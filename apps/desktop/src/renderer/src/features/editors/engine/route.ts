// Tính đường đi của connector từ hai đầu mút + kiểu định tuyến.
import type { Connector, Endpoint, Side } from '@umlab/core';
import {
  anchorPt,
  autoOrtho,
  center,
  cleanPts,
  curvedPts,
  diamondBoundary,
  ellipseBoundary,
  selfLoopPts,
  sideToward,
  type Box,
  type Pt,
} from './geometry';
import { smartRoute } from './smart-route';
import { getConnector, type EngineLookup } from './registry';

export interface EndInfo {
  pt: Pt;
  side?: Side;
}

export interface Routed {
  pts: Pt[];
  src: EndInfo;
  tgt: EndInfo;
  curved: boolean;
}

export interface RouteEnv {
  box: (viewId: string) => Box | null;
  outline: (viewId: string) => 'rect' | 'ellipse' | 'diamond' | 'none' | undefined;
  /** Hộp các hình khác (để định tuyến thông minh né). */
  obstacles?: (exclude: string[]) => Box[];
  /** Cho ConnectorDef.route (bố cục riêng cần đọc các hình / đường nối khác). */
  lookup?: EngineLookup;
}

function resolve(e: Endpoint, other: Pt | null, env: RouteEnv): EndInfo | null {
  if (!e.viewId) {
    if (e.x === undefined || e.y === undefined) return null;
    return { pt: [e.x, e.y] };
  }
  const b = env.box(e.viewId);
  if (!b) return null;
  const outline = env.outline(e.viewId);
  if (e.side) {
    const t = e.t ?? 0.5;
    // trên elip/thoi: điểm nối giữa cạnh nằm đúng viền; t lệch thì chiếu lên viền theo hướng điểm trên hộp
    if (outline === 'ellipse' || outline === 'diamond') {
      const onBox = anchorPt(b, e.side, t);
      const pt = outline === 'ellipse' ? ellipseBoundary(b, onBox) : diamondBoundary(b, onBox);
      return { pt, side: e.side };
    }
    return { pt: anchorPt(b, e.side, t), side: e.side };
  }
  // tự chọn cạnh hướng về đầu kia
  const toward = other ?? center(b);
  const side = sideToward(b, toward);
  if (outline === 'ellipse') return { pt: ellipseBoundary(b, toward), side };
  if (outline === 'diamond') return { pt: diamondBoundary(b, toward), side };
  return { pt: anchorPt(b, side, 0.5), side };
}

function roughPoint(e: Endpoint, env: RouteEnv): Pt | null {
  if (!e.viewId) return e.x !== undefined && e.y !== undefined ? [e.x, e.y] : null;
  const b = env.box(e.viewId);
  return b ? center(b) : null;
}

/** Đoạn thẳng có cắt vào (phần trong) hộp không — dùng cho đường vuông góc / thẳng. */
export function segHitsBox(a: Pt, b: Pt, o: Box, inset = 3): boolean {
  const x1 = o.x + inset;
  const y1 = o.y + inset;
  const x2 = o.x + o.w - inset;
  const y2 = o.y + o.h - inset;
  if (x2 <= x1 || y2 <= y1) return false;
  // Liang–Barsky: cắt hình chữ nhật mở
  let t0 = 0;
  let t1 = 1;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const clip = (p: number, q: number) => {
    if (Math.abs(p) < 1e-9) return q > 0;
    const r = q / p;
    if (p < 0) {
      if (r > t1) return false;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return false;
      if (r < t1) t1 = r;
    }
    return true;
  };
  return clip(-dx, a[0] - x1) && clip(dx, x2 - a[0]) && clip(-dy, a[1] - y1) && clip(dy, y2 - a[1]) && t1 - t0 > 1e-6;
}

/** Đường đi qua hình nào trong `boxes` không. */
export function pathHits(pts: Pt[], boxes: Box[]): boolean {
  for (let i = 1; i < pts.length; i++) for (const o of boxes) if (segHitsBox(pts[i - 1], pts[i], o)) return true;
  return false;
}

const aligned = (a: Pt, b: Pt) => Math.abs(a[0] - b[0]) < 0.5 || Math.abs(a[1] - b[1]) < 0.5;

/**
 * Đường chỉnh tay có các điểm uốn vuông góc (≥ 2 điểm thẳng hàng từng cặp): nối đầu mút vào điểm uốn đầu/cuối bằng
 * khuỷu vuông góc theo hướng cạnh — trượt đầu mút sang cạnh khác không làm đoạn đầu bị xiên.
 */
