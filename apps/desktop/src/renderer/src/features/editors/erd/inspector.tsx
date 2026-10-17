// Inspector của Entity: tab Cột (bảng tên · kiểu theo dialect · độ dài · PK/NN/UQ/AI · default · comment, kéo đổi
// thứ tự) và tab Index & ràng buộc (index, unique, check). Mọi ghi cột đi qua setEntityColumns (FK con theo PK cha).
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import {
  DIALECT_TYPES,
  entityData,
  newColumn,
  parseTypeText,
  typeText,
  uid,
  type EntityData,
  type ErdCheck,
  type ErdColumn,
  type ErdIndex,
  type ErdUnique,
} from '@umlab/core';
import { cn } from '@/lib/cn';
import { IconButton, Tabs } from '@/ui';
import type { ShapeInspectorProps, Tx } from '../engine/registry';
import { dialectOf, setEntityColumns } from './ops';

/** Ô nhập ghi khi rời ô / Enter (không ghi từng phím để undo gọn). */
function Cell({
  value,
  onCommit,
  label,
  readOnly,
  list,
  placeholder,
  className,
}: {
  value: string;
  onCommit: (v: string) => void;
  label: string;
  readOnly: boolean;
  list?: string;
  placeholder?: string;
  className?: string;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <input
      className={cn('field erd-cell', className)}
      aria-label={label}
      value={v}
      list={list}
      placeholder={placeholder}
      readOnly={readOnly}
      spellCheck={false}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onCommit(v)}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
  );
}

