// Lifeline Sequence (docs/spec/notation-sequence.md mục 2): Lifeline (hộp `name : Type`), Boundary, Control, Entity,
// Actor — đường nét đứt dọc, activation bar tự tính (state.seqResult), ✕ khi bị Destroy.
import { z } from 'zod';
import { Checkbox, Select } from '@/ui';
import { registerShape, type RenderCtx, type ShapeDef, type ShapeInspectorProps, type Tx } from '../engine/registry';
import { Label, fitText, textW } from '../engine/text';
import { INK, dashArray } from '../shapes/common/helpers';
import { headH, lifelineCx, seqResult } from './state';

type P = Record<string, unknown>;
const str = (v: unknown, d = '') => (v === undefined || v === null || v === '' ? d : String(v));
const FS = 12.5;
/** Kiểu được gán (baseClassifier) có thể là class / interface / actor… trong project. */
const CLASSIFIERS = new Set(['uml.class', 'uml.interface', 'uml.signal', 'uml.datatype', 'uml.component']);

/** Chữ hiển thị: `name : Type`, `: Type` (ẩn danh) hoặc `name`. */
export function lifelineText(ctx: Pick<RenderCtx, 'model' | 'lookup'>): string {
  const name = ctx.model?.name ?? '';
  const base = str(ctx.model?.data.baseClassifier);
  const type = base ? (ctx.lookup.model(base)?.name ?? '') : '';
  return type ? `${name} : ${type}`.trim() : name;
}

/** Đường nét đứt, activation bar, ✕. */
function Line({ ctx, from }: { ctx: RenderCtx; from: number }) {
  const v = ctx.view;
  const cx = lifelineCx(v);
  const res = seqResult(ctx.lookup);
  const acts = res.activations.filter((a) => a.lifelineId === v.id);
  const dead = res.destroyed.has(v.id) || (ctx.props as P).destroyed === true;
  const bottom = v.y + v.h - (dead ? 12 : 0);
  return (
    <>
      {/* vùng bấm rộng dọc lifeline */}
      {!ctx.forExport && <path d={`M${cx},${from} V${v.y + v.h}`} stroke="transparent" strokeWidth={14} />}
      <path
        d={`M${cx},${from} V${bottom}`}
        stroke={ctx.style.stroke || INK}
        strokeWidth={1}
        strokeDasharray={dashArray(1.2)}
      />
      {acts
        .sort((a, b) => a.depth - b.depth)
        .map((a) => (
          <rect
            key={a.msgId}
            x={cx - 6 + a.depth * 6}
            y={a.y1}
            width={12}
            height={Math.max(4, a.y2 - a.y1)}
            fill="#FFFFFF"
            stroke={ctx.style.stroke || INK}
            strokeWidth={1}
          />
        ))}
      {dead && (
        <path
          d={`M${cx - 9},${bottom - 9} L${cx + 9},${bottom + 9} M${cx + 9},${bottom - 9} L${cx - 9},${bottom + 9}`}
          stroke={ctx.style.stroke || INK}
          strokeWidth={2}
        />
      )}
    </>
  );
}

function Icon({ kind, cx, cy, ctx }: { kind: string; cx: number; cy: number; ctx: RenderCtx }) {
  const s = { fill: ctx.style.fill || '#FFFFFF', stroke: ctx.style.stroke || INK, strokeWidth: 1.3 };
  const r = 14;
  if (kind === 'boundary')
    return (
      <>
        <circle cx={cx + 5} cy={cy} r={r} {...s} />
        <path
          d={`M${cx - r - 6},${cy - r} V${cy + r} M${cx - r - 6},${cy} H${cx + 5 - r}`}
          fill="none"
          stroke={s.stroke}
          strokeWidth={1.3}
        />
      </>
    );
  if (kind === 'control')
    return (
      <>
        <circle cx={cx} cy={cy + 2} r={r} {...s} />
        <path
          d={`M${cx + 3},${cy + 2 - r - 5} L${cx - 3},${cy + 2 - r} L${cx + 3},${cy + 2 - r + 5}`}
          fill="none"
          stroke={s.stroke}
          strokeWidth={1.3}
        />
      </>
    );
  if (kind === 'entity')
    return (
      <>
        <circle cx={cx} cy={cy - 2} r={r} {...s} />
        <path d={`M${cx - r},${cy + r + 1} H${cx + r}`} stroke={s.stroke} strokeWidth={1.3} />
      </>
    );
  // actor: hình người que
  const h = 32;
  const y = cy - h / 2;
  return (
    <>
      <circle cx={cx} cy={y + 5} r={5} {...s} />
      <path
        d={`M${cx},${y + 10} V${y + 21} M${cx - 9},${y + 14} H${cx + 9} M${cx},${y + 21} L${cx - 7},${y + h} M${cx},${y + 21} L${cx + 7},${y + h}`}
        fill="none"
        stroke={s.stroke}
        strokeWidth={1.3}
        strokeLinecap="round"
      />
    </>
  );
}

function LifelineInspector({ view, model, apply, lookup, readOnly }: ShapeInspectorProps) {
  if (!model || model.kind !== 'uml.lifeline') return null;
  const options = [
    { value: '', label: '(không gán class)' },
    ...lookup
      .allModel()
      .filter((m) => CLASSIFIERS.has(m.kind))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((m) => ({ value: m.id, label: m.name })),
  ];
  return (
    <div className="pgroup grid gap-2">
      <label className="grid gap-1">
        <span className="lbl">Class (baseClassifier)</span>
        <Select
          aria-label="Class của lifeline"
          value={str(model.data.baseClassifier)}
          disabled={readOnly}
          options={options}
          onChange={(e) => apply((tx) => tx.setModelData(model.id, { baseClassifier: e.target.value }))}
        />
      </label>
      <Checkbox
        label="Đánh dấu huỷ (✕ cuối lifeline)"
        checked={view.props.destroyed === true}
        onChange={(v) => apply((tx) => tx.setViewProps(view.id, { destroyed: v }))}
      />
    </div>
  );
}

