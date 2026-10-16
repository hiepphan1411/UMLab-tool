// Thao tác thư mục / sơ đồ trên Y.Doc của project (thay cho REST /folders, /diagrams của kế hoạch web).
// Mọi hàm chạy trong một transaction với `origin` truyền vào (để Y.UndoManager/đồng bộ phân biệt nguồn).
import type * as Y from 'yjs';
import type { DiagramFile, DiagramMeta, DiagramRecord, DiagramType, Folder, ModelElement } from '../format/types';
import { uid } from '../util/ids';
import { clone } from '../util/json';
import { remapDeep } from './bundle';
import { newDiagram } from './templates';
import { diagramsMap, foldersMap, modelMap, putDiagram, readDiagram, removeDiagram } from './ydoc';

export type DropPos = 'before' | 'after' | 'inside';

export const listFolders = (doc: Y.Doc): Folder[] => [...foldersMap(doc).values()];
export const listDiagrams = (doc: Y.Doc): DiagramMeta[] => [...diagramsMap(doc).values()];

const byOrder = <T extends { order: number; name: string }>(a: T, b: T) =>
  a.order - b.order || a.name.localeCompare(b.name, 'vi');

export function childFolders(doc: Y.Doc, parentId: string | null): Folder[] {
  return listFolders(doc)
    .filter((f) => (f.parentId ?? null) === parentId)
    .sort(byOrder);
}

export function folderDiagrams(doc: Y.Doc, folderId: string | null): DiagramMeta[] {
  return listDiagrams(doc)
    .filter((d) => (d.folderId ?? null) === folderId)
    .sort(byOrder);
}

/** Tập id thư mục con cháu (kể cả chính nó). */
export function descendants(doc: Y.Doc, folderId: string): Set<string> {
  const all = listFolders(doc);
  const out = new Set([folderId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of all)
      if (f.parentId && out.has(f.parentId) && !out.has(f.id)) {
        out.add(f.id);
        grew = true;
      }
  }
  return out;
}

/** Đường dẫn thư mục: ["Phân tích", "Đặc tả"]. */
export function folderPath(doc: Y.Doc, folderId: string | null): Folder[] {
  const map = foldersMap(doc);
  const out: Folder[] = [];
  let cur = folderId ? map.get(folderId) : undefined;
  let guard = 0;
  while (cur && guard++ < 64) {
    out.unshift(cur);
    cur = cur.parentId ? map.get(cur.parentId) : undefined;
  }
  return out;
}

const nextOrder = (items: { order: number }[]) => (items.length ? Math.max(...items.map((x) => x.order)) + 1 : 0);

/** Tên không trùng trong cùng thư mục: "Sơ đồ mới", "Sơ đồ mới 2"… */
export function uniqueName(existing: string[], base: string): string {
  const set = new Set(existing.map((s) => s.toLowerCase()));
  if (!set.has(base.toLowerCase())) return base;
  for (let i = 2; ; i++) if (!set.has(`${base} ${i}`.toLowerCase())) return `${base} ${i}`;
}

export function createFolder(doc: Y.Doc, name: string, parentId: string | null, origin?: unknown): string {
  const id = uid('f');
  doc.transact(() => {
    const siblings = childFolders(doc, parentId);
    foldersMap(doc).set(id, {
      id,
      parentId,
      name: uniqueName(
        siblings.map((f) => f.name),
        name.trim() || 'Thư mục mới',
      ),
      order: nextOrder(siblings),
    });
  }, origin);
  return id;
}

export function renameFolder(doc: Y.Doc, id: string, name: string, origin?: unknown): void {
  const f = foldersMap(doc).get(id);
  if (!f || !name.trim()) return;
  doc.transact(() => foldersMap(doc).set(id, { ...f, name: name.trim() }), origin);
}

