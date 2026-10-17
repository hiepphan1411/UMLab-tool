// Hình học thuần cho engine — port từ tool cũ (anchorPt, autoOrtho, cleanPts, roundedPath, polyLen, pointAt,
// segDist, unionBox, inside, nearestSide, snapMove) + bổ sung đường cong, vòng tự nối, cầu nhảy.
import type { Side } from '@umlab/core';

export type Pt = [number, number];
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const r1 = (v: number) => Math.round(v * 10) / 10;
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const SIDES: Side[] = ['top', 'right', 'bottom', 'left'];
export const DIRS: Record<Side, Pt> = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] };

/** Điểm trên cạnh `side` của hộp tại vị trí tương đối t (0..1). */
export function anchorPt(b: Box, side: Side, t: number): Pt {
  switch (side) {
    case 'top':
      return [b.x + b.w * t, b.y];
    case 'bottom':
      return [b.x + b.w * t, b.y + b.h];
    case 'left':
      return [b.x, b.y + b.h * t];
    default:
      return [b.x + b.w, b.y + b.h * t];
  }
}

/** Bỏ điểm trùng và điểm thẳng hàng giữa đường gấp khúc. */
export function cleanPts(p: Pt[]): Pt[] {
  const o: Pt[] = [];
  p.forEach((q) => {
    const l = o[o.length - 1];
    if (!l || Math.hypot(l[0] - q[0], l[1] - q[1]) > 0.5) o.push(q);
  });
  for (let i = o.length - 2; i > 0; i--) {
    const a = o[i - 1];
    const b = o[i];
    const c = o[i + 1];
    if (
      (Math.abs(a[0] - b[0]) < 0.5 && Math.abs(b[0] - c[0]) < 0.5) ||
      (Math.abs(a[1] - b[1]) < 0.5 && Math.abs(b[1] - c[1]) < 0.5)
    )
      o.splice(i, 1);
  }
  return o;
}

/** Đường vuông góc giữa hai điểm nối trên hai cạnh (giữ nguyên thuật toán tool cũ). */
export function autoOrtho(p1: Pt, s1: Side, p2: Pt, s2: Side): Pt[] {
  const v1 = s1 === 'top' || s1 === 'bottom';
  const v2 = s2 === 'top' || s2 === 'bottom';
  const off = 20;
  const d1 = DIRS[s1];
  const d2 = DIRS[s2];
  const a: Pt = [p1[0] + d1[0] * off, p1[1] + d1[1] * off];
  const b: Pt = [p2[0] + d2[0] * off, p2[1] + d2[1] * off];
  let mid: Pt[];
  if (v1 && v2) {
    const my =
      (s1 === 'bottom' && s2 === 'top' && p2[1] > p1[1]) || (s1 === 'top' && s2 === 'bottom' && p2[1] < p1[1])
        ? (p1[1] + p2[1]) / 2
        : s1 === 'bottom'
          ? Math.max(a[1], b[1])
          : s1 === 'top'
            ? Math.min(a[1], b[1])
            : (a[1] + b[1]) / 2;
    mid = [
      [p1[0], my],
      [p2[0], my],
    ];
  } else if (!v1 && !v2) {
    const mx =
      (s1 === 'right' && s2 === 'left' && p2[0] > p1[0]) || (s1 === 'left' && s2 === 'right' && p2[0] < p1[0])
        ? (p1[0] + p2[0]) / 2
        : s1 === 'right'
          ? Math.max(a[0], b[0])
          : Math.min(a[0], b[0]);
    mid = [
      [mx, p1[1]],
      [mx, p2[1]],
    ];
  } else if (v1) {
    const goes = s1 === 'bottom' ? p2[1] > p1[1] : p2[1] < p1[1];
    mid = goes ? [[p1[0], p2[1]]] : [a, [b[0], a[1]], b];
  } else {
    const ok = s1 === 'right' ? p2[0] > p1[0] : p2[0] < p1[0];
    mid = ok ? [[p2[0], p1[1]]] : [a, [a[0], b[1]], b];
  }
  return cleanPts([p1, ...mid, p2]);
}

