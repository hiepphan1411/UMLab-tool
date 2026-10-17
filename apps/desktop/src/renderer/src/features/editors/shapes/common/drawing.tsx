// Nhóm D của spec/notation-common.md: vẽ tay (Pencil, Pen, Calligraphy) + Connector vuông góc tự do.
// Điểm lưu ở toạ độ tương đối 0..1 trong hộp của hình → đổi kích thước hình là co giãn nét theo.
import { getStroke } from 'perfect-freehand';
import { z } from 'zod';
import type { Pt } from '../../engine/geometry';
import { segDist } from '../../engine/geometry';
import { registerConnector, registerShape, type PenPoint } from '../../engine/registry';
import { penSeg } from '../../engine/overlay';
import { genericConnProps, genericLabels, genericLook } from './organize';

type P = Record<string, unknown>;
const r3 = (v: number) => Math.round(v * 1000) / 1000;

/** Ramer–Douglas–Peucker: bỏ điểm gần như thẳng hàng. */
export function simplify(pts: Pt[], eps: number): Pt[] {
  if (pts.length < 3) return pts;
  let idx = 0;
  let max = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = segDist(pts[i], pts[0], pts[pts.length - 1]);
    if (d > max) {
      max = d;
      idx = i;
    }
  }
  if (max <= eps) return [pts[0], pts[pts.length - 1]];
  return [...simplify(pts.slice(0, idx + 1), eps).slice(0, -1), ...simplify(pts.slice(idx), eps)];
}

/** Làm mượt Chaikin (giữ hai đầu). */
export function chaikin(pts: Pt[], iter = 2): Pt[] {
  let out = pts;
  for (let k = 0; k < iter && out.length > 2; k++) {
    const n: Pt[] = [out[0]];
    for (let i = 0; i < out.length - 1; i++) {
      const [a, b] = [out[i], out[i + 1]];
      n.push(
        [0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]],
        [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]],
      );
    }
    n.push(out[out.length - 1]);
    out = n;
  }
  return out;
}

/** Hộp bao + điểm chuẩn hoá 0..1. */
function normalize(pts: Pt[], pad: number) {
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  for (const [x, y] of pts) {
    x1 = Math.min(x1, x);
    y1 = Math.min(y1, y);
    x2 = Math.max(x2, x);
    y2 = Math.max(y2, y);
  }
  x1 -= pad;
  y1 -= pad;
  const w = Math.max(8, x2 - x1 + pad);
  const h = Math.max(8, y2 - y1 + pad);
  return {
    x: Math.round(x1),
    y: Math.round(y1),
    w: Math.round(w),
    h: Math.round(h),
    norm: (p: Pt): Pt => [r3((p[0] - x1) / w), r3((p[1] - y1) / h)],
  };
}

const scaled = (v: { x: number; y: number; w: number; h: number }, pts: Pt[]): Pt[] =>
  pts.map(([u, t]) => [v.x + u * v.w, v.y + t * v.h]);

/** Path mượt qua các điểm (trung điểm + Q). */
function smoothPath(p: Pt[]): string {
  if (!p.length) return '';
  if (p.length < 3) return `M${p.map((q) => q.join(',')).join(' L')}`;
  let d = `M${p[0][0]},${p[0][1]}`;
  for (let i = 1; i < p.length - 1; i++) {
    const mx = (p[i][0] + p[i + 1][0]) / 2;
    const my = (p[i][1] + p[i + 1][1]) / 2;
    d += ` Q${p[i][0]},${p[i][1]} ${mx},${my}`;
  }
  const l = p[p.length - 1];
  return d + ` L${l[0]},${l[1]}`;
}

const nearPolyline = (pts: Pt[], x: number, y: number, tol: number) => {
  for (let i = 1; i < pts.length; i++) if (segDist([x, y], pts[i - 1], pts[i]) <= tol) return true;
  return false;
};

// ---------------- Pencil ----------------

