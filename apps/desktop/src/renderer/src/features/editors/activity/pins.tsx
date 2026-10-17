// Hình bám viền (docs/spec/notation-activity.md mục 1): Input/Output/Value/Action Input Pin bám viền Action,
// Activity Parameter Node bám viền Activity, Expansion Node bám viền Expansion Region. Kéo chỉ trượt dọc viền
// (engine: ShapeDef.attach); khi đặt, tự gắn vào hình cha dưới con trỏ và dính lên viền gần nhất.
import { z } from 'zod';
import type { View } from '@umlab/core';
import { registerShape, type RenderCtx, type ShapeDef, type Tx } from '../engine/registry';
import { Label } from '../engine/text';
import { INK, strokeProps } from '../shapes/common/helpers';

type P = Record<string, unknown>;
type Side = 'top' | 'right' | 'bottom' | 'left';
const str = (v: unknown, d = '') => (v === undefined || v === null ? d : String(v));

export const ACTION_SHAPES = [
  'act.action',
  'act.callBehavior',
  'act.callOperation',
  'act.sendSignal',
  'act.acceptEvent',
  'act.ctrlOpAction',
  'act.valueSpec',
];

/** Cạnh của cha mà tâm hình con đang nằm trên (gần nhất). */
export function sideOn(child: { x: number; y: number; w: number; h: number }, parent: View): Side {
  const cx = child.x + child.w / 2;
  const cy = child.y + child.h / 2;
  const d: [Side, number][] = [
    ['top', Math.abs(cy - parent.y)],
    ['right', Math.abs(cx - (parent.x + parent.w))],
    ['bottom', Math.abs(cy - (parent.y + parent.h))],
    ['left', Math.abs(cx - parent.x)],
  ];
  return d.sort((a, b) => a[1] - b[1])[0][0];
}

/** Đặt hình `v` lên viền gần nhất của `parent` (tâm hình nằm đúng trên viền). */
export function snapToBorder(v: View, parent: View): { x: number; y: number } {
  const side = sideOn(v, parent);
  const cx = Math.min(parent.x + parent.w, Math.max(parent.x, v.x + v.w / 2));
  const cy = Math.min(parent.y + parent.h, Math.max(parent.y, v.y + v.h / 2));
  const p =
    side === 'top'
      ? [cx, parent.y]
      : side === 'bottom'
        ? [cx, parent.y + parent.h]
        : side === 'left'
          ? [parent.x, cy]
          : [parent.x + parent.w, cy];
  return { x: Math.round(p[0] - v.w / 2), y: Math.round(p[1] - v.h / 2) };
}

/** Khi đặt: gắn vào hình cha (loại `to`) dưới tâm hình, dính viền. */
function attachOnCreate(to: string[]) {
  return (tx: Tx, v: View) => {
    const cx = v.x + v.w / 2;
    const cy = v.y + v.h / 2;
    const parent = [...tx.lookup.views()]
      .reverse()
      .find(
        (p) => to.includes(p.shape) && cx >= p.x - 14 && cx <= p.x + p.w + 14 && cy >= p.y - 14 && cy <= p.y + p.h + 14,
      );
    if (!parent) return;
    const pos = snapToBorder(v, parent);
    tx.setView(v.id, { parentId: parent.id, ...pos });
  };
}

const parentOf = (ctx: RenderCtx) => (ctx.view.parentId ? ctx.lookup.view(ctx.view.parentId) : undefined);

// ---------------- Pin ----------------

type PinKind = 'input' | 'output' | 'value' | 'actionInput';
const PINS: Record<PinKind, { type: string; label: string; icon: string }> = {
  input: { type: 'act.inputPin', label: 'Input Pin', icon: 'input-pin' },
  output: { type: 'act.outputPin', label: 'Output Pin', icon: 'output-pin' },
  value: { type: 'act.valuePin', label: 'Value Pin', icon: 'value-pin' },
  actionInput: { type: 'act.actionInputPin', label: 'Action Input Pin', icon: 'action-input-pin' },
};

