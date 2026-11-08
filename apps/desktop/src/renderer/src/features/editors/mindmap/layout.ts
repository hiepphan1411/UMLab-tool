// Bố cục mindmap: đo kích thước từng node (ngắt dòng bằng canvas.measureText), xếp cây ngang kiểu "tidy tree"
// sang phải hoặc chia hai phía quanh node trung tâm. Vị trí cuối = vị trí node cha + (độ lệch kéo tay | độ lệch tự động),
// nên kéo một node thì cả nhánh con đi theo.
import { mindTree, type MindmapData, type MindNode, type MindTree } from '@umlab/core';
import { textW } from '../engine/text';

export interface NodeBox {
  id: string;
  depth: number;
  /** Tâm node. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Phía của node so với node trung tâm: 1 phải, -1 trái (root = 1). */
  dir: 1 | -1;
  titleLines: string[];
  sumLines: string[];
  titleSize: number;
  sumSize: number;
  padX: number;
  padY: number;
  /** Lề trái thêm cho huy hiệu "?" của câu hỏi. */
  extraL: number;
  /** Số node con bị ẩn (thu gọn). */
  hidden: number;
  hasKids: boolean;
}

export interface MindLayout {
  boxes: Map<string, NodeBox>;
  /** Thứ tự vẽ (cha trước con). */
  order: string[];
  edges: { from: string; to: string }[];
  bounds: { x: number; y: number; w: number; h: number };
  tree: MindTree;
}

const HGAP = [70, 56, 44];
const VGAP = 14;

interface Spec {
  titleSize: number;
  titleWeight: number;
  sumSize: number;
  maxW: number;
  padX: number;
  padY: number;
  sumMax: number;
}

export function specOf(n: MindNode, depth: number): Spec {
  if (depth === 0) return { titleSize: 21, titleWeight: 700, sumSize: 12.5, maxW: 300, padX: 26, padY: 18, sumMax: 2 };
  if (depth === 1) return { titleSize: 15.5, titleWeight: 700, sumSize: 12, maxW: 240, padX: 16, padY: 11, sumMax: 2 };
  return {
    titleSize: 13.5,
    titleWeight: 600,
    sumSize: 11.8,
    maxW: n.kind === 'question' ? 250 : 230,
    padX: 13,
    padY: 9,
    sumMax: 3,
  };
}

/** Ngắt chuỗi thành các dòng không quá maxW; quá `max` dòng thì cắt và thêm "…". */
export function wrap(text: string, size: number, weight: number, maxW: number, max = 99): string[] {
  const out: string[] = [];
  for (const par of text.split(/\r?\n/)) {
    const words = par.split(/\s+/).filter(Boolean);
    let cur = '';
    for (const w of words) {
      const next = cur ? cur + ' ' + w : w;
      if (textW(next, size, weight) <= maxW || !cur) cur = next;
      else {
        out.push(cur);
        cur = w;
      }
    }
    if (cur) out.push(cur);
  }
  if (out.length > max) {
    const cut = out.slice(0, max);
    let last = cut[max - 1];
    while (last.length > 1 && textW(last + '…', size, weight) > maxW) last = last.slice(0, -1);
    cut[max - 1] = last.trimEnd() + '…';
    return cut;
  }
  return out;
}

function measure(n: MindNode, depth: number) {
  const s = specOf(n, depth);
  const titleLines = wrap(n.title || 'Chưa đặt tên', s.titleSize, s.titleWeight, s.maxW, depth === 0 ? 3 : 4);
  const sumLines = n.summary.trim() ? wrap(n.summary.trim(), s.sumSize, 400, s.maxW, s.sumMax) : [];
  const tw = Math.max(0, ...titleLines.map((l) => textW(l, s.titleSize, s.titleWeight)));
  const sw = Math.max(0, ...sumLines.map((l) => textW(l, s.sumSize, 400)));
  const extraL = n.kind === 'question' && depth > 0 ? 24 : 0;
  const w = Math.ceil(Math.max(tw, sw, depth === 0 ? 140 : 60) + s.padX * 2 + extraL);
  const h = Math.ceil(
    titleLines.length * s.titleSize * 1.28 +
      (sumLines.length ? 6 + sumLines.length * s.sumSize * 1.38 : 0) +
      s.padY * 2,
  );
  return { w, h, titleLines, sumLines, extraL, ...s };
}

