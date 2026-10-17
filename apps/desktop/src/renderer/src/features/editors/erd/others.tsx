// Stored Procedures, Triggers, Sequence (docs/spec/notation-erd.md mục 1 "Các hình khác").
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import {
  ERD_KINDS,
  sequenceData,
  uid,
  type ModelElement,
  type Procedure,
  type ProcParam,
  type Trigger,
} from '@umlab/core';
import { IconButton } from '@/ui';
import {
  registerShape,
  type RenderCtx,
  type ShapeDef,
  type ShapeInspectorProps,
  type TextRegion,
} from '../engine/registry';
import { Label, fitText, textW } from '../engine/text';
import { strokeProps } from '../shapes/common/helpers';

const FS = 12;
const LH = 19;
const PAD = 6;
const NAME_FS = 13;
const ST_FS = 10.5;

const procs = (m: ModelElement | null | undefined): Procedure[] =>
  Array.isArray(m?.data.procedures) ? (m!.data.procedures as Procedure[]) : [];
const trigs = (m: ModelElement | null | undefined): Trigger[] =>
  Array.isArray(m?.data.triggers) ? (m!.data.triggers as Trigger[]) : [];

// ---------------- dòng văn bản ↔ thủ tục / trigger ----------------

export const formatProc = (p: Procedure) =>
  `${p.name}(${p.params.map((x) => `${x.name} ${x.mode} ${x.type}`).join(', ')})${p.returns ? ' : ' + p.returns : ''}`;

/** `tinh_phi(p_phien IN bigint, p_tong OUT numeric) : numeric` */
export function parseProc(line: string, prev?: Procedure): Procedure | null {
  const m = line.trim().match(/^([\w$]+)\s*(?:\((.*)\))?\s*(?::\s*(.+))?$/);
  if (!m) return null;
  const params: ProcParam[] = (m[2] ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const t = s.split(/\s+/);
      let mode: ProcParam['mode'] = 'IN';
      const mi = t.findIndex((x) => /^(in|out|inout)$/i.test(x));
      if (mi >= 0) mode = t.splice(mi, 1)[0].toUpperCase() as ProcParam['mode'];
      return { name: t[0] ?? 'p', type: t.slice(1).join(' ') || 'int', mode };
    });
  return {
    id: prev?.id ?? uid('pr'),
    body: prev?.body ?? '',
    name: m[1],
    params,
    ...(m[3] ? { returns: m[3].trim() } : {}),
  };
}

export const formatTrigger = (t: Trigger, table: string) =>
  `${t.name} ${t.timing} ${t.events.join(' OR ')} ON ${table}${t.forEach === 'STATEMENT' ? ' FOR EACH STATEMENT' : ''}`;

