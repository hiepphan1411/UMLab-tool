// Vẽ mindmap thành SVG — dùng chung cho canvas trực tiếp (có id để bắt sự kiện) và ảnh xuất / ảnh thu nhỏ (nền sáng).
import { renderToStaticMarkup } from 'react-dom/server';
import { useEffect, useState } from 'react';
import { mindColor, type MindmapData, type MindNode } from '@umlab/core';
import { FONT_CSS } from '../engine/roboto-font';
import { DIAGRAM_FONT } from '../engine/text';
import { computeLayout, edgePath, type MindLayout, type NodeBox } from './layout';

export interface MindPal {
  dark: boolean;
  card: string;
  text: string;
  muted: string;
  onColor: string;
  sel: string;
  hit: string;
  drop: string;
  rootA: string;
  rootB: string;
  shadow: string;
}

export const MPAL_L: MindPal = {
  dark: false,
  card: '#FFFFFF',
  text: '#1B2130',
  muted: '#5F6779',
  onColor: '#FFFFFF',
  sel: '#2E62E6',
  hit: '#F5B700',
  drop: '#16A34A',
  rootA: '#1E3A8A',
  rootB: '#2E62E6',
  shadow: '#0F172A',
};
export const MPAL_D: MindPal = {
  dark: true,
  card: '#1D2027',
  text: '#E5E8EF',
  muted: '#9AA3B5',
  onColor: '#FFFFFF',
  sel: '#8AAEFF',
  hit: '#FFC93C',
  drop: '#3CC48A',
  rootA: '#1E3A8A',
  rootB: '#4F7BF0',
  shadow: '#000000',
};

function currentPal(): MindPal {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--panel').trim().toLowerCase();
  return v && v !== '#ffffff' && v !== '#fff' ? MPAL_D : MPAL_L;
}

export function useMindPal(): MindPal {
  const [p, setP] = useState<MindPal>(() => currentPal());
  useEffect(() => {
    const upd = () => setP(currentPal());
    const mo = new MutationObserver(upd);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    const mq = matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', upd);
    return () => {
      mo.disconnect();
      mq.removeEventListener('change', upd);
    };
  }, []);
  return p;
}

export interface SceneState {
  sel?: string | null;
  /** Node khớp tìm kiếm (null = không tìm). */
  hits?: Set<string> | null;
  /** Node đích khi kéo thả đổi cha. */
  drop?: string | null;
  /** Node đang kéo (vẽ mờ). */
  dragging?: Set<string> | null;
  interactive?: boolean;
}

const KIND_LABEL: Record<string, string> = { question: '?', note: '!' };

function NodeShape({ n, b, color, P, st }: { n: MindNode; b: NodeBox; color: string; P: MindPal; st: SceneState }) {
  const x = b.x - b.w / 2;
  const y = b.y - b.h / 2;
  const dim = st.hits && !st.hits.has(n.id) ? 0.28 : st.dragging?.has(n.id) ? 0.55 : 1;
  const filled = b.depth <= 1;
  const rx = b.depth === 0 ? 18 : b.depth === 1 ? 12 : 9;
  const tc = filled ? P.onColor : P.text;
  const sc = filled ? 'rgba(255,255,255,.86)' : P.muted;
  const tx = b.depth === 0 ? b.x : x + b.padX + b.extraL;
  const anchor = b.depth === 0 ? 'middle' : 'start';
  let ty = y + b.padY + b.titleSize * 0.98;
  const lh = b.titleSize * 1.28;
  const sumY0 = y + b.padY + b.titleLines.length * lh + 6 + b.sumSize * 0.98;
  const hasDetail = !!n.detail.trim();
  return (
    <g
      data-node={st.interactive ? n.id : undefined}
      opacity={dim}
      style={st.interactive ? { cursor: 'pointer' } : undefined}
    >
      {b.depth === 0 && (
        <defs>
          <linearGradient id="mm-root-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={P.rootA} />
            <stop offset="1" stopColor={P.rootB} />
          </linearGradient>
        </defs>
      )}
      {filled && (
        <rect x={x} y={y + 2.5} width={b.w} height={b.h} rx={rx} fill={P.shadow} opacity={P.dark ? 0.35 : 0.12} />
      )}
      <rect
        x={x}
        y={y}
        width={b.w}
        height={b.h}
        rx={rx}
        fill={b.depth === 0 ? 'url(#mm-root-g)' : filled ? color : P.card}
        stroke={filled ? 'none' : color}
        strokeWidth={filled ? 0 : 1.5}
        strokeDasharray={n.kind === 'question' && !filled ? '5 3.5' : undefined}
      />
      {!filled && (
        <rect
          x={x}
          y={y}
          width={b.w}
          height={b.h}
          rx={rx}
          fill={color}
          opacity={n.kind === 'note' ? (P.dark ? 0.22 : 0.13) : P.dark ? 0.12 : 0.06}
          pointerEvents="none"
        />
      )}
      {b.extraL > 0 && (
        <g>
          <circle cx={x + b.padX + 8} cy={y + b.padY + b.titleSize * 0.62} r={9} fill={color} />
          <text
            x={x + b.padX + 8}
            y={y + b.padY + b.titleSize * 0.62 + 4.2}
            textAnchor="middle"
            fontSize={12}
            fontWeight={700}
            fill={P.onColor}
          >
            {KIND_LABEL[n.kind] ?? '?'}
          </text>
        </g>
      )}
      <text fontSize={b.titleSize} fontWeight={b.depth === 0 ? 700 : b.depth === 1 ? 700 : 600} fill={tc}>
        {b.titleLines.map((l, i) => {
          const yy = ty;
          ty += lh;
          return (
            <tspan key={i} x={tx} y={yy} textAnchor={anchor}>
              {l}
            </tspan>
          );
        })}
      </text>
      {b.sumLines.length > 0 && (
        <text fontSize={b.sumSize} fill={sc}>
          {b.sumLines.map((l, i) => (
            <tspan key={i} x={tx} y={sumY0 + i * b.sumSize * 1.38} textAnchor={anchor}>
              {l}
            </tspan>
          ))}
        </text>
      )}
      {hasDetail && b.depth > 0 && (
        <g pointerEvents="none">
          <circle
            cx={x + b.w - 1}
            cy={y + 1}
            r={5.5}
            fill={filled ? P.card : color}
            stroke={filled ? color : P.card}
            strokeWidth={1.5}
          />
        </g>
      )}
      {st.drop === n.id && (
        <rect
          x={x - 5}
          y={y - 5}
          width={b.w + 10}
          height={b.h + 10}
          rx={rx + 4}
          fill="none"
          stroke={P.drop}
          strokeWidth={2.5}
          strokeDasharray="6 4"
        />
      )}
      {st.hits?.has(n.id) && (
        <rect
          x={x - 4}
          y={y - 4}
          width={b.w + 8}
          height={b.h + 8}
          rx={rx + 3}
          fill="none"
          stroke={P.hit}
          strokeWidth={3}
        />
      )}
      {st.sel === n.id && (
        <rect
          x={x - 4}
          y={y - 4}
          width={b.w + 8}
          height={b.h + 8}
          rx={rx + 3}
          fill="none"
          stroke={P.sel}
          strokeWidth={2.2}
        />
      )}
    </g>
  );
}

