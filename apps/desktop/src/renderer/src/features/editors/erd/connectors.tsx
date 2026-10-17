// Đường quan hệ ERD — Crow's foot (docs/spec/notation-erd.md mục 2): One-to-One / One-to-Many / Many-to-Many.
// Identifying = nét liền (FK nằm trong PK con), non-identifying = nét đứt. Cha = nguồn, con = đích.
import { Table2 } from 'lucide-react';
import {
  ERD_KINDS,
  FK_ACTIONS,
  entityData,
  relData,
  removeFkColumns,
  type ChildCardinality,
  type Connector,
  type FkAction,
  type ModelElement,
  type RelationshipData,
} from '@umlab/core';
import { Checkbox, choiceDialog, Select, Segmented } from '@/ui';
import type { Engine } from '../engine/engine';
import {
  registerConnector,
  type ConnectorDef,
  type ConnLook,
  type EngineLookup,
  type MarkerKind,
  type Tx,
  type ViewCtx,
} from '../engine/registry';
import { asEntity, generateFks, makeJunction, newRelData, setEntityColumns } from './ops';

const MARK: Record<ChildCardinality, MarkerKind> = {
  one: 'cf-one-only',
  zeroOrOne: 'cf-zero-one',
  oneOrMany: 'cf-one-many',
  zeroOrMany: 'cf-zero-many',
};
const CARD_LABEL: Record<ChildCardinality, string> = {
  one: 'Một và chỉ một (1)',
  zeroOrOne: 'Không hoặc một (0..1)',
  oneOrMany: 'Một hoặc nhiều (1..*)',
  zeroOrMany: 'Không hoặc nhiều (0..*)',
};

export function relLook(_c: Connector, m: ModelElement | null): ConnLook {
  const r = relData(m);
  if (r.kind === 'relnn') return { line: 'solid', start: 'cf-zero-many', end: 'cf-zero-many' };
  return {
    line: r.identifying ? 'solid' : 'dashed',
    start: MARK[r.parent.cardinality],
    end: MARK[r.child.cardinality],
  };
}

const isEntity = (c: ViewCtx) => c.view.shape === 'erd.entity' && !!c.model;

/** Biểu tượng crow's foot nhỏ cho nút chọn cardinality. */
function CardGlyph({ card }: { card: ChildCardinality }) {
  const s = 'currentColor';
  const fork = 'M14 3 L8 8 L14 13';
  return (
    <svg width="22" height="16" viewBox="0 0 22 16" aria-hidden>
      <path d="M2 8 H20" stroke={s} strokeWidth={1.3} fill="none" />
      {card === 'one' && <path d="M12 3 V13 M15 3 V13" stroke={s} strokeWidth={1.3} />}
      {card === 'zeroOrOne' && (
        <>
          <path d="M15 3 V13" stroke={s} strokeWidth={1.3} />
          <circle cx={9} cy={8} r={3} fill="var(--panel)" stroke={s} strokeWidth={1.3} />
        </>
      )}
      {card === 'oneOrMany' && (
        <path d={`${fork} M9 3 V13`} stroke={s} strokeWidth={1.3} fill="none" transform="translate(4 0)" />
      )}
      {card === 'zeroOrMany' && (
        <>
          <path d={fork} stroke={s} strokeWidth={1.3} fill="none" transform="translate(5 0)" />
          <circle cx={7} cy={8} r={3} fill="var(--panel)" stroke={s} strokeWidth={1.3} />
        </>
      )}
    </svg>
  );
}

function CardPicker({
  label,
  value,
  onChange,
  parent,
  readOnly,
}: {
  label: string;
  value: ChildCardinality;
  onChange: (v: ChildCardinality) => void;
  parent?: boolean;
  readOnly: boolean;
}) {
  return (
    <div>
      <span className="lbl">{label}</span>
      <Segmented
        ariaLabel={label}
        value={value}
        onChange={(v) => !readOnly && onChange(v)}
        options={(Object.keys(MARK) as ChildCardinality[]).map((k) => ({
          value: k,
          label: <CardGlyph card={k} />,
          title:
            parent && (k === 'oneOrMany' || k === 'zeroOrMany')
              ? 'Đầu cha chỉ là 1 hoặc 0..1 — dùng Many-to-Many'
              : CARD_LABEL[k],
          disabled: parent && (k === 'oneOrMany' || k === 'zeroOrMany'),
        }))}
      />
    </div>
  );
}

