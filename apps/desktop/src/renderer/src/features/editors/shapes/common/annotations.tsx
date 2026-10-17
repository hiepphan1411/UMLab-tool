// Nhóm A + B của spec/notation-common.md: chú thích, ràng buộc, yêu cầu (SysML).
import { z } from 'zod';
import { registerConnector, registerShape, type RenderCtx } from '../../engine/registry';
import { Label } from '../../engine/text';
import { INK, NOTE_FILL, NOTE_STROKE, TextBlock, propRegion, strokeProps, textHeight } from './helpers';

/** Các hình chú thích nối được bằng Anchor. */
export const ANNOTATION_SHAPES = [
  'common.note',
  'common.constraint',
  'common.rationale',
  'common.problem',
  'common.callout',
  'common.userStory',
];

const FOLD = 12;
const PAD = 10;

function noteBody(ctx: RenderCtx, header?: { text: string; color: string }) {
  const { view: v } = ctx;
  const sp = strokeProps(ctx);
  const f = Math.min(FOLD, v.w / 3, v.h / 3);
  const p = ctx.props as { text?: string; fontSize?: number };
  const size = Number(p.fontSize ?? 13);
  const top = header ? 22 : 0;
  return (
    <>
      <path
        d={`M${v.x},${v.y} H${v.x + v.w - f} L${v.x + v.w},${v.y + f} V${v.y + v.h} H${v.x} Z`}
        {...sp}
        strokeLinejoin="round"
      />
      <path
        d={`M${v.x + v.w - f},${v.y} V${v.y + f} H${v.x + v.w}`}
        fill="none"
        stroke={sp.stroke}
        strokeWidth={sp.strokeWidth}
        strokeLinejoin="round"
      />
      {header && (
        <Label
          x={v.x + PAD}
          y={v.y + 13}
          text={header.text}
          size={11.5}
          weight={600}
          color={header.color}
          anchor="start"
        />
      )}
      <TextBlock
        ctx={ctx}
        text={String(p.text ?? '')}
        box={{ x: v.x + PAD, y: v.y + PAD + top - (header ? 4 : 0), w: v.w - PAD * 2 - (header ? 0 : 4), h: v.h }}
        size={size}
        align="left"
        valign="top"
      />
    </>
  );
}

const noteMeasure = (header: boolean) => (ctx: RenderCtx) => {
  const p = ctx.props as { text?: string; fontSize?: number };
  const need =
    textHeight(String(p.text ?? ''), Number(p.fontSize ?? 13), 400, ctx.view.w - PAD * 2 - 4) +
    PAD * 2 +
    (header ? 18 : 0);
  return need > ctx.view.h ? { h: need } : null;
};

const noteRegion = (header: boolean) => (ctx: RenderCtx) => [
  propRegion(
    ctx,
    'text',
    {
      x: ctx.view.x + PAD - 3,
      y: ctx.view.y + PAD - 3 + (header ? 18 : 0),
      w: ctx.view.w - PAD * 2,
      h: ctx.view.h - PAD * 2,
    },
    { align: 'left', fontSize: Number((ctx.props as { fontSize?: number }).fontSize ?? 13), placeholder: 'Ghi chú…' },
  ),
];

const textSchema = z.object({
  text: z.string().describe('Nội dung — **đậm**, *nghiêng*, "- " gạch đầu dòng|textarea'),
  fontSize: z.number().describe('Cỡ chữ'),
});

registerShape({
  type: 'common.note',
  label: 'Note',
  icon: 'note',
  defaultSize: { w: 180, h: 80 },
  minSize: { w: 60, h: 36 },
  defaultProps: () => ({ text: 'Ghi chú', fontSize: 13 }),
  defaultStyle: { fill: NOTE_FILL, stroke: NOTE_STROKE, strokeWidth: 1.2 },
  propsSchema: textSchema,
  styleFields: ['fill', 'stroke', 'strokeWidth'],
  render: (ctx) => noteBody(ctx),
  textRegions: noteRegion(false),
  measure: noteMeasure(false),
  name: (ctx) =>
    String((ctx.props as { text?: string }).text ?? 'Note')
      .split('\n')[0]
      .replace(/\*/g, ''),
});

registerShape({
  type: 'common.rationale',
  label: 'Rationale',
  icon: 'rationale',
  defaultSize: { w: 200, h: 90 },
  minSize: { w: 80, h: 44 },
  defaultProps: () => ({ text: 'Lý do lựa chọn…', fontSize: 13 }),
  defaultStyle: { fill: NOTE_FILL, stroke: NOTE_STROKE, strokeWidth: 1.2 },
  propsSchema: textSchema,
  styleFields: ['fill', 'stroke', 'strokeWidth'],
  render: (ctx) => noteBody(ctx, { text: '«rationale»', color: '#6B5A12' }),
  textRegions: noteRegion(true),
  measure: noteMeasure(true),
});