/** Path SVG cho đường gấp khúc có bo góc (Q). */
export function roundedPath(pts: Pt[], r: number): string {
  if (!pts.length) return '';
  let d = `M${r1(pts[0][0])},${r1(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const [nx, ny] = pts[i + 1];
    const d1 = Math.hypot(cx - px, cy - py);
    const d2 = Math.hypot(nx - cx, ny - cy);
    const rr = Math.min(r, d1 / 2, d2 / 2);
    if (rr < 0.5) {
      d += ` L${r1(cx)},${r1(cy)}`;
      continue;
    }
    const ax = cx - ((cx - px) / d1) * rr;
    const ay = cy - ((cy - py) / d1) * rr;
    const bx = cx + ((nx - cx) / d2) * rr;
    const by = cy + ((ny - cy) / d2) * rr;
    d += ` L${r1(ax)},${r1(ay)} Q${r1(cx)},${r1(cy)} ${r1(bx)},${r1(by)}`;
  }
  const l = pts[pts.length - 1];
  return d + ` L${r1(l[0])},${r1(l[1])}`;
}

export function norm(v: Pt): Pt {
  const L = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / L, v[1] / L];
}

/** Vòng tự nối ở góc trên phải của hộp. */
export function selfLoopPts(b: Box, size = 28): Pt[] {
  const x0 = b.x + b.w * 0.72;
  const y0 = b.y;
  const x1 = b.x + b.w;
  const y1 = b.y + b.h * 0.28;
  return [
    [x0, y0],
    [x0, y0 - size],
    [x1 + size, y0 - size],
    [x1 + size, y1],
    [x1, y1],
  ];
}

export function polyLen(p: Pt[]): number {
  let L = 0;
  for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
  return L;
}

/** Điểm tại tỉ lệ độ dài t (0..1) trên đường gấp khúc. */
export function pointAt(p: Pt[], t: number): Pt {
  let target = polyLen(p) * t;
  for (let i = 1; i < p.length; i++) {
    const s = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    if (target <= s || i === p.length - 1) {
      const k = s ? Math.min(1, target / s) : 0;
      return [p[i - 1][0] + (p[i][0] - p[i - 1][0]) * k, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * k];
    }
    target -= s;
  }
  return p[0];
}

/** Hướng (vector đơn vị) của đoạn chứa vị trí t. */
export function directionAt(p: Pt[], t: number): Pt {
  let target = polyLen(p) * t;
  for (let i = 1; i < p.length; i++) {
    const s = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    if (target <= s || i === p.length - 1) return norm([p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]]);
    target -= s;
  }
  return [1, 0];
}

/** Tỉ lệ t của điểm gần nhất trên đường gấp khúc (để kéo nhãn). */
export function projectT(p: Pt[], q: Pt): number {
  const L = polyLen(p) || 1;
  let acc = 0;
  let best = { d: Infinity, t: 0.5 };
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1];
    const b = p[i];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy || 1;
    const k = clamp(((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / len2, 0, 1);
    const x = a[0] + dx * k;
    const y = a[1] + dy * k;
    const d = Math.hypot(q[0] - x, q[1] - y);
    const seg = Math.sqrt(len2);
    if (d < best.d) best = { d, t: (acc + seg * k) / L };
    acc += seg;
  }
  return best.t;
}

export function segDist(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const L = dx * dx + dy * dy || 1;
  const t = clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L, 0, 1);
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

export function polyDist(p: Pt, pts: Pt[]): number {
  let d = Infinity;
  for (let i = 1; i < pts.length; i++) d = Math.min(d, segDist(p, pts[i - 1], pts[i]));
  return d;
}

/** Chỉ số đoạn gần điểm nhất (để chèn waypoint). */
export function nearestSegment(p: Pt, pts: Pt[]): number {
  let best = 1;
  let bd = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const d = segDist(p, pts[i - 1], pts[i]);
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return best;
}

export function unionBox(boxes: Box[]): Box | null {
  if (!boxes.length) return null;
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  boxes.forEach((b) => {
    x1 = Math.min(x1, b.x);
    y1 = Math.min(y1, b.y);
    x2 = Math.max(x2, b.x + b.w);
    y2 = Math.max(y2, b.y + b.h);
  });
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

export const inside = (a: Box, b: Box) =>
  a.x >= b.x - 0.5 && a.y >= b.y - 0.5 && a.x + a.w <= b.x + b.w + 0.5 && a.y + a.h <= b.y + b.h + 0.5;
export const intersects = (a: Box, b: Box) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export const containsPt = (b: Box, x: number, y: number, pad = 0) =>
  x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad;
export const center = (b: Box): Pt => [b.x + b.w / 2, b.y + b.h / 2];

/** Cạnh gần nhất + vị trí t (bắt dính 1/20, hút về giữa) — như tool cũ. */
export function nearestSide(b: Box, wx: number, wy: number): { side: Side; t: number } {
  const c: [Side, number][] = (
    [
      ['top', Math.abs(wy - b.y)],
      ['bottom', Math.abs(wy - b.y - b.h)],
      ['left', Math.abs(wx - b.x)],
      ['right', Math.abs(wx - b.x - b.w)],
    ] as [Side, number][]
  ).sort((a, b2) => a[1] - b2[1]);
  const side = c[0][0];
  let t = side === 'top' || side === 'bottom' ? (wx - b.x) / (b.w || 1) : (wy - b.y) / (b.h || 1);
  t = clamp(Math.round(t * 20) / 20, 0, 1);
  if (Math.abs(t - 0.5) < 0.08) t = 0.5;
  return { side, t };
}

/** Cạnh của hộp hướng về điểm p (dùng cho định tuyến tự chọn cạnh). */
/** Điểm (x,y) có nằm sát mép hộp (trong khoảng tol) không — kéo nối từ sát mép thì khoá cạnh, từ giữa hình thì tự chọn. */
export function nearEdge(b: Box, x: number, y: number, tol: number): boolean {
  return Math.min(Math.abs(x - b.x), Math.abs(x - b.x - b.w), Math.abs(y - b.y), Math.abs(y - b.y - b.h)) <= tol;
}

export function sideToward(b: Box, p: Pt): Side {
  const [cx, cy] = center(b);
  const dx = (p[0] - cx) / (b.w || 1);
  const dy = (p[1] - cy) / (b.h || 1);
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'bottom' : 'top';
}

export interface Guide {
  v?: number;
  h?: number;
  a: number;
  b: number;
}

/**
 * Bắt dính khi kéo: căn mép/giữa với hình khác (đường gióng hồng), nếu không thì bám lưới.
 * `others` là hộp các hình không di chuyển. tol tính theo đơn vị thế giới.
 */
export function snapMove(
  box: Box | null,
  dx: number,
  dy: number,
  others: Box[],
  tol: number,
  grid: number | null,
): { dx: number; dy: number; guides: Guide[] } {
  const guides: Guide[] = [];
  if (!box) return { dx, dy, guides };
  const nb = { x: box.x + dx, y: box.y + dy, w: box.w, h: box.h };
  const xs = [nb.x, nb.x + nb.w / 2, nb.x + nb.w];
  const ys = [nb.y, nb.y + nb.h / 2, nb.y + nb.h];
  let bx: { d: number; v: number; e: Box } | null = null;
  let by: { d: number; v: number; e: Box } | null = null;
  for (const e of others) {
    for (const v of [e.x, e.x + e.w / 2, e.x + e.w])
      for (const x of xs) {
        const d = v - x;
        if (Math.abs(d) < tol && (!bx || Math.abs(d) < Math.abs(bx.d))) bx = { d, v, e };
      }
    for (const v of [e.y, e.y + e.h / 2, e.y + e.h])
      for (const y of ys) {
        const d = v - y;
        if (Math.abs(d) < tol && (!by || Math.abs(d) < Math.abs(by.d))) by = { d, v, e };
      }
  }
  if (bx) {
    dx += bx.d;
    guides.push({ v: bx.v, a: Math.min(nb.y, bx.e.y) - 10, b: Math.max(nb.y + nb.h, bx.e.y + bx.e.h) + 10 });
  } else if (grid) dx = Math.round((box.x + dx) / grid) * grid - box.x;
  if (by) {
    dy += by.d;
    guides.push({ h: by.v, a: Math.min(nb.x, by.e.x) - 10, b: Math.max(nb.x + nb.w, by.e.x + by.e.w) + 10 });
  } else if (grid) dy = Math.round((box.y + dy) / grid) * grid - box.y;
  return { dx, dy, guides };
}

/** Giao điểm hai đoạn thẳng ngang/dọc (dùng cho cầu nhảy). */
export function crossPoint(a1: Pt, a2: Pt, b1: Pt, b2: Pt): Pt | null {
  const d = (a2[0] - a1[0]) * (b2[1] - b1[1]) - (a2[1] - a1[1]) * (b2[0] - b1[0]);
  if (Math.abs(d) < 1e-9) return null;
  const t = ((b1[0] - a1[0]) * (b2[1] - b1[1]) - (b1[1] - a1[1]) * (b2[0] - b1[0])) / d;
  const u = ((b1[0] - a1[0]) * (a2[1] - a1[1]) - (b1[1] - a1[1]) * (a2[0] - a1[0])) / d;
  if (t <= 0.02 || t >= 0.98 || u <= 0.02 || u >= 0.98) return null;
  return [a1[0] + t * (a2[0] - a1[0]), a1[1] + t * (a2[1] - a1[1])];
}

/** Path có "cầu nhảy" tại các điểm cắt với đường khác (chỉ vẽ cầu trên đoạn ngang, như Visual Paradigm). */
export function jumpPath(pts: Pt[], others: Pt[][], r = 4.5): string {
  if (pts.length < 2) return '';
  let d = `M${r1(pts[0][0])},${r1(pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const horizontal = Math.abs(a[1] - b[1]) < 0.5;
    const hits: Pt[] = [];
    if (horizontal)
      for (const o of others)
        for (let j = 1; j < o.length; j++) {
          if (Math.abs(o[j - 1][0] - o[j][0]) > 0.5) continue; // chỉ cắt đoạn dọc
          const c = crossPoint(a, b, o[j - 1], o[j]);
          if (c) hits.push(c);
        }
    hits.sort((p, q) => (b[0] > a[0] ? p[0] - q[0] : q[0] - p[0]));
    const dir = b[0] > a[0] ? 1 : -1;
    for (const h of hits) {
      d += ` L${r1(h[0] - dir * r)},${r1(h[1])} A${r},${r} 0 0 ${dir > 0 ? 1 : 0} ${r1(h[0] + dir * r)},${r1(h[1])}`;
    }
    d += ` L${r1(b[0])},${r1(b[1])}`;
  }
  return d;
}

/** Giao của tia từ tâm hộp tới điểm ngoài với viền elip (để nối vào elip/hình tròn đẹp hơn). */
export function ellipseBoundary(b: Box, toward: Pt): Pt {
  const [cx, cy] = center(b);
  const rx = b.w / 2;
  const ry = b.h / 2;
  const dx = toward[0] - cx;
  const dy = toward[1] - cy;
  if (!dx && !dy) return [cx + rx, cy];
  const k = 1 / Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));
  return [cx + dx * k, cy + dy * k];
}