/** Sửa dữ liệu quan hệ + đồng bộ cột FK (nullable / unique / PK khi identifying). */
function updateRel(tx: Tx, connId: string, relId: string, patch: Partial<RelationshipData>) {
  const m = tx.model(relId);
  if (!m) return;
  const r: RelationshipData = { ...relData(m), ...patch };
  if (r.kind !== 'relnn')
    r.kind = r.child.cardinality === 'one' || r.child.cardinality === 'zeroOrOne' ? 'rel11' : 'rel1n';
  tx.setModelData(relId, r as unknown as Record<string, unknown>);
  tx.setConn(connId, { kind: `erd.${r.kind}` });
  const cm = tx.model(r.child.entityId);
  if (!cm) return;
  const child = asEntity(cm);
  const fks = child.columns.filter((c) => c.fk?.relationshipId === relId);
  if (!fks.length) return;
  const single = fks.length === 1;
  let cols = child.columns.map((c) => {
    if (c.fk?.relationshipId !== relId) return c;
    return {
      ...c,
      pk: r.identifying,
      nullable: r.identifying ? false : r.parent.cardinality === 'zeroOrOne',
      unique: !r.identifying && single && r.kind === 'rel11',
    };
  });
  // FK identifying lên nhóm PK đầu bảng
  if (patch.identifying !== undefined) cols = [...cols.filter((c) => c.pk), ...cols.filter((c) => !c.pk)];
  setEntityColumns(tx, child.id, cols);
}