/** Mũi tên nhỏ trong pin: vào Action (input) / ra khỏi Action (output). */
function pinArrow(side: Side, inward: boolean, x: number, y: number, s: number): string {
  // hướng "ra ngoài" theo cạnh
  const out = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] }[side];
  const d = inward ? [-out[0], -out[1]] : out;
  const k = s * 0.28;
  const tip = [x + d[0] * k, y + d[1] * k];
  const b1 = [x - d[0] * k + d[1] * k, y - d[1] * k - d[0] * k];
  const b2 = [x - d[0] * k - d[1] * k, y - d[1] * k + d[0] * k];
  return `M${b1[0]},${b1[1]} L${tip[0]},${tip[1]} L${b2[0]},${b2[1]}`;
}

function pinLabel(ctx: RenderCtx, side: Side) {
  const v = ctx.view;
  const p = ctx.props as P;
  const d = ctx.data;
  const kind = str(p.pinKind) as PinKind;
  const name = ctx.model?.name ?? '';
  const t = kind === 'value' ? str(d.value) || name : [name, str(d.type)].filter(Boolean).join(' : ');
  const mult = str(d.multiplicity);
  const text = mult ? `${t} [${mult}]` : t;
  const pos =
    side === 'top'
      ? { x: v.x + v.w + 3, y: v.y - 4, anchor: 'start' as const }
      : side === 'bottom'
        ? { x: v.x + v.w + 3, y: v.y + v.h + 8, anchor: 'start' as const }
        : side === 'left'
          ? { x: v.x - 3, y: v.y - 6, anchor: 'end' as const }
          : { x: v.x + v.w + 3, y: v.y - 6, anchor: 'start' as const };
  return { text, ...pos };
}

function pinDef(kind: PinKind): ShapeDef {
  const info = PINS[kind];
  return {
    type: info.type,
    label: info.label,
    icon: info.icon,
    modelKind: 'uml.pin',
    defaultModel: () => ({
      name: kind === 'output' ? 'ketQua' : kind === 'value' ? '' : 'thamSo',
      data: {
        pinKind: kind,
        type: '',
        multiplicity: '',
        isControl: false,
        ...(kind === 'value' ? { value: '0' } : {}),
        ...(kind === 'actionInput' ? { fromAction: '' } : {}),
      },
    }),
    defaultSize: { w: 12, h: 12 },
    resizable: false,
    defaultProps: () => ({ pinKind: kind }),
    defaultStyle: { fill: '#FFFFFF', stroke: INK, strokeWidth: 1.2 },
    styleFields: ['fill', 'stroke'],
    attach: { to: ACTION_SHAPES },
    modelSchema: z.object({
      type: z.string().describe('Kiểu'),
      multiplicity: z.string().describe('Multiplicity'),
      isControl: z.boolean().describe('isControl'),
      ...(kind === 'value' ? { value: z.string().describe('Giá trị') } : {}),
      ...(kind === 'actionInput' ? { fromAction: z.string().describe('Action con (fromAction)') } : {}),
    }),
    onCreate: attachOnCreate(ACTION_SHAPES),
    render: (ctx) => {
      const v = ctx.view;
      const par = parentOf(ctx);
      const side = par ? sideOn(v, par) : 'left';
      const sp = strokeProps(ctx);
      const lab = pinLabel(ctx, side);
      const cx = v.x + v.w / 2;
      const cy = v.y + v.h / 2;
      return (
        <>
          <rect x={v.x} y={v.y} width={v.w} height={v.h} {...sp} fill={kind === 'value' ? '#E7EEFD' : sp.fill} />
          {kind !== 'value' && (
            <path d={pinArrow(side, kind !== 'output', cx, cy, v.w)} stroke={sp.stroke} strokeWidth={1} fill="none" />
          )}
          {lab.text && ctx.editing !== 'name' && (
            <Label x={lab.x} y={lab.y} text={lab.text} size={11} anchor={lab.anchor} color="#334155" />
          )}
        </>
      );
    },
    textRegions: (ctx) => {
      const v = ctx.view;
      return [
        {
          key: 'name',
          box: { x: v.x + v.w + 2, y: v.y - 16, w: 140, h: 18 },
          value: ctx.model?.name ?? '',
          align: 'left',
          fontSize: 11,
          commit: (tx, value) => ctx.model && tx.setModel(ctx.model.id, { name: value.trim() }),
        },
      ];
    },
  };
}
for (const k of Object.keys(PINS) as PinKind[]) registerShape(pinDef(k));