/** Giao với viền hình thoi. */
export function diamondBoundary(b: Box, toward: Pt): Pt {
  const [cx, cy] = center(b);
  const dx = toward[0] - cx;
  const dy = toward[1] - cy;
  if (!dx && !dy) return [cx + b.w / 2, cy];
  const k = 1 / (Math.abs(dx) / (b.w / 2) + Math.abs(dy) / (b.h / 2));
  return [cx + dx * k, cy + dy * k];
}

/**
 * Nhấp đúp lên đường: bẻ một khúc vuông góc tại `at` trên đoạn `i` (pts[i-1] → pts[i]). Đoạn vuông góc được tách
 * thành bậc thang lệch 24 px để thấy rõ chỗ bẻ, sau đó kéo tay nắm đoạn để chỉnh. Đoạn xiên: thêm điểm uốn tự do.
 * Trả về các điểm uốn bên trong (không gồm 2 đầu mút).
 */
export function bendAt(pts: Pt[], i: number, at: Pt, step = 24): Pt[] {
  const a = pts[i - 1];
  const b = pts[i];
  const inner = pts.slice(1, -1).map((p) => [p[0], p[1]] as Pt);
  const hor = Math.abs(a[1] - b[1]) < 0.5 && Math.abs(a[0] - b[0]) > 0.5;
  const ver = Math.abs(a[0] - b[0]) < 0.5 && Math.abs(a[1] - b[1]) > 0.5;
  if (!hor && !ver) {
    inner.splice(i - 1, 0, at);
    return inner;
  }
  // điểm bẻ nằm trên đoạn (chiếu lên trục của đoạn)
  const k: Pt = hor ? [at[0], a[1]] : [a[0], at[1]];
  const k2: Pt = hor ? [at[0], a[1] + step] : [a[0] + step, at[1]];
  const b2: Pt = hor ? [b[0], b[1] + step] : [b[0] + step, b[1]];
  if (i < pts.length - 1) {
    // b là điểm uốn: dời b theo bậc (đoạn kế tiếp vuông góc nên vẫn thẳng hàng) → bậc chữ Z
    inner.splice(i - 1, 1, k, k2, b2);
    return inner;
  }
  // b là đầu mút bám hình: giữ nguyên, thêm bậc quay về
  inner.splice(i - 1, 0, k, k2, b2);
  return inner;
}
