// Mô hình dữ liệu sơ đồ tư duy (`mindmap`): cây node có tiêu đề + khái niệm ngắn hiển thị trên canvas,
// nội dung chi tiết dạng Markdown mở rộng (bảng, công thức KaTeX, hình SVG, ảnh) xem trong drawer, và danh sách
// tài liệu tham khảo dùng chung đánh số theo báo cáo ([1], [2]…).
import { uid } from '../util/ids';
import { isPlainObject } from '../util/json';

/** root: trung tâm · branch: nhánh cấp 1 · topic: ý thường · question: câu hỏi phản biện · note: ghi chú/kết luận. */
export const MIND_KINDS = ['root', 'branch', 'topic', 'question', 'note'] as const;
export type MindKind = (typeof MIND_KINDS)[number];

export const MIND_LAYOUTS = ['both', 'right'] as const;
export type MindLayout = (typeof MIND_LAYOUTS)[number];

export interface MindRef {
  /** Số thứ tự đúng như mục "Tài liệu tham khảo" của báo cáo. */
  id: number;
  text: string;
  url?: string;
}

export interface MindNode {
  id: string;
  parentId: string | null;
  /** Thứ tự giữa các node cùng cha. */
  order: number;
  kind: MindKind;
  title: string;
  /** Khái niệm ngắn hiện ngay dưới tiêu đề trên canvas. */
  summary: string;
  /** Nội dung chi tiết (Markdown mở rộng) hiện trong drawer. */
  detail: string;
  /** Màu nhánh (hex); null = kế thừa từ nhánh cha / bảng màu tự động. */
  color: string | null;
  /** Số hiệu tài liệu tham khảo (trỏ vào `references`). */
  refs: number[];
  tags: string[];
  collapsed: boolean;
  /** Độ lệch so với vị trí của node cha sau khi kéo tay; null = theo bố cục tự động. Root: toạ độ tuyệt đối. */
  off: { dx: number; dy: number } | null;
}

export interface MindmapMeta {
  title: string;
  layout: MindLayout;
  /** Khoá chỉnh sửa (chỉ xem, vẫn kéo khung nhìn / thu gọn / mở drawer được). */
  locked: boolean;
  references: MindRef[];
}

export interface MindmapData extends MindmapMeta {
  nodes: MindNode[];
}

const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const HEX = /^#[0-9a-f]{6}$/i;

export function normRef(raw: unknown): MindRef | null {
  if (!isPlainObject(raw)) return null;
  const id = num(raw.id);
  if (id === null || id < 0) return null;
  const r: MindRef = { id: Math.round(id), text: str(raw.text).trim() };
  const url = str(raw.url).trim();
  if (/^https?:\/\//i.test(url)) r.url = url;
  return r;
}

export function normNode(raw: unknown): MindNode {
  const o = isPlainObject(raw) ? raw : {};
  const kind = MIND_KINDS.includes(o.kind as MindKind) ? (o.kind as MindKind) : 'topic';
  const off = isPlainObject(o.off) ? { dx: num(o.off.dx), dy: num(o.off.dy) } : null;
  return {
    id: str(o.id) || uid('mn'),
    parentId: typeof o.parentId === 'string' && o.parentId ? o.parentId : null,
    order: num(o.order) ?? 0,
    kind,
    title: str(o.title),
    summary: str(o.summary),
    detail: str(o.detail),
    color: typeof o.color === 'string' && HEX.test(o.color) ? o.color : null,
    refs: Array.isArray(o.refs)
      ? [
          ...new Set(
            o.refs
              .map(num)
              .filter((x): x is number => x !== null)
              .map(Math.round),
          ),
        ]
      : [],
    tags: Array.isArray(o.tags) ? o.tags.filter((t): t is string => typeof t === 'string' && !!t.trim()) : [],
    collapsed: o.collapsed === true,
    off: off && off.dx !== null && off.dy !== null ? { dx: off.dx, dy: off.dy } : null,
  };
}

export function normMeta(raw: unknown, fallbackTitle = 'Sơ đồ tư duy'): MindmapMeta {
  const o = isPlainObject(raw) ? raw : {};
  const refs = Array.isArray(o.references) ? o.references.map(normRef).filter((r): r is MindRef => !!r) : [];
  const seen = new Set<number>();
  return {
    title: str(o.title) || fallbackTitle,
    layout: MIND_LAYOUTS.includes(o.layout as MindLayout) ? (o.layout as MindLayout) : 'both',
    locked: o.locked === true,
    references: refs.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true))).sort((a, b) => a.id - b.id),
  };
}

/**
 * Chuẩn hoá dữ liệu mindmap: đúng một root (thiếu thì tạo), id không trùng, parent hỏng/vòng lặp → gắn vào root.
 */
