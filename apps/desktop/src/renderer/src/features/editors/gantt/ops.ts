// Thao tác ghi Gantt của editor: bọc các hàm core (gantt/doc.ts) với origin LOCAL (có undo, đồng bộ) và chế độ chỉ xem.
import type * as Y from 'yjs';
import {
  ganttInsertTask,
  ganttMoveTask,
  ganttPutTasks,
  ganttRemoveTask,
  ganttSetMeta,
  ganttSetTask,
  type GanttData,
  type GanttTask,
} from '@umlab/core';
import { LOCAL } from '../../workspace/session';

export interface GanttOps {
  setMeta(patch: Partial<Omit<GanttData, 'tasks'>>): void;
  setTask(id: string, patch: Partial<GanttTask> | ((t: GanttTask) => GanttTask)): void;
  insert(t: Partial<GanttTask>, index?: number): GanttTask | null;
  remove(id: string): void;
  move(id: string, dir: -1 | 1): void;
  put(tasks: GanttTask[], mode: 'replace' | 'append'): void;
}

export function makeOps(doc: Y.Doc, diagramId: string, readOnly: boolean): GanttOps {
  const ro =
    <A extends unknown[], R>(fn: (...a: A) => R, d: R) =>
    (...a: A): R =>
      readOnly ? d : fn(...a);
  return {
    setMeta: ro((p) => ganttSetMeta(doc, diagramId, p, LOCAL), undefined),
    setTask: ro((id, p) => ganttSetTask(doc, diagramId, id, p, LOCAL), undefined),
    insert: ro((t, i) => ganttInsertTask(doc, diagramId, t, i, LOCAL), null),
    remove: ro((id) => ganttRemoveTask(doc, diagramId, id, LOCAL), undefined),
    move: ro((id, dir) => ganttMoveTask(doc, diagramId, id, dir, LOCAL), undefined),
    put: ro((ts, mode) => ganttPutTasks(doc, diagramId, ts, mode, LOCAL), undefined),
  };
}