registerShape({
  type: 'common.pencil',
  label: 'Pencil',
  icon: 'pencil',
  defaultSize: { w: 120, h: 60 },
  minSize: { w: 6, h: 6 },
  noPorts: true,
  outline: 'none',
  defaultProps: () => ({ pts: [] }),
  defaultStyle: { stroke: '#1F2937', strokeWidth: 2, fill: 'none' },
  styleFields: ['stroke', 'strokeWidth', 'dash'],
  ink: (raw) => {
    if (raw.length < 2) return null;
    const pts = chaikin(simplify(raw, 1.2), 2);
    const b = normalize(pts, 3);
    return { x: b.x, y: b.y, w: b.w, h: b.h, props: { pts: pts.map(b.norm) } };
  },
  render: (ctx) => {
    const pts = scaled(ctx.view, ((ctx.props as P).pts as Pt[]) ?? []);
    return (
      <>
        <path d={smoothPath(pts)} fill="none" stroke="transparent" strokeWidth={12} />
        <path
          d={smoothPath(pts)}
          fill="none"
          stroke={ctx.style.stroke}
          strokeWidth={ctx.style.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={ctx.style.dash ? `${ctx.style.strokeWidth * 3} ${ctx.style.strokeWidth * 2.5}` : undefined}
        />
      </>
    );
  },
  hitTest: (v, x, y) => nearPolyline(scaled(v, (v.props.pts as Pt[]) ?? []), x, y, 6),
  name: () => 'Nét vẽ tay',
});

// ---------------- Pen (bezier) ----------------

registerShape({
  type: 'common.pen',
  label: 'Pen',
  icon: 'pen',
  defaultSize: { w: 120, h: 80 },
  minSize: { w: 6, h: 6 },
  noPorts: true,
  outline: 'none',
  defaultProps: () => ({ nodes: [], closed: false }),
  defaultStyle: { stroke: '#1F2937', strokeWidth: 2, fill: 'none' },
  propsSchema: z.object({ closed: z.boolean().describe('Khép kín') }),
  styleFields: ['fill', 'stroke', 'strokeWidth', 'dash'],
  pen: (nodes, closed) => {
    const all: Pt[] = [];
    for (const n of nodes) {
      all.push([n.x, n.y]);
      if (n.cx !== undefined && n.cy !== undefined) all.push([n.cx, n.cy], [2 * n.x - n.cx, 2 * n.y - n.cy]);
    }
    const b = normalize(all, 3);
    const out = nodes.map((n) => {
      const [x, y] = b.norm([n.x, n.y]);
      const o: PenPoint = { x, y };
      if (n.cx !== undefined && n.cy !== undefined) {
        const [cx, cy] = b.norm([n.cx, n.cy]);
        o.cx = cx;
        o.cy = cy;
      }
      return o;
    });
    return { x: b.x, y: b.y, w: b.w, h: b.h, props: { nodes: out, closed } };
  },
  render: (ctx) => {
    const v = ctx.view;
    const p = ctx.props as P;
    const nodes = ((p.nodes as PenPoint[]) ?? []).map((n) => ({
      x: v.x + n.x * v.w,
      y: v.y + n.y * v.h,
      cx: n.cx !== undefined ? v.x + n.cx * v.w : undefined,
      cy: n.cy !== undefined ? v.y + n.cy * v.h : undefined,
    }));
    if (!nodes.length) return null;
    let d = `M${nodes[0].x},${nodes[0].y}`;
    for (let i = 1; i < nodes.length; i++) d += penSeg(nodes[i - 1], nodes[i]);
    if (p.closed && nodes.length > 2) d += penSeg(nodes[nodes.length - 1], nodes[0]) + ' Z';
    return (
      <>
        <path d={d} fill={p.closed ? 'transparent' : 'none'} stroke="transparent" strokeWidth={12} />
        <path
          d={d}
          fill={p.closed ? ctx.style.fill || 'none' : 'none'}
          stroke={ctx.style.stroke}
          strokeWidth={ctx.style.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={ctx.style.dash ? `${ctx.style.strokeWidth * 3} ${ctx.style.strokeWidth * 2.5}` : undefined}
        />
      </>
    );
  },
  name: () => 'Đường Pen',
});

// ---------------- Calligraphy (perfect-freehand) ----------------

function calligraphyOutline(pts: Pt[], size: number, thinning: number): string {
  const o = getStroke(pts, { size, thinning, smoothing: 0.5, streamline: 0.45, simulatePressure: true });
  if (!o.length) return '';
  let d = `M${o[0][0].toFixed(1)},${o[0][1].toFixed(1)}`;
  for (let i = 1; i < o.length; i++) {
    const [x0, y0] = o[i - 1];
    const [x1, y1] = o[i];
    d += ` Q${x0.toFixed(1)},${y0.toFixed(1)} ${((x0 + x1) / 2).toFixed(1)},${((y0 + y1) / 2).toFixed(1)}`;
  }
  return d + ' Z';
}

registerShape({
  type: 'common.calligraphy',
  label: 'Calligraphy Tool',
  icon: 'calligraphy',
  defaultSize: { w: 120, h: 60 },
  minSize: { w: 6, h: 6 },
  noPorts: true,
  outline: 'none',
  defaultProps: () => ({ pts: [], size: 8, thinning: 0.6 }),
  defaultStyle: { stroke: '#1F2937', fill: 'none' },
  propsSchema: z.object({
    size: z.number().describe('Độ dày tối đa'),
    thinning: z.number().describe('Độ thon theo tốc độ (0–1)|step01'),
  }),
  styleFields: ['stroke'],
  ink: (raw) => {
    if (raw.length < 2) return null;
    const pts = simplify(raw, 0.6);
    const b = normalize(pts, 8);
    return { x: b.x, y: b.y, w: b.w, h: b.h, props: { pts: pts.map(b.norm) } };
  },
  render: (ctx) => {
    const p = ctx.props as P;
    const pts = scaled(ctx.view, (p.pts as Pt[]) ?? []);
    return (
      <path
        d={calligraphyOutline(pts, Number(p.size ?? 8), Number(p.thinning ?? 0.6))}
        fill={ctx.style.stroke}
        stroke="none"
      />
    );
  },
  hitTest: (v, x, y) => nearPolyline(scaled(v, (v.props.pts as Pt[]) ?? []), x, y, 8),
  name: () => 'Nét thư pháp',
});

// ---------------- Connector (vuông góc, tự do) ----------------

registerConnector({
  kind: 'common.freeConnector',
  label: 'Connector',
  icon: 'connector',
  look: (c) => genericLook(c),
  labels: (c) => genericLabels(c),
  defaultRouting: 'orthogonal',
  freeEnds: true,
  selfLoop: true,
  defaultProps: () => ({ label: '', line: 'solid', start: 'none', end: 'arrow-open' }),
  defaultStyle: { stroke: '#475569', strokeWidth: 1.4 },
  propsSchema: genericConnProps,
});
