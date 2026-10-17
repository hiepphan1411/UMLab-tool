// Nhóm C của spec/notation-common.md: tổ chức & tài liệu (Package, Diagram Overview, User Story, ảnh, hình cơ bản…).
import { Camera, ClipboardPaste, ImagePlus, Maximize2 } from 'lucide-react';
import { z } from 'zod';
import { umlab } from '@/lib/api';
import { Button, Select, toast } from '@/ui';
import { pointInPoly } from '../../engine/ops';
import {
  registerConnector,
  registerShape,
  type ConnLook,
  type EngineLookup,
  type MarkerKind,
  type RenderCtx,
  type ShapeInspectorProps,
  type Tx,
} from '../../engine/registry';
import { Label, fitText, textW } from '../../engine/text';
import { renderThumbnail } from '../../thumbnails';
import {
  INK,
  TextBlock,
  blobToDataUrl,
  bytesToDataUrl,
  cropDialog,
  fitSize,
  normalizeImage,
  propRegion,
  strokeProps,
  textHeight,
} from './helpers';

type P = Record<string, unknown>;
const str = (v: unknown, d = '') => (v === undefined || v === null ? d : String(v));
const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);

// ---------------- hình cơ bản: Rectangle, Oval, Polygon ----------------

const basicSchema = z.object({
  text: z.string().describe('Chữ bên trong — **đậm**, *nghiêng*|textarea'),
  fontSize: z.number().describe('Cỡ chữ|step01'),
  color: z.string().describe('Màu chữ|color'),
  shadow: z.boolean().describe('Đổ bóng'),
});
const basicProps = (text: string) => () => ({ text, fontSize: 14, color: INK, shadow: false });

function innerText(ctx: RenderCtx, k: number) {
  const { view: v } = ctx;
  const p = ctx.props as P;
  const fs = num(p.fontSize, 14);
  const w = v.w * k;
  return (
    <TextBlock
      ctx={ctx}
      text={str(p.text)}
      box={{ x: v.x + (v.w - w) / 2, y: v.y, w, h: v.h }}
      size={fs}
      color={str(p.color, INK)}
    />
  );
}
const innerRegion = (k: number) => (ctx: RenderCtx) => {
  const { view: v } = ctx;
  const w = v.w * k;
  return [
    propRegion(
      ctx,
      'text',
      { x: v.x + (v.w - w) / 2, y: v.y + v.h / 2 - 14, w, h: 28 },
      { fontSize: num((ctx.props as P).fontSize, 14) },
    ),
  ];
};

registerShape({
  type: 'common.rectangle',
  label: 'Rectangle',
  icon: 'rectangle',
  defaultSize: { w: 160, h: 80 },
  defaultProps: basicProps('Khối'),
  defaultStyle: { fill: '#FFFFFF', stroke: '#64748B', strokeWidth: 1.5, radius: 8 },
  propsSchema: basicSchema,
  styleFields: ['fill', 'stroke', 'strokeWidth', 'radius', 'dash'],
  render: (ctx) => {
    const v = ctx.view;
    return (
      <>
        <rect
          x={v.x}
          y={v.y}
          width={v.w}
          height={v.h}
          rx={num(ctx.style.radius, 0)}
          {...strokeProps(ctx, { shadow: !!(ctx.props as P).shadow })}
        />
        {innerText(ctx, 0.9)}
      </>
    );
  },
  textRegions: innerRegion(0.9),
});

registerShape({
  type: 'common.oval',
  label: 'Oval',
  icon: 'oval',
  outline: 'ellipse',
  defaultSize: { w: 150, h: 90 },
  defaultProps: basicProps('Elip'),
  defaultStyle: { fill: '#FFFFFF', stroke: '#64748B', strokeWidth: 1.5 },
  propsSchema: basicSchema,
  styleFields: ['fill', 'stroke', 'strokeWidth', 'dash'],
  render: (ctx) => {
    const v = ctx.view;
    return (
      <>
        <ellipse
          cx={v.x + v.w / 2}
          cy={v.y + v.h / 2}
          rx={v.w / 2}
          ry={v.h / 2}
          {...strokeProps(ctx, { shadow: !!(ctx.props as P).shadow })}
        />
        {innerText(ctx, 0.7)}
      </>
    );
  },
  textRegions: innerRegion(0.7),
  hitTest: (v, x, y) => ((x - v.x - v.w / 2) / (v.w / 2)) ** 2 + ((y - v.y - v.h / 2) / (v.h / 2)) ** 2 <= 1.02,
});

/** Đỉnh đa giác (toạ độ tương đối 0..1): theo `points` tự vẽ, hoặc đa giác đều n cạnh (đỉnh đầu ở trên, xoay theo độ). */
export function polygonPts(p: P): [number, number][] {
  const custom = p.points as [number, number][] | undefined;
  if (Array.isArray(custom) && custom.length >= 3) return custom;
  const n = Math.max(3, Math.min(12, Math.round(num(p.sides, 6))));
  const rot = (num(p.rotation, 0) * Math.PI) / 180;
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + rot + (i * 2 * Math.PI) / n;
    out.push([0.5 + Math.cos(a) / 2, 0.5 + Math.sin(a) / 2]);
  }
  return out;
}
const absPts = (v: { x: number; y: number; w: number; h: number }, pts: [number, number][]) =>
  pts.map(([u, w]) => [v.x + u * v.w, v.y + w * v.h] as [number, number]);

