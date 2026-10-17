// Hình của sơ đồ kiến trúc — port renderEl / renderEdge của tool cũ (group, node, icon, edge).
// Thuộc tính giữ đúng tên của định dạng cũ để migrate legacy (core/format/legacy.ts) hiển thị y hệt.
import { registerConnector, registerShape, type RenderCtx, type TextRegion, type Tx } from '../engine/registry';
import { layoutText, TextLines } from '../engine/text';
import { dashArray } from '../shapes/common/helpers';
import { IconGlyph } from './icons';
import { CardInspector, GroupInspector, IconInspector, LinkInspector } from './inspector';

import type { CardIcon } from './presets';
export { GROUP_PRESETS, NODE_PRESETS, type CardIcon } from './presets';
type P = Record<string, unknown>;
const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);
const str = (v: unknown, d = '') => (v === undefined || v === null ? d : String(v));

function stroked(ctx: RenderCtx) {
  const s = ctx.style;
  const sw = num(s.strokeWidth, 1.5);
  return {
    fill: s.fill || 'none',
    stroke: s.stroke || 'none',
    strokeWidth: sw,
    strokeDasharray: s.dash ? dashArray(sw) : undefined,
  };
}

// ---------------- Nhóm / Khung ----------------

const GROUP_PAD = 12;
function groupTitle(ctx: RenderCtx) {
  const v = ctx.view;
  const p = ctx.props as P;
  const size = num(p.titleSize, 14);
  const weight = num(p.titleWeight, 500);
  const lines = str(p.title) ? layoutText(str(p.title), size, weight, v.w - GROUP_PAD * 2) : [];
  const align = str(p.titleAlign, 'left') === 'center' ? 'center' : 'left';
  return { lines, size, weight, lh: size * 1.3, align: align as 'left' | 'center' };
}

registerShape({
  type: 'arch.group',
  label: 'Nhóm / Khung',
  icon: 'arch-group',
  defaultSize: { w: 420, h: 220 },
  minSize: { w: 40, h: 30 },
  container: { accepts: '*', padding: 12, header: 30 },
  defaultProps: () => ({
    title: 'TÊN NHÓM',
    titleSize: 14,
    titleWeight: 500,
    titleColor: '#1F2937',
    titleAlign: 'left',
  }),
  defaultStyle: { fill: '#ECEAE6', stroke: '#B5B0A8', strokeWidth: 1.25, dash: true, radius: 12 },
  styleFields: ['fill', 'stroke', 'strokeWidth', 'radius', 'dash'],
  inspector: GroupInspector,
  render: (ctx) => {
    const v = ctx.view;
    const t = groupTitle(ctx);
    const x = t.align === 'center' ? v.x + v.w / 2 : v.x + GROUP_PAD;
    return (
      <>
        <rect x={v.x} y={v.y} width={v.w} height={v.h} rx={num(ctx.style.radius, 12)} {...stroked(ctx)} />
        {ctx.editing !== 'title' && t.lines.length > 0 && (
          <TextLines
            lines={t.lines}
            x={x}
            y={v.y + 7}
            size={t.size}
            color={str((ctx.props as P).titleColor, '#1F2937')}
            align={t.align}
            lh={t.lh}
          />
        )}
      </>
    );
  },
  textRegions: (ctx) => {
    const v = ctx.view;
    const t = groupTitle(ctx);
    return [
      {
        key: 'title',
        box: { x: v.x + 6, y: v.y + 4, w: v.w - 12, h: Math.max(1, t.lines.length) * t.lh + 6 },
        value: str((ctx.props as P).title),
        multiline: true,
        align: t.align,
        fontSize: t.size,
        fontWeight: t.weight,
        commit: (tx: Tx, value: string) => tx.setViewProps(v.id, { title: value }),
      },
    ];
  },
  name: (ctx) =>
    str((ctx.props as P).name) ||
    str((ctx.props as P).title, 'Nhóm')
      .replace(/\*\*/g, '')
      .split('\n')[0],
});

// ---------------- Thẻ thành phần ----------------

interface CardLayout {
  icons: { k: string; c?: string; sw?: number; x: number; y: number }[];
  isz: number;
  title: {
    lines: ReturnType<typeof layoutText>;
    x: number;
    y: number;
    w: number;
    lh: number;
    size: number;
    weight: number;
  };
  sub: { lines: ReturnType<typeof layoutText>; x: number; y: number; w: number; lh: number; size: number };
  align: 'left' | 'center';
}

