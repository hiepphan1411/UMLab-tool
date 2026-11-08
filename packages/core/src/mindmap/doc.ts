// Đọc/ghi mindmap trong Y.Doc: `data:<diagramId>` = { meta, node:<id> } (xem project/ydoc.ts encodeData).
// Mỗi node một khoá → hai người sửa/kéo hai node khác nhau cùng lúc không đè nhau.
import type * as Y from 'yjs';
import { dataMap, decodeData } from '../project/ydoc';
import { clone } from '../util/json';
import { mindTree, normMeta, normMindmap, normNode, type MindmapData, type MindmapMeta, type MindNode } from './model';

export function readMindmap(doc: Y.Doc, diagramId: string, fallbackTitle?: string): MindmapData {
  const raw = decodeData('mindmap', Object.fromEntries(dataMap(doc, diagramId).entries()));
  return normMindmap(raw ?? {}, fallbackTitle);
}

export function mindSetMeta(doc: Y.Doc, diagramId: string, patch: Partial<MindmapMeta>, origin?: unknown): void {
  const m = dataMap(doc, diagramId);
  doc.transact(() => {
    const cur = normMeta(m.get('meta'));
    m.set('meta', clone(normMeta({ ...cur, ...patch })));
  }, origin);
}

export function mindSetNode(
  doc: Y.Doc,
  diagramId: string,
  id: string,
  patch: Partial<MindNode> | ((n: MindNode) => MindNode),
  origin?: unknown,
): void {
  const m = dataMap(doc, diagramId);
  const cur = m.get('node:' + id);
  if (!cur) return;
  const base = normNode(cur);
  const next = normNode(typeof patch === 'function' ? patch(clone(base)) : { ...base, ...patch, id });
  next.id = id;
  doc.transact(() => m.set('node:' + id, clone(next)), origin);
}

/** Cập nhật nhiều node trong một bước undo (vd. kéo cả nhóm, đổi thứ tự). */
export function mindPatchNodes(
  doc: Y.Doc,
  diagramId: string,
  patches: Record<string, Partial<MindNode>>,
  origin?: unknown,
): void {
  const m = dataMap(doc, diagramId);
  doc.transact(() => {
    for (const [id, p] of Object.entries(patches)) {
      const cur = m.get('node:' + id);
      if (!cur) continue;
      const next = normNode({ ...normNode(cur), ...p, id });
      m.set('node:' + id, clone(next));
    }
  }, origin);
}

/** Thêm node con của `parentId` (sau `afterId` nếu có, mặc định cuối). Trả về node đã chuẩn hoá. */
export function mindAddNode(
  doc: Y.Doc,
  diagramId: string,
  parentId: string,
  raw: Partial<MindNode>,
  afterId?: string | null,
  origin?: unknown,
): MindNode {
  const d = readMindmap(doc, diagramId);
  const t = mindTree(d);
  const sibs = t.children(parentId);
  const m = dataMap(doc, diagramId);
  const n = normNode({ kind: parentId === t.root.id ? 'branch' : 'topic', ...raw, parentId });
  doc.transact(() => {
    const idx = afterId ? sibs.findIndex((s) => s.id === afterId) : -1;
    const list = sibs.map((s) => s.id);
    list.splice(idx < 0 ? list.length : idx + 1, 0, n.id);
    list.forEach((id, i) => {
      if (id === n.id) n.order = i;
      else {
        const s = t.byId.get(id)!;
        if (s.order !== i) m.set('node:' + id, clone({ ...s, order: i }));
      }
    });
    m.set('node:' + n.id, clone(n));
    if (!m.has('meta')) m.set('meta', clone(normMeta({ title: d.title })));
  }, origin);
  return n;
}

/** Xoá node và toàn bộ nhánh con (không xoá root). */
export function mindRemoveNode(doc: Y.Doc, diagramId: string, id: string, origin?: unknown): void {
  const t = mindTree(readMindmap(doc, diagramId));
  if (id === t.root.id) return;
  const m = dataMap(doc, diagramId);
  doc.transact(() => {
    for (const x of t.subtree(id)) m.delete('node:' + x);
  }, origin);
}

/** Chuyển node sang cha mới tại vị trí `index` (bỏ độ lệch kéo tay để bố cục tự xếp lại). */
export function mindMoveNode(
  doc: Y.Doc,
  diagramId: string,
  id: string,
  parentId: string,
  index: number,
  origin?: unknown,
): boolean {
  const d = readMindmap(doc, diagramId);
  const t = mindTree(d);
  const n = t.byId.get(id);
  if (!n || id === t.root.id || id === parentId || t.isDescendant(parentId, id) || !t.byId.has(parentId)) return false;
  const m = dataMap(doc, diagramId);
  const list = t
    .children(parentId)
    .map((s) => s.id)
    .filter((x) => x !== id);
  list.splice(Math.max(0, Math.min(list.length, index)), 0, id);
  doc.transact(() => {
    list.forEach((x, i) => {
      const s = t.byId.get(x)!;
      const kind =
        x === id
          ? parentId === t.root.id
            ? s.kind === 'topic'
              ? 'branch'
              : s.kind
            : s.kind === 'branch'
              ? 'topic'
              : s.kind
          : s.kind;
      const next =
        x === id ? { ...s, parentId, order: i, off: n.parentId === parentId ? s.off : null, kind } : { ...s, order: i };
      if (x === id || s.order !== i) m.set('node:' + x, clone(next));
    });
  }, origin);
  return true;
}

/** Thay toàn bộ nội dung mindmap (nhập JSON / mẫu). */
export function mindReplace(doc: Y.Doc, diagramId: string, data: MindmapData, origin?: unknown): void {
  const m = dataMap(doc, diagramId);
  const d = normMindmap(data);
  doc.transact(() => {
    for (const k of [...m.keys()]) m.delete(k);
    const { nodes, ...meta } = d;
    m.set('meta', clone(meta));
    for (const n of nodes) m.set('node:' + n.id, clone(n));
  }, origin);
}
