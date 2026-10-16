import * as Y from 'yjs';
import type {
  Connector,
  DiagramContent,
  DiagramMeta,
  DiagramRecord,
  DiagramType,
  Folder,
  ModelElement,
  ProjectBundle,
  ProjectInfo,
  View,
} from '../format/types';
import { clone, isPlainObject, jsonEqual } from '../util/json';

/**
 * Cấu trúc Y.Doc của một project (docs/ARCHITECTURE.md mục 4). Mỗi giá trị là JSON thuần, thay cả object khi sửa —
 * xung đột giữa hai người được giải quyết ở mức phần tử (hình, đường nối, phần tử mô hình, thư mục, task Gantt…).
 */
export const YK = {
  meta: 'meta',
  folders: 'folders',
  diagrams: 'diagrams',
  model: 'model',
  views: (diagramId: string) => `views:${diagramId}`,
  conns: (diagramId: string) => `conns:${diagramId}`,
  data: (diagramId: string) => `data:${diagramId}`,
} as const;

export const foldersMap = (doc: Y.Doc) => doc.getMap<Folder>(YK.folders);
export const diagramsMap = (doc: Y.Doc) => doc.getMap<DiagramMeta>(YK.diagrams);
export const modelMap = (doc: Y.Doc) => doc.getMap<ModelElement>(YK.model);
export const metaMap = (doc: Y.Doc) => doc.getMap<unknown>(YK.meta);
export const viewsMap = (doc: Y.Doc, id: string) => doc.getMap<View>(YK.views(id));
export const connsMap = (doc: Y.Doc, id: string) => doc.getMap<Connector>(YK.conns(id));
export const dataMap = (doc: Y.Doc, id: string) => doc.getMap<unknown>(YK.data(id));

/** Ghi danh sách vào Y.Map theo kiểu so sánh: chỉ set phần tử đổi, xoá phần tử không còn. */
export function syncMap<T extends { id: string }>(map: Y.Map<T>, items: T[]): void {
  const keep = new Set<string>();
  for (const it of items) {
    keep.add(it.id);
    const cur = map.get(it.id);
    if (!cur || !jsonEqual(cur, it)) map.set(it.id, clone(it));
  }
  for (const k of [...map.keys()]) if (!keep.has(k)) map.delete(k);
}

export function syncEntries(map: Y.Map<unknown>, entries: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(entries)) {
    if (v === undefined) continue;
    const cur = map.get(k);
    if (cur === undefined || !jsonEqual(cur, v)) map.set(k, clone(v));
  }
  for (const k of [...map.keys()]) if (!(k in entries) || entries[k] === undefined) map.delete(k);
}

// ---------------- mã hoá phần `data` của sơ đồ không phải canvas ----------------

/** Tách `data` thành nhiều khoá để hai người sửa hai phần khác nhau không đè nhau. */
export function encodeData(type: DiagramType, data: unknown): Record<string, unknown> {
  if (data === null || data === undefined) return {};
  if (type === 'gantt' && isPlainObject(data) && Array.isArray(data.tasks)) {
    const { tasks, ...meta } = data as { tasks: { id: string }[] } & Record<string, unknown>;
    const out: Record<string, unknown> = { meta, order: tasks.map((t) => t.id) };
    for (const t of tasks) out['task:' + t.id] = t;
    return out;
  }
  if (isPlainObject(data)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) if (v !== undefined) out['f:' + k] = v;
    return out;
  }
  return { value: data };
}

export function decodeData(type: DiagramType, entries: Record<string, unknown>): unknown {
  const keys = Object.keys(entries);
  if (!keys.length) return null;
  if (type === 'gantt' && 'meta' in entries) {
    const order = Array.isArray(entries.order) ? (entries.order as string[]) : [];
    const tasks: unknown[] = [];
    const seen = new Set<string>();
    for (const id of order) {
      const t = entries['task:' + id];
      if (t && !seen.has(id)) {
        tasks.push(t);
        seen.add(id);
      }
    }
    // Task thêm đồng thời ở máy khác có thể chưa nằm trong `order` → nối vào cuối, không mất.
    for (const k of keys)
      if (k.startsWith('task:') && !seen.has(k.slice(5))) {
        tasks.push(entries[k]);
        seen.add(k.slice(5));
      }
    return { ...(entries.meta as object), tasks };
  }
  if ('value' in entries && keys.length === 1) return entries.value;
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k.startsWith('f:')) out[k.slice(2)] = entries[k];
  return out;
}