/** Xoá thư mục: 'cascade' xoá cả thư mục con + sơ đồ; 'moveToParent' chuyển nội dung lên thư mục cha. */
export function deleteFolder(doc: Y.Doc, id: string, mode: 'cascade' | 'moveToParent', origin?: unknown): void {
  const f = foldersMap(doc).get(id);
  if (!f) return;
  doc.transact(() => {
    if (mode === 'cascade') {
      const ids = descendants(doc, id);
      for (const d of listDiagrams(doc)) if (d.folderId && ids.has(d.folderId)) removeDiagram(doc, d.id);
      for (const fid of ids) foldersMap(doc).delete(fid);
    } else {
      const parent = f.parentId ?? null;
      let o = nextOrder(childFolders(doc, parent));
      for (const c of childFolders(doc, id)) foldersMap(doc).set(c.id, { ...c, parentId: parent, order: o++ });
      let od = nextOrder(folderDiagrams(doc, parent));
      for (const d of folderDiagrams(doc, id)) diagramsMap(doc).set(d.id, { ...d, folderId: parent, order: od++ });
      foldersMap(doc).delete(id);
    }
  }, origin);
}

export function diagramUsesFolder(doc: Y.Doc, folderId: string): { folders: number; diagrams: number } {
  const ids = descendants(doc, folderId);
  return { folders: ids.size - 1, diagrams: listDiagrams(doc).filter((d) => d.folderId && ids.has(d.folderId)).length };
}

/**
 * Kéo thả trong cây: chuyển các mục (thư mục hoặc sơ đồ) tới vị trí trước/sau/vào trong mục đích.
 * targetId null + 'inside' = thả vào gốc. Đánh lại thứ tự anh em liên tục 0..n. Trả về false nếu không hợp lệ.
 */
export function moveItems(doc: Y.Doc, ids: string[], targetId: string | null, pos: DropPos, origin?: unknown): boolean {
  const fm = foldersMap(doc);
  const dm = diagramsMap(doc);
  let parent: string | null;
  let anchor: string | null = null;
  if (targetId === null) parent = null;
  else if (pos === 'inside') {
    if (!fm.has(targetId)) return false;
    parent = targetId;
  } else {
    const tf = fm.get(targetId);
    const td = dm.get(targetId);
    if (!tf && !td) return false;
    parent = tf ? (tf.parentId ?? null) : (td!.folderId ?? null);
    anchor = targetId;
  }
  const folderIds = ids.filter((id) => fm.has(id));
  const diagramIds = ids.filter((id) => dm.has(id));
  // không cho thả thư mục vào chính nó/con cháu của nó
  for (const fid of folderIds) if (parent && descendants(doc, fid).has(parent)) return false;
  doc.transact(() => {
    const placeFolders = () => {
      const sib = childFolders(doc, parent).filter((f) => !folderIds.includes(f.id));
      const moving = folderIds.map((id) => fm.get(id)!).filter(Boolean);
      let idx = sib.length;
      if (anchor && fm.has(anchor)) {
        const i = sib.findIndex((f) => f.id === anchor);
        idx = pos === 'before' ? i : i + 1;
      } else if (anchor && dm.has(anchor) && pos === 'before') idx = sib.length;
      const list = [...sib.slice(0, idx), ...moving, ...sib.slice(idx)];
      list.forEach((f, i) => {
        const cur = fm.get(f.id)!;
        if (cur.parentId !== parent || cur.order !== i) fm.set(f.id, { ...cur, parentId: parent, order: i });
      });
    };
    const placeDiagrams = () => {
      const sib = folderDiagrams(doc, parent).filter((d) => !diagramIds.includes(d.id));
      const moving = diagramIds.map((id) => dm.get(id)!).filter(Boolean);
      let idx = sib.length;
      if (anchor && dm.has(anchor)) {
        const i = sib.findIndex((d) => d.id === anchor);
        idx = pos === 'before' ? i : i + 1;
      } else if (anchor && fm.has(anchor)) idx = 0;
      const list = [...sib.slice(0, idx), ...moving, ...sib.slice(idx)];
      list.forEach((d, i) => {
        const cur = dm.get(d.id)!;
        if (cur.folderId !== parent || cur.order !== i) dm.set(d.id, { ...cur, folderId: parent, order: i });
      });
    };
    if (folderIds.length) placeFolders();
    if (diagramIds.length) placeDiagrams();
  }, origin);
  return true;
}