function Toggle({ b, color, P, interactive }: { b: NodeBox; color: string; P: MindPal; interactive?: boolean }) {
  if (!b.hasKids || b.depth === 0) return null;
  const cx = b.x + (b.dir * b.w) / 2 + b.dir * 10;
  const cy = b.y;
  return (
    <g data-toggle={interactive ? b.id : undefined} style={interactive ? { cursor: 'pointer' } : undefined}>
      {b.hidden > 0 ? (
        <>
          <circle cx={cx + b.dir * 4} cy={cy} r={10.5} fill={color} />
          <text x={cx + b.dir * 4} y={cy + 3.8} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={P.onColor}>
            {b.hidden > 99 ? '99+' : b.hidden}
          </text>
        </>
      ) : interactive ? (
        <g className="mm-tg">
          <circle cx={cx} cy={cy} r={7} fill={P.card} stroke={color} strokeWidth={1.4} />
          <path d={`M${cx - 3.2},${cy}h6.4`} stroke={color} strokeWidth={1.6} strokeLinecap="round" />
        </g>
      ) : null}
    </g>
  );
}

export function MindScene({ d, L, P, st }: { d: MindmapData; L: MindLayout; P: MindPal; st: SceneState }) {
  const t = L.tree;
  const colors = new Map(L.order.map((id) => [id, mindColor(t, id)]));
  return (
    <g style={{ fontFamily: DIAGRAM_FONT }}>
      <g fill="none" strokeLinecap="round">
        {L.edges.map((e) => {
          const a = L.boxes.get(e.from)!;
          const b = L.boxes.get(e.to)!;
          const dim = st.hits && !(st.hits.has(e.to) || st.hits.has(e.from)) ? 0.25 : 1;
          return (
            <path
              key={e.to}
              d={edgePath(a, b)}
              stroke={colors.get(e.to)}
              strokeWidth={b.depth === 1 ? 3.4 : b.depth === 2 ? 2.2 : 1.6}
              opacity={dim * (b.depth === 1 ? 0.9 : 0.75)}
            />
          );
        })}
      </g>
      {L.order.map((id) => {
        const n = t.byId.get(id)!;
        const b = L.boxes.get(id)!;
        return (
          <g key={id}>
            <NodeShape n={n} b={b} color={colors.get(id)!} P={P} st={st} />
            <Toggle b={b} color={colors.get(id)!} P={P} interactive={st.interactive} />
          </g>
        );
      })}
      {d.nodes.length === 0 && null}
    </g>
  );
}

/** SVG đầy đủ của mindmap (nền sáng) cho xuất ảnh. */
export function mindExportSVG(d: MindmapData, o: { padding: number; bg: string | null; embedFont?: boolean }) {
  const L = computeLayout(d);
  const pad = o.padding;
  const W = Math.ceil(L.bounds.w + pad * 2 + 30);
  const H = Math.ceil(L.bounds.h + pad * 2 + 10);
  const body = renderToStaticMarkup(<MindScene d={d} L={L} P={MPAL_L} st={{}} />);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    (o.embedFont ? `<style>${FONT_CSS}</style>` : '') +
    (o.bg ? `<rect width="100%" height="100%" fill="${o.bg}"/>` : '') +
    `<g transform="translate(${pad + 15 - L.bounds.x},${pad + 5 - L.bounds.y})">${body}</g></svg>`;
  return { svg, W, H };
}

/** Ảnh thu nhỏ 320×200 cho dashboard. */
export function mindThumbSVG(d: MindmapData): string {
  const L = computeLayout(d);
  const s = Math.min(300 / Math.max(1, L.bounds.w), 180 / Math.max(1, L.bounds.h), 1);
  const body = renderToStaticMarkup(<MindScene d={d} L={L} P={MPAL_L} st={{}} />);
  const tx = 160 - (L.bounds.x + L.bounds.w / 2) * s;
  const ty = 100 - (L.bounds.y + L.bounds.h / 2) * s;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200"><rect width="320" height="200" fill="#FFFFFF"/><g transform="translate(${tx},${ty}) scale(${s})">${body}</g></svg>`;
}
