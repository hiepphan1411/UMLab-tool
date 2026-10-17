// Inspector tự động từ zod schema (docs/phases/P04 mục 4.3):
// string → Input, enum → Segmented/Select, boolean → Checkbox, number → ô số, màu → ô màu, mảng → danh sách thêm/xoá/kéo.
// Nhãn & kiểu hiển thị lấy từ .describe('Nhãn|textarea') — hậu tố: textarea, color, hidden, readonly, select, wide.
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { z, type ZodTypeAny } from 'zod';
import { Checkbox, ColorField, NumberField, Segmented, Select } from '@/ui';

export interface FieldMeta {
  label: string;
  flags: Set<string>;
}

export function metaOf(s: ZodTypeAny, key: string): FieldMeta {
  const d = s.description ?? unwrap(s).description ?? '';
  const [label, ...flags] = d.split('|');
  return { label: label || key, flags: new Set(flags) };
}

/** Bỏ lớp optional/default/nullable/effects để lấy kiểu lõi. */
export function unwrap(s: ZodTypeAny): ZodTypeAny {
  let cur: ZodTypeAny = s;
  for (let i = 0; i < 8; i++) {
    if (cur instanceof z.ZodOptional || cur instanceof z.ZodNullable) cur = cur.unwrap();
    else if (cur instanceof z.ZodDefault) cur = cur._def.innerType;
    else if (cur instanceof z.ZodEffects) cur = cur._def.schema;
    else break;
  }
  return cur;
}

export function defaultOf(s: ZodTypeAny): unknown {
  if (s instanceof z.ZodDefault) return s._def.defaultValue();
  const u = unwrap(s);
  if (u instanceof z.ZodString) return '';
  if (u instanceof z.ZodNumber) return 0;
  if (u instanceof z.ZodBoolean) return false;
  if (u instanceof z.ZodEnum) return u.options[0];
  if (u instanceof z.ZodArray) return [];
  if (u instanceof z.ZodObject)
    return Object.fromEntries(Object.entries(u.shape as Record<string, ZodTypeAny>).map(([k, v]) => [k, defaultOf(v)]));
  return null;
}