/** `kiem_tra_so_du BEFORE INSERT OR UPDATE ON giao_dich` */
export function parseTrigger(line: string, tables: Map<string, string>, prev?: Trigger): Trigger | null {
  const m = line
    .trim()
    .match(
      /^([\w$]+)\s+(BEFORE|AFTER|INSTEAD\s+OF)\s+(.+?)\s+ON\s+([\w$."`[\]]+)(?:\s+FOR\s+EACH\s+(ROW|STATEMENT))?$/i,
    );
  if (!m) {
    const name = line.trim().split(/\s+/)[0];
    return name ? { ...(prev ?? emptyTrigger()), name } : null;
  }
  const events = m[3]
    .split(/\s+OR\s+|\s*,\s*/i)
    .map((e) => e.trim().toUpperCase())
    .filter((e): e is Trigger['events'][number] => ['INSERT', 'UPDATE', 'DELETE'].includes(e));
  const table = m[4].replace(/["`[\]]/g, '').toLowerCase();
  return {
    id: prev?.id ?? uid('tg'),
    body: prev?.body ?? '',
    name: m[1],
    timing: m[2].toUpperCase().replace(/\s+/g, ' ') as Trigger['timing'],
    events: events.length ? events : ['INSERT'],
    entityId: tables.get(table) ?? prev?.entityId ?? '',
    forEach: (m[5]?.toUpperCase() as Trigger['forEach']) ?? 'ROW',
  };
}

const emptyTrigger = (): Trigger => ({
  id: uid('tg'),
  name: 'trigger_moi',
  timing: 'AFTER',
  events: ['INSERT'],
  entityId: '',
  forEach: 'ROW',
  body: '',
});

const tableNames = (ctx: Pick<RenderCtx, 'lookup'>) =>
  new Map(
    ctx.lookup
      .allModel()
      .filter((m) => m.kind === ERD_KINDS.entity)
      .map((m) => [m.name.toLowerCase(), m.id]),
  );

// ---------------- hình danh sách (procedures / triggers) ----------------

function listLayout(ctx: RenderCtx, stereo: string, lines: string[]) {
  const name = ctx.model?.name ?? '';
  const headerH = PAD * 2 + ST_FS * 1.35 + (name ? NAME_FS * 1.3 : 0);
  const totalH = headerH + PAD + Math.max(1, lines.length) * LH + 2;
  const needW = Math.max(
    150,
    textW(stereo, ST_FS, 400) + 24,
    textW(name, NAME_FS, 700) + 24,
    ...lines.map((l) => textW(l, FS, 400) + PAD * 2 + 8),
  );
  return { name, headerH, totalH, needW };
}

function renderList(ctx: RenderCtx, stereo: string, lines: string[], header: string) {
  const v = ctx.view;
  const sp = strokeProps(ctx);
  const L = listLayout(ctx, stereo, lines);
  const out = [
    <rect key="b" x={v.x} y={v.y} width={v.w} height={v.h} {...sp} rx={3} />,
    <rect
      key="h"
      x={v.x}
      y={v.y}
      width={v.w}
      height={L.headerH}
      fill={header}
      stroke={sp.stroke}
      strokeWidth={sp.strokeWidth}
      rx={3}
    />,
    <Label key="st" x={v.x + v.w / 2} y={v.y + PAD + ST_FS * 0.65} text={stereo} size={ST_FS} color="#475569" />,
  ];
  if (L.name && ctx.editing !== 'name')
    out.push(
      <Label
        key="n"
        x={v.x + v.w / 2}
        y={v.y + PAD + ST_FS * 1.35 + NAME_FS * 0.65}
        text={fitText(L.name, NAME_FS, 700, v.w - 10)}
        size={NAME_FS}
        weight={700}
      />,
    );
  if (ctx.editing !== 'items')
    lines.forEach((l, i) =>
      out.push(
        <Label
          key={'l' + i}
          x={v.x + PAD + 2}
          y={v.y + L.headerH + PAD + i * LH + LH / 2 - 2}
          text={fitText(l, FS, 400, v.w - PAD * 2 - 4)}
          size={FS}
          anchor="start"
        />,
      ),
    );
  return <>{out}</>;
}

function listRegions(
  ctx: RenderCtx,
  stereo: string,
  lines: string[],
  placeholder: string,
  commit: TextRegion['commit'],
): TextRegion[] {
  const v = ctx.view;
  const L = listLayout(ctx, stereo, lines);
  const m = ctx.model;
  return [
    {
      key: 'name',
      box: { x: v.x + 4, y: v.y + PAD + ST_FS * 1.35 - 2, w: v.w - 8, h: NAME_FS * 1.3 + 4 },
      value: L.name,
      align: 'center',
      fontSize: NAME_FS,
      fontWeight: 700,
      commit: (tx, value) => m && tx.setModel(m.id, { name: value.trim() }),
    },
    {
      key: 'items',
      box: { x: v.x + 2, y: v.y + L.headerH + 2, w: v.w - 4, h: Math.max(LH, v.h - L.headerH - 4) },
      list: true,
      align: 'left',
      fontSize: FS,
      placeholder,
      value: lines.join('\n'),
      commit,
    },
  ];
}

function BodyEditor({
  value,
  onCommit,
  readOnly,
  label,
}: {
  value: string;
  onCommit: (v: string) => void;
  readOnly: boolean;
  label: string;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <textarea
      className="field mono"
      rows={4}
      aria-label={label}
      value={v}
      readOnly={readOnly}
      spellCheck={false}
      style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onCommit(v)}
    />
  );
}

function ProceduresInspector({ model, apply, readOnly }: ShapeInspectorProps) {
  if (!model) return null;
  const list = procs(model);
  const set = (next: Procedure[]) => apply((tx) => tx.setModelData(model.id, { procedures: next }));
  return (
    <div className="pgroup">
      <div className="flex items-center justify-between">
        <div className="pgroup-h">Thủ tục ({list.length})</div>
        <IconButton
          label="Thêm thủ tục"
          disabled={readOnly}
          onClick={() => set([...list, parseProc(`thu_tuc_${list.length + 1}()`)!])}
        >
          <Plus />
        </IconButton>
      </div>
      {list.map((p, i) => (
        <div
          key={p.id}
          className="grid gap-1.5 rounded-md border border-line p-2"
          style={{ background: 'var(--panel-2)' }}
        >
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate text-[11.5px]">{formatProc(p)}</code>
            <IconButton label="Xoá thủ tục" disabled={readOnly} onClick={() => set(list.filter((_, k) => k !== i))}>
              <Trash2 />
            </IconButton>
          </div>
          <span className="lbl">Thân thủ tục (SQL, giữ nguyên khi xuất DDL)</span>
          <BodyEditor
            label={`Thân ${p.name}`}
            value={p.body}
            readOnly={readOnly}
            onCommit={(body) => set(list.map((x, k) => (k === i ? { ...x, body } : x)))}
          />
        </div>
      ))}
      <p className="text-[11.5px] text-muted">Sửa chữ trên hình: mỗi dòng `ten(p IN int, q OUT text) : kieu_tra_ve`.</p>
    </div>
  );
}

function TriggersInspector({ model, apply, readOnly, lookup }: ShapeInspectorProps) {
  if (!model) return null;
  const list = trigs(model);
  const set = (next: Trigger[]) => apply((tx) => tx.setModelData(model.id, { triggers: next }));
  const tables = lookup.allModel().filter((m) => m.kind === ERD_KINDS.entity);
  return (
    <div className="pgroup">
      <div className="flex items-center justify-between">
        <div className="pgroup-h">Trigger ({list.length})</div>
        <IconButton
          label="Thêm trigger"
          disabled={readOnly}
          onClick={() => set([...list, { ...emptyTrigger(), entityId: tables[0]?.id ?? '' }])}
        >
          <Plus />
        </IconButton>
      </div>
      {list.map((t, i) => (
        <div
          key={t.id}
          className="grid gap-1.5 rounded-md border border-line p-2"
          style={{ background: 'var(--panel-2)' }}
        >
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate text-[11.5px]">
              {formatTrigger(t, tables.find((x) => x.id === t.entityId)?.name ?? '?')}
            </code>
            <IconButton label="Xoá trigger" disabled={readOnly} onClick={() => set(list.filter((_, k) => k !== i))}>
              <Trash2 />
            </IconButton>
          </div>
          <span className="lbl">Thân trigger (SQL)</span>
          <BodyEditor
            label={`Thân ${t.name}`}
            value={t.body}
            readOnly={readOnly}
            onCommit={(body) => set(list.map((x, k) => (k === i ? { ...x, body } : x)))}
          />
        </div>
      ))}
      <p className="text-[11.5px] text-muted">Sửa chữ trên hình: mỗi dòng `ten BEFORE INSERT OR UPDATE ON bang`.</p>
    </div>
  );
}

const listBase = (o: Pick<ShapeDef, 'type' | 'label' | 'icon' | 'modelKind'>): Omit<ShapeDef, 'render'> => ({
  ...o,
  defaultSize: { w: 220, h: 70 },
  minSize: { w: 120, h: 40 },
  defaultProps: () => ({ autoSize: true }),
  defaultStyle: { fill: '#FFFFFF', stroke: '#1F2937', strokeWidth: 1.2 },
  propsSchema: z.object({ autoSize: z.boolean().describe('Tự giãn theo nội dung') }),
  styleFields: ['fill', 'stroke', 'strokeWidth'],
});

registerShape({
  ...listBase({
    type: 'erd.procedures',
    label: 'Stored Procedures',
    icon: 'stored-procedures',
    modelKind: ERD_KINDS.procedures,
  }),
  defaultModel: () => ({ name: '', data: { procedures: [] } }),
  render: (ctx) => renderList(ctx, '«stored procedures»', procs(ctx.model).map(formatProc), '#F1F5F9'),
  textRegions: (ctx) =>
    listRegions(ctx, '«stored procedures»', procs(ctx.model).map(formatProc), 'ten(p IN int) : int', (tx, value) => {
      const m = ctx.model;
      if (!m) return;
      const old = procs(tx.model(m.id));
      const next = value
        .split('\n')
        .map((l, i) => parseProc(l, old.find((p) => p.name === l.trim().split('(')[0].trim()) ?? old[i]))
        .filter((p): p is Procedure => !!p);
      tx.setModelData(m.id, { procedures: next });
    }),
  measure: (ctx) => {
    if (ctx.props.autoSize === false) return null;
    const L = listLayout(ctx, '«stored procedures»', procs(ctx.model).map(formatProc));
    return { w: Math.round(L.needW), h: Math.round(L.totalH) };
  },
  inspector: ProceduresInspector,
});

registerShape({
  ...listBase({ type: 'erd.triggers', label: 'Triggers', icon: 'triggers', modelKind: ERD_KINDS.triggers }),
  defaultModel: () => ({ name: '', data: { triggers: [] } }),
  live: true,
  render: (ctx) => {
    const names = new Map([...tableNames(ctx)].map(([n, id]) => [id, n]));
    return renderList(
      ctx,
      '«triggers»',
      trigs(ctx.model).map((t) => formatTrigger(t, names.get(t.entityId) ?? '?')),
      '#FEF6E0',
    );
  },
  textRegions: (ctx) => {
    const tables = tableNames(ctx);
    const names = new Map([...tables].map(([n, id]) => [id, n]));
    return listRegions(
      ctx,
      '«triggers»',
      trigs(ctx.model).map((t) => formatTrigger(t, names.get(t.entityId) ?? '?')),
      'ten AFTER INSERT ON bang',
      (tx, value) => {
        const m = ctx.model;
        if (!m) return;
        const old = trigs(tx.model(m.id));
        const next = value
          .split('\n')
          .map((l, i) => parseTrigger(l, tables, old.find((t) => t.name === l.trim().split(/\s+/)[0]) ?? old[i]))
          .filter((t): t is Trigger => !!t);
        tx.setModelData(m.id, { triggers: next });
      },
    );
  },
  measure: (ctx) => {
    if (ctx.props.autoSize === false) return null;
    const names = new Map([...tableNames(ctx)].map(([n, id]) => [id, n]));
    const L = listLayout(
      ctx,
      '«triggers»',
      trigs(ctx.model).map((t) => formatTrigger(t, names.get(t.entityId) ?? '?')),
    );
    return { w: Math.round(L.needW), h: Math.round(L.totalH) };
  },
  inspector: TriggersInspector,
});

// ---------------- Sequence ----------------

registerShape<Record<string, unknown>>({
  type: 'erd.sequence',
  label: 'Sequence',
  icon: 'sequence',
  modelKind: ERD_KINDS.sequence,
  defaultModel: () => ({ name: 'seq_moi', data: { start: 1, increment: 1, min: '', max: '', cycle: false } }),
  defaultSize: { w: 150, h: 54 },
  minSize: { w: 90, h: 40 },
  defaultStyle: { fill: '#E7EEFD', stroke: '#1F2937', strokeWidth: 1.2 },
  styleFields: ['fill', 'stroke', 'strokeWidth'],
  modelSchema: z.object({
    start: z.number().describe('Bắt đầu (START WITH)'),
    increment: z.number().describe('Bước (INCREMENT BY)'),
    min: z.string().describe('MINVALUE (để trống = mặc định)'),
    max: z.string().describe('MAXVALUE (để trống = mặc định)'),
    cycle: z.boolean().describe('CYCLE'),
  }),
  render: (ctx) => {
    const v = ctx.view;
    const s = sequenceData(ctx.model);
    const sp = strokeProps(ctx);
    return (
      <>
        <rect x={v.x} y={v.y} width={v.w} height={v.h} {...sp} rx={6} />
        <Label x={v.x + v.w / 2} y={v.y + 13} text="«sequence»" size={ST_FS} color="#475569" />
        {ctx.editing !== 'name' && (
          <Label
            x={v.x + v.w / 2}
            y={v.y + 29}
            text={fitText(ctx.model?.name ?? '', NAME_FS, 700, v.w - 10)}
            size={NAME_FS}
            weight={700}
          />
        )}
        <Label
          x={v.x + v.w / 2}
          y={v.y + 44}
          text={`${s.start}, +${s.increment}${s.cycle ? ', cycle' : ''}`}
          size={10.5}
          color="#64748B"
        />
      </>
    );
  },
  textRegions: (ctx) => [
    {
      key: 'name',
      box: { x: ctx.view.x + 4, y: ctx.view.y + 20, w: ctx.view.w - 8, h: 18 },
      value: ctx.model?.name ?? '',
      align: 'center',
      fontSize: NAME_FS,
      fontWeight: 700,
      commit: (tx, value) => ctx.model && tx.setModel(ctx.model.id, { name: value.trim() || 'seq_moi' }),
    },
  ],
});
