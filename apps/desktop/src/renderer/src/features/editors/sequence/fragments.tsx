// Khung & ký hiệu phụ Sequence (docs/spec/notation-sequence.md mục 2): Combined Fragment (12 toán tử, nhiều operand +
// guard, loop(min,max)), Interaction Use `ref`, Frame `sd`, Concurrent (coregion), Continuation, Gate, State Invariant,
// Duration / Time Constraint & Observation.
import { Plus, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { IconButton, Select } from '@/ui';
import { registerShape, type RenderCtx, type ShapeInspectorProps, type Tx } from '../engine/registry';
import { Label, fitText, textW } from '../engine/text';
import { INK, propRegion, strokeProps } from '../shapes/common/helpers';
import { operandsOf, type Operand } from './state';

type P = Record<string, unknown>;
const str = (v: unknown, d = '') => (v === undefined || v === null || v === '' ? d : String(v));
const FS = 12;
const TAG_H = 20;

export const OPERATORS = [
  'alt',
  'opt',
  'loop',
  'par',
  'break',
  'critical',
  'neg',
  'assert',
  'strict',
  'seq',
  'ignore',
  'consider',
] as const;

/** Nhãn ngũ giác góc trên trái. */
function Tag({ x, y, text, bold = true }: { x: number; y: number; text: string; bold?: boolean }) {
  const w = textW(text, FS, bold ? 700 : 400) + 22;
  return (
    <>
      <path
        d={`M${x},${y} H${x + w} V${y + TAG_H - 7} L${x + w - 7},${y + TAG_H} H${x} Z`}
        fill="#F1F5F9"
        stroke={INK}
        strokeWidth={1}
      />
      <Label x={x + 8} y={y + TAG_H / 2} text={text} size={FS} weight={bold ? 700 : 400} anchor="start" />
    </>
  );
}
const tagW = (text: string) => textW(text, FS, 700) + 22;

/** Gần viền / nhãn: chọn được khung mà không chắn lifeline & message bên trong. */
const borderHit =
  (extra?: (v: { x: number; y: number; w: number; h: number; props: P }, x: number, y: number) => boolean) =>
  (v: { x: number; y: number; w: number; h: number; props: P }, x: number, y: number) => {
    const t = 6;
    const inX = x >= v.x - t && x <= v.x + v.w + t;
    const inY = y >= v.y - t && y <= v.y + v.h + t;
    if (!inX || !inY) return false;
    if (
      Math.abs(x - v.x) <= t ||
      Math.abs(x - v.x - v.w) <= t ||
      Math.abs(y - v.y) <= t ||
      Math.abs(y - v.y - v.h) <= t
    )
      return true;
    if (x <= v.x + 120 && y <= v.y + TAG_H) return true;
    return extra ? extra(v, x, y) : false;
  };

const fragLabel = (p: P) => {
  const op = str(p.operator, 'alt');
  if (op === 'loop' && (str(p.min) || str(p.max)))
    return `loop(${str(p.min, '0')}${str(p.max) ? `,${str(p.max)}` : ''})`;
  return op;
};

function FragmentInspector({ view, apply, readOnly }: ShapeInspectorProps) {
  const ops = operandsOf(view.props);
  const set = (next: Operand[]) => apply((tx) => tx.setViewProps(view.id, { operands: next }));
  return (
    <div className="pgroup grid gap-2">
      <span className="lbl">Operand (guard)</span>
      {ops.map((o, i) => (
        <div key={i} className="flex items-center gap-1">
          <input
            className="field"
            aria-label={`Guard operand ${i + 1}`}
            defaultValue={o.guard}
            key={`${view.id}:${i}:${o.guard}`}
            placeholder={i === ops.length - 1 && i > 0 ? 'else' : 'điều kiện'}
            readOnly={readOnly}
            onBlur={(e) =>
              e.target.value !== o.guard && set(ops.map((x, k) => (k === i ? { ...x, guard: e.target.value } : x)))
            }
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
          <IconButton
            label="Xoá operand"
            size="sm"
            disabled={readOnly || ops.length <= 1}
            onClick={() => set(ops.filter((_, k) => k !== i))}
          >
            <Trash2 />
          </IconButton>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-outline btn-sm"
        disabled={readOnly}
        onClick={() =>
          apply((tx) => {
            // thêm operand ở nửa dưới operand cuối; khung giãn thêm nếu chật
            const last = ops[ops.length - 1];
            const room = view.h - last.y;
            const y = room > 80 ? Math.round(last.y + room / 2) : view.h;
            tx.setViewProps(view.id, { operands: [...ops, { guard: 'else', y }] });
            if (y >= view.h) tx.setView(view.id, { h: view.h + 60 });
          })
        }
      >
        <Plus /> Thêm operand
      </button>
    </div>
  );
}

registerShape({
  type: 'seq.fragment',
  label: 'Combined Fragment',
  icon: 'combined-fragment',
  defaultSize: { w: 320, h: 160 },
  minSize: { w: 120, h: 60 },
  noPorts: true,
  outline: 'none',
  defaultProps: () => ({
    operator: 'alt',
    operands: [
      { guard: '', y: 0 },
      { guard: 'else', y: 80 },
    ],
    min: '',
    max: '',
  }),
  defaultStyle: { fill: 'none', stroke: INK, strokeWidth: 1.2 },
  styleFields: ['stroke', 'strokeWidth'],
  propsSchema: z.object({
    operator: z.enum(OPERATORS).describe('Toán tử'),
    min: z.string().describe('loop: min'),
    max: z.string().describe('loop: max'),
  }),
  hitTest: borderHit((v, _x, y) => operandsOf(v.props).some((o, i) => i > 0 && Math.abs(y - v.y - o.y) <= 5)),
  onCreate: (tx, v) => {
    // toán tử khác alt/par: một operand
    const op = str(v.props.operator, 'alt');
    if (op !== 'alt' && op !== 'par') tx.setViewProps(v.id, { operands: [{ guard: '', y: 0 }] });
  },
  render: (ctx) => {
    const v = ctx.view;
    const p = ctx.props as P;
    const ops = operandsOf(p);
    const label = fragLabel(p);
    const tw = tagW(label);
    return (
      <>
        <rect x={v.x} y={v.y} width={v.w} height={v.h} {...strokeProps(ctx)} fill="none" />
        <Tag x={v.x} y={v.y} text={label} />
        {ops.map((o, i) => (
          <g key={i}>
            {i > 0 && (
              <path
                d={`M${v.x},${v.y + o.y} H${v.x + v.w}`}
                stroke={ctx.style.stroke}
                strokeWidth={1}
                strokeDasharray="6 4"
              />
            )}
            {o.guard && ctx.editing !== `g:${i}` && (
              <Label
                x={v.x + (i === 0 ? tw + 8 : 10)}
                y={v.y + o.y + (i === 0 ? TAG_H / 2 : 12)}
                text={fitText(`[${o.guard.replace(/^\[|\]$/g, '')}]`, FS, 500, v.w - (i === 0 ? tw + 16 : 20))}
                size={FS}
                weight={500}
                anchor="start"
              />
            )}
          </g>
        ))}
      </>
    );
  },
  handles: (ctx) =>
    operandsOf(ctx.props as P)
      .slice(1)
      .map((o, i) => ({
        key: `op:${i + 1}`,
        x: ctx.view.x + ctx.view.w / 2,
        y: ctx.view.y + o.y,
        shape: 'square' as const,
        title: 'Kéo vạch ngăn operand',
      })),
  dragHandle: (ctx, key, pt) => {
    const i = Number(key.split(':')[1]);
    const ops = operandsOf(ctx.props as P);
    const lo = (ops[i - 1]?.y ?? 0) + 24;
    const hi = (ops[i + 1]?.y ?? ctx.view.h) - 16;
    const y = Math.round(Math.max(lo, Math.min(hi, pt[1] - ctx.view.y)));
    return { operands: ops.map((o, k) => (k === i ? { ...o, y } : o)) };
  },
  textRegions: (ctx) => {
    const v = ctx.view;
    const ops = operandsOf(ctx.props as P);
    const tw = tagW(fragLabel(ctx.props as P));
    return ops.map((o, i) => ({
      key: `g:${i}`,
      box: { x: v.x + (i === 0 ? tw + 4 : 6), y: v.y + o.y + 2, w: Math.min(260, v.w - tw - 10), h: 20 },
      value: o.guard,
      align: 'left' as const,
      fontSize: FS,
      placeholder: 'điều kiện',
      commit: (tx: Tx, value: string) =>
        tx.setViewProps(v.id, {
          operands: ops.map((x, k) => (k === i ? { ...x, guard: value.replace(/^\[|\]$/g, '') } : x)),
        }),
    }));
  },
  inspector: FragmentInspector,
  name: (ctx) => fragLabel(ctx.props as P),
});

// ---------------- Interaction Use (ref) ----------------

function RefInspector({ view, apply, lookup, readOnly }: ShapeInspectorProps) {
  const options = [
    { value: '', label: '(chưa trỏ tới sơ đồ)' },
    ...lookup
      .diagrams()
      .filter((d) => d.type === 'sequence' && d.id !== lookup.diagramId)
      .map((d) => ({ value: d.id, label: d.name })),
  ];
  return (
    <div className="pgroup grid gap-1">
      <span className="lbl">Tương tác được tham chiếu (nhấp đúp để mở)</span>
      <Select
        aria-label="Sơ đồ được tham chiếu"
        value={str(view.props.refDiagramId)}
        disabled={readOnly}
        options={options}
        onChange={(e) => {
          const d = lookup.diagram(e.target.value);
          apply((tx) =>
            tx.setViewProps(view.id, {
              refDiagramId: e.target.value,
              ...(d && !str(view.props.name) ? { name: d.name } : {}),
            }),
          );
        }}
      />
    </div>
  );
}

const refText = (ctx: RenderCtx) => {
  const p = ctx.props as P;
  const d = str(p.refDiagramId) ? ctx.lookup.diagram(str(p.refDiagramId)) : undefined;
  const name = str(p.name) || d?.name || 'Tương tác';
  const args = str(p.arguments);
  const ret = str(p.returnValue);
  return `${name}${args ? `(${args})` : ''}${ret ? ` : ${ret}` : ''}`;
};

registerShape({
  type: 'seq.ref',
  label: 'Interaction Use',
  icon: 'interaction-use',
  defaultSize: { w: 260, h: 44 },
  minSize: { w: 100, h: 34 },
  noPorts: true,
  live: true,
  defaultProps: () => ({ name: '', refDiagramId: '', arguments: '', returnValue: '' }),
  defaultStyle: { fill: '#FFFFFF', stroke: INK, strokeWidth: 1.2 },
  propsSchema: z.object({
    arguments: z.string().describe('Tham số'),
    returnValue: z.string().describe('Giá trị trả về'),
  }),
  render: (ctx) => {
    const v = ctx.view;
    return (
      <>
        <rect x={v.x} y={v.y} width={v.w} height={v.h} {...strokeProps(ctx)} />
        <Tag x={v.x} y={v.y} text="ref" />
        {ctx.editing !== 'name' && (
          <Label
            x={v.x + v.w / 2}
            y={v.y + v.h / 2 + 4}
            text={fitText(refText(ctx), 12.5, 600, v.w - 60)}
            size={12.5}
            weight={600}
          />
        )}
      </>
    );
  },
  textRegions: (ctx) => [
    propRegion(
      ctx,
      'name',
      { x: ctx.view.x + 40, y: ctx.view.y + 6, w: ctx.view.w - 50, h: ctx.view.h - 8 },
      { multiline: false, fontSize: 12.5, fontWeight: 600 },
    ),
  ],
  onDoubleClick: (v, api) => {
    const id = str(v.props.refDiagramId);
    if (id && api.lookup.diagram(id)) {
      api.open(id);
      return true;
    }
    return false;
  },
  inspector: RefInspector,
  name: (ctx) => `ref ${refText(ctx)}`,
});

// ---------------- Frame (sd) ----------------

registerShape({
  type: 'seq.frame',
  label: 'Frame',
  icon: 'frame',
  defaultSize: { w: 640, h: 420 },
  minSize: { w: 160, h: 80 },
  noPorts: true,
  outline: 'none',
  defaultProps: () => ({ name: 'Tương tác', parameters: '' }),
  defaultStyle: { fill: 'none', stroke: INK, strokeWidth: 1.2 },
  propsSchema: z.object({ parameters: z.string().describe('Tham số') }),
  hitTest: borderHit(),
  render: (ctx) => {
    const v = ctx.view;
    const p = ctx.props as P;
    const text = `sd ${str(p.name)}${str(p.parameters) ? `(${str(p.parameters)})` : ''}`;
    return (
      <>
        <rect x={v.x} y={v.y} width={v.w} height={v.h} {...strokeProps(ctx)} fill="none" />
        {ctx.editing !== 'name' && <Tag x={v.x} y={v.y} text={text} />}
      </>
    );
  },
  textRegions: (ctx) => [
    propRegion(
      ctx,
      'name',
      { x: ctx.view.x + 22, y: ctx.view.y, w: 220, h: TAG_H },
      { multiline: false, align: 'left', fontSize: FS },
    ),
  ],
  name: (ctx) => `sd ${str((ctx.props as P).name)}`,
});

// ---------------- Concurrent (coregion), Continuation, Gate, State Invariant ----------------

registerShape({
  type: 'seq.coregion',
  label: 'Concurrent',
  icon: 'concurrent',
  defaultSize: { w: 28, h: 90 },
  minSize: { w: 16, h: 30 },
  noPorts: true,
  defaultProps: () => ({}),
  defaultStyle: { fill: 'none', stroke: INK, strokeWidth: 1.5 },
  styleFields: ['stroke', 'strokeWidth'],
  render: (ctx) => {
    const v = ctx.view;
    const s = { fill: 'none', stroke: ctx.style.stroke, strokeWidth: ctx.style.strokeWidth };
    return (
      <>
        <rect x={v.x} y={v.y} width={v.w} height={v.h} fill="transparent" />
        <path d={`M${v.x},${v.y + 8} V${v.y} H${v.x + v.w} V${v.y + 8}`} {...s} />
        <path d={`M${v.x},${v.y + v.h - 8} V${v.y + v.h} H${v.x + v.w} V${v.y + v.h - 8}`} {...s} />
      </>
    );
  },
});

registerShape({
  type: 'seq.continuation',
  label: 'Continuation',
  icon: 'continuation',
  defaultSize: { w: 200, h: 30 },
  minSize: { w: 60, h: 22 },
  noPorts: true,
  defaultProps: () => ({ name: 'Tiếp tục' }),
  defaultStyle: { fill: '#FFFFFF', stroke: INK, strokeWidth: 1.2 },
  render: (ctx) => {
    const v = ctx.view;
    return (
      <>
        <rect x={v.x} y={v.y} width={v.w} height={v.h} rx={v.h / 2} {...strokeProps(ctx)} />
        {ctx.editing !== 'name' && (
          <Label
            x={v.x + v.w / 2}
            y={v.y + v.h / 2}
            text={fitText(str((ctx.props as P).name), FS, 500, v.w - 16)}
            size={FS}
            weight={500}
          />
        )}
      </>
    );
  },
  textRegions: (ctx) => [propRegion(ctx, 'name', ctx.view, { multiline: false, fontSize: FS })],
  name: (ctx) => str((ctx.props as P).name),
});

registerShape({
  type: 'seq.gate',
  label: 'Gate',
  icon: 'gate',
  defaultSize: { w: 10, h: 10 },
  minSize: { w: 6, h: 6 },
  resizable: false,
  defaultProps: () => ({ name: '' }),
  defaultStyle: { fill: INK, stroke: INK, strokeWidth: 1 },
  outline: 'ellipse',
  render: (ctx) => {
    const v = ctx.view;
    const n = str((ctx.props as P).name);
    return (
      <>
        <circle cx={v.x + v.w / 2} cy={v.y + v.h / 2} r={v.w / 2} fill={ctx.style.fill} stroke={ctx.style.stroke} />
        {n && ctx.editing !== 'name' && <Label x={v.x + v.w + 4} y={v.y - 6} text={n} size={11} anchor="start" />}
      </>
    );
  },
  textRegions: (ctx) => [
    propRegion(
      ctx,
      'name',
      { x: ctx.view.x + ctx.view.w + 2, y: ctx.view.y - 16, w: 120, h: 18 },
      { multiline: false, align: 'left', fontSize: 11 },
    ),
  ],
  name: (ctx) => `Gate ${str((ctx.props as P).name)}`,
});

registerShape({
  type: 'seq.stateInvariant',
  label: 'State Invariant',
  icon: 'state-invariant',
  defaultSize: { w: 120, h: 30 },
  minSize: { w: 50, h: 22 },
  noPorts: true,
  defaultProps: () => ({ expr: 'trạng thái' }),
  defaultStyle: { fill: '#FFFFFF', stroke: INK, strokeWidth: 1.2 },
  render: (ctx) => {
    const v = ctx.view;
    return (
      <>
        <rect x={v.x} y={v.y} width={v.w} height={v.h} rx={10} {...strokeProps(ctx)} />
        {ctx.editing !== 'expr' && (
          <Label
            x={v.x + v.w / 2}
            y={v.y + v.h / 2}
            text={fitText(`{${str((ctx.props as P).expr)}}`, FS, 400, v.w - 10)}
            size={FS}
          />
        )}
      </>
    );
  },
  textRegions: (ctx) => [propRegion(ctx, 'expr', ctx.view, { multiline: false, fontSize: FS })],
  name: (ctx) => `{${str((ctx.props as P).expr)}}`,
});

// ---------------- Duration / Time Constraint & Observation ----------------

/** Ngoặc dọc mũi tên 2 đầu + nhãn bên phải. */
function Bracket({ ctx, text, arrows }: { ctx: RenderCtx; text: string; arrows: boolean }) {
  const v = ctx.view;
  const x = v.x + 8;
  const s = { stroke: ctx.style.stroke || INK, strokeWidth: 1, fill: 'none' };
  return (
    <>
      <rect x={v.x} y={v.y} width={v.w} height={v.h} fill="transparent" />
      <path d={`M${x - 6},${v.y} H${x + 6} M${x - 6},${v.y + v.h} H${x + 6} M${x},${v.y} V${v.y + v.h}`} {...s} />
      {arrows && (
        <path
          d={`M${x - 4},${v.y + 7} L${x},${v.y} L${x + 4},${v.y + 7} M${x - 4},${v.y + v.h - 7} L${x},${v.y + v.h} L${x + 4},${v.y + v.h - 7}`}
          {...s}
        />
      )}
      {ctx.editing !== 'expr' && <Label x={x + 10} y={v.y + v.h / 2} text={text} size={FS} anchor="start" />}
    </>
  );
}

/** Nhãn gắn một thời điểm bằng vạch mảnh. */
function Tick({ ctx, text }: { ctx: RenderCtx; text: string }) {
  const v = ctx.view;
  return (
    <>
      <rect x={v.x} y={v.y} width={v.w} height={v.h} fill="transparent" />
      <path d={`M${v.x},${v.y + v.h / 2} H${v.x + 18}`} stroke={ctx.style.stroke || INK} strokeWidth={1} />
      {ctx.editing !== 'expr' && <Label x={v.x + 22} y={v.y + v.h / 2} text={text} size={FS} anchor="start" />}
    </>
  );
}

const TIMING: {
  type: string;
  label: string;
  icon: string;
  def: string;
  bracket: boolean;
  fmt: (e: string) => string;
}[] = [
  {
    type: 'seq.durationConstraint',
    label: 'Duration Constraint',
    icon: 'duration-constraint',
    def: 'd..3*d',
    bracket: true,
    fmt: (e) => `{${e}}`,
  },
  {
    type: 'seq.timeConstraint',
    label: 'Time Constraint',
    icon: 'time-constraint',
    def: 't..t+3',
    bracket: false,
    fmt: (e) => `{${e}}`,
  },
  {
    type: 'seq.durationObs',
    label: 'Duration Observation',
    icon: 'duration-observation',
    def: 'd = duration',
    bracket: true,
    fmt: (e) => e,
  },
  {
    type: 'seq.timeObs',
    label: 'Time Observation',
    icon: 'time-observation',
    def: 't = now',
    bracket: false,
    fmt: (e) => e,
  },
];

for (const t of TIMING)
  registerShape({
    type: t.type,
    label: t.label,
    icon: t.icon,
    defaultSize: t.bracket ? { w: 110, h: 70 } : { w: 110, h: 22 },
    minSize: { w: 40, h: t.bracket ? 24 : 16 },
    noPorts: true,
    defaultProps: () => ({ expr: t.def }),
    defaultStyle: { fill: 'none', stroke: INK, strokeWidth: 1 },
    styleFields: ['stroke'],
    render: (ctx) => {
      const text = t.fmt(str((ctx.props as P).expr, t.def));
      return t.bracket ? (
        <Bracket ctx={ctx} text={text} arrows={t.type === 'seq.durationConstraint'} />
      ) : (
        <Tick ctx={ctx} text={text} />
      );
    },
    textRegions: (ctx) => [
      propRegion(
        ctx,
        'expr',
        { x: ctx.view.x + (t.bracket ? 16 : 20), y: ctx.view.y + ctx.view.h / 2 - 10, w: ctx.view.w - 16, h: 20 },
        { multiline: false, align: 'left', fontSize: FS },
      ),
    ],
    name: (ctx) => t.fmt(str((ctx.props as P).expr, t.def)),
  });