export function normMindmap(raw: unknown, fallbackTitle?: string): MindmapData {
  const o = isPlainObject(raw) ? raw : {};
  const meta = normMeta(o, fallbackTitle);
  const seen = new Set<string>();
  const nodes: MindNode[] = [];
  for (const r of Array.isArray(o.nodes) ? o.nodes : []) {
    const n = normNode(r);
    if (seen.has(n.id)) n.id = uid('mn');
    seen.add(n.id);
    nodes.push(n);
  }
  let root = nodes.find((n) => n.kind === 'root' && !n.parentId) ?? nodes.find((n) => !n.parentId);
  if (!root) {
    root = normNode({ kind: 'root', title: meta.title });
    nodes.unshift(root);
  }
  root.kind = 'root';
  root.parentId = null;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const n of nodes) {
    if (n === root) continue;
    if (n.kind === 'root') n.kind = 'branch';
    if (!n.parentId || !byId.has(n.parentId) || n.parentId === n.id) n.parentId = root.id;
  }
  // phá vòng lặp cha-con
  for (const n of nodes) {
    const path = new Set<string>([n.id]);
    let p = n.parentId ? byId.get(n.parentId) : undefined;
    while (p) {
      if (path.has(p.id)) {
        n.parentId = root.id;
        break;
      }
      path.add(p.id);
      p = p.parentId ? byId.get(p.parentId) : undefined;
    }
  }
  return { ...meta, nodes };
}

// ---------------- truy vấn cây ----------------

export interface MindTree {
  root: MindNode;
  byId: Map<string, MindNode>;
  /** Con theo thứ tự `order`. */
  children: (id: string) => MindNode[];
  depth: (id: string) => number;
  /** Danh sách tổ tiên từ root → cha (không gồm chính nó). */
  path: (id: string) => MindNode[];
  /** Node cấp 1 chứa node này (null với root). */
  branchOf: (id: string) => MindNode | null;
  isDescendant: (id: string, ancestor: string) => boolean;
  subtree: (id: string) => string[];
}

export function mindTree(d: Pick<MindmapData, 'nodes'>): MindTree {
  const byId = new Map(d.nodes.map((n) => [n.id, n]));
  const kids = new Map<string, MindNode[]>();
  for (const n of d.nodes) {
    if (!n.parentId) continue;
    const a = kids.get(n.parentId) ?? [];
    a.push(n);
    kids.set(n.parentId, a);
  }
  for (const a of kids.values()) a.sort((x, y) => x.order - y.order || (x.id < y.id ? -1 : 1));
  const root = d.nodes.find((n) => !n.parentId) ?? d.nodes[0];
  const path = (id: string) => {
    const out: MindNode[] = [];
    let p = byId.get(id)?.parentId;
    let guard = 0;
    while (p && guard++ < 1000) {
      const n = byId.get(p);
      if (!n) break;
      out.unshift(n);
      p = n.parentId;
    }
    return out;
  };
  const subtree = (id: string) => {
    const out: string[] = [];
    const st = [id];
    while (st.length) {
      const x = st.pop()!;
      out.push(x);
      for (const c of kids.get(x) ?? []) st.push(c.id);
    }
    return out;
  };
  return {
    root,
    byId,
    children: (id) => kids.get(id) ?? [],
    depth: (id) => path(id).length,
    path,
    branchOf: (id) => {
      const p = path(id);
      if (!p.length) return null;
      return p.length === 1 ? (byId.get(id) ?? null) : p[1];
    },
    isDescendant: (id, ancestor) => path(id).some((n) => n.id === ancestor),
    subtree,
  };
}

/** Bảng màu nhánh tự động (đủ tương phản với chữ trắng ở nền sáng). */
export const MIND_PALETTE = [
  '#2E62E6',
  '#0E8A6E',
  '#C2410C',
  '#7C3AED',
  '#BE185D',
  '#0369A1',
  '#A16207',
  '#4D7C0F',
  '#B91C1C',
  '#475569',
];

/** Màu của một node: màu riêng → màu của tổ tiên gần nhất có màu → màu nhánh cấp 1 theo bảng màu. */
export function mindColor(t: MindTree, id: string): string {
  const n = t.byId.get(id);
  if (!n) return MIND_PALETTE[0];
  if (n.color) return n.color;
  const p = t.path(id);
  for (let i = p.length - 1; i >= 1; i--) if (p[i].color) return p[i].color!;
  const b = t.branchOf(id);
  if (!b) return MIND_PALETTE[0];
  const idx = t.children(t.root.id).findIndex((c) => c.id === b.id);
  return b.color ?? MIND_PALETTE[(idx < 0 ? 0 : idx) % MIND_PALETTE.length];
}

/** Đọc danh sách tài liệu tham khảo dạng văn bản "[n] nội dung <url>" (mỗi dòng một mục). */
export function parseRefsText(text: string): MindRef[] {
  const out: MindRef[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*\\?\[(\d+)\\?\]\s*(.+?)\s*$/.exec(line);
    if (!m) continue;
    let body = m[2];
    const um = /<?(https?:\/\/[^\s>]+)>?\s*\.?$/.exec(body);
    const r: MindRef = { id: Number(m[1]), text: body };
    if (um) {
      r.url = um[1];
      body = body
        .slice(0, um.index)
        .replace(/\s*Available:\s*$/i, '')
        .trim();
      r.text = body;
    }
    out.push(r);
  }
  return normMeta({ references: out }).references;
}

export const refsToText = (refs: MindRef[]) =>
  refs.map((r) => `[${r.id}] ${r.text}${r.url ? ` <${r.url}>` : ''}`).join('\n');

/** Mindmap trống: chỉ có node trung tâm. */
export function emptyMindmap(title: string): MindmapData {
  return normMindmap({ title, nodes: [{ kind: 'root', title }] }, title);
}
