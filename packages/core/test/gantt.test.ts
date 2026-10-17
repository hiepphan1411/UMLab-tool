import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import {
  dataMap,
  ganttInsertTask,
  ganttMoveTask,
  ganttPutTasks,
  ganttRemoveTask,
  ganttSetMeta,
  ganttSetTask,
  gSummary,
  parseTSV,
  readGantt,
  rowsToTasks,
  statusOf,
  dn,
} from '../src';

const D = 'dg1';
const fresh = () => {
  const doc = new Y.Doc();
  ganttSetMeta(doc, D, { title: 'Dự án', board: 'sprint', reportDate: '2026-10-10' });
  return doc;
};

describe('Gantt trên Y.Doc', () => {
  it('thêm / sửa / đổi chỗ / xoá task giữ đúng thứ tự', () => {
    const doc = fresh();
    const a = ganttInsertTask(doc, D, { code: 'Sprint 1', start: '2026-10-01', end: '2026-10-14' });
    const b = ganttInsertTask(doc, D, { code: 'Sprint 2', start: '2026-10-15', end: '2026-10-28' });
    const c = ganttInsertTask(doc, D, { code: 'Sprint 0', start: '2026-09-20', end: '2026-09-30' }, 0);
    expect(readGantt(doc, D).tasks.map((t) => t.code)).toEqual(['Sprint 0', 'Sprint 1', 'Sprint 2']);
    ganttSetTask(doc, D, a.id, { progress: 140 });
    expect(readGantt(doc, D).tasks[1].progress).toBe(100);
    ganttMoveTask(doc, D, b.id, -1);
    expect(readGantt(doc, D).tasks.map((t) => t.id)).toEqual([c.id, b.id, a.id]);
    ganttRemoveTask(doc, D, c.id);
    expect(readGantt(doc, D).tasks.map((t) => t.id)).toEqual([b.id, a.id]);
    expect(readGantt(doc, D).title).toBe('Dự án');
  });

  it('checklist tự tính % khi autoProg', () => {
    const doc = fresh();
    const t = ganttInsertTask(doc, D, {
      name: 'Auth',
      autoProg: true,
      items: [
        { t: 'Đăng nhập', done: true },
        { t: 'OTP', done: false },
      ],
    });
    expect(readGantt(doc, D).tasks[0].progress).toBe(50);
    ganttSetTask(doc, D, t.id, (x) => ({ ...x, items: x.items.map((i) => ({ ...i, done: true })) }));
    expect(readGantt(doc, D).tasks[0].progress).toBe(100);
  });

  it('hai máy sửa hai task khác nhau cùng lúc → giữ cả hai; task thêm đồng thời không mất', () => {
    const a = fresh();
    const t1 = ganttInsertTask(a, D, { code: 'S1' });
    const t2 = ganttInsertTask(a, D, { code: 'S2' });
    const b = new Y.Doc();
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a));
    ganttSetTask(a, D, t1.id, { progress: 30 });
    ganttSetTask(b, D, t2.id, { progress: 70 });
    ganttInsertTask(a, D, { code: 'Sa' });
    ganttInsertTask(b, D, { code: 'Sb' });
    Y.applyUpdate(a, Y.encodeStateAsUpdate(b));
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a));
    for (const doc of [a, b]) {
      const g = readGantt(doc, D);
      expect(g.tasks.find((t) => t.id === t1.id)!.progress).toBe(30);
      expect(g.tasks.find((t) => t.id === t2.id)!.progress).toBe(70);
      expect(g.tasks.map((t) => t.code).sort()).toEqual(['S1', 'S2', 'Sa', 'Sb']);
    }
    expect(readGantt(a, D).tasks.map((t) => t.id)).toEqual(readGantt(b, D).tasks.map((t) => t.id));
  });

  it('dán bảng Excel (TSV có tiêu đề, ngày d/m/y) → thay thế / thêm cuối', () => {
    const doc = fresh();
    ganttInsertTask(doc, D, { code: 'Cũ' });
    const tsv =
      'Sprint\tTên giai đoạn\tNgày bắt đầu\tNgày kết thúc\tTiến độ\nSprint 1\tPhân tích\t01/09/2026\t14/09/2026\t100%\nSprint 2\t"Thiết kế\ncơ sở dữ liệu"\t15/09/2026\t28/09/2026\t0,5\n';
    const ts = rowsToTasks(parseTSV(tsv), 'dmy');
    expect(ts).toHaveLength(2);
    expect(ts[1].name).toBe('Thiết kế\ncơ sở dữ liệu');
    expect(ts[1].progress).toBe(50);
    expect(ts[0].start).toBe('2026-09-01');
    ganttPutTasks(doc, D, ts, 'append');
    expect(readGantt(doc, D).tasks.map((t) => t.code)).toEqual(['Cũ', 'Sprint 1', 'Sprint 2']);
    ganttPutTasks(doc, D, ts, 'replace');
    expect(readGantt(doc, D).tasks.map((t) => t.code)).toEqual(['Sprint 1', 'Sprint 2']);
    expect(dataMap(doc, D).has('task:' + readGantt(doc, D).tasks[0].id)).toBe(true);
  });

  it('trạng thái tự động 6 loại và tổng hợp KPI', () => {
    const rd = dn('2026-10-10');
    const base = {
      id: 'x',
      type: 'task' as const,
      code: '',
      name: '',
      goal: '',
      deliverables: '',
      owner: '',
      jira: '',
      icon: '',
      items: [],
      autoProg: false,
    };
    expect(statusOf({ ...base, start: '2026-10-01', end: '2026-10-20', progress: 100, status: 'auto' }, rd)).toBe(
      'done',
    );
    expect(statusOf({ ...base, start: '2026-09-01', end: '2026-09-20', progress: 50, status: 'auto' }, rd)).toBe(
      'late',
    );
    expect(statusOf({ ...base, start: '2026-11-01', end: '2026-11-20', progress: 0, status: 'auto' }, rd)).toBe('todo');
    expect(statusOf({ ...base, start: '2026-10-01', end: '2026-10-12', progress: 10, status: 'auto' }, rd)).toBe(
      'risk',
    );
    expect(statusOf({ ...base, start: '2026-10-01', end: '2026-10-30', progress: 40, status: 'auto' }, rd)).toBe(
      'progress',
    );
    expect(statusOf({ ...base, start: '2026-10-01', end: '2026-10-30', progress: 40, status: 'paused' }, rd)).toBe(
      'paused',
    );
    const doc = fresh();
    ganttInsertTask(doc, D, { start: '2026-10-01', end: '2026-10-10', progress: 100 });
    ganttInsertTask(doc, D, { start: '2026-10-11', end: '2026-10-20', progress: 0 });
    const s = gSummary(readGantt(doc, D));
    expect(s.overall).toBe(50);
    expect(s.cnt.done).toBe(1);
    expect(s.left).toBe(10);
  });
});
