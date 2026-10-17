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

/** Điểm của đường nối (đã gồm 2 đầu). null nếu thiếu hình nguồn/đích. */
export function routeConnector(c: Connector, env: RouteEnv): Routed | null {
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
    return { pts: cleanPts([src.pt, ...wp.map((p) => [p.x, p.y] as Pt), tgt.pt]), src, tgt, curved: false };
  }
  if (c.routing === 'straight') return { pts: [src.pt, tgt.pt], src, tgt, curved: false };
  if (c.routing === 'curved') return { pts: curvedPts(src.pt, src.side, tgt.pt, tgt.side), src, tgt, curved: true };
  const s1 = src.side ?? 'right';
  const s2 = tgt.side ?? 'left';
  if (c.routing === 'smart' && env.obstacles) {
    const smart = smartRoute(
      src.pt,
      s1,
      tgt.pt,
      s2,
      env.obstacles([c.source.viewId, c.target.viewId].filter(Boolean) as string[]),
    );
    if (smart) return { pts: smart, src, tgt, curved: false };
  }
  return { pts: autoOrtho(src.pt, s1, tgt.pt, s2), src, tgt, curved: false };
}