function RelationshipInspector({
  conn,
  model,
  apply,
  lookup,
  readOnly,
}: {
  conn: Connector;
  model: ModelElement | null;
  apply: (fn: (tx: Tx) => void) => void;
  lookup: EngineLookup;
  readOnly: boolean;
}) {
  if (!model) return null;
  const r = relData(model);
  const parent = lookup.model(r.parent.entityId);
  const child = lookup.model(r.child.entityId);
  const set = (patch: Partial<RelationshipData>) => apply((tx) => updateRel(tx, conn.id, model.id, patch));
  const fks = entityData(child).columns.filter((c) => c.fk?.relationshipId === model.id);
  const pcols = entityData(parent).columns;
  return (
    <div className="pgroup">
      <div className="pgroup-h">Quan hệ</div>
      <div className="text-[12px]">
        <b>{parent?.name ?? '?'}</b> (cha) → <b>{child?.name ?? '?'}</b> (con)
      </div>
      {r.kind === 'relnn' ? (
        <>
          <p className="text-[11.5px] text-muted">
            Many-to-Many là quan hệ khái niệm: DDL bỏ qua cho tới khi tạo bảng trung gian.
          </p>
          {!readOnly && (
            <button className="btn outline" onClick={() => makeJunction(apply, conn.id)}>
              <Table2 />
              Tạo bảng trung gian
            </button>
          )}
        </>
      ) : (
        <>
          <Checkbox
            label="Identifying (nét liền — FK nằm trong khoá chính của con)"
            checked={r.identifying}
            disabled={readOnly}
            onChange={(identifying) => set({ identifying })}
          />
          <CardPicker
            label={`Đầu cha · ${parent?.name ?? '?'}`}
            value={r.parent.cardinality}
            parent
            readOnly={readOnly}
            onChange={(v) => set({ parent: { ...r.parent, cardinality: v === 'zeroOrOne' ? 'zeroOrOne' : 'one' } })}
          />
          <CardPicker
            label={`Đầu con · ${child?.name ?? '?'}`}
            value={r.child.cardinality}
            readOnly={readOnly}
            onChange={(v) => set({ child: { ...r.child, cardinality: v } })}
          />
          <div className="row2">
            <div>
              <span className="lbl">ON DELETE</span>
              <Select
                aria-label="ON DELETE"
                value={r.onDelete}
                disabled={readOnly}
                onChange={(e) => set({ onDelete: e.target.value as FkAction })}
                options={FK_ACTIONS.map((a) => ({ value: a, label: a }))}
              />
            </div>
            <div>
              <span className="lbl">ON UPDATE</span>
              <Select
                aria-label="ON UPDATE"
                value={r.onUpdate}
                disabled={readOnly}
                onChange={(e) => set({ onUpdate: e.target.value as FkAction })}
                options={FK_ACTIONS.map((a) => ({ value: a, label: a }))}
              />
            </div>
          </div>
          <div>
            <span className="lbl">Cột khoá ngoại</span>
            {fks.length ? (
              <div className="grid gap-1 text-[12px]">
                {fks.map((c) => (
                  <code key={c.id}>
                    {child?.name}.{c.name} → {parent?.name}.{pcols.find((p) => p.id === c.fk?.refColumnId)?.name ?? '?'}
                  </code>
                ))}
              </div>
            ) : (
              <p className="text-[11.5px] text-muted">Chưa có (bảng cha chưa có khoá chính?).</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** Hỏi tạo bảng trung gian cho N-N vừa nối. */
async function askJunction(e: Engine, c: Connector) {
  const choice = await choiceDialog({
    title: 'Quan hệ Many-to-Many',
    text: 'CSDL quan hệ không lưu trực tiếp N-N. Tạo bảng trung gian (PK ghép 2 khoá ngoại + 2 quan hệ 1-N), hay giữ N-N ở mức khái niệm (cảnh báo khi xuất DDL)?',
    options: [
      { value: 'keep', label: 'Giữ N-N khái niệm', variant: 'outline' },
      { value: 'junction', label: 'Tạo bảng trung gian', variant: 'primary' },
    ],
  });
  if (choice === 'junction' && e.lookup.conn(c.id)) makeJunction((fn) => e.apply(fn), c.id);
}

/** Xoá quan hệ → hỏi xoá cột FK đã sinh hay giữ lại làm cột thường. */
async function askDropFks(e: Engine, model: ModelElement | null) {
  if (!model || model.kind !== ERD_KINDS.relationship) return;
  const r = relData(model);
  const childOnCanvas = e.lookup.views().some((v) => v.modelId === r.child.entityId);
  const cm = e.lookup.model(r.child.entityId);
  if (!childOnCanvas || !cm) return;
  const cols = entityData(cm).columns.filter((c) => c.fk?.relationshipId === model.id);
  if (!cols.length) return;
  const choice = await choiceDialog({
    title: 'Xoá quan hệ',
    text: `Quan hệ đã sinh ${cols.length} cột khoá ngoại ở “${cm.name}”: ${cols.map((c) => c.name).join(', ')}. Xoá luôn các cột này?`,
    options: [
      { value: 'keep', label: 'Giữ cột (bỏ ràng buộc FK)', variant: 'outline' },
      { value: 'drop', label: 'Xoá cột FK', variant: 'danger' },
    ],
  });
  if (!choice) return;
  e.apply((tx) => {
    const cur = tx.model(cm.id);
    if (cur) setEntityColumns(tx, cm.id, removeFkColumns(entityData(cur).columns, model.id, choice === 'keep'));
  });
}

const base: Omit<ConnectorDef, 'kind' | 'label' | 'icon'> = {
  modelKind: ERD_KINDS.relationship,
  look: relLook,
  defaultRouting: 'orthogonal',
  selfLoop: true,
  live: true,
  labels: (_c, m) => (m?.name ? [{ role: 'name', text: m.name, pos: 0.5, draggable: true }] : []),
  allow: (s, t) => (isEntity(s) && isEntity(t) ? true : 'Quan hệ nối giữa hai Entity (cha → con)'),
  inspector: RelationshipInspector,
  onCreate: (tx, c) => c.modelId && generateFks(tx, c.modelId),
  onDelete: (tx, c) => {
    if (c.modelId) tx.deleteModel(c.modelId);
  },
  afterDelete: (e, _c, m) => void askDropFks(e, m),
};

for (const [kind, label, icon] of [
  ['rel11', 'One-to-One Relationship', 'rel-1-1'],
  ['rel1n', 'One-to-Many Relationship', 'rel-1-n'],
  ['relnn', 'Many-to-Many Relationship', 'rel-n-n'],
] as const)
  registerConnector({
    ...base,
    kind: `erd.${kind}`,
    label,
    icon,
    defaultModel: (s, t) => ({
      name: '',
      data: newRelData(kind, s.model?.id ?? '', t.model?.id ?? '') as unknown as Record<string, unknown>,
    }),
    ...(kind === 'relnn' ? { afterCreate: (e: Engine, c: Connector) => void askJunction(e, c) } : {}),
  });
