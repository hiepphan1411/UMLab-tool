// Đọc/ghi Gantt trong Y.Doc của project: `data:<diagramId>` = { meta, order, task:<id> } (xem project/ydoc.ts).
// Mỗi task một khoá → hai người sửa hai task khác nhau cùng lúc không đè nhau; thứ tự dòng nằm ở `order`.
import type * as Y from 'yjs';
import { dataMap, decodeData } from '../project/ydoc';
import { clone } from '../util/json';
import { normGantt, normTask, syncProg, type GanttData, type GanttTask } from './model';

type Meta = Omit<GanttData, 'tasks'>;

export function readGantt(doc: Y.Doc, diagramId: string): GanttData {
  const raw = decodeData('gantt', Object.fromEntries(dataMap(doc, diagramId).entries()));
  const g = normGantt(raw ?? {});
  // normTask giữ id có sẵn; task hỏng (thiếu id) đã được sinh id mới trong bản đọc
  return g;
}

function order(m: Y.Map<unknown>): string[] {
  const o = m.get('order');
  const ids = Array.isArray(o) ? (o as string[]) : [];
  // task do máy khác thêm mà chưa có trong order → nối vào cuối (như decodeData)
  const extra = [...m.keys()].filter((k) => k.startsWith('task:') && !ids.includes(k.slice(5))).map((k) => k.slice(5));
  return [...ids.filter((id) => m.has('task:' + id)), ...extra];
}

export function ganttSetMeta(doc: Y.Doc, diagramId: string, patch: Partial<Meta>, origin?: unknown): void {
  const m = dataMap(doc, diagramId);
  doc.transact(() => {
    const cur = (m.get('meta') as Meta | undefined) ?? (({ tasks: _t, ...rest }) => rest)(normGantt({}));
    m.set('meta', clone({ ...cur, ...patch }));
  }, origin);
}

export function ganttSetTask(
  doc: Y.Doc,
  diagramId: string,
  taskId: string,
  patch: Partial<GanttTask> | ((t: GanttTask) => GanttTask),
  origin?: unknown,
): void {
  const m = dataMap(doc, diagramId);
  const cur = m.get('task:' + taskId) as GanttTask | undefined;
  if (!cur) return;
  const next = normTask(typeof patch === 'function' ? patch(clone(cur)) : { ...cur, ...patch, id: taskId });
  syncProg(next);
  doc.transact(() => m.set('task:' + taskId, clone(next)), origin);
}

/** Thêm task tại vị trí `index` (mặc định cuối). Trả về task đã chuẩn hoá. */
export function ganttInsertTask(
  doc: Y.Doc,
  diagramId: string,
  raw: Partial<GanttTask>,
  index?: number,
  origin?: unknown,
): GanttTask {
  const m = dataMap(doc, diagramId);
  const t = normTask(raw);
  doc.transact(() => {
    if (!m.has('meta')) ganttSetMeta(doc, diagramId, {});
    const o = order(m);
    o.splice(index === undefined ? o.length : Math.max(0, Math.min(o.length, index)), 0, t.id);
    m.set('task:' + t.id, clone(t));
    m.set('order', o);
  }, origin);
  return t;
}

export function ganttRemoveTask(doc: Y.Doc, diagramId: string, taskId: string, origin?: unknown): void {
  const m = dataMap(doc, diagramId);
  doc.transact(() => {
    m.delete('task:' + taskId);
    m.set(
      'order',
      order(m).filter((id) => id !== taskId),
    );
  }, origin);
}

/** Đổi chỗ task với dòng trên (-1) / dưới (+1). */
export function ganttMoveTask(doc: Y.Doc, diagramId: string, taskId: string, dir: -1 | 1, origin?: unknown): void {
  const m = dataMap(doc, diagramId);
  const o = order(m);
  const i = o.indexOf(taskId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= o.length) return;
  [o[i], o[j]] = [o[j], o[i]];
  doc.transact(() => m.set('order', o), origin);
}

/** Nhập nhiều task (dán Excel / nhập JSON): thay thế toàn bộ hoặc thêm vào cuối. */
export function ganttPutTasks(
  doc: Y.Doc,
  diagramId: string,
  tasks: GanttTask[],
  mode: 'replace' | 'append',
  origin?: unknown,
): void {
  const m = dataMap(doc, diagramId);
  doc.transact(() => {
    if (!m.has('meta')) ganttSetMeta(doc, diagramId, {});
    let o = order(m);
    if (mode === 'replace') {
      for (const id of o) m.delete('task:' + id);
      o = [];
    }
    for (const raw of tasks) {
      const t = normTask(raw);
      if (o.includes(t.id)) t.id = normTask({ ...t, id: undefined }).id;
      m.set('task:' + t.id, clone(t));
      o.push(t.id);
    }
    m.set('order', o);
  }, origin);
}