export function createDiagram(
  doc: Y.Doc,
  type: DiagramType,
  name: string,
  folderId: string | null,
  origin?: unknown,
  init?: Partial<Pick<DiagramRecord, 'views' | 'connectors' | 'data' | 'canvas' | 'generatedFrom'>> & {
    model?: ModelElement[];
  },
): string {
  const siblings = folderDiagrams(doc, folderId);
  const d = newDiagram(
    type,
    uniqueName(
      siblings.map((x) => x.name),
      name.trim() || 'Sơ đồ mới',
    ),
    folderId,
    nextOrder(siblings),
  );
  const { model, ...rest } = init ?? {};
  Object.assign(d, rest);
  doc.transact(() => {
    putDiagram(doc, d);
    for (const m of model ?? []) modelMap(doc).set(m.id, clone(m));
  }, origin);
  return d.id;
}

export function updateDiagramMeta(doc: Y.Doc, id: string, patch: Partial<DiagramMeta>, origin?: unknown): void {
  const d = diagramsMap(doc).get(id);
  if (!d) return;
  doc.transact(() => diagramsMap(doc).set(id, { ...d, ...clone(patch), id }), origin);
}

export function renameDiagram(doc: Y.Doc, id: string, name: string, origin?: unknown): void {
  if (name.trim()) updateDiagramMeta(doc, id, { name: name.trim() }, origin);
}

/** Nhân bản sơ đồ trong cùng project: id hình/đường nối mới, phần tử mô hình giữ nguyên (cùng một phần tử). */
export function duplicateDiagram(
  doc: Y.Doc,
  id: string,
  origin?: unknown,
  now = new Date().toISOString(),
): string | null {
  const d = readDiagram(doc, id);
  if (!d) return null;
  const map = new Map<string, string>();
  d.views.forEach((v) => map.set(v.id, uid('v')));
  d.connectors.forEach((c) => map.set(c.id, uid('c')));
  const nid = uid('dg');
  map.set(d.id, nid);
  const copy = remapDeep({ views: d.views, connectors: d.connectors, data: d.data }, map);
  const siblings = folderDiagrams(doc, d.folderId);
  const rec: DiagramRecord = {
    ...clone(d),
    ...copy,
    id: nid,
    name: uniqueName(
      siblings.map((x) => x.name),
      `${d.name} (bản sao)`,
    ),
    order: d.order + 0.5,
    createdAt: now,
    updatedAt: now,
    generatedFrom: null,
  };
  doc.transact(() => {
    putDiagram(doc, rec);
    // dồn lại thứ tự anh em
    folderDiagrams(doc, d.folderId).forEach((x, i) => {
      if (x.order !== i) diagramsMap(doc).set(x.id, { ...x, order: i });
    });
  }, origin);
  return nid;
}

export function deleteDiagrams(doc: Y.Doc, ids: string[], origin?: unknown): void {
  doc.transact(() => ids.forEach((id) => removeDiagram(doc, id)), origin);
}

/** Phần tử mô hình trong tệp sơ đồ trùng id với phần tử đã có trong project. */
export function conflictingModel(doc: Y.Doc, file: DiagramFile): ModelElement[] {
  const mm = modelMap(doc);
  return file.model.filter((m) => mm.has(m.id));
}

/**
 * Nhập tệp `kind: diagram` vào project (docs/spec/json-format.md mục 3): tạo sơ đồ mới trong thư mục chỉ định.
 * Phần tử mô hình trùng id: 'reuse' dùng lại phần tử sẵn có; 'copy' tạo bản sao (id mới).
 */
export function importDiagramFile(
  doc: Y.Doc,
  file: DiagramFile,
  folderId: string | null,
  modelMode: 'reuse' | 'copy',
  origin?: unknown,
): string {
  const mm = modelMap(doc);
  const map = new Map<string, string>();
  file.diagram.views.forEach((v) => map.set(v.id, uid('v')));
  file.diagram.connectors.forEach((c) => map.set(c.id, uid('c')));
  const model: ModelElement[] = [];
  for (const m of file.model) {
    if (mm.has(m.id) && modelMode === 'reuse') continue;
    if (mm.has(m.id)) map.set(m.id, uid('m'));
    model.push(m);
  }
  const content = remapDeep(
    { views: file.diagram.views, connectors: file.diagram.connectors, data: file.diagram.data, model },
    map,
  );
  return createDiagram(doc, file.diagram.type, file.diagram.name, folderId, origin, {
    views: content.views,
    connectors: content.connectors,
    data: content.data,
    canvas: file.diagram.canvas,
    model: content.model,
  });
}
