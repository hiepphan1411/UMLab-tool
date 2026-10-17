// Định tuyến "thông minh" — port A* trên lưới thưa từ add-on smart-edges.js của tool cũ:
// đường vuông góc né khối, chạy giữa khe, ít khúc gấp, tránh chạy chồng lên đường khác.
import type { Side } from '@umlab/core';
import { cleanPts, type Box, type Pt } from './geometry';

const MARGIN = 14;
const BEND = 34;
const OVERLAP_BASE = 20;
const OVERLAP_PER_PX = 6;
const NEAR_DIST = 10;
const NEAR_PER_PX = 1.2;
const CROSS = 26;
const HUG_PER_PX = 0.35;
const MAX_ITER = 250000;

const DV: Pt[] = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];
const DIR_OF: Record<Side, number> = { right: 0, bottom: 1, left: 2, top: 3 };

/** Đoạn đã vẽ của các đường khác (để phạt chạy trùng/cắt ngang). */
export interface Seg {
  h: boolean;
  c: number;
  a: number;
  b: number;
}

export function segsOf(pts: Pt[]): Seg[] {
  const out: Seg[] = [];
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    if (Math.abs(ay - by) < 0.5 && Math.abs(ax - bx) > 0.5)
      out.push({ h: true, c: ay, a: Math.min(ax, bx), b: Math.max(ax, bx) });
    else if (Math.abs(ax - bx) < 0.5 && Math.abs(ay - by) > 0.5)
      out.push({ h: false, c: ax, a: Math.min(ay, by), b: Math.max(ay, by) });
  }
  return out;
}

const overlapLen = (a1: number, a2: number, b1: number, b2: number) => Math.min(a2, b2) - Math.max(a1, b1);

function uniqSorted(arr: number[]): number[] {
  arr.sort((a, b) => a - b);
  const out: number[] = [];
  arr.forEach((v) => {
    if (!out.length || v - out[out.length - 1] > 0.5) out.push(v);
  });
  return out;
}

function withChannels(arr: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    out.push(arr[i]);
    const gap = i + 1 < arr.length ? arr[i + 1] - arr[i] : 0;
    if (gap > 2 * NEAR_DIST + 4) {
      const mid = (arr[i] + arr[i + 1]) / 2;
      out.push(mid);
      if (gap > 56) out.push(mid - 12, mid + 12);
    }
  }
  return uniqSorted(out);
}

const lowerIdx = (arr: number[], v: number) => {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (arr[m] < v - 0.25) lo = m + 1;
    else hi = m;
  }
  return lo;
};
const upperIdx = (arr: number[], v: number) => lowerIdx(arr, v + 0.5) - 1;
const nearestIdx = (arr: number[], v: number) => {
  const i = lowerIdx(arr, v);
  if (i >= arr.length) return arr.length - 1;
  if (i > 0 && Math.abs(arr[i - 1] - v) < Math.abs(arr[i] - v)) return i - 1;
  return i;
};

class Heap {
  private ks: number[] = [];
  private vs: number[] = [];
  get size() {
    return this.ks.length;
  }
  push(k: number, v: number) {
    const { ks, vs } = this;
    let i = ks.length;
    ks.push(k);
    vs.push(v);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (ks[p] <= k) break;
      ks[i] = ks[p];
      vs[i] = vs[p];
      i = p;
    }
    ks[i] = k;
    vs[i] = v;
  }
  pop(): [number, number] {
    const { ks, vs } = this;
    const k0 = ks[0];
    const v0 = vs[0];
    const k = ks.pop()!;
    const v = vs.pop()!;
    if (ks.length) {
      let i = 0;
      const n = ks.length;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= n) break;
        if (c + 1 < n && ks[c + 1] < ks[c]) c++;
        if (ks[c] >= k) break;
        ks[i] = ks[c];
        vs[i] = vs[c];
        i = c;
      }
      ks[i] = k;
      vs[i] = v;
    }
    return [k0, v0];
  }
}

