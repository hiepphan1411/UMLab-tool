// Sơ đồ thử nghiệm `playground` (chỉ bản dev, P04 mục 4.12): 3 hình + 2 đường nối để kiểm engine độc lập với UML.
import { z } from 'zod';
import { registerEditor } from '../editor-registry';
import {
  CanvasEditor,
  registerConnector,
  registerPalette,
  registerRules,
  registerShape,
  type RenderCtx,
  type TextRegion,
} from '../engine';
import { TextLines, wrapText } from '../engine/text';

const textProps = z.object({ text: z.string().describe('Chữ|textarea'), fontSize: z.number().describe('Cỡ chữ') });
type TP = z.infer<typeof textProps>;

function label(ctx: RenderCtx<TP>, maxW: number) {
  const { view: v, props } = ctx;
  if (ctx.editing === 'text') return null;
  const t = wrapText(props.text, props.fontSize, 400, maxW);
  return (
    <TextLines
      lines={t.lines}
      x={v.x + v.w / 2}
      y={v.y + (v.h - t.height) / 2}
      size={props.fontSize}
      color="#1F2937"
      align="center"
      lh={t.lh}
    />
  );
}
const region = (ctx: RenderCtx<TP>): TextRegion[] => [
  {
    key: 'text',
    box: { x: ctx.view.x + 6, y: ctx.view.y + ctx.view.h / 2 - 12, w: ctx.view.w - 12, h: 24 },
    value: ctx.props.text,
    multiline: true,
    fontSize: ctx.props.fontSize,
    commit: (tx, value) => tx.setViewProps(ctx.view.id, { text: value }),
  },
];

registerShape<TP>({
  type: 'pg.box',
  label: 'Hộp',
  icon: 'rectangle',
  defaultSize: { w: 140, h: 70 },
  defaultProps: () => ({ text: 'Hộp', fontSize: 13 }),
  defaultStyle: { fill: '#FFFFFF', stroke: '#4A6FA5', strokeWidth: 1.5, radius: 8 },
  propsSchema: textProps,
  styleFields: ['fill', 'stroke', 'strokeWidth', 'radius', 'dash'],
  render: (ctx) => (
    <>
      <rect
        x={ctx.view.x}
        y={ctx.view.y}
        width={ctx.view.w}
        height={ctx.view.h}
        rx={Number(ctx.style.radius ?? 8)}
        fill={ctx.style.fill}
        stroke={ctx.style.stroke}
        strokeWidth={ctx.style.strokeWidth}
        strokeDasharray={ctx.style.dash ? '6 4' : undefined}
      />
      {label(ctx, ctx.view.w - 16)}
    </>
  ),
  textRegions: region,
  catalog: [{ connector: 'pg.arrow', shape: 'pg.box', label: 'Mũi tên → Hộp' }],
});

registerShape<TP>({
  type: 'pg.circle',
  label: 'Tròn',
  icon: 'oval',
  outline: 'ellipse',
  aspectLock: true,
  defaultSize: { w: 80, h: 80 },
  defaultProps: () => ({ text: 'Tròn', fontSize: 13 }),
  defaultStyle: { fill: '#E7EEFD', stroke: '#2E62E6', strokeWidth: 1.5 },
  propsSchema: textProps,
  render: (ctx) => (
    <>
      <ellipse
        cx={ctx.view.x + ctx.view.w / 2}
        cy={ctx.view.y + ctx.view.h / 2}
        rx={ctx.view.w / 2}
        ry={ctx.view.h / 2}
        fill={ctx.style.fill}
        stroke={ctx.style.stroke}
        strokeWidth={ctx.style.strokeWidth}
      />
      {label(ctx, ctx.view.w * 0.7)}
    </>
  ),
  textRegions: region,
});

registerShape<{ title: string }>({
  type: 'pg.container',
  label: 'Khung chứa',
  icon: 'package',
  defaultSize: { w: 320, h: 200 },
  container: { accepts: '*', autoGrow: true, padding: 16, header: 24 },
  defaultProps: () => ({ title: 'Khung' }),
  defaultStyle: { fill: '#F6F3EE', stroke: '#B5B0A8', strokeWidth: 1.25 },
  propsSchema: z.object({ title: z.string().describe('Tiêu đề') }),
  render: ({ view: v, props, style, editing }) => (
    <>
      <rect
        x={v.x}
        y={v.y}
        width={v.w}
        height={v.h}
        rx={10}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        strokeDasharray="6 4"
      />
      {editing !== 'title' && (
        <text x={v.x + 12} y={v.y + 20} fontSize={13} fontWeight={600} fill="#1F2937">
          {props.title}
        </text>
      )}
    </>
  ),
  textRegions: (ctx) => [
    {
      key: 'title',
      box: { x: ctx.view.x + 8, y: ctx.view.y + 4, w: Math.min(ctx.view.w - 16, 220), h: 22 },
      value: ctx.props.title,
      align: 'left',
      fontSize: 13,
      fontWeight: 600,
      commit: (tx, value) => tx.setViewProps(ctx.view.id, { title: value }),
    },
  ],
});

registerConnector({
  kind: 'pg.arrow',
  label: 'Mũi tên',
  icon: 'connector',
  look: { line: 'solid', start: 'none', end: 'arrow-filled' },
  defaultRouting: 'orthogonal',
  labels: (c) =>
    c.labels.filter((l) => l.text).map((l) => ({ role: l.role, text: l.text, pos: l.pos, draggable: true })),
  selfLoop: true,
  allow: (s, t) =>
    s.view.shape === 'pg.container' || t.view.shape === 'pg.container' ? 'Không nối vào khung chứa' : true,
});

registerConnector({
  kind: 'pg.dashed',
  label: 'Nét đứt',
  icon: 'dependency',
  look: { line: 'dashed', start: 'none', end: 'arrow-open', stereotype: 'use' },
  defaultRouting: 'straight',
});

registerPalette('playground', [
  { id: 'shapes', items: [{ id: 'pg.box' }, { id: 'pg.circle' }, { id: 'pg.container' }] },
  { id: 'links', items: [{ id: 'pg.arrow' }, { id: 'pg.dashed' }] },
]);

registerRules('playground', [
  ({ views, conns }) =>
    views
      .filter(
        (v) => v.shape !== 'pg.container' && !conns.some((c) => c.source.viewId === v.id || c.target.viewId === v.id),
      )
      .map((v) => ({
        level: 'warning' as const,
        message: `Hình “${String(v.props.text ?? '')}” chưa nối với hình nào`,
        targetId: v.id,
      })),
]);

registerEditor('playground', (p) => <CanvasEditor {...p} />);
