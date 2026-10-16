import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import {
  bundleToUpdate,
  buildTemplate,
  computeStats,
  docFromUpdates,
  migrateLegacyUnipark,
  parseImport,
  readBundle,
  regenerateIds,
  stringifyFile,
  toProjectFile,
  type GanttData,
} from '../src';

export const fixture = JSON.parse(readFileSync(join(__dirname, '../../../docs/reference/unipark-plus.json'), 'utf8'));

describe('migrateLegacyUnipark', () => {
  const b = migrateLegacyUnipark(fixture, { now: '2026-10-16T00:00:00Z' });

  it('tạo 1 sơ đồ kiến trúc + 2 Gantt', () => {
    expect(b.diagrams.map((d) => d.type)).toEqual(['architecture', 'gantt', 'gantt']);
    expect(b.diagrams.map((d) => d.name)).toEqual([
      'UniPark+ Kiến trúc hệ thống',
      'Tiến độ theo sprint',
      'Tiến độ theo module',
    ]);
    expect(b.project.name).toBe('UniPark+');
  });

  it('ánh xạ elements → views đúng shape, giữ toạ độ và style', () => {
    const arch = b.diagrams[0];
    expect(arch.views).toHaveLength(fixture.elements.length);
    const byId = Object.fromEntries(arch.views.map((v) => [v.id, v]));
    expect(byId.g_client.shape).toBe('arch.group');
    expect(byId.n_mobile.shape).toBe('arch.card');
    expect(byId.t_backend.shape).toBe('common.textbox');
    expect(byId.bg.shape).toBe('common.rectangle');
    expect(byId.bg.locked).toBe(true);
    expect(byId.n_mobile).toMatchObject({ x: 310.5, y: 52.5, w: 204, h: 63 });
    expect(byId.n_mobile.style).toMatchObject({ fill: '#F9FBFF', stroke: '#4A6FA5', strokeWidth: 1.6 });
    expect(byId.n_mobile.props).toMatchObject({
      title: 'Mobile App',
      layout: 'left',
      shadow: true,
      icons: [{ k: 'lucide:smartphone', c: '#3B5F94' }],
    });
    expect(arch.canvas.background).toBe('#FFFFFF');
  });

  it('gán parentId theo nhóm nhỏ nhất bao trọn', () => {
    const byId = Object.fromEntries(b.diagrams[0].views.map((v) => [v.id, v]));
    expect(byId.n_mobile.parentId).toBe('g_client');
    expect(byId.m_auth.parentId).toBe('g_lr');
    expect(byId.g_lr.parentId).toBe('g_backend');
    expect(byId.bg.parentId).toBeNull();
  });

  it('ánh xạ edges → connectors (source/target, waypoints, mũi tên)', () => {
    const arch = b.diagrams[0];
    expect(arch.connectors).toHaveLength(fixture.edges.length);
    const c = arch.connectors.find((x) => x.id === 'e_mobile_gw')!;
    expect(c.kind).toBe('arch.link');
    expect(c.source).toEqual({ viewId: 'n_mobile', side: 'bottom', t: 0.5 });
    expect(c.target).toEqual({ viewId: 'g_gateway', side: 'top', t: 0.5 });
    expect(c.routing).toBe('manual');
    expect(c.waypoints).toHaveLength(2);
    expect(c.style).toEqual({ stroke: '#3F63A0', strokeWidth: 1.8 });
    expect(c.props).toMatchObject({ arrowEnd: true, arrowStart: false, dash: false });
  });

  it('giữ đủ dữ liệu Gantt (sprint + module)', () => {
    const sprint = b.diagrams[1].data as GanttData;
    const mod = b.diagrams[2].data as GanttData;
    expect(sprint.tasks).toHaveLength(fixture.gantt.tasks.length);
    expect(mod.tasks).toHaveLength(fixture.moduleGantt.tasks.length);
    expect(sprint.board).toBe('sprint');
    expect(mod.board).toBe('module');
    expect(sprint.title).toBe(fixture.gantt.title);
    expect(sprint.tasks[0]).toMatchObject({
      code: 'Sprint 0',
      name: 'Chuẩn bị',
      start: '2026-07-21',
      end: '2026-08-03',
    });
    expect(mod.tasks[0]).toMatchObject({ name: 'AuthModule', icon: 'lucide:hand', progress: 100 });
  });

  it('từ chối tệp không phải unipark-diagram', () => {
    expect(() => migrateLegacyUnipark({ format: 'khac' })).toThrow();
  });
});