interface Def {
  type: string;
  label: string;
  icon: string;
  kind: 'lifeline' | 'boundary' | 'control' | 'entity' | 'actor';
}

const DEFS: Def[] = [
  { type: 'seq.lifeline', label: 'Lifeline', icon: 'lifeline', kind: 'lifeline' },
  { type: 'seq.boundary', label: 'Boundary Lifeline', icon: 'boundary', kind: 'boundary' },
  { type: 'seq.control', label: 'Control Lifeline', icon: 'control', kind: 'control' },
  { type: 'seq.entity', label: 'Entity Lifeline', icon: 'entity-lifeline', kind: 'entity' },
  { type: 'seq.actor', label: 'Actor', icon: 'actor', kind: 'actor' },
];

for (const d of DEFS) {
  const box = d.kind === 'lifeline';
  const def: ShapeDef = {
    type: d.type,
    label: d.label,
    icon: d.icon,
    modelKind: d.kind === 'actor' ? 'uml.actor' : 'uml.lifeline',
    defaultModel: () =>
      d.kind === 'actor'
        ? { name: 'Actor', data: { description: '', isBusiness: false, type: 'user' } }
        : {
            name: box ? 'lifeline' : d.label.replace(' Lifeline', ''),
            data: { baseClassifier: '', stereotype: box ? '' : d.kind },
          },
    defaultSize: { w: box ? 110 : 90, h: 110 },
    minSize: { w: 60, h: 70 },
    resizable: 'horizontal',
    moveAxis: 'x',
    noPorts: true,
    outline: 'none',
    defaultStyle: { fill: box ? '#FFFFFF' : '#E7EEFD', stroke: INK, strokeWidth: 1.3 },
    styleFields: ['fill', 'stroke'],
    propsSchema: box ? z.object({ underline: z.boolean().describe('Gạch chân tên (instance)') }) : undefined,
    hitTest: (v, x, y) =>
      (y >= v.y && y <= v.y + headH(v) && x >= v.x && x <= v.x + v.w) ||
      (Math.abs(x - lifelineCx(v)) <= 9 && y >= v.y && y <= v.y + v.h),
    render: (ctx) => {
      const v = ctx.view;
      const cx = lifelineCx(v);
      const text = lifelineText(ctx);
      const st = str(ctx.model?.data.stereotype);
      const editing = ctx.editing === 'name';
      if (box) {
        const hh = headH(v);
        return (
          <>
            <Line ctx={ctx} from={v.y + hh} />
            <rect
              x={v.x}
              y={v.y}
              width={v.w}
              height={hh}
              rx={2}
              fill={ctx.style.fill}
              stroke={ctx.style.stroke}
              strokeWidth={ctx.style.strokeWidth}
            />
            {st && <Label x={cx} y={v.y + 10} text={`«${st}»`} size={10.5} color="#475569" />}
            {!editing && (
              <Label
                x={cx}
                y={v.y + (st ? 26 : hh / 2)}
                text={fitText(text, FS, 600, v.w - 10)}
                size={FS}
                weight={600}
                underline={(ctx.props as P).underline === true}
              />
            )}
          </>
        );
      }
      return (
        <>
          <Line ctx={ctx} from={v.y + headH(v)} />
          {!ctx.forExport && <rect x={v.x} y={v.y} width={v.w} height={headH(v)} fill="transparent" />}
          <Icon kind={d.kind} cx={cx} cy={v.y + 18} ctx={ctx} />
          {!editing && <Label x={cx} y={v.y + 48} text={fitText(text, FS, 600, v.w + 30)} size={FS} weight={600} />}
        </>
      );
    },
    textRegions: (ctx) => [
      {
        key: 'name',
        box: box
          ? { x: ctx.view.x + 4, y: ctx.view.y + 8, w: ctx.view.w - 8, h: 26 }
          : { x: ctx.view.x - 10, y: ctx.view.y + 38, w: ctx.view.w + 20, h: 22 },
        value: ctx.model?.name ?? '',
        align: 'center',
        fontSize: FS,
        fontWeight: 600,
        commit: (tx: Tx, value: string) => {
          if (!ctx.model) return;
          // "ten : Class" → tên + gán class trùng tên trong project
          const m = /^(.*?)\s*:\s*(.+)$/.exec(value.trim());
          if (m && d.kind !== 'actor') {
            const cls = ctx.lookup.allModel().find((x) => CLASSIFIERS.has(x.kind) && x.name === m[2].trim());
            tx.setModel(ctx.model.id, { name: m[1].trim() });
            if (cls) tx.setModelData(ctx.model.id, { baseClassifier: cls.id });
          } else tx.setModel(ctx.model.id, { name: value.trim() });
        },
      },
    ],
    measure: (ctx) => {
      const w = textW(lifelineText(ctx), FS, 600) + (box ? 24 : 0);
      return { w: Math.max(box ? 90 : 70, Math.round(w)) };
    },
    inspector: LifelineInspector,
    contextMenu: (v, api) => [
      {
        label: v.props.destroyed === true ? 'Bỏ đánh dấu huỷ (✕)' : 'Đánh dấu huỷ (✕ cuối lifeline)',
        onSelect: () => api.apply((tx) => tx.setViewProps(v.id, { destroyed: v.props.destroyed !== true })),
      },
    ],
    name: (ctx) => lifelineText(ctx),
  };
  registerShape(def);
}