registerShape({
  type: 'common.polygon',
  label: 'Polygon',
  icon: 'polygon',
  defaultSize: { w: 120, h: 110 },
  defaultProps: () => ({ ...basicProps('')(), sides: 6, rotation: 0, editVertices: false }),
  defaultStyle: { fill: '#FFFFFF', stroke: '#64748B', strokeWidth: 1.5 },
  propsSchema: basicSchema.extend({
    sides: z.number().describe('Số cạnh (3–12)'),
    rotation: z.number().describe('Xoay (độ)'),
    editVertices: z.boolean().describe('Sửa đỉnh (kéo từng đỉnh)'),
  }),
  styleFields: ['fill', 'stroke', 'strokeWidth', 'dash'],
  render: (ctx) => {
    const pts = absPts(ctx.view, polygonPts(ctx.props as P));
    return (
      <>
        <polygon
          points={pts.map((q) => q.join(',')).join(' ')}
          {...strokeProps(ctx, { shadow: !!(ctx.props as P).shadow })}
          strokeLinejoin="round"
        />
        {innerText(ctx, 0.62)}
      </>
    );
  },
  textRegions: innerRegion(0.62),
  hitTest: (v, x, y) => pointInPoly(x, y, absPts(v, polygonPts(v.props))),
  handles: (ctx) =>
    (ctx.props as P).editVertices
      ? absPts(ctx.view, polygonPts(ctx.props as P)).map(([x, y], i) => ({
          key: 'v' + i,
          x,
          y,
          shape: 'square' as const,
          title: `Đỉnh ${i + 1}`,
        }))
      : [],
  dragHandle: (ctx, key, [x, y]) => {
    const v = ctx.view;
    const pts = polygonPts(ctx.props as P).map((q) => [...q] as [number, number]);
    const i = Number(key.slice(1));
    const cl = (t: number) => Math.round(Math.max(0, Math.min(1, t)) * 1000) / 1000;
    pts[i] = [cl((x - v.x) / v.w), cl((y - v.y) / v.h)];
    return { points: pts };
  },
  contextMenu: (v, api) => [
    {
      label: v.props.editVertices ? 'Xong sửa đỉnh' : 'Sửa đỉnh',
      onSelect: () => api.apply((tx) => tx.setViewProps(v.id, { editVertices: !v.props.editVertices })),
    },
    ...(Array.isArray(v.props.points)
      ? [
          {
            label: 'Về đa giác đều',
            onSelect: () => api.apply((tx) => tx.setViewProps(v.id, { points: undefined, editVertices: false })),
          },
        ]
      : []),
  ],
});

// ---------------- Text Box ----------------

registerShape({
  type: 'common.textbox',
  label: 'Text Box',
  icon: 'text-box',
  defaultSize: { w: 220, h: 20 },
  resizable: 'horizontal',
  minSize: { w: 20, h: 12 },
  defaultProps: () => ({ text: 'Văn bản ghi chú', fontSize: 14, weight: 400, color: INK, align: 'left' }),
  propsSchema: z.object({
    text: z.string().describe('Văn bản — **đậm**, *nghiêng*, "- " gạch đầu dòng|textarea'),
    fontSize: z.number().describe('Cỡ chữ|step01'),
    weight: z.enum(['400', '500', '700']).describe('Độ đậm|opts:400=Thường;500=Vừa;700=Đậm'),
    color: z.string().describe('Màu chữ|color'),
    align: z.enum(['left', 'center', 'right']).describe('Căn|opts:left=Trái;center=Giữa;right=Phải'),
  }),
  styleFields: false,
  render: (ctx) => {
    const v = ctx.view;
    const p = ctx.props as P;
    const fs = num(p.fontSize, 14);
    return (
      <>
        <rect x={v.x} y={v.y} width={v.w} height={v.h} fill="transparent" />
        <TextBlock
          ctx={ctx}
          text={str(p.text)}
          box={{ x: v.x, y: v.y, w: Math.max(10, v.w), h: v.h }}
          size={fs}
          weight={num(p.weight, 400)}
          color={str(p.color, INK)}
          align={(str(p.align, 'left') as 'left') ?? 'left'}
          valign="top"
          lhK={1.35}
        />
      </>
    );
  },
  measure: (ctx) => {
    const p = ctx.props as P;
    const fs = num(p.fontSize, 14);
    return { h: Math.max(fs * 1.35, textHeight(str(p.text), fs, num(p.weight, 400), Math.max(10, ctx.view.w), 1.35)) };
  },
  textRegions: (ctx) => [
    propRegion(ctx, 'text', ctx.view, {
      align: str((ctx.props as P).align, 'left') as 'left',
      fontSize: num((ctx.props as P).fontSize, 14),
    }),
  ],
});

// ---------------- Callout ----------------

