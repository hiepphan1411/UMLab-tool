// Hộp thoại Parse ORM → ERD (docs/spec/orm-mapping.md mục 1): 1. chọn class · 2. tuỳ chọn · 3. xem diff rồi Áp dụng.
// Đồng bộ không nhân bản: khớp theo id class / thuộc tính / association, giữ chỉnh sửa tay, vị trí bảng cũ giữ nguyên.
import { useMemo, useState } from 'react';
import type * as Y from 'yjs';
import {
  DIALECTS,
  classToErd,
  createDiagram,
  defaultOrmSelection,
  defaultSelection,
  diagramsMap,
  diffErd,
  erdDialect,
  erdState,
  metaMap,
  ormInputFromDiagram,
  planSync,
  updateDiagramMeta,
  viewsMap,
  writeErdPlan,
  type Dialect,
  type ErdDiffItem,
  type InheritanceStrategy,
  type OrmOptions,
} from '@umlab/core';
import { cn } from '@/lib/cn';
import { Button, Checkbox, Dialog, Segmented, openDialog, toast } from '@/ui';
import { LOCAL } from '../../workspace/session';
import { layoutEntities } from './layout';
import { entitySize } from './table';

type Step = 1 | 2 | 3;
type Opts = Omit<OrmOptions, 'classIds' | 'typeMap'> & { target: string; typeMapText: string };

const parseTypeMap = (text: string): Record<string, string> =>
  Object.fromEntries(
    text
      .split('\n')
      .map((l) => l.split('='))
      .filter((p) => p.length === 2 && p[0].trim() && p[1].trim())
      .map(([k, v]) => [k.trim(), v.trim()]),
  );

const OP: Record<ErdDiffItem['op'], { sign: string; label: string; color: string }> = {
  add: { sign: '+', label: 'Thêm', color: 'var(--ok)' },
  change: { sign: '~', label: 'Sửa', color: 'var(--warn)' },
  remove: { sign: '−', label: 'Xoá', color: 'var(--danger)' },
};

/** ERD đã liên kết với Class Diagram (sinh bằng Parse ORM trước đó). */
export function linkedErds(doc: Y.Doc, classDiagramId: string) {
  return [...diagramsMap(doc).values()].filter(
    (d) =>
      d.type === 'erd' && d.generatedFrom?.generator === 'orm' && d.generatedFrom.sourceDiagramId === classDiagramId,
  );
}