function Flag({
  on,
  label,
  title,
  onClick,
  disabled,
}: {
  on: boolean;
  label: string;
  title: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      className={cn('erd-flag', on && 'on')}
      aria-pressed={on}
      title={title}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

const sizeText = (c: ErdColumn) => {
  const t = typeText(c);
  const m = t.match(/\((.*)\)$/);
  return m ? m[1] : '';
};

function ColumnsTab({
  cols,
  write,
  readOnly,
  dialect,
}: {
  cols: ErdColumn[];
  write: (c: ErdColumn[]) => void;
  readOnly: boolean;
  dialect: string;
}) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const patch = (i: number, p: Partial<ErdColumn>) => {
    const next = cols.map((c, k) => (k === i ? { ...c, ...p } : c));
    const c = next[i];
    if (c.pk) next[i] = { ...c, nullable: false };
    write(next);
  };
  const setType = (i: number, typ: string, size: string) => {
    const st = parseTypeText(size.trim() ? `${typ}(${size})` : typ);
    const c: ErdColumn = { ...cols[i], type: st.type };
    delete c.length;
    delete c.precision;
    delete c.scale;
    if (!/^enum$/i.test(st.type) && c.enumValues && typ !== cols[i].type) delete c.enumValues;
    write(cols.map((x, k) => (k === i ? { ...c, ...st } : x)));
  };
  const move = (from: number, to: number) => {
    const next = [...cols];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    write(next);
  };
  return (
    <div className="grid gap-1.5" aria-label="Danh sách cột">
      <datalist id="erd-types">
        {(DIALECT_TYPES[dialect as keyof typeof DIALECT_TYPES] ?? []).map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      {cols.map((c, i) => (
        <div
          key={c.id}
          data-col={c.name}
          className={cn(
            'erd-col',
            dragFrom === i && 'dragging',
            over === i && dragFrom !== null && dragFrom !== i && 'drop-before',
          )}
          onDragOver={(e) => {
            if (dragFrom === null) return;
            e.preventDefault();
            setOver(i);
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (dragFrom !== null && dragFrom !== i) move(dragFrom, i);
            setDragFrom(null);
            setOver(null);
          }}
        >
          <div className="erd-col-r1">
            <span
              className="erd-grip"
              draggable={!readOnly}
              title="Kéo để đổi thứ tự"
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', c.id);
                setDragFrom(i);
              }}
              onDragEnd={() => {
                setDragFrom(null);
                setOver(null);
              }}
            >
              <GripVertical size={13} />
            </span>
            <Cell
              label={`Tên cột ${i + 1}`}
              value={c.name}
              readOnly={readOnly}
              onCommit={(name) => name.trim() && patch(i, { name: name.trim() })}
            />
            <Cell
              label={`Kiểu cột ${c.name}`}
              className="erd-type"
              list="erd-types"
              value={c.enumValues?.length ? c.type : c.type}
              readOnly={readOnly}
              onCommit={(t) => t.trim() && setType(i, t.trim().toUpperCase(), sizeText(c))}
            />
            <Cell
              label={`Độ dài ${c.name}`}
              className="erd-len"
              placeholder="n / p,s"
              value={c.enumValues?.length ? '' : sizeText(c)}
              readOnly={readOnly}
              onCommit={(s) => setType(i, c.type, s)}
            />
          </div>
          <div className="erd-col-r2">
            <Flag
              label="PK"
              title="Khoá chính"
              on={c.pk}
              disabled={readOnly}
              onClick={() => patch(i, { pk: !c.pk, nullable: c.pk ? c.nullable : false })}
            />
            <Flag
              label="NN"
              title="NOT NULL"
              on={!c.nullable || c.pk}
              disabled={readOnly || c.pk}
              onClick={() => patch(i, { nullable: !c.nullable })}
            />
            <Flag
              label="UQ"
              title="UNIQUE"
              on={c.unique}
              disabled={readOnly}
              onClick={() => patch(i, { unique: !c.unique })}
            />
            <Flag
              label="AI"
              title="Tự tăng (identity / auto_increment)"
              on={c.autoIncrement}
              disabled={readOnly}
              onClick={() => patch(i, { autoIncrement: !c.autoIncrement })}
            />
            <Cell
              label={`Default ${c.name}`}
              className="erd-def"
              placeholder="default"
              value={c.default ?? ''}
              readOnly={readOnly}
              onCommit={(d) => patch(i, { default: d.trim() || undefined })}
            />
            <IconButton
              label={`Xoá cột ${c.name}`}
              disabled={readOnly}
              onClick={() => write(cols.filter((_, k) => k !== i))}
            >
              <Trash2 />
            </IconButton>
          </div>
          <Cell
            label={`Chú thích ${c.name}`}
            className="erd-cmt"
            placeholder="Chú thích (COMMENT)"
            value={c.comment ?? ''}
            readOnly={readOnly}
            onCommit={(t) => patch(i, { comment: t.trim() || undefined })}
          />
          {c.enumValues?.length ? (
            <Cell
              label={`Giá trị enum ${c.name}`}
              className="erd-cmt"
              value={c.enumValues.join(', ')}
              readOnly={readOnly}
              onCommit={(t) =>
                patch(i, {
                  enumValues: t
                    .split(',')
                    .map((x) => x.trim())
                    .filter(Boolean),
                })
              }
            />
          ) : null}
        </div>
      ))}
      {!readOnly && (
        <button
          className="btn outline"
          onClick={() => {
            const names = new Set(cols.map((c) => c.name));
            let n = 'cot_moi';
            for (let k = 2; names.has(n); k++) n = `cot_moi_${k}`;
            write([...cols, newColumn(n, 'VARCHAR', { length: 255 })]);
          }}
        >
          <Plus />
          Thêm cột (Alt+Shift+C)
        </button>
      )}
    </div>
  );
}

/** Chọn cột cho index / unique: danh sách tick. */
function ColumnPicker({
  cols,
  value,
  onChange,
  readOnly,
  label,
}: {
  cols: ErdColumn[];
  value: string[];
  onChange: (v: string[]) => void;
  readOnly: boolean;
  label: string;
}) {
  return (
    <div className="flex flex-wrap gap-1" aria-label={label}>
      {cols.map((c) => {
        const on = value.includes(c.id) || value.includes(c.name);
        return (
          <Flag
            key={c.id}
            label={c.name}
            title={on ? 'Bỏ cột' : 'Thêm cột'}
            on={on}
            disabled={readOnly}
            onClick={() => onChange(on ? value.filter((x) => x !== c.id && x !== c.name) : [...value, c.id])}
          />
        );
      })}
    </div>
  );
}