/** Bong bóng hội thoại có đuôi nhọn tới điểm (tx, ty) — toạ độ tương đối so với góc trên trái hình. */
export function calloutPath(v: { x: number; y: number; w: number; h: number }, tx: number, ty: number, r = 8): string {
  const X = v.x;
  const Y = v.y;
  const W = v.w;
  const H = v.h;
  const T = [X + tx, Y + ty];
  const half = Math.min(10, W / 4, H / 4);
  const inside = T[0] > X && T[0] < X + W && T[1] > Y && T[1] < Y + H;
  const side = inside ? 'none' : T[1] >= Y + H ? 'bottom' : T[1] <= Y ? 'top' : T[0] >= X + W ? 'right' : 'left';
  const cl = (val: number, a: number, b: number) => Math.max(a, Math.min(b, val));
  const bx = cl(T[0], X + r + half, X + W - r - half);
  const by = cl(T[1], Y + r + half, Y + H - r - half);
  let d = `M${X + r},${Y}`;
  if (side === 'top') d += ` L${bx - half},${Y} L${T[0]},${T[1]} L${bx + half},${Y}`;
  d += ` L${X + W - r},${Y} Q${X + W},${Y} ${X + W},${Y + r}`;
  if (side === 'right') d += ` L${X + W},${by - half} L${T[0]},${T[1]} L${X + W},${by + half}`;
  d += ` L${X + W},${Y + H - r} Q${X + W},${Y + H} ${X + W - r},${Y + H}`;
  if (side === 'bottom') d += ` L${bx + half},${Y + H} L${T[0]},${T[1]} L${bx - half},${Y + H}`;
  d += ` L${X + r},${Y + H} Q${X},${Y + H} ${X},${Y + H - r}`;
  if (side === 'left') d += ` L${X},${by + half} L${T[0]},${T[1]} L${X},${by - half}`;
  d += ` L${X},${Y + r} Q${X},${Y} ${X + r},${Y} Z`;
  return d;
}

registerShape({
  type: 'common.callout',
  label: 'Callout',
  icon: 'callout',
  defaultSize: { w: 180, h: 70 },
  minSize: { w: 60, h: 32 },
  defaultProps: () => ({ text: 'Chú thích', fontSize: 13, tx: 36, ty: 104 }),
  defaultStyle: { fill: '#FFFFFF', stroke: '#64748B', strokeWidth: 1.4 },
  propsSchema: z.object({
    text: z.string().describe('Nội dung|textarea'),
    fontSize: z.number().describe('Cỡ chữ'),
  }),
  styleFields: ['fill', 'stroke', 'strokeWidth', 'dash'],
  render: (ctx) => {
    const v = ctx.view;
    const p = ctx.props as P;
    return (
      <>
        <path d={calloutPath(v, num(p.tx, 36), num(p.ty, v.h + 34))} {...strokeProps(ctx)} strokeLinejoin="round" />
        <TextBlock
          ctx={ctx}
          text={str(p.text)}
          box={{ x: v.x + 10, y: v.y, w: v.w - 20, h: v.h }}
          size={num(p.fontSize, 13)}
        />
      </>
    );
  },
  textRegions: (ctx) => [
    propRegion(ctx, 'text', { x: ctx.view.x + 6, y: ctx.view.y + 6, w: ctx.view.w - 12, h: ctx.view.h - 12 }),
  ],
  handles: (ctx) => [
    {
      key: 'tail',
      x: ctx.view.x + num((ctx.props as P).tx, 36),
      y: ctx.view.y + num((ctx.props as P).ty, ctx.view.h + 34),
      title: 'Kéo để đổi hướng đuôi',
    },
  ],
  dragHandle: (ctx, _k, [x, y]) => ({ tx: Math.round(x - ctx.view.x), ty: Math.round(y - ctx.view.y) }),
});

// ---------------- Package ◢ (Package / Model / Subsystem) ----------------

const PKG_TAB_H = 22;
registerShape({
  type: 'common.package',
  label: 'Package',
  icon: 'package',
  modelKind: 'package',
  defaultModel: () => ({ name: 'Package', data: { stereotype: '', visibility: 'public' } }),
  defaultSize: { w: 300, h: 200 },
  minSize: { w: 80, h: 60 },
  container: { accepts: '*', autoGrow: true, padding: 16, header: 30 },
  defaultProps: () => ({ kind: 'package' }),
  defaultStyle: { fill: '#F4F7FC', stroke: '#4A6FA5', strokeWidth: 1.4 },
  modelSchema: z.object({
    stereotype: z.string().describe('Stereotype'),
    visibility: z
      .enum(['public', 'private', 'protected', 'package'])
      .describe('Visibility|opts:public=+ public;private=- private;protected=# protected;package=~ package'),
  }),
  propsSchema: z.object({
    kind: z
      .enum(['package', 'model', 'subsystem'])
      .describe('Loại|opts:package=Package;model=Model;subsystem=Subsystem'),
  }),
  styleFields: ['fill', 'stroke', 'strokeWidth', 'dash'],
  render: (ctx) => {
    const v = ctx.view;
    const kind = str((ctx.props as P).kind, 'package');
    const name = ctx.model?.name ?? 'Package';
    const st = str(ctx.data.stereotype) || (kind === 'subsystem' ? 'subsystem' : '');
    const empty = !ctx.lookup.children(v.id).length;
    const tabW = Math.min(v.w * 0.6, Math.max(70, textW(name, 12.5, 600) + 24 + (kind === 'model' ? 14 : 0)));
    const sp = strokeProps(ctx);
    const editing = ctx.editing === 'name';
    return (
      <>
        <rect x={v.x} y={v.y} width={tabW} height={PKG_TAB_H + 2} rx={2} {...sp} />
        <rect x={v.x} y={v.y + PKG_TAB_H} width={v.w} height={v.h - PKG_TAB_H} rx={2} {...sp} />
        {kind === 'model' && (
          <path
            d={`M${v.x + tabW - 16},${v.y + 16} l5,-9 l5,9 z`}
            fill="none"
            stroke={sp.stroke}
            strokeWidth={1.1}
            strokeLinejoin="round"
          />
        )}
        {!editing && !empty && (
          <Label
            x={v.x + 10}
            y={v.y + PKG_TAB_H / 2 + 1}
            text={fitText(name, 12.5, 600, tabW - 18 - (kind === 'model' ? 14 : 0))}
            size={12.5}
            weight={600}
            anchor="start"
          />
        )}
        {!editing && empty && (
          <>
            {st && (
              <Label x={v.x + v.w / 2} y={v.y + PKG_TAB_H + (v.h - PKG_TAB_H) / 2 - 10} text={`«${st}»`} size={12} />
            )}
            <Label
              x={v.x + v.w / 2}
              y={v.y + PKG_TAB_H + (v.h - PKG_TAB_H) / 2 + (st ? 7 : 0)}
              text={fitText(name, 14, 600, v.w - 16)}
              size={14}
              weight={600}
            />
          </>
        )}
        {!empty && st && (
          <Label
            x={v.x + v.w - 10}
            y={v.y + PKG_TAB_H + 12}
            text={`«${st}»`}
            size={11.5}
            anchor="end"
            color="#475569"
          />
        )}
      </>
    );
  },
  textRegions: (ctx) => {
    const v = ctx.view;
    const empty = !ctx.lookup.children(v.id).length;
    return [
      {
        key: 'name',
        box: empty
          ? { x: v.x + 8, y: v.y + PKG_TAB_H + (v.h - PKG_TAB_H) / 2 - 12, w: v.w - 16, h: 24 }
          : { x: v.x + 4, y: v.y + 2, w: Math.max(120, v.w * 0.6), h: PKG_TAB_H - 2 },
        value: ctx.model?.name ?? '',
        align: empty ? 'center' : 'left',
        fontSize: empty ? 14 : 12.5,
        fontWeight: 600,
        commit: (tx: Tx, value: string) => ctx.model && tx.setModel(ctx.model.id, { name: value.trim() || 'Package' }),
      },
    ];
  },
});