export function computeLayout(d: MindmapData): MindLayout {
  const t = mindTree(d);
  const boxes = new Map<string, NodeBox>();
  const order: string[] = [];
  const edges: MindLayout['edges'] = [];
  const auto = new Map<string, { x: number; y: number }>();
  const size = new Map<string, ReturnType<typeof measure>>();
  const visKids = (id: string) => {
    const n = t.byId.get(id)!;
    return n.collapsed ? [] : t.children(id);
  };
  const sz = (n: MindNode, depth: number) => {
    let s = size.get(n.id);
    if (!s) size.set(n.id, (s = measure(n, depth)));
    return s;
  };
  // chiều cao khối của nhánh con
  const blockH = new Map<string, number>();
  const block = (n: MindNode, depth: number): number => {
    const own = sz(n, depth).h;
    const kids = visKids(n.id);
    const kh = kids.reduce((a, c, i) => a + block(c, depth + 1) + (i ? VGAP : 0), 0);
    const h = Math.max(own, kh);
    blockH.set(n.id, h);
    return h;
  };
  const place = (n: MindNode, depth: number, x: number, y: number, dir: 1 | -1) => {
    auto.set(n.id, { x, y });
    const s = sz(n, depth);
    const kids = visKids(n.id);
    const total = kids.reduce((a, c, i) => a + blockH.get(c.id)! + (i ? VGAP : 0), 0);
    let cy = y - total / 2;
    for (const c of kids) {
      const bh = blockH.get(c.id)!;
      const cs = sz(c, depth + 1);
      const gap = HGAP[Math.min(depth, HGAP.length - 1)];
      place(c, depth + 1, x + dir * (s.w / 2 + gap + cs.w / 2), cy + bh / 2, dir);
      cy += bh + VGAP;
    }
  };

  const root = t.root;
  const rs = sz(root, 0);
  const kids = visKids(root.id);
  kids.forEach((k) => block(k, 1));
  let right = kids;
  let left: MindNode[] = [];
  if (d.layout === 'both' && kids.length > 1) {
    const hs = kids.map((k) => blockH.get(k.id)!);
    const total = hs.reduce((a, b) => a + b, 0);
    let best = 1;
    let bestDiff = Infinity;
    let acc = 0;
    for (let i = 1; i < kids.length; i++) {
      acc += hs[i - 1];
      const diff = Math.abs(acc - (total - acc));
      if (diff < bestDiff) {
        bestDiff = diff;
        best = i;
      }
    }
    right = kids.slice(0, best);
    left = kids.slice(best);
  }
  auto.set(root.id, { x: 0, y: 0 });
  const side = (list: MindNode[], dir: 1 | -1) => {
    const total = list.reduce((a, c, i) => a + blockH.get(c.id)! + (i ? VGAP * 2 : 0), 0);
    let cy = -total / 2;
    for (const c of list) {
      const bh = blockH.get(c.id)!;
      const cs = sz(c, 1);
      place(c, 1, dir * (rs.w / 2 + 90 + cs.w / 2), cy + bh / 2, dir);
      cy += bh + VGAP * 2;
    }
  };
  side(right, 1);
  // phía trái xếp từ dưới lên để đọc theo chiều kim đồng hồ
  side([...left].reverse(), -1);

  // vị trí cuối: theo cha + độ lệch
  const dirOf = new Map<string, 1 | -1>();
  for (const c of right) dirOf.set(c.id, 1);
  for (const c of left) dirOf.set(c.id, -1);
  const walk = (n: MindNode, depth: number, px: number, py: number, dir: 1 | -1, parent: MindNode | null) => {
    const a = auto.get(n.id)!;
    let x: number;
    let y: number;
    if (!parent) {
      x = n.off ? n.off.dx : 0;
      y = n.off ? n.off.dy : 0;
    } else {
      const pa = auto.get(parent.id)!;
      x = px + (n.off ? n.off.dx : a.x - pa.x);
      y = py + (n.off ? n.off.dy : a.y - pa.y);
    }
    const s = sz(n, depth);
    const all = t.children(n.id);
    boxes.set(n.id, {
      id: n.id,
      depth,
      x,
      y,
      w: s.w,
      h: s.h,
      dir,
      titleLines: s.titleLines,
      sumLines: s.sumLines,
      titleSize: s.titleSize,
      sumSize: s.sumSize,
      padX: s.padX,
      padY: s.padY,
      extraL: s.extraL,
      hidden: n.collapsed ? t.subtree(n.id).length - 1 : 0,
      hasKids: all.length > 0,
    });
    order.push(n.id);
    for (const c of visKids(n.id)) {
      edges.push({ from: n.id, to: c.id });
      walk(c, depth + 1, x, y, parent ? dir : (dirOf.get(c.id) ?? 1), n);
    }
  };
  walk(root, 0, 0, 0, 1, null);

  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const b of boxes.values()) {
    x0 = Math.min(x0, b.x - b.w / 2);
    y0 = Math.min(y0, b.y - b.h / 2);
    x1 = Math.max(x1, b.x + b.w / 2);
    y1 = Math.max(y1, b.y + b.h / 2);
  }
  if (!Number.isFinite(x0)) x0 = y0 = x1 = y1 = 0;
  return { boxes, order, edges, bounds: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, tree: t };
}

/** Đường cong nối cha → con (từ cạnh bên của cha tới cạnh đối diện của con). */
export function edgePath(a: NodeBox, b: NodeBox): string {
  const dir = b.x >= a.x ? 1 : -1;
  const sx = a.depth === 0 ? a.x + dir * (a.w / 2 - 8) : a.x + (dir * a.w) / 2;
  const sy = a.y;
  const ex = b.x - (dir * b.w) / 2;
  const ey = b.y;
  const k = Math.max(24, Math.abs(ex - sx) * 0.5);
  return `M${sx},${sy} C${sx + dir * k},${sy} ${ex - dir * k},${ey} ${ex},${ey}`;
}

/** Node ở toạ độ thế giới (x, y), bỏ qua các id trong `skip`. */
export function hitNode(L: MindLayout, x: number, y: number, skip?: Set<string>): string | null {
  for (let i = L.order.length - 1; i >= 0; i--) {
    const id = L.order[i];
    if (skip?.has(id)) continue;
    const b = L.boxes.get(id)!;
    if (Math.abs(x - b.x) <= b.w / 2 && Math.abs(y - b.y) <= b.h / 2) return id;
  }
  return null;
}