function Section({
  title,
  onAdd,
  readOnly,
  children,
}: {
  title: string;
  onAdd: () => void;
  readOnly: boolean;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between">
        <span className="lbl" style={{ margin: 0 }}>
          {title}
        </span>
        <IconButton label={`Thêm ${title.toLowerCase()}`} disabled={readOnly} onClick={onAdd}>
          <Plus />
        </IconButton>
      </div>
      {children}
    </div>
  );
}

function ConstraintsTab({
  name,
  d,
  set,
  readOnly,
}: {
  name: string;
  d: EntityData;
  set: (p: Partial<EntityData>) => void;
  readOnly: boolean;
}) {
  const ix = (i: number, p: Partial<ErdIndex>) =>
    set({ indexes: d.indexes.map((x, k) => (k === i ? { ...x, ...p } : x)) });
  const uq = (i: number, p: Partial<ErdUnique>) =>
    set({ uniqueConstraints: d.uniqueConstraints.map((x, k) => (k === i ? { ...x, ...p } : x)) });
  const ck = (i: number, p: Partial<ErdCheck>) =>
    set({ checks: d.checks.map((x, k) => (k === i ? { ...x, ...p } : x)) });
  return (
    <div className="grid gap-3">
      <Section
        title="Index"
        readOnly={readOnly}
        onAdd={() =>
          set({
            indexes: [
              ...d.indexes,
              { id: uid('ix'), name: `ix_${name}_${d.indexes.length + 1}`, columns: [], unique: false },
            ],
          })
        }
      >
        {d.indexes.map((x, i) => (
          <div key={x.id} className="erd-col">
            <div className="erd-col-r1">
              <Cell label="Tên index" value={x.name} readOnly={readOnly} onCommit={(v) => ix(i, { name: v.trim() })} />
              <Flag
                label="UNIQUE"
                title="Index duy nhất"
                on={x.unique}
                disabled={readOnly}
                onClick={() => ix(i, { unique: !x.unique })}
              />
              <select
                className="field erd-cell erd-len"
                aria-label="Phương thức index"
                value={x.method ?? 'btree'}
                disabled={readOnly}
                onChange={(e) => ix(i, { method: e.target.value as ErdIndex['method'] })}
              >
                <option value="btree">btree</option>
                <option value="hash">hash</option>
                <option value="gin">gin</option>
              </select>
              <IconButton
                label="Xoá index"
                disabled={readOnly}
                onClick={() => set({ indexes: d.indexes.filter((_, k) => k !== i) })}
              >
                <Trash2 />
              </IconButton>
            </div>
            <ColumnPicker
              label="Cột của index"
              cols={d.columns}
              value={x.columns}
              readOnly={readOnly}
              onChange={(columns) => ix(i, { columns })}
            />
          </div>
        ))}
      </Section>
      <Section
        title="Unique"
        readOnly={readOnly}
        onAdd={() =>
          set({
            uniqueConstraints: [
              ...d.uniqueConstraints,
              { id: uid('uq'), name: `uq_${name}_${d.uniqueConstraints.length + 1}`, columns: [] },
            ],
          })
        }
      >
        {d.uniqueConstraints.map((x, i) => (
          <div key={x.id ?? i} className="erd-col">
            <div className="erd-col-r1">
              <Cell
                label="Tên ràng buộc unique"
                value={x.name}
                readOnly={readOnly}
                onCommit={(v) => uq(i, { name: v.trim() })}
              />
              <IconButton
                label="Xoá unique"
                disabled={readOnly}
                onClick={() => set({ uniqueConstraints: d.uniqueConstraints.filter((_, k) => k !== i) })}
              >
                <Trash2 />
              </IconButton>
            </div>
            <ColumnPicker
              label="Cột unique"
              cols={d.columns}
              value={x.columns}
              readOnly={readOnly}
              onChange={(columns) => uq(i, { columns })}
            />
          </div>
        ))}
      </Section>
      <Section
        title="Check"
        readOnly={readOnly}
        onAdd={() =>
          set({ checks: [...d.checks, { id: uid('ck'), name: `ck_${name}_${d.checks.length + 1}`, expr: '' }] })
        }
      >
        {d.checks.map((x, i) => (
          <div key={x.id ?? i} className="erd-col">
            <div className="erd-col-r1">
              <Cell label="Tên check" value={x.name} readOnly={readOnly} onCommit={(v) => ck(i, { name: v.trim() })} />
              <IconButton
                label="Xoá check"
                disabled={readOnly}
                onClick={() => set({ checks: d.checks.filter((_, k) => k !== i) })}
              >
                <Trash2 />
              </IconButton>
            </div>
            <Cell
              label="Biểu thức check"
              className="erd-cmt"
              placeholder="gia >= 0"
              value={x.expr}
              readOnly={readOnly}
              onCommit={(v) => ck(i, { expr: v.trim() })}
            />
          </div>
        ))}
      </Section>
    </div>
  );
}