const sortByZ = <T extends { z?: number; id: string }>(a: T, b: T) => (a.z ?? 0) - (b.z ?? 0) || (a.id < b.id ? -1 : 1);

// ---------------- đọc ----------------

export function readContent(doc: Y.Doc, diagramId: string): DiagramContent {
  const meta = diagramsMap(doc).get(diagramId);
  const views = [...viewsMap(doc, diagramId).values()].map((v) => clone(v)).sort(sortByZ);
  const connectors = [...connsMap(doc, diagramId).values()].map((c) => clone(c)).sort(sortByZ);
  const data = meta ? decodeData(meta.type, Object.fromEntries(dataMap(doc, diagramId).entries())) : null;
  return { views, connectors, data: clone(data) };
}

export function readDiagram(doc: Y.Doc, diagramId: string): DiagramRecord | null {
  const meta = diagramsMap(doc).get(diagramId);
  if (!meta) return null;
  return { ...clone(meta), ...readContent(doc, diagramId) };
}

export function readBundle(doc: Y.Doc, project: ProjectInfo): ProjectBundle {
  const folders = [...foldersMap(doc).values()]
    .map((f) => clone(f))
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  const diagrams = [...diagramsMap(doc).keys()]
    .map((id) => readDiagram(doc, id)!)
    .filter(Boolean)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  const model = [...modelMap(doc).values()].map((m) => clone(m)).sort((a, b) => (a.id < b.id ? -1 : 1));
  const meta = Object.fromEntries([...metaMap(doc).entries()].map(([k, v]) => [k, clone(v)]));
  return { project: clone(project), folders, diagrams, model, meta };
}

// ---------------- ghi ----------------

export function writeContent(
  doc: Y.Doc,
  diagramId: string,
  type: DiagramType,
  content: Partial<DiagramContent>,
  origin?: unknown,
): void {
  doc.transact(() => {
    if (content.views) syncMap(viewsMap(doc, diagramId), content.views);
    if (content.connectors) syncMap(connsMap(doc, diagramId), content.connectors);
    if ('data' in content) syncEntries(dataMap(doc, diagramId), encodeData(type, content.data));
  }, origin);
}

/** Thêm/ghi đè toàn bộ một sơ đồ (meta + nội dung). */
export function putDiagram(doc: Y.Doc, d: DiagramRecord, origin?: unknown): void {
  doc.transact(() => {
    const { views, connectors, data, ...meta } = d;
    diagramsMap(doc).set(d.id, clone(meta));
    writeContent(doc, d.id, d.type, { views, connectors, data });
  }, origin);
}

export function removeDiagram(doc: Y.Doc, diagramId: string, origin?: unknown): void {
  doc.transact(() => {
    diagramsMap(doc).delete(diagramId);
    viewsMap(doc, diagramId).clear();
    connsMap(doc, diagramId).clear();
    dataMap(doc, diagramId).clear();
  }, origin);
}

/** Ghi cả project vào một Y.Doc (thường là doc mới) trong một transaction. */
export function writeBundle(doc: Y.Doc, b: ProjectBundle, origin?: unknown): void {
  doc.transact(() => {
    syncMap(foldersMap(doc), b.folders);
    for (const id of [...diagramsMap(doc).keys()]) if (!b.diagrams.some((d) => d.id === id)) removeDiagram(doc, id);
    for (const d of b.diagrams) putDiagram(doc, d);
    syncMap(modelMap(doc), b.model);
    if (b.meta) syncEntries(metaMap(doc), b.meta);
  }, origin);
}

export function bundleToUpdate(b: ProjectBundle): Uint8Array {
  const doc = new Y.Doc();
  writeBundle(doc, b);
  return Y.encodeStateAsUpdate(doc);
}

export function docFromUpdates(updates: Uint8Array[]): Y.Doc {
  const doc = new Y.Doc();
  doc.transact(() => {
    for (const u of updates) Y.applyUpdate(doc, u);
  });
  return doc;
}

/** Thống kê hiển thị ở trang chủ. */
export function computeStats(doc: Y.Doc): { diagramCount: number; diagramCountByType: Record<string, number> } {
  const byType: Record<string, number> = {};
  let n = 0;
  for (const d of diagramsMap(doc).values()) {
    n++;
    byType[d.type] = (byType[d.type] ?? 0) + 1;
  }
  return { diagramCount: n, diagramCountByType: byType };
}