/** Bố cục thẻ (giống hệt renderEl 'node' của tool cũ) — dùng chung cho vẽ và vùng sửa chữ. */
export function cardLayout(v: { x: number; y: number; w: number; h: number }, p: P): CardLayout {
  const layout = str(p.layout, 'left');
  const icons = layout === 'none' ? [] : (((p.icons as CardIcon[]) ?? []).filter((i) => i && i.k) as CardIcon[]);
  const isz = num(p.iconSize, 30);
  const gap = Math.round(isz * 0.28);
  const iconsW = icons.length ? icons.length * isz + (icons.length - 1) * gap : 0;
  const titleSize = num(p.titleSize, 15);
  const titleWeight = num(p.titleWeight, 500);
  const subSize = num(p.subSize, 13);
  const tlh = titleSize * 1.25;
  const slh = subSize * 1.3;
  const align = str(p.textAlign, 'center') === 'left' ? 'left' : 'center';
  const title = str(p.title);
  const subtitle = str(p.subtitle);
  const placed: CardLayout['icons'] = [];
  if (layout === 'top' || !icons.length) {
    const tw = v.w - 16;
    const tl = title ? layoutText(title, titleSize, titleWeight, tw) : [];
    const sl = subtitle ? layoutText(subtitle, subSize, 400, tw) : [];
    const textH = tl.length * tlh + sl.length * slh + (tl.length && sl.length ? 2 : 0);
    const ih = icons.length ? isz + 7 : 0;
    let y = v.y + (v.h - ih - textH) / 2;
    let ix = v.x + (v.w - iconsW) / 2;
    for (const ic of icons) {
      placed.push({ ...ic, x: ix, y });
      ix += isz + gap;
    }
    y += ih;
    const tx = align === 'center' ? v.x + v.w / 2 : v.x + 8;
    const ty = y;
    y += tl.length * tlh + (tl.length && sl.length ? 2 : 0);
    return {
      icons: placed,
      isz,
      align,
      title: { lines: tl, x: tx, y: ty, w: tw, lh: tlh, size: titleSize, weight: titleWeight },
      sub: { lines: sl, x: tx, y, w: tw, lh: slh, size: subSize },
    };
  }
  const padL = 12;
  const x0 = v.x + padL + iconsW + 10;
  const tw = v.x + v.w - 10 - x0;
  let ix = v.x + padL;
  for (const ic of icons) {
    placed.push({ ...ic, x: ix, y: v.y + (v.h - isz) / 2 });
    ix += isz + gap;
  }
  const tl = title ? layoutText(title, titleSize, titleWeight, tw) : [];
  const sl = subtitle ? layoutText(subtitle, subSize, 400, tw) : [];
  const textH = tl.length * tlh + sl.length * slh + (tl.length && sl.length ? 2 : 0);
  let y = v.y + (v.h - textH) / 2;
  const tx = align === 'center' ? x0 + tw / 2 : x0;
  const ty = y;
  y += tl.length * tlh + (tl.length && sl.length ? 2 : 0);
  return {
    icons: placed,
    isz,
    align,
    title: { lines: tl, x: tx, y: ty, w: tw, lh: tlh, size: titleSize, weight: titleWeight },
    sub: { lines: sl, x: tx, y, w: tw, lh: slh, size: subSize },
  };
}

export const CARD_DEFAULTS = {
  title: 'Thành phần',
  subtitle: '(mô tả ngắn)',
  icons: [{ k: 'lucide:server', c: '#3B5F94' }] as CardIcon[],
  layout: 'left',
  iconSize: 30,
  textAlign: 'center',
  titleSize: 15,
  titleWeight: 500,
  subSize: 13,
  textColor: '#1F2937',
  subColor: '#374151',
  shadow: true,
};