function TextInput({
  value,
  onCommit,
  multiline,
  readOnly,
  placeholder,
}: {
  value: string;
  onCommit: (v: string) => void;
  multiline?: boolean;
  readOnly?: boolean;
  placeholder?: string;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const commit = () => v !== value && onCommit(v);
  return multiline ? (
    <textarea
      className="field"
      rows={3}
      value={v}
      readOnly={readOnly}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
    />
  ) : (
    <input
      className="field"
      value={v}
      readOnly={readOnly}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

export function FieldControl({
  schema,
  value,
  onChange,
  readOnly,
  name,
}: {
  schema: ZodTypeAny;
  value: unknown;
  onChange: (v: unknown) => void;
  readOnly?: boolean;
  name: string;
}) {
  const u = unwrap(schema);
  const meta = metaOf(schema, name);
  const ro = readOnly || meta.flags.has('readonly');
  if (u instanceof z.ZodString) {
    if (meta.flags.has('color'))
      return (
        <ColorField value={String(value ?? '')} onChange={(v) => !ro && onChange(v)} ariaLabel={meta.label} allowNone />
      );
    return (
      <TextInput
        value={String(value ?? '')}
        onCommit={(v) => onChange(v)}
        multiline={meta.flags.has('textarea')}
        readOnly={ro}
      />
    );
  }
  if (u instanceof z.ZodNumber)
    return (
      <NumberField
        value={Number(value ?? 0)}
        onChange={(v) => !ro && onChange(v)}
        ariaLabel={meta.label}
        step={meta.flags.has('step01') ? 0.1 : 1}
      />
    );
  if (u instanceof z.ZodBoolean)
    return <Checkbox label={meta.label} checked={!!value} onChange={(v) => !ro && onChange(v)} disabled={ro} />;
  if (u instanceof z.ZodEnum) {
    const named = new Map<string, string>();
    for (const f of meta.flags)
      if (f.startsWith('opts:'))
        for (const pair of f.slice(5).split(';')) {
          const [k, ...rest] = pair.split('=');
          named.set(k, rest.join('='));
        }
    const opts = (u.options as string[]).map((o) => ({ value: o, label: named.get(o) ?? (o || '(không)') }));
    if (opts.length <= 4 && !meta.flags.has('select') && opts.every((o) => o.label.length < 14))
      return (
        <Segmented
          value={String(value ?? opts[0].value)}
          onChange={(v) => !ro && onChange(v)}
          options={opts}
          ariaLabel={meta.label}
        />
      );
    return (
      <Select
        value={String(value ?? '')}
        onChange={(e) => !ro && onChange(e.target.value)}
        options={opts}
        disabled={ro}
      />
    );
  }
  if (u instanceof z.ZodArray)
    return <ArrayControl schema={u} value={Array.isArray(value) ? value : []} onChange={onChange} readOnly={ro} />;
  if (u instanceof z.ZodObject)
    return (
      <ZodForm
        schema={u}
        value={(value ?? {}) as Record<string, unknown>}
        onChange={(v) => onChange(v)}
        readOnly={ro}
        compact
      />
    );
  return <span className="text-muted">—</span>;
}

function ArrayControl({
  schema,
  value,
  onChange,
  readOnly,
}: {
  schema: z.ZodArray<ZodTypeAny>;
  value: unknown[];
  onChange: (v: unknown[]) => void;
  readOnly?: boolean;
}) {
  const item = schema.element;
  const isObj = unwrap(item) instanceof z.ZodObject;
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const n = [...value];
    [n[i], n[j]] = [n[j], n[i]];
    onChange(n);
  };
  return (
    <div className="grid gap-1.5">
      {value.map((v, i) => (
        <div
          key={i}
          className={isObj ? 'rounded-md border border-line p-2' : 'flex items-center gap-1'}
          style={isObj ? { background: 'var(--panel-2)' } : undefined}
        >
          <div className={isObj ? '' : 'min-w-0 flex-1'}>
            <FieldControl
              schema={item}
              value={v}
              name={String(i)}
              readOnly={readOnly}
              onChange={(nv) => onChange(value.map((x, j) => (j === i ? nv : x)))}
            />
          </div>
          {!readOnly && (
            <div className={'flex gap-0.5 ' + (isObj ? 'mt-1.5 justify-end' : '')}>
              <button className="ibtn sm" aria-label="Lên" onClick={() => move(i, -1)}>
                <ArrowUp />
              </button>
              <button className="ibtn sm" aria-label="Xuống" onClick={() => move(i, 1)}>
                <ArrowDown />
              </button>
              <button className="ibtn sm" aria-label="Xoá" onClick={() => onChange(value.filter((_, j) => j !== i))}>
                <X />
              </button>
            </div>
          )}
        </div>
      ))}
      {!readOnly && (
        <button className="btn outline sm justify-self-start" onClick={() => onChange([...value, defaultOf(item)])}>
          <Plus />
          Thêm
        </button>
      )}
    </div>
  );
}

/** Form tự sinh cho một zod object. onChange trả về object mới (chỉ phần đã đổi được ghi). */
export function ZodForm({
  schema,
  value,
  onChange,
  readOnly,
  compact,
}: {
  schema: ZodTypeAny;
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>, key: string) => void;
  readOnly?: boolean;
  compact?: boolean;
}) {
  const obj = unwrap(schema);
  if (!(obj instanceof z.ZodObject)) return null;
  const shape = obj.shape as Record<string, ZodTypeAny>;
  return (
    <div className={compact ? 'grid gap-2' : 'grid gap-2.5'}>
      {Object.entries(shape).map(([k, s]) => {
        const meta = metaOf(s, k);
        if (meta.flags.has('hidden')) return null;
        const u = unwrap(s);
        const control = (
          <FieldControl
            schema={s}
            name={k}
            value={value[k] ?? defaultOf(s)}
            readOnly={readOnly}
            onChange={(v) => onChange({ ...value, [k]: v }, k)}
          />
        );
        if (u instanceof z.ZodBoolean) return <div key={k}>{control}</div>;
        return (
          <div key={k}>
            <span className="lbl">{meta.label}</span>
            {control}
          </div>
        );
      })}
    </div>
  );
}