function OrmDialog({
  doc,
  classDiagramId,
  preselect,
  done,
}: {
  doc: Y.Doc;
  classDiagramId: string;
  preselect: string[];
  done: (erdId: string | null) => void;
}) {
  const input = useMemo(() => ormInputFromDiagram(doc, classDiagramId), [doc, classDiagramId]);
  const candidates = input.classes.filter((c) => c.kind === 'class' || c.kind === 'associationClass');
  const linked = useMemo(() => linkedErds(doc, classDiagramId), [doc, classDiagramId]);
  const [step, setStep] = useState<Step>(1);
  const [sel, setSel] = useState<Set<string>>(
    () =>
      new Set(
        preselect.filter((id) => candidates.some((c) => c.id === id)).length ? preselect : defaultOrmSelection(input),
      ),
  );
  const [o, setO] = useState<Opts>(() => {
    const tm = metaMap(doc).get('typeMap');
    return {
      dialect: linked[0] ? erdDialect(linked[0]) : 'postgresql',
      tableNaming: 'snake',
      columnNaming: 'snake',
      inheritance: 'JOINED',
      keyType: 'identity',
      target: linked[0]?.id ?? 'new',
      typeMapText:
        tm && typeof tm === 'object'
          ? Object.entries(tm as Record<string, string>)
              .map(([k, v]) => `${k} = ${v}`)
              .join('\n')
          : '',
    };
  });
  const set = (p: Partial<Opts>) => setO((x) => ({ ...x, ...p }));
  const result = useMemo(
    () => (step === 3 ? classToErd(input, { ...o, classIds: [...sel], typeMap: parseTypeMap(o.typeMapText) }) : null),
    [step, input, o, sel],
  );
  const cur = useMemo(
    () => (step === 3 && o.target !== 'new' ? erdState(doc, o.target) : { entities: [], relationships: [] }),
    [step, doc, o.target],
  );
  const diff = useMemo(() => (result ? diffErd(cur, result) : null), [result, cur]);
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const chosen = picked ?? (diff ? defaultSelection(diff.items) : new Set<string>());
  const toggle = (k: string) => {
    const n = new Set(chosen);
    if (n.has(k)) n.delete(k);
    else n.add(k);
    setPicked(n);
  };
  const [busy, setBusy] = useState(false);

  const apply = async () => {
    if (!diff || !result) return;
    setBusy(true);
    try {
      const cls = diagramsMap(doc).get(classDiagramId);
      const typeMap = parseTypeMap(o.typeMapText);
      doc.transact(() => metaMap(doc).set('typeMap', typeMap), LOCAL);
      let target = o.target;
      const generatedFrom = { sourceDiagramId: classDiagramId, sourceVersion: Date.now(), generator: 'orm' };
      if (target === 'new')
        target = createDiagram(doc, 'erd', `ERD · ${cls?.name ?? 'Class'}`, cls?.folderId ?? null, LOCAL);
      const meta = diagramsMap(doc).get(target)!;
      updateDiagramMeta(doc, target, { generatedFrom, canvas: { ...meta.canvas, dialect: o.dialect } }, LOCAL);
      const plan = planSync(cur, diff, chosen);
      // bảng mới: elkjs, đặt bên phải vùng đang có hình
      const existing = [...viewsMap(doc, target).values()];
      const origin = existing.length
        ? { x: Math.max(...existing.map((v) => v.x + v.w)) + 120, y: Math.min(...existing.map((v) => v.y)) }
        : { x: 40, y: 40 };
      const fresh = plan.upsertEntities.filter((e) => plan.newEntityIds.includes(e.id));
      const pos = await layoutEntities(fresh, plan.upsertRelationships, origin);
      writeErdPlan(doc, target, plan, {
        place: (e) => pos.get(e.id) ?? { ...origin, ...entitySize(e) },
        size: entitySize,
        origin: LOCAL,
      });
      const n = (op: string) => diff.items.filter((i) => i.op === op && chosen.has(i.key)).length;
      toast(`Đã cập nhật ERD: +${n('add')} · ~${n('change')} · −${n('remove')}`);
      done(target);
    } finally {
      setBusy(false);
    }
  };

  const groups = useMemo(() => {
    const g = new Map<string, ErdDiffItem[]>();
    for (const it of diff?.items ?? []) g.set(it.table, [...(g.get(it.table) ?? []), it]);
    return [...g];
  }, [diff]);

  const footer = (
    <>
      <Button variant="outline" onClick={() => (step === 1 ? done(null) : setStep((s) => (s - 1) as Step))}>
        {step === 1 ? 'Huỷ' : 'Quay lại'}
      </Button>
      {step < 3 ? (
        <Button
          variant="primary"
          disabled={!sel.size}
          onClick={() => {
            setPicked(null);
            setStep((s) => (s + 1) as Step);
          }}
        >
          Tiếp tục
        </Button>
      ) : (
        <Button
          variant="primary"
          loading={busy}
          disabled={!diff?.items.length || !chosen.size}
          onClick={() => void apply()}
        >
          Áp dụng
        </Button>
      )}
    </>
  );

  return (
    <Dialog open onClose={() => done(null)} title="Parse ORM → ERD" width={720} footer={footer} modalOnly>
      <div className="grid gap-3" data-orm-step={step}>
        <div className="flex gap-2 text-[12px]">
          {['Chọn class', 'Tuỳ chọn', 'Xem trước thay đổi'].map((t, i) => (
            <span
              key={t}
              className={cn('chip', step === i + 1 && 'on')}
              style={{ fontWeight: step === i + 1 ? 700 : 400 }}
            >
              {i + 1}. {t}
            </span>
          ))}
        </div>

        {step === 1 && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-muted">
                Đã chọn {sel.size}/{candidates.length} class. Mặc định: class có «entity» / «table».
              </span>
              <span className="flex-1" />
              <Button size="sm" variant="outline" onClick={() => setSel(new Set(candidates.map((c) => c.id)))}>
                Chọn tất cả
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSel(new Set())}>
                Bỏ chọn
              </Button>
            </div>
            <div className="grid gap-1" style={{ maxHeight: 340, overflow: 'auto' }} aria-label="Danh sách class">
              {candidates.map((c) => (
                <Checkbox
                  key={c.id}
                  checked={sel.has(c.id)}
                  onChange={(on) => {
                    const n = new Set(sel);
                    if (on) n.add(c.id);
                    else n.delete(c.id);
                    setSel(n);
                  }}
                  label={
                    <span>
                      {c.stereotypes.length ? <span className="text-muted">«{c.stereotypes.join(', ')}» </span> : null}
                      <b style={{ fontStyle: c.isAbstract ? 'italic' : undefined }}>{c.name}</b>
                      <span className="text-muted"> · {c.attributes.length} thuộc tính</span>
                    </span>
                  }
                />
              ))}
              {!candidates.length && <p className="text-muted">Class Diagram chưa có class nào.</p>}
            </div>
          </>
        )}

        {step === 2 && (
          <div className="grid gap-3">
            <div>
              <span className="lbl">Dialect</span>
              <Segmented
                ariaLabel="Dialect"
                value={o.dialect}
                onChange={(dialect: Dialect) => set({ dialect })}
                options={DIALECTS.map((d) => ({ value: d.id, label: d.label }))}
              />
            </div>
            <div className="row2">
              <div>
                <span className="lbl">Tên bảng</span>
                <Segmented
                  ariaLabel="Tên bảng"
                  value={o.tableNaming}
                  onChange={(tableNaming) => set({ tableNaming })}
                  options={[
                    { value: 'snake', label: 'snake_case' },
                    { value: 'keep', label: 'Giữ nguyên' },
                    { value: 'plural', label: 'Số nhiều' },
                  ]}
                />
              </div>
              <div>
                <span className="lbl">Tên cột</span>
                <Segmented
                  ariaLabel="Tên cột"
                  value={o.columnNaming}
                  onChange={(columnNaming) => set({ columnNaming })}
                  options={[
                    { value: 'snake', label: 'snake_case' },
                    { value: 'camel', label: 'camelCase' },
                  ]}
                />
              </div>
            </div>
            <div className="row2">
              <div>
                <span className="lbl">Kế thừa mặc định</span>
                <Segmented
                  ariaLabel="Chiến lược kế thừa"
                  value={o.inheritance}
                  onChange={(inheritance: InheritanceStrategy) => set({ inheritance })}
                  options={[
                    { value: 'JOINED', label: 'JOINED', title: 'Bảng con có PK = FK tới cha' },
                    { value: 'SINGLE_TABLE', label: 'SINGLE', title: 'Gộp vào bảng cha + cột dtype' },
                    { value: 'TABLE_PER_CLASS', label: 'PER_CLASS', title: 'Mỗi lớp cụ thể một bảng đủ cột' },
                  ]}
                />
              </div>
              <div>
                <span className="lbl">Khoá tự sinh</span>
                <Segmented
                  ariaLabel="Khoá tự sinh"
                  value={o.keyType}
                  onChange={(keyType) => set({ keyType })}
                  options={[
                    { value: 'identity', label: 'BIGINT IDENTITY' },
                    { value: 'uuid', label: 'UUID' },
                  ]}
                />
              </div>
            </div>
            <div>
              <span className="lbl">ERD đích</span>
              <select
                className="field"
                aria-label="ERD đích"
                value={o.target}
                onChange={(e) => set({ target: e.target.value })}
              >
                <option value="new">Tạo ERD mới</option>
                {linked.map((d) => (
                  <option key={d.id} value={d.id}>
                    Cập nhật “{d.name}” (đã liên kết)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="lbl">Bảng kiểu tuỳ chỉnh (lưu theo project) — mỗi dòng `KieuUML = KIỂU SQL`</span>
              <textarea
                className="field"
                rows={3}
                aria-label="Bảng kiểu tuỳ chỉnh"
                placeholder="Money = DECIMAL(12,2)"
                style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
                value={o.typeMapText}
                onChange={(e) => set({ typeMapText: e.target.value })}
              />
            </div>
          </div>
        )}

        {step === 3 && result && diff && (
          <>
            <p className="text-[12px] text-muted">
              Kết quả parse: {result.report.tables} bảng · {result.report.foreignKeys} khoá ngoại ·{' '}
              {result.report.junctionTables} bảng trung gian. Bỏ tick mục không muốn áp dụng.
            </p>
            {result.report.warnings.length > 0 && (
              <ul className="grid gap-1 text-[12px]" style={{ color: 'var(--warn)' }} aria-label="Cảnh báo parse">
                {result.report.warnings.map((w) => (
                  <li key={w}>⚠ {w}</li>
                ))}
              </ul>
            )}
            <div className="grid gap-2" style={{ maxHeight: 360, overflow: 'auto' }} aria-label="Thay đổi">
              {!diff.items.length && <p className="text-muted">Không có thay đổi — ERD đã khớp Class Diagram.</p>}
              {groups.map(([table, items]) => (
                <div
                  key={table}
                  className="grid gap-1 rounded-md border border-line p-2"
                  style={{ background: 'var(--panel-2)' }}
                >
                  <b className="text-[12.5px]">{table}</b>
                  {items.map((it) => (
                    <label key={it.key} className="flex items-start gap-2 text-[12px]" data-diff={it.op}>
                      <input
                        type="checkbox"
                        checked={chosen.has(it.key)}
                        onChange={() => toggle(it.key)}
                        aria-label={`${OP[it.op].label} ${it.label}`}
                      />
                      <span style={{ color: OP[it.op].color, fontWeight: 700, width: 12 }}>{OP[it.op].sign}</span>
                      <span>
                        <span>{it.label}</span>
                        {it.detail && <code className="ml-1 text-muted">{it.detail}</code>}
                        {it.manual && (
                          <span className="ml-1 text-[11px]" style={{ color: 'var(--warn)' }}>
                            (Giữ chỉnh sửa tay)
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}

/** Mở hộp thoại; trả về id ERD đã tạo/cập nhật (null nếu huỷ). */
export function openOrmDialog(doc: Y.Doc, classDiagramId: string, preselect: string[] = []): Promise<string | null> {
  return openDialog<string>((done) => (
    <OrmDialog doc={doc} classDiagramId={classDiagramId} preselect={preselect} done={done} />
  ));
}