function orthoJoin(src: EndInfo, inner: Pt[], tgt: EndInfo): Pt[] {
  const ortho = inner.length >= 2 && inner.every((p, i) => i === 0 || aligned(inner[i - 1], p));
  if (!ortho) return [src.pt, ...inner, tgt.pt];
  const STUB = 18;
  const elbow = (end: EndInfo, p: Pt): Pt[] => {
    const [x, y] = end.pt;
    const vertical = end.side === 'top' || end.side === 'bottom';
    // điểm uốn nằm "phía sau" cạnh (đi thẳng sẽ cắt vào hình) → ra một đoạn ngắn ngoài cạnh rồi vòng
    const inward =
      (end.side === 'top' && p[1] > y) ||
      (end.side === 'bottom' && p[1] < y) ||
      (end.side === 'left' && p[0] > x) ||
      (end.side === 'right' && p[0] < x);
    if (inward) {
      const d = end.side === 'top' || end.side === 'left' ? -STUB : STUB;
      return vertical
        ? [
            [x, y + d],
            [p[0], y + d],
          ]
        : [
            [x + d, y],
            [x + d, p[1]],
          ];
    }
    if (aligned(end.pt, p)) return [];
    return [vertical ? [x, p[1]] : [p[0], y]];
  };
  const first = inner[0];
  const last = inner[inner.length - 1];
  return [src.pt, ...elbow(src, first), ...inner, ...elbow(tgt, last).reverse(), tgt.pt];
}

/** Điểm của đường nối (đã gồm 2 đầu). null nếu thiếu hình nguồn/đích. */
export function routeConnector(c: Connector, env: RouteEnv): Routed | null {
  const custom = getConnector(c.kind)?.route;
  if (custom) return custom(c, env);
  const rs = roughPoint(c.source, env);
  const rt = roughPoint(c.target, env);
  if (!rs || !rt) return null;
  const wp = c.waypoints ?? [];
  // vòng tự nối
  if (c.source.viewId && c.source.viewId === c.target.viewId && !wp.length) {
    const b = env.box(c.source.viewId);
    if (!b) return null;
    const pts = selfLoopPts(b);
    return { pts, src: { pt: pts[0], side: 'top' }, tgt: { pt: pts[pts.length - 1], side: 'right' }, curved: false };
  }
  const firstWp: Pt | null = wp.length ? [wp[0].x, wp[0].y] : null;
  const lastWp: Pt | null = wp.length ? [wp[wp.length - 1].x, wp[wp.length - 1].y] : null;
  const src = resolve(c.source, firstWp ?? rt, env);
  const tgt = resolve(c.target, lastWp ?? rs, env);
  if (!src || !tgt) return null;
  if (wp.length || c.routing === 'manual') {
    const inner = wp.map((p) => [p.x, p.y] as Pt);
    return { pts: cleanPts(orthoJoin(src, inner, tgt)), src, tgt, curved: false };
  }
  if (c.routing === 'straight') return { pts: [src.pt, tgt.pt], src, tgt, curved: false };
  if (c.routing === 'curved') return { pts: curvedPts(src.pt, src.side, tgt.pt, tgt.side), src, tgt, curved: true };
  const s1 = src.side ?? 'right';
  const s2 = tgt.side ?? 'left';
  const exclude = [c.source.viewId, c.target.viewId].filter(Boolean) as string[];
  if (c.routing === 'smart' && env.obstacles) {
    const smart = smartRoute(src.pt, s1, tgt.pt, s2, env.obstacles(exclude));
    if (smart) return { pts: smart, src, tgt, curved: false };
  }
  const ortho = autoOrtho(src.pt, s1, tgt.pt, s2);
  // vuông góc mặc định: nếu đi xuyên qua hình khác thì tự né (A* như chế độ Thông minh)
  if (c.routing === 'orthogonal' && env.obstacles) {
    const xs = ortho.map((p) => p[0]);
    const ys = ortho.map((p) => p[1]);
    const bx = {
      x: Math.min(...xs),
      y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs),
      h: Math.max(...ys) - Math.min(...ys),
    };
    const near = env
      .obstacles(exclude)
      .filter((o) => o.x < bx.x + bx.w && bx.x < o.x + o.w && o.y < bx.y + bx.h && bx.y < o.y + o.h);
    if (near.length && pathHits(ortho, near)) {
      const smart = smartRoute(src.pt, s1, tgt.pt, s2, env.obstacles(exclude));
      if (smart) return { pts: smart, src, tgt, curved: false };
    }
  }
  return { pts: ortho, src, tgt, curved: false };
}