describe('Y.Doc của project + xuất/nhập JSON', () => {
  it('bundle → Y.Doc → bundle giữ nguyên (cả Gantt tách task)', () => {
    const b = migrateLegacyUnipark(fixture, { now: '2026-10-16T00:00:00Z' });
    const doc = docFromUpdates([bundleToUpdate(b)]);
    const back = readBundle(doc, b.project);
    expect(back.diagrams.map((d) => d.id).sort()).toEqual(b.diagrams.map((d) => d.id).sort());
    const arch = back.diagrams.find((d) => d.type === 'architecture')!;
    expect(arch.views).toEqual(b.diagrams[0].views);
    expect(arch.connectors).toEqual(b.diagrams[0].connectors);
    const g = back.diagrams.find((d) => d.name === 'Tiến độ theo sprint')!.data as GanttData;
    expect(g).toEqual(b.diagrams[1].data);
    expect(computeStats(doc)).toEqual({ diagramCount: 3, diagramCountByType: { architecture: 1, gantt: 2 } });
  });

  it('hai người sửa hai task Gantt khác nhau cùng lúc → giữ cả hai', () => {
    const b = migrateLegacyUnipark(fixture);
    const u = bundleToUpdate(b);
    const a = docFromUpdates([u]);
    const c = docFromUpdates([u]);
    const gid = b.diagrams[1].id;
    const ma = a.getMap('data:' + gid);
    const mc = c.getMap('data:' + gid);
    const t0 = (b.diagrams[1].data as GanttData).tasks[0];
    const t1 = (b.diagrams[1].data as GanttData).tasks[1];
    ma.set('task:' + t0.id, { ...t0, progress: 77 });
    mc.set('task:' + t1.id, { ...t1, progress: 11 });
    Y.applyUpdate(a, Y.encodeStateAsUpdate(c));
    Y.applyUpdate(c, Y.encodeStateAsUpdate(a));
    const ga = readBundle(a, b.project).diagrams.find((d) => d.id === gid)!.data as GanttData;
    expect(ga.tasks[0].progress).toBe(77);
    expect(ga.tasks[1].progress).toBe(11);
  });

  it('xuất project rồi nhập lại → giống hệt, id khác', () => {
    const b = buildTemplate('unipark-sample', 'UniPark+', fixture);
    const text = stringifyFile(toProjectFile(b));
    const parsed = parseImport(text);
    expect(parsed.kind).toBe('project');
    if (parsed.kind !== 'project') return;
    const re = regenerateIds(parsed.bundle);
    expect(re.diagrams).toHaveLength(3);
    expect(re.folders.map((f) => f.name)).toEqual(['Phân tích', 'Thiết kế', 'Quản lý dự án']);
    const oldIds = new Set([
      ...b.diagrams.map((d) => d.id),
      ...b.folders.map((f) => f.id),
      ...b.diagrams.flatMap((d) => d.views.map((v) => v.id)),
    ]);
    for (const d of re.diagrams) {
      expect(oldIds.has(d.id)).toBe(false);
      for (const v of d.views) expect(oldIds.has(v.id)).toBe(false);
      for (const c of d.connectors) {
        expect(d.views.some((v) => v.id === c.source.viewId)).toBe(true);
        expect(d.views.some((v) => v.id === c.target.viewId)).toBe(true);
      }
      expect(re.folders.some((f) => f.id === d.folderId)).toBe(true);
    }
    // so sánh nội dung sau khi bỏ id (id task Gantt trùng id hình cũ cũng được sinh lại — vẫn nhất quán)
    const noIds = (d: unknown) => JSON.stringify(d, (k, v) => (k === 'id' ? undefined : v));
    const strip = (x: typeof b) =>
      x.diagrams.map((d) =>
        noIds([d.name, d.type, d.views.map((v) => [v.shape, v.x, v.y, v.w, v.h, v.props]), d.data]),
      );
    expect(strip(re)).toEqual(strip(b));
  });

  it('nhập JSON sai schema → liệt kê lỗi theo đường dẫn', () => {
    const bad = {
      format: 'umlab',
      schemaVersion: 1,
      kind: 'diagram',
      diagram: { id: 'd', type: 'class', name: 'X', views: [{ id: 'v', shape: 's', x: 'a', y: 0, w: 1, h: 1 }] },
    };
    let details: string[] = [];
    try {
      parseImport(JSON.stringify(bad));
    } catch (e) {
      details = (e as { details: string[] }).details;
    }
    expect(details[0]).toBe('diagram.views[0].x: phải là số');
  });

  it('nhận tệp unipark-diagram cũ', () => {
    expect(parseImport(JSON.stringify(fixture)).kind).toBe('legacy');
  });
});