const SEVERITY: Record<string, string> = { low: '#D98A1C', medium: '#D9463E', high: '#9F1D1D' };
registerShape<{ text: string; fontSize: number; severity: string }>({
  type: 'common.problem',
  label: 'Problem',
  icon: 'problem',
  defaultSize: { w: 200, h: 90 },
  minSize: { w: 80, h: 44 },
  defaultProps: () => ({ text: 'Mô tả vấn đề…', fontSize: 13, severity: 'medium' }),
  defaultStyle: { fill: '#FDECEC', stroke: '#E59A9A', strokeWidth: 1.4 },
  propsSchema: textSchema.extend({
    severity: z.enum(['low', 'medium', 'high']).describe('Mức độ|opts:low=Thấp;medium=Trung bình;high=Nghiêm trọng'),
  }),
  styleFields: ['fill', 'stroke', 'strokeWidth'],
  render: (ctx) => {
    const sev = SEVERITY[ctx.props.severity] ?? SEVERITY.medium;
    const label = { low: 'thấp', medium: 'trung bình', high: 'nghiêm trọng' }[ctx.props.severity] ?? '';
    return (
      <>
        {noteBody(ctx as unknown as RenderCtx, { text: '«problem»', color: sev })}
        <circle cx={ctx.view.x + ctx.view.w - 22} cy={ctx.view.y + 13} r={4} fill={sev}>
          <title>Mức độ {label}</title>
        </circle>
      </>
    );
  },
  textRegions: noteRegion(true) as never,
  measure: noteMeasure(true) as never,
});

registerShape<{ specification: string; language: string; border: boolean; fontSize: number }>({
  type: 'common.constraint',
  label: 'Constraint',
  icon: 'constraint',
  defaultSize: { w: 160, h: 36 },
  minSize: { w: 40, h: 24 },
  defaultProps: () => ({ specification: 'ràng buộc', language: 'Text', border: false, fontSize: 13 }),
  defaultStyle: { fill: NOTE_FILL, stroke: NOTE_STROKE, strokeWidth: 1.2 },
  propsSchema: z.object({
    specification: z.string().describe('Đặc tả|textarea'),
    language: z.enum(['Text', 'OCL']).describe('Ngôn ngữ'),
    border: z.boolean().describe('Viền như Note'),
    fontSize: z.number().describe('Cỡ chữ'),
  }),
  styleFields: ['fill', 'stroke'],
  render: (ctx) => {
    const { view: v, props: p } = ctx;
    return (
      <>
        {p.border ? (
          <rect x={v.x} y={v.y} width={v.w} height={v.h} rx={3} {...strokeProps(ctx as unknown as RenderCtx)} />
        ) : (
          <rect x={v.x} y={v.y} width={v.w} height={v.h} fill="transparent" />
        )}
        <TextBlock
          ctx={ctx as unknown as RenderCtx}
          editKey="specification"
          text={`{${p.specification}}`}
          box={{ x: v.x + 6, y: v.y, w: v.w - 12, h: v.h }}
          size={p.fontSize}
          italic={p.language === 'OCL'}
        />
      </>
    );
  },
  textRegions: (ctx) => [
    propRegion(ctx as unknown as RenderCtx, 'specification', {
      x: ctx.view.x,
      y: ctx.view.y,
      w: ctx.view.w,
      h: ctx.view.h,
    }),
  ],
  measure: (ctx) => {
    const need = textHeight(`{${ctx.props.specification}}`, ctx.props.fontSize, 400, ctx.view.w - 12) + 12;
    return need > ctx.view.h ? { h: need } : null;
  },
  name: (ctx) => `{${ctx.props.specification}}`,
});

// ---------------- đường nối ----------------

registerConnector({
  kind: 'common.anchor',
  label: 'Anchor',
  icon: 'anchor',
  look: { line: 'dashed', start: 'none', end: 'none' },
  defaultStyle: { stroke: '#64748B', strokeWidth: 1 },
  defaultRouting: 'straight',
  allow: (s, t) =>
    ANNOTATION_SHAPES.includes(s.view.shape) || ANNOTATION_SHAPES.includes(t.view.shape)
      ? true
      : 'Anchor chỉ nối Note, Constraint, Rationale, Problem, Callout hoặc User Story với phần tử khác',
});

registerConnector({
  kind: 'common.containment',
  label: 'Containment',
  icon: 'containment',
  look: { line: 'solid', start: 'circle-plus', end: 'none' },
  defaultRouting: 'straight',
  allow: (s, t) => (s.view.id === t.view.id ? 'Phần tử không thể chứa chính nó' : true),
  // phần tử chứa (nguồn) là owner trong không gian tên của phần tử đích
  onCreate: (tx, _c, src, tgt) => {
    if (src.model && tgt.model) tx.setModelData(tgt.model.id, { owner: src.model.id });
  },
  onDelete: (tx, c) => {
    const s = tx.lookup.view(c.source.viewId);
    const t = tx.lookup.view(c.target.viewId);
    const tm = t?.modelId ? tx.model(t.modelId) : undefined;
    if (tm && s?.modelId && tm.data.owner === s.modelId) tx.setModelData(tm.id, { owner: null });
  },
});

registerConnector({
  kind: 'common.allocate',
  label: 'Allocate',
  icon: 'allocate',
  look: { line: 'dashed', start: 'none', end: 'arrow-open', stereotype: 'allocate' },
  defaultRouting: 'straight',
  defaultProps: () => ({ name: '', description: '' }),
  propsSchema: z.object({
    name: z.string().describe('Tên'),
    description: z.string().describe('Mô tả|textarea'),
  }),
  labels: (c) => {
    const n = String((c.props as { name?: string }).name ?? '');
    return n ? [{ role: 'name', text: n, pos: 0.5, draggable: true }] : [];
  },
});

export { INK };