function astar(
  p1: Pt,
  side1: Side,
  p2: Pt,
  side2: Side,
  m: number,
  pad: number,
  obstacles: Box[],
  segs: Seg[],
): Pt[] | null {
  const d1 = DIR_OF[side1] ?? 1;
  const d2 = DIR_OF[side2] ?? 3;
  let stub = m + 6;
  if (d2 === (d1 + 2) % 4) {
    const gap = (p2[0] - p1[0]) * DV[d1][0] + (p2[1] - p1[1]) * DV[d1][1];
    if (gap > 0 && gap < 2 * stub) stub = gap / 2;
  }
  const s1: Pt = [p1[0] + DV[d1][0] * stub, p1[1] + DV[d1][1] * stub];
  const s2: Pt = [p2[0] + DV[d2][0] * stub, p2[1] + DV[d2][1] * stub];
  let bx1 = Infinity;
  let by1 = Infinity;
  let bx2 = -Infinity;
  let by2 = -Infinity;
  for (const o of obstacles) {
    bx1 = Math.min(bx1, o.x);
    by1 = Math.min(by1, o.y);
    bx2 = Math.max(bx2, o.x + o.w);
    by2 = Math.max(by2, o.y + o.h);
  }
  if (!isFinite(bx1)) {
    bx1 = Math.min(p1[0], p2[0]);
    by1 = Math.min(p1[1], p2[1]);
    bx2 = Math.max(p1[0], p2[0]);
    by2 = Math.max(p1[1], p2[1]);
  }
  const minX = Math.min(s1[0], s2[0], Math.max(Math.min(s1[0], s2[0]) - pad, bx1 - 60));
  const maxX = Math.max(s1[0], s2[0], Math.min(Math.max(s1[0], s2[0]) + pad, bx2 + 60));
  const minY = Math.min(s1[1], s2[1], Math.max(Math.min(s1[1], s2[1]) - pad, by1 - 60));
  const maxY = Math.max(s1[1], s2[1], Math.min(Math.max(s1[1], s2[1]) + pad, by2 + 60));
  type R = { L: number; R: number; T: number; B: number };
  const inside = (r: R, p: Pt) => p[0] > r.L + 0.01 && p[0] < r.R - 0.01 && p[1] > r.T + 0.01 && p[1] < r.B - 0.01;
  const rects: R[] = [];
  for (const o of obstacles) {
    let r: R = { L: o.x - m, R: o.x + o.w + m, T: o.y - m, B: o.y + o.h + m };
    if (r.R < minX || r.L > maxX || r.B < minY || r.T > maxY) continue;
    if (inside(r, s1) || inside(r, s2)) {
      r = { L: o.x, R: o.x + o.w, T: o.y, B: o.y + o.h };
      if (inside(r, s1) || inside(r, s2)) continue;
    }
    rects.push(r);
  }
  const xs0 = [minX, maxX, s1[0], s2[0]];
  const ys0 = [minY, maxY, s1[1], s2[1]];
  rects.forEach((r) => {
    xs0.push(r.L, r.R);
    ys0.push(r.T, r.B);
  });
  const xs = withChannels(uniqSorted(xs0.filter((v) => v >= minX - 0.5 && v <= maxX + 0.5)));
  const ys = withChannels(uniqSorted(ys0.filter((v) => v >= minY - 0.5 && v <= maxY + 0.5)));
  const nx = xs.length;
  const ny = ys.length;
  if (nx < 2 || ny < 2) return null;
  const hb = new Uint8Array(ny * (nx - 1));
  const vb = new Uint8Array((ny - 1) * nx);
  const hc = new Float32Array(ny * (nx - 1));
  const vc = new Float32Array((ny - 1) * nx);
  for (const r of rects) {
    const i0 = lowerIdx(xs, r.L);
    const i1 = upperIdx(xs, r.R);
    const j0 = lowerIdx(ys, r.T);
    const j1 = upperIdx(ys, r.B);
    for (let j = j0; j <= j1; j++) {
      const onEdge = Math.abs(ys[j] - r.T) < 0.5 || Math.abs(ys[j] - r.B) < 0.5;
      for (let i = i0; i < i1; i++) {
        const k = j * (nx - 1) + i;
        if (onEdge) hc[k] += HUG_PER_PX * (xs[i + 1] - xs[i]);
        else hb[k] = 1;
      }
    }
    for (let i = i0; i <= i1; i++) {
      const onEdge = Math.abs(xs[i] - r.L) < 0.5 || Math.abs(xs[i] - r.R) < 0.5;
      for (let j = j0; j < j1; j++) {
        const k = j * nx + i;
        if (onEdge) vc[k] += HUG_PER_PX * (ys[j + 1] - ys[j]);
        else vb[k] = 1;
      }
    }
  }
  for (const s of segs) {
    const along = s.h ? xs : ys;
    const across = s.h ? ys : xs;
    const nA = along.length;
    const cost = s.h ? hc : vc;
    const stride = s.h ? nx - 1 : nx;
    const idx = s.h ? (i: number, j: number) => j * stride + i : (i: number, j: number) => i * stride + j;
    const a0 = Math.max(0, lowerIdx(along, s.a) - 1);
    const a1 = Math.min(nA - 1, upperIdx(along, s.b) + 1);
    for (let j = lowerIdx(across, s.c - NEAR_DIST); j <= upperIdx(across, s.c + NEAR_DIST); j++) {
      const dist = Math.abs(across[j] - s.c);
      const same = dist < 1;
      for (let i = a0; i < a1; i++) {
        const ov = overlapLen(along[i], along[i + 1], s.a, s.b);
        if (ov > 0.5)
          cost[idx(i, j)] += same ? OVERLAP_BASE + OVERLAP_PER_PX * ov : NEAR_PER_PX * (1 - dist / NEAR_DIST) * ov;
      }
    }
    const pCost = s.h ? vc : hc;
    const pStride = s.h ? nx : nx - 1;
    const pIdx = (a: number, b: number) => b * pStride + a;
    const cols = s.h ? xs : ys;
    const rows = s.h ? ys : xs;
    for (let c = lowerIdx(cols, s.a + 1); c <= upperIdx(cols, s.b - 1); c++) {
      const r = lowerIdx(rows, s.c);
      if (r < rows.length && Math.abs(rows[r] - s.c) < 0.5) {
        if (r > 0) pCost[pIdx(c, r - 1)] += CROSS / 2;
        if (r < rows.length - 1) pCost[pIdx(c, r)] += CROSS / 2;
      } else if (r > 0 && r < rows.length) pCost[pIdx(c, r - 1)] += CROSS;
    }
  }
  const si = nearestIdx(xs, s1[0]);
  const sj = nearestIdx(ys, s1[1]);
  const gi = nearestIdx(xs, s2[0]);
  const gj = nearestIdx(ys, s2[1]);
  const want = (d2 + 2) % 4;
  const N = nx * ny * 4;
  const g = new Float64Array(N).fill(Infinity);
  const prev = new Int32Array(N).fill(-1);
  const hd = (i: number, j: number) => Math.abs(xs[i] - xs[gi]) + Math.abs(ys[j] - ys[gj]);
  const heap = new Heap();
  const start = ((sj * nx + si) << 2) + d1;
  g[start] = 0;
  heap.push(hd(si, sj), start);
  let best = Infinity;
  let bestS = -1;
  let iter = 0;
  while (heap.size) {
    const [f, s] = heap.pop();
    if (f >= best || ++iter > MAX_ITER) break;
    const d = s & 3;
    const n = s >> 2;
    const i = n % nx;
    const j = (n / nx) | 0;
    const gs = g[s];
    if (gs + hd(i, j) < f - 1e-6) continue;
    if (i === gi && j === gj) {
      const c = gs + (d === want ? 0 : d === (want + 2) % 4 ? BEND * 3 : BEND);
      if (c < best) {
        best = c;
        bestS = s;
      }
      continue;
    }
    for (let nd = 0; nd < 4; nd++) {
      if (nd === (d + 2) % 4) continue;
      let ni = i;
      let nj = j;
      let len: number;
      let k: number;
      let add: number;
      if (nd === 0) {
        if (i + 1 >= nx) continue;
        k = j * (nx - 1) + i;
        if (hb[k]) continue;
        len = xs[i + 1] - xs[i];
        add = hc[k];
        ni = i + 1;
      } else if (nd === 2) {
        if (i === 0) continue;
        k = j * (nx - 1) + i - 1;
        if (hb[k]) continue;
        len = xs[i] - xs[i - 1];
        add = hc[k];
        ni = i - 1;
      } else if (nd === 1) {
        if (j + 1 >= ny) continue;
        k = j * nx + i;
        if (vb[k]) continue;
        len = ys[j + 1] - ys[j];
        add = vc[k];
        nj = j + 1;
      } else {
        if (j === 0) continue;
        k = (j - 1) * nx + i;
        if (vb[k]) continue;
        len = ys[j] - ys[j - 1];
        add = vc[k];
        nj = j - 1;
      }
      const ns = ((nj * nx + ni) << 2) + nd;
      const ng = gs + len + add + (nd !== d ? BEND : 0);
      if (ng < g[ns]) {
        g[ns] = ng;
        prev[ns] = s;
        heap.push(ng + hd(ni, nj), ns);
      }
    }
  }
  if (bestS < 0) return null;
  const nodes: Pt[] = [];
  for (let s = bestS; s >= 0; s = prev[s]) {
    const n = s >> 2;
    nodes.push([xs[n % nx], ys[(n / nx) | 0]]);
  }
  nodes.reverse();
  return cleanPts([p1, ...nodes, p2]);
}

/** Đường vuông góc né các hộp `obstacles` (không gồm 2 hình đầu mút). null nếu không tìm được. */
export function smartRoute(
  p1: Pt,
  s1: Side,
  p2: Pt,
  s2: Side,
  obstacles: Box[],
  _exclude: string[] = [],
  segs: Seg[] = [],
): Pt[] | null {
  for (const [m, pad] of [
    [MARGIN, 240],
    [MARGIN, 5000],
    [6, 5000],
    [2, 5000],
  ] as const) {
    const r = astar(p1, s1, p2, s2, m, pad, obstacles, segs);
    if (r) return r;
  }
  return null;
}