registerShape({
  type: 'arch.card',
  label: 'Thẻ icon trái',
  icon: 'arch-card-left',
  defaultSize: { w: 200, h: 64 },
  minSize: { w: 40, h: 24 },
  defaultProps: () => ({ ...CARD_DEFAULTS, icons: CARD_DEFAULTS.icons.map((i) => ({ ...i })) }),
  defaultStyle: { fill: '#FFFFFF', stroke: '#4A6FA5', strokeWidth: 1.5, dash: false, radius: 8 },
  styleFields: ['fill', 'stroke', 'strokeWidth', 'radius', 'dash'],
  inspector: CardInspector,
  render: (ctx) => {
    const v = ctx.view;
    const p = ctx.props as P;
    const L = cardLayout(v, p);
    return (
      <>
        <rect
          x={v.x}
          y={v.y}
          width={v.w}
          height={v.h}
          rx={num(ctx.style.radius, 8)}
          {...stroked(ctx)}
          filter={p.shadow ? 'url(#shadow)' : undefined}
        />
        {L.icons.map((ic, i) => (
          <IconGlyph key={i} k={ic.k} x={ic.x} y={ic.y} size={L.isz} color={ic.c} stroke={ic.sw || 2} />
        ))}
        {ctx.editing !== 'title' && (
          <TextLines
            lines={L.title.lines}
            x={L.title.x}
            y={L.title.y}
            size={L.title.size}
            color={str(p.textColor, '#1F2937')}
            align={L.align}
            lh={L.title.lh}
          />
        )}
        {ctx.editing !== 'subtitle' && (
          <TextLines
            lines={L.sub.lines}
            x={L.sub.x}
            y={L.sub.y}
            size={L.sub.size}
            color={str(p.subColor, '#374151')}
            align={L.align}
            lh={L.sub.lh}
          />
        )}
      </>
    );
  },
  textRegions: (ctx) => {
    const v = ctx.view;
    const L = cardLayout(v, ctx.props as P);
    const left = (b: { x: number; w: number }) => (L.align === 'center' ? b.x - b.w / 2 : b.x);
    const reg = (
      key: 'title' | 'subtitle',
      b: CardLayout['title'] | CardLayout['sub'],
      weight: number,
    ): TextRegion => ({
      key,
      box: { x: left(b) - 3, y: b.y - 2, w: b.w + 6, h: Math.max(1, b.lines.length) * b.lh + 4 },
      value: str((ctx.props as P)[key]),
      multiline: true,
      align: L.align,
      fontSize: b.size,
      fontWeight: weight,
      placeholder: key === 'title' ? 'Tiêu đề' : 'Mô tả',
      commit: (tx: Tx, value: string) => tx.setViewProps(v.id, { [key]: value }),
    });
    const sub = L.sub.lines.length
      ? L.sub
      : { ...L.sub, y: L.title.y + Math.max(1, L.title.lines.length) * L.title.lh + 2, lines: [] };
    return [reg('title', L.title, L.title.weight), reg('subtitle', sub, 400)];
  },
  name: (ctx) =>
    str((ctx.props as P).name) ||
    str((ctx.props as P).title, 'Thẻ')
      .replace(/\*\*/g, '')
      .split('\n')[0],
});

// ---------------- Icon đơn ----------------

registerShape({
  type: 'arch.icon',
  label: 'Icon',
  icon: 'arch-icon',
  defaultSize: { w: 40, h: 40 },
  minSize: { w: 12, h: 12 },
  aspectLock: true,
  defaultProps: () => ({ icon: 'lucide:box', color: '#334155' }),
  styleFields: false,
  inspector: IconInspector,
  render: (ctx) => {
    const v = ctx.view;
    const p = ctx.props as P;
    const sz = Math.min(v.w, v.h);
    return (
      <>
        <rect x={v.x} y={v.y} width={v.w} height={v.h} fill="transparent" />
        <IconGlyph
          k={str(p.icon, 'lucide:box')}
          x={v.x + (v.w - sz) / 2}
          y={v.y + (v.h - sz) / 2}
          size={sz}
          color={str(p.color) || null}
          stroke={num(p.sw, 2)}
        />
      </>
    );
  },
  name: (ctx) =>
    str((ctx.props as P).name) ||
    'Icon ' +
      str((ctx.props as P).icon)
        .split(':')
        .pop(),
});

// ---------------- Liên kết ----------------

registerConnector({
  kind: 'arch.link',
  label: 'Liên kết',
  icon: 'connector',
  look: (c) => {
    const p = c.props as P;
    return {
      line: p.dash ? 'dashed' : 'solid',
      start: p.arrowStart ? 'arrow-filled' : 'none',
      end: p.arrowEnd === false ? 'none' : 'arrow-filled',
    };
  },
  defaultRouting: 'orthogonal',
  selfLoop: false,
  defaultProps: () => ({ dash: false, arrowStart: false, arrowEnd: true, radius: 8 }),
  defaultStyle: { stroke: '#B5602E', strokeWidth: 1.6 },
  inspector: LinkInspector,
});