export function EntityInspector({ model, apply, readOnly, lookup }: ShapeInspectorProps) {
  const [tab, setTab] = useState<'cols' | 'cons'>('cols');
  if (!model) return null;
  const d = entityData(model);
  const dialect = dialectOf(lookup);
  const write = (cols: ErdColumn[]) => apply((tx: Tx) => setEntityColumns(tx, model.id, cols));
  const set = (p: Partial<EntityData>) =>
    apply((tx) => tx.setModelData(model.id, { ...p, ...(d.mappedFrom ? { manuallyEdited: true } : {}) }));
  return (
    <div className="pgroup">
      <div className="row2">
        <div>
          <span className="lbl">Tên logic</span>
          <Cell
            label="Tên logic"
            value={d.logicalName}
            readOnly={readOnly}
            onCommit={(logicalName) => set({ logicalName })}
          />
        </div>
        <div>
          <span className="lbl">Schema</span>
          <Cell
            label="Schema"
            placeholder="public / dbo"
            value={d.schema}
            readOnly={readOnly}
            onCommit={(schema) => set({ schema: schema.trim() })}
          />
        </div>
      </div>
      <div>
        <span className="lbl">Chú thích bảng</span>
        <Cell label="Chú thích bảng" value={d.comment} readOnly={readOnly} onCommit={(comment) => set({ comment })} />
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'cols', label: `Cột (${d.columns.length})` },
          { value: 'cons', label: 'Index & ràng buộc' },
        ]}
      />
      {tab === 'cols' ? (
        <ColumnsTab cols={d.columns} write={write} readOnly={readOnly} dialect={dialect} />
      ) : (
        <ConstraintsTab name={model.name} d={d} set={set} readOnly={readOnly} />
      )}
    </div>
  );
}

/** Inspector của View / Result set: định nghĩa SQL (view) + chú thích. */
export function ViewInspector({ model, apply, readOnly, view }: ShapeInspectorProps) {
  const [def, setDef] = useState(String(model?.data.definition ?? ''));
  useEffect(() => setDef(String(model?.data.definition ?? '')), [model?.data.definition]);
  if (!model || view.shape !== 'erd.view') return null;
  return (
    <div className="pgroup">
      <span className="lbl">Định nghĩa (SELECT …)</span>
      <textarea
        className="field"
        rows={5}
        aria-label="Định nghĩa view"
        spellCheck={false}
        style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}
        value={def}
        readOnly={readOnly}
        onChange={(e) => setDef(e.target.value)}
        onBlur={() => def !== model.data.definition && apply((tx) => tx.setModelData(model.id, { definition: def }))}
      />
      <p className="text-[11.5px] text-muted">Cột của view nhập bằng sửa chữ trên hình (Alt+Shift+C).</p>
    </div>
  );
}