// ---------------- Activity Parameter Node ----------------

registerShape<P>({
  type: 'act.paramNode',
  label: 'Activity Parameter Node',
  icon: 'param-node',
  modelKind: 'uml.parameterNode',
  defaultModel: () => ({ name: 'thamSo', data: { type: '', direction: 'in', isStream: false, isException: false } }),
  defaultSize: { w: 86, h: 26 },
  minSize: { w: 40, h: 20 },
  defaultStyle: { fill: '#FFFFFF', stroke: INK, strokeWidth: 1.2 },
  styleFields: ['fill', 'stroke'],
  attach: { to: ['act.activity', 'act.ctrlOpActivity'] },
  onCreate: attachOnCreate(['act.activity', 'act.ctrlOpActivity']),
  modelSchema: z.object({
    type: z.string().describe('Kiểu'),
    direction: z.enum(['in', 'out', 'inout', 'return']).describe('Hướng|opts:in=in;out=out;inout=inout;return=return'),
    isStream: z.boolean().describe('{stream}'),
    isException: z.boolean().describe('{exception}'),
  }),
  render: (ctx) => {
    const v = ctx.view;
    const t = [ctx.model?.name ?? '', str(ctx.data.type)].filter(Boolean).join(' : ');
    return (
      <>
        <rect x={v.x} y={v.y} width={v.w} height={v.h} {...strokeProps(ctx)} />
        {ctx.editing !== 'name' && <Label x={v.x + v.w / 2} y={v.y + v.h / 2} text={t} size={11} />}
      </>
    );
  },
  textRegions: (ctx) => [
    {
      key: 'name',
      box: { x: ctx.view.x + 2, y: ctx.view.y + 2, w: ctx.view.w - 4, h: ctx.view.h - 4 },
      value: ctx.model?.name ?? '',
      align: 'center',
      fontSize: 11,
      commit: (tx, value) => ctx.model && tx.setModel(ctx.model.id, { name: value.trim() || 'thamSo' }),
    },
  ],
});

// ---------------- Expansion Node: ô dài chia ngăn bám viền Expansion Region ----------------

registerShape<P>({
  type: 'act.expansionNode',
  label: 'Expansion Node',
  icon: 'expansion-node',
  defaultSize: { w: 44, h: 12 },
  resizable: false,
  defaultStyle: { fill: '#FFFFFF', stroke: INK, strokeWidth: 1.1 },
  styleFields: ['fill', 'stroke'],
  attach: { to: ['act.expansionRegion'] },
  onCreate: attachOnCreate(['act.expansionRegion']),
  render: (ctx) => {
    const v = ctx.view;
    const par = parentOf(ctx);
    const side = par ? sideOn(v, par) : 'top';
    // trên cạnh trái/phải: ô đứng
    const vertical = side === 'left' || side === 'right';
    const w = vertical ? Math.min(v.w, v.h) : Math.max(v.w, v.h);
    const h = vertical ? Math.max(v.w, v.h) : Math.min(v.w, v.h);
    const x = v.x + v.w / 2 - w / 2;
    const y = v.y + v.h / 2 - h / 2;
    const parts = [1, 2, 3].map((i) =>
      vertical ? `M${x},${y + (h * i) / 4} H${x + w}` : `M${x + (w * i) / 4},${y} V${y + h}`,
    );
    return (
      <>
        <rect x={x} y={y} width={w} height={h} {...strokeProps(ctx)} />
        <path d={parts.join(' ')} stroke={String(ctx.style.stroke)} strokeWidth={1} />
      </>
    );
  },
});