// ---------------- Diagram Overview ----------------

let overviewDepth = 0;
function OverviewInspector({ view, apply, lookup, readOnly }: ShapeInspectorProps) {
  const options = [
    { value: '', label: '(Chọn sơ đồ)' },
    ...lookup
      .diagrams()
      .filter((d) => d.id !== lookup.diagramId)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((d) => ({ value: d.id, label: d.name })),
  ];
  return (
    <div className="pgroup">
      <div className="pgroup-h">Sơ đồ hiển thị</div>
      <Select
        value={str(view.props.diagramId)}
        disabled={readOnly}
        options={options}
        onChange={(e) => apply((tx) => tx.setViewProps(view.id, { diagramId: e.target.value }))}
      />
      <p className="text-[11.5px] text-muted">Ảnh thu nhỏ tự cập nhật. Nhấp đúp lên hình để mở sơ đồ đó.</p>
    </div>
  );
}

registerShape({
  type: 'common.diagramOverview',
  label: 'Diagram Overview',
  icon: 'diagram-overview',
  live: true,
  defaultSize: { w: 260, h: 190 },
  minSize: { w: 100, h: 70 },
  defaultProps: () => ({ diagramId: '' }),
  defaultStyle: { fill: '#FFFFFF', stroke: '#4A6FA5', strokeWidth: 1.2 },
  styleFields: ['fill', 'stroke', 'strokeWidth'],
  inspector: OverviewInspector,
  render: (ctx) => {
    const v = ctx.view;
    const id = str((ctx.props as P).diagramId);
    const meta = id ? ctx.lookup.diagram(id) : undefined;
    const sp = strokeProps(ctx);
    let svg: string | null = null;
    if (meta && overviewDepth < 1) {
      overviewDepth++;
      try {
        svg = renderThumbnail(ctx.lookup.doc, meta);
      } finally {
        overviewDepth--;
      }
    }
    const bodyY = v.y + 24;
    const bodyH = v.h - 24;
    return (
      <>
        <rect x={v.x} y={v.y} width={v.w} height={v.h} rx={4} {...sp} />
        <path d={`M${v.x},${bodyY} H${v.x + v.w}`} stroke={sp.stroke} strokeWidth={sp.strokeWidth} />
        <Label
          x={v.x + 10}
          y={v.y + 12}
          text={fitText(meta ? meta.name : 'Chọn sơ đồ trong Inspector', 12, 600, v.w - 20)}
          size={12}
          weight={meta ? 600 : 400}
          color={meta ? INK : '#94A3B8'}
          anchor="start"
        />
        {svg ? (
          <image
            x={v.x + 6}
            y={bodyY + 6}
            width={v.w - 12}
            height={bodyH - 12}
            href={'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)}
            preserveAspectRatio="xMidYMid meet"
          />
        ) : (
          <Label
            x={v.x + v.w / 2}
            y={bodyY + bodyH / 2}
            text={meta ? '(Sơ đồ trống)' : '—'}
            size={12}
            color="#94A3B8"
          />
        )}
      </>
    );
  },
  onDoubleClick: (v, api) => {
    const id = str(v.props.diagramId);
    if (!id || !api.lookup.diagram(id)) return false;
    api.open(id);
    return true;
  },
  name: (ctx) => {
    const id = str((ctx.props as P).diagramId);
    return 'Overview: ' + (ctx.lookup.diagram(id)?.name ?? '—');
  },
});

// ---------------- User Story ----------------

const PRIORITY: Record<string, { n: string; c: string }> = {
  low: { n: 'Thấp', c: '#8A93A5' },
  medium: { n: 'Trung bình', c: '#2E6BE6' },
  high: { n: 'Cao', c: '#D98A1C' },
  critical: { n: 'Khẩn', c: '#D9463E' },
};
const US_STATUS: Record<string, { n: string; c: string }> = {
  todo: { n: 'Chưa làm', c: '#8A93A5' },
  doing: { n: 'Đang làm', c: '#2E6BE6' },
  done: { n: 'Xong', c: '#1F9D66' },
};

const storyText = (p: P) =>
  `Là **${str(p.role, '…')}**, tôi muốn **${str(p.goal, '…')}**${str(p.benefit) ? `, để ${str(p.benefit)}` : ''}.`;
const US_PAD = 12;

registerShape({
  type: 'common.userStory',
  label: 'User Story',
  icon: 'user-story',
  defaultSize: { w: 240, h: 130 },
  minSize: { w: 140, h: 80 },
  defaultProps: () => ({
    code: 'US-01',
    role: 'tài xế',
    goal: 'đặt chỗ trước',
    benefit: 'không phải tìm chỗ khi đến',
    acceptanceCriteria: [] as { text: string; done: boolean }[],
    priority: 'medium',
    points: 3,
    status: 'todo',
  }),
  defaultStyle: { fill: '#FFFFFF', stroke: '#CBD5E1', strokeWidth: 1.2, radius: 10 },
  propsSchema: z.object({
    code: z.string().describe('Mã'),
    role: z.string().describe('Là (vai trò)'),
    goal: z.string().describe('Tôi muốn (mục tiêu)|textarea'),
    benefit: z.string().describe('Để (lợi ích)|textarea'),
    priority: z
      .enum(['low', 'medium', 'high', 'critical'])
      .describe('Độ ưu tiên|opts:low=Thấp;medium=Trung bình;high=Cao;critical=Khẩn'),
    points: z.number().describe('Story points'),
    status: z.enum(['todo', 'doing', 'done']).describe('Trạng thái|opts:todo=Chưa làm;doing=Đang làm;done=Xong'),
    acceptanceCriteria: z
      .array(z.object({ text: z.string().describe('Tiêu chí'), done: z.boolean().describe('Đạt') }))
      .describe('Tiêu chí chấp nhận'),
  }),
  styleFields: ['fill', 'stroke', 'radius'],
  render: (ctx) => {
    const v = ctx.view;
    const p = ctx.props as P;
    const pr = PRIORITY[str(p.priority)] ?? PRIORITY.medium;
    const stt = US_STATUS[str(p.status)] ?? US_STATUS.todo;
    const crit = (p.acceptanceCriteria as { done: boolean }[] | undefined) ?? [];
    const r = num(ctx.style.radius, 10);
    const sp = strokeProps(ctx);
    const pillW = textW(stt.n, 10.5, 600) + 14;
    const editingAny = !!ctx.editing;
    return (
      <>
        <rect x={v.x} y={v.y} width={v.w} height={v.h} rx={r} {...sp} filter="url(#shadow)" />
        <path
          d={`M${v.x + r},${v.y} H${v.x + 6} V${v.y + v.h} H${v.x + r} A${r},${r} 0 0 1 ${v.x},${v.y + v.h - r} V${v.y + r} A${r},${r} 0 0 1 ${v.x + r},${v.y} Z`}
          fill={pr.c}
        />
        <Label
          x={v.x + US_PAD + 4}
          y={v.y + 15}
          text={str(p.code, 'US')}
          size={11.5}
          weight={700}
          color={pr.c}
          anchor="start"
        />
        <rect
          x={v.x + v.w - US_PAD - pillW}
          y={v.y + 7}
          width={pillW}
          height={17}
          rx={8.5}
          fill={stt.c}
          opacity={0.14}
        />
        <Label x={v.x + v.w - US_PAD - pillW / 2} y={v.y + 15.5} text={stt.n} size={10.5} weight={600} color={stt.c} />
        {!editingAny && (
          <TextBlock
            ctx={ctx}
            text={storyText(p)}
            box={{ x: v.x + US_PAD + 4, y: v.y + 30, w: v.w - US_PAD * 2 - 4, h: v.h - 54 }}
            size={12.5}
            align="left"
            valign="top"
            lhK={1.35}
          />
        )}
        <path d={`M${v.x + 6},${v.y + v.h - 24} H${v.x + v.w}`} stroke="#E2E8F0" strokeWidth={1} />
        <Label
          x={v.x + US_PAD + 4}
          y={v.y + v.h - 12}
          text={`Ưu tiên ${pr.n} · ${num(p.points, 0)} SP`}
          size={10.5}
          color="#64748B"
          anchor="start"
        />
        {crit.length > 0 && (
          <Label
            x={v.x + v.w - US_PAD}
            y={v.y + v.h - 12}
            text={`✓ ${crit.filter((c) => c.done).length}/${crit.length} tiêu chí`}
            size={10.5}
            color={crit.every((c) => c.done) ? '#1F9D66' : '#64748B'}
            anchor="end"
          />
        )}
      </>
    );
  },
  measure: (ctx) => {
    const need = textHeight(storyText(ctx.props as P), 12.5, 400, ctx.view.w - US_PAD * 2 - 4, 1.35) + 64;
    return need > ctx.view.h ? { h: need } : null;
  },
  textRegions: (ctx) => {
    const v = ctx.view;
    const box = { x: v.x + US_PAD, y: v.y + 28, w: v.w - US_PAD * 2, h: 24 };
    return [
      propRegion(ctx, 'goal', box, { align: 'left', fontSize: 12.5, placeholder: 'Tôi muốn…' }),
      propRegion(ctx, 'role', box, { align: 'left', fontSize: 12.5, multiline: false, placeholder: 'Là (vai trò)…' }),
      propRegion(ctx, 'benefit', box, { align: 'left', fontSize: 12.5, placeholder: 'Để…' }),
      propRegion(ctx, 'code', { x: v.x + US_PAD, y: v.y + 4, w: 90, h: 22 }, { align: 'left', multiline: false }),
    ];
  },
  name: (ctx) => `${str((ctx.props as P).code)} ${str((ctx.props as P).goal)}`.trim(),
});

// ---------------- Image & Screen Capture ----------------

const IMAGE_FILTERS = [{ name: 'Ảnh', extensions: ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'] }];

/** Ghi ảnh vào hình: giữ chiều rộng, chỉnh chiều cao theo tỉ lệ ảnh. */
function setImage(tx: Tx, viewId: string, src: string, natW: number, natH: number, keepBox = false) {
  const v = tx.view(viewId);
  if (!v) return;
  const extra = v.shape === 'common.screenCapture' ? 22 : 0;
  const h = keepBox ? v.h : Math.round((v.w * natH) / Math.max(1, natW)) + extra;
  tx.setView(viewId, (cur) => ({ ...cur, h, props: { ...cur.props, src, natW, natH } }));
}

export async function pickImageInto(apply: (fn: (tx: Tx) => void) => void, viewId: string): Promise<boolean> {
  const files = await umlab.files.open({ filters: IMAGE_FILTERS });
  if (!files.length || !files[0].bytes) return false;
  try {
    const img = await normalizeImage(await bytesToDataUrl(files[0].bytes, files[0].name));
    apply((tx) => setImage(tx, viewId, img.src, img.w, img.h));
    return true;
  } catch (e) {
    toast(e instanceof Error ? e.message : String(e), { error: true });
    return false;
  }
}

export async function captureInto(apply: (fn: (tx: Tx) => void) => void, viewId: string): Promise<boolean> {
  const shot = await umlab.files.captureScreen();
  if (!shot) {
    toast('Không chụp được màn hình', { error: true });
    return false;
  }
  const cropped = await cropDialog(shot);
  if (!cropped) return false;
  const img = await normalizeImage(cropped);
  apply((tx) => {
    setImage(tx, viewId, img.src, img.w, img.h);
    tx.setViewProps(viewId, { caption: `Chụp màn hình · ${new Date().toLocaleString('vi-VN')}` });
  });
  return true;
}

async function pasteInto(apply: (fn: (tx: Tx) => void) => void, viewId: string): Promise<boolean> {
  try {
    for (const it of await navigator.clipboard.read()) {
      const t = it.types.find((x) => x.startsWith('image/'));
      if (!t) continue;
      const img = await normalizeImage(await blobToDataUrl(await it.getType(t)));
      apply((tx) => setImage(tx, viewId, img.src, img.w, img.h));
      return true;
    }
  } catch {
    /* không đọc được clipboard */
  }
  toast('Clipboard không có ảnh', { error: true });
  return false;
}

function imageBody(ctx: RenderCtx, box: { x: number; y: number; w: number; h: number }) {
  const p = ctx.props as P;
  const src = str(p.src);
  const fit = str(p.fit, 'contain');
  if (!src)
    return (
      <>
        <rect
          x={box.x}
          y={box.y}
          width={box.w}
          height={box.h}
          rx={6}
          fill="#F8FAFC"
          stroke="#94A3B8"
          strokeDasharray="5 4"
        />
        <Label
          x={box.x + box.w / 2}
          y={box.y + box.h / 2}
          text={ctx.view.shape === 'common.screenCapture' ? 'Nhấp đúp để chụp màn hình' : 'Nhấp đúp để chọn ảnh'}
          size={12}
          color="#64748B"
        />
      </>
    );
  return (
    <svg x={box.x} y={box.y} width={box.w} height={box.h} overflow="hidden">
      <image
        width="100%"
        height="100%"
        href={src}
        opacity={num(p.opacity, 1)}
        preserveAspectRatio={fit === 'cover' ? 'xMidYMid slice' : fit === 'fill' ? 'none' : 'xMidYMid meet'}
      />
    </svg>
  );
}

function ImageInspector({ view, apply, readOnly }: ShapeInspectorProps) {
  const capture = view.shape === 'common.screenCapture';
  const p = view.props as P;
  return (
    <div className="pgroup">
      <div className="pgroup-h">Ảnh</div>
      {p.src ? (
        <img
          src={str(p.src)}
          alt=""
          className="max-h-32 w-full rounded-md border border-line object-contain"
          style={{ background: 'var(--panel-2)' }}
        />
      ) : (
        <p className="text-[11.5px] text-muted">Chưa có ảnh.</p>
      )}
      {!readOnly && (
        <div className="flex flex-wrap gap-2">
          {capture ? (
            <Button size="sm" variant="outline" icon={<Camera />} onClick={() => void captureInto(apply, view.id)}>
              {p.src ? 'Chụp lại' : 'Chụp màn hình'}
            </Button>
          ) : (
            <Button size="sm" variant="outline" icon={<ImagePlus />} onClick={() => void pickImageInto(apply, view.id)}>
              {p.src ? 'Thay ảnh…' : 'Chọn ảnh…'}
            </Button>
          )}
          <Button size="sm" variant="outline" icon={<ClipboardPaste />} onClick={() => void pasteInto(apply, view.id)}>
            Dán ảnh
          </Button>
          {!!p.natW && (
            <Button
              size="sm"
              variant="outline"
              icon={<Maximize2 />}
              onClick={() =>
                apply((tx) => {
                  const s = fitSize(num(p.natW, 300), num(p.natH, 200), 1200);
                  tx.setView(view.id, { w: s.w, h: s.h + (capture ? 22 : 0) });
                })
              }
            >
              Kích thước gốc
            </Button>
          )}
        </div>
      )}
      <p className="text-[11.5px] text-muted">
        Ảnh được nén ≤ 1 MB và lưu trong sơ đồ. Có thể kéo tệp ảnh thả vào khung vẽ.
      </p>
    </div>
  );
}

const imageSchema = z.object({
  fit: z.enum(['contain', 'cover', 'fill']).describe('Hiển thị|opts:contain=Vừa khung;cover=Phủ kín;fill=Kéo giãn'),
  opacity: z.number().describe('Độ mờ (0–1)|step01'),
  alt: z.string().describe('Mô tả ảnh'),
});

registerShape({
  type: 'common.image',
  label: 'Image',
  icon: 'image',
  defaultSize: { w: 240, h: 160 },
  minSize: { w: 24, h: 24 },
  defaultProps: () => ({ src: '', fit: 'contain', opacity: 1, alt: '' }),
  propsSchema: imageSchema,
  styleFields: false,
  inspector: ImageInspector,
  render: (ctx) => imageBody(ctx, ctx.view),
  onPlaced: (v, api) => void pickImageInto(api.apply, v.id),
  onDoubleClick: (v, api) => {
    void pickImageInto(api.apply, v.id);
    return true;
  },
  name: (ctx) => str((ctx.props as P).alt) || 'Ảnh',
});

registerShape({
  type: 'common.screenCapture',
  label: 'Screen Capture',
  icon: 'screen-capture',
  defaultSize: { w: 320, h: 202 },
  minSize: { w: 60, h: 50 },
  defaultProps: () => ({ src: '', caption: '', fit: 'contain', opacity: 1, alt: '' }),
  defaultStyle: { stroke: '#94A3B8', strokeWidth: 1 },
  propsSchema: z.object({ caption: z.string().describe('Nhãn nguồn') }).merge(imageSchema),
  styleFields: ['stroke', 'strokeWidth'],
  inspector: ImageInspector,
  render: (ctx) => {
    const v = ctx.view;
    const cap = str((ctx.props as P).caption);
    return (
      <>
        <rect
          x={v.x}
          y={v.y}
          width={v.w}
          height={v.h}
          fill="#FFFFFF"
          stroke={ctx.style.stroke}
          strokeWidth={ctx.style.strokeWidth}
        />
        {imageBody(ctx, { x: v.x + 3, y: v.y + 3, w: v.w - 6, h: v.h - 25 })}
        {ctx.editing !== 'caption' && (
          <Label
            x={v.x + 8}
            y={v.y + v.h - 11}
            text={fitText(cap || 'Ảnh chụp màn hình', 11, 400, v.w - 16)}
            size={11}
            color="#64748B"
            anchor="start"
            italic
          />
        )}
      </>
    );
  },
  textRegions: (ctx) => [
    propRegion(
      ctx,
      'caption',
      { x: ctx.view.x + 4, y: ctx.view.y + ctx.view.h - 21, w: ctx.view.w - 8, h: 19 },
      { align: 'left', fontSize: 11, multiline: false },
    ),
  ],
  onPlaced: (v, api) => {
    void captureInto(api.apply, v.id).then((ok) => {
      if (!ok && !api.lookup.view(v.id)?.props.src) api.remove();
    });
  },
  onDoubleClick: (v, api) => {
    if (v.props.src) return false;
    void captureInto(api.apply, v.id);
    return true;
  },
  name: (ctx) => str((ctx.props as P).caption) || 'Ảnh chụp màn hình',
});

// ---------------- Diagram Info ----------------

const fmtDate = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(+d)) return '';
  const p2 = (n: number) => String(n).padStart(2, '0');
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
};

export function diagramInfoRows(lookup: EngineLookup, p: P): [string, string][] {
  const meta = lookup.diagram(lookup.diagramId);
  const proj = lookup.project?.() ?? null;
  const by = meta?.updatedBy ? proj?.members[meta.updatedBy] : '';
  const rows: [string, string][] = [
    ['Project', proj?.name ?? ''],
    ['Sơ đồ', meta?.name ?? ''],
    ['Tác giả', str(p.author) || proj?.ownerName || ''],
    ['Ngày tạo', fmtDate(meta?.createdAt)],
    ['Cập nhật', fmtDate(meta?.updatedAt) + (by ? ` · ${by}` : '')],
    ['Phiên bản', str(p.version, '1.0')],
  ];
  for (const r of (p.rows as { key: string; value: string }[] | undefined) ?? []) rows.push([r.key, r.value]);
  return rows;
}

const ROW_H = 22;
registerShape({
  type: 'common.diagramInfo',
  label: 'Diagram Info',
  icon: 'diagram-info',
  live: true,
  defaultSize: { w: 280, h: ROW_H * 6 },
  resizable: 'horizontal',
  defaultProps: () => ({ author: '', version: '1.0', rows: [] }),
  defaultStyle: { fill: '#FFFFFF', stroke: '#94A3B8', strokeWidth: 1 },
  propsSchema: z.object({
    author: z.string().describe('Tác giả (để trống = chủ project)'),
    version: z.string().describe('Phiên bản'),
    rows: z
      .array(z.object({ key: z.string().describe('Mục'), value: z.string().describe('Giá trị') }))
      .describe('Dòng thêm'),
  }),
  styleFields: ['fill', 'stroke'],
  render: (ctx) => {
    const v = ctx.view;
    const rows = diagramInfoRows(ctx.lookup, ctx.props as P);
    const kw = Math.round(v.w * 0.34);
    const sp = strokeProps(ctx);
    return (
      <>
        <rect x={v.x} y={v.y} width={v.w} height={v.h} {...sp} />
        <rect x={v.x} y={v.y} width={kw} height={v.h} fill="#F1F5F9" stroke="none" />
        <rect x={v.x} y={v.y} width={v.w} height={v.h} fill="none" stroke={sp.stroke} strokeWidth={sp.strokeWidth} />
        <path d={`M${v.x + kw},${v.y} V${v.y + v.h}`} stroke={sp.stroke} strokeWidth={sp.strokeWidth} />
        {rows.map(([k, val], i) => (
          <g key={i}>
            {i > 0 && (
              <path d={`M${v.x},${v.y + i * ROW_H} H${v.x + v.w}`} stroke={sp.stroke} strokeWidth={sp.strokeWidth} />
            )}
            <Label
              x={v.x + 8}
              y={v.y + i * ROW_H + ROW_H / 2}
              text={fitText(k, 11.5, 600, kw - 12)}
              size={11.5}
              weight={600}
              color="#334155"
              anchor="start"
            />
            <Label
              x={v.x + kw + 8}
              y={v.y + i * ROW_H + ROW_H / 2}
              text={fitText(val, 11.5, 400, v.w - kw - 14)}
              size={11.5}
              anchor="start"
            />
          </g>
        ))}
      </>
    );
  },
  measure: (ctx) => ({ h: diagramInfoRows(ctx.lookup, ctx.props as P).length * ROW_H }),
  name: () => 'Diagram Info',
});

// ---------------- đường nối chung: Generic Connector, Line ----------------

const MARKERS: [MarkerKind, string][] = [
  ['none', 'Không'],
  ['arrow-open', 'Mũi tên mở'],
  ['arrow-filled', 'Mũi tên đặc'],
  ['triangle-hollow', 'Tam giác rỗng'],
  ['diamond-hollow', 'Thoi rỗng'],
  ['diamond-filled', 'Thoi đặc'],
  ['circle-plus', 'Tròn ⊕'],
  ['dot-filled', 'Chấm đặc'],
  ['cross-x', 'Dấu X'],
  ['half-arrow', 'Nửa mũi tên'],
];
const markerEnum = (label: string) =>
  z
    .enum(MARKERS.map((m) => m[0]) as [MarkerKind, ...MarkerKind[]])
    .describe(`${label}|select|opts:${MARKERS.map(([k, n]) => `${k}=${n}`).join(';')}`);

export const genericConnProps = z.object({
  label: z.string().describe('Nhãn'),
  line: z.enum(['solid', 'dashed', 'dotted']).describe('Nét|opts:solid=Liền;dashed=Đứt;dotted=Chấm'),
  start: markerEnum('Đầu nguồn'),
  end: markerEnum('Đầu đích'),
});

export function genericLook(c: { props: P }): ConnLook {
  const p = c.props;
  return {
    line: (str(p.line, 'solid') as ConnLook['line']) ?? 'solid',
    start: (str(p.start, 'none') as MarkerKind) ?? 'none',
    end: (str(p.end, 'arrow-open') as MarkerKind) ?? 'arrow-open',
  };
}
export const genericLabels = (c: { props: P }) => {
  const t = str(c.props.label);
  return t ? [{ role: 'name', text: t, pos: 0.5, draggable: true }] : [];
};

registerConnector({
  kind: 'common.connector',
  label: 'Generic Connector',
  icon: 'generic-connector',
  look: (c) => genericLook(c),
  labels: (c) => genericLabels(c),
  defaultRouting: 'straight',
  selfLoop: true,
  defaultProps: () => ({ label: '', line: 'solid', start: 'none', end: 'none' }),
  defaultStyle: { stroke: '#475569', strokeWidth: 1.4 },
  propsSchema: genericConnProps,
});

registerConnector({
  kind: 'common.line',
  label: 'Line',
  icon: 'line',
  look: (c) => genericLook(c),
  labels: (c) => genericLabels(c),
  defaultRouting: 'straight',
  freeEnds: true,
  defaultProps: () => ({ label: '', line: 'solid', start: 'none', end: 'none' }),
  defaultStyle: { stroke: '#475569', strokeWidth: 1.6 },
  propsSchema: genericConnProps,
});
