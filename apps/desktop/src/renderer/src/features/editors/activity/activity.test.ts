import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import {
  connsMap,
  createDiagram,
  diagramsMap,
  insertStep,
  readSpec,
  viewsMap,
  writeSpec,
  type Connector,
} from '@umlab/core';
import { LOCAL, type ProjectSession } from '../../workspace/session';
import { Engine } from '../engine/engine';
import { createConnector, createView } from '../engine/ops';
import { connLook, getConnector, getRules, getShape, type ViewCtx } from '../engine/registry';
import { generateNew, regenerateInto } from '../generated';
import { ACTIVITY_GENERATOR } from './index';
import { laneAt, laneBoxes } from './swimlane';
import uc03 from '@fixtures/uc03-spec.umlab.json';

function setup(doc = new Y.Doc(), id = 'd1') {
  const session = { doc, setPresence: () => {} } as unknown as ProjectSession;
  return new Engine(session, id, 'activity', false, 'u1');
}
const vc = (e: Engine, id: string): ViewCtx => {
  const view = e.lookup.view(id)!;
  return { view, def: getShape(view.shape), model: view.modelId ? (e.lookup.model(view.modelId) ?? null) : null };
};
const allow = (e: Engine, kind: string, a: string, b: string) =>
  getConnector(kind)!.allow!(vc(e, a), vc(e, b), e.lookup);
const issues = (e: Engine) =>
  getRules('activity').flatMap((r) =>
    r({ lookup: e.lookup, views: e.lookup.views(), conns: e.lookup.conns(), shape: getShape }),
  );

describe('Activity: luật nối', () => {
  it('không vào Initial, không ra khỏi Final/Flow Final', () => {
    const e = setup();
    const i = createView(e, 'act.initial', 0, 0)!;
    const a = createView(e, 'act.action', 100, 0)!;
    const f = createView(e, 'act.final', 300, 0)!;
    const ff = createView(e, 'act.flowFinal', 300, 100)!;
    expect(allow(e, 'act.controlFlow', i, a)).toBe(true);
    expect(allow(e, 'act.controlFlow', a, i)).toMatch(/Initial/);
    expect(allow(e, 'act.controlFlow', f, a)).toMatch(/Final/);
    expect(allow(e, 'act.controlFlow', ff, a)).toMatch(/Final/);
  });

  it('Fork 1 vào nhiều ra, Join nhiều vào 1 ra; Object Flow cần đầu là object/pin', () => {
    const e = setup();
    const a = createView(e, 'act.action', 0, 0)!;
    const b = createView(e, 'act.action', 0, 200)!;
    const fork = createView(e, 'act.fork', 200, 100)!;
    const join = createView(e, 'act.join', 400, 100)!;
    createConnector(e, 'act.controlFlow', { viewId: a }, { viewId: fork });
    expect(allow(e, 'act.controlFlow', b, fork)).toMatch(/Fork/);
    expect(allow(e, 'act.controlFlow', fork, b)).toBe(true);
    createConnector(e, 'act.controlFlow', { viewId: join }, { viewId: a });
    expect(allow(e, 'act.controlFlow', join, b)).toMatch(/Join/);
    expect(allow(e, 'act.objectFlow', a, b)).toMatch(/Object Node/);
    const o = createView(e, 'act.object', 600, 0)!;
    expect(allow(e, 'act.objectFlow', a, o)).toBe(true);
  });

  it('Control Flow từ trong Interruptible Region ra ngoài vẽ tia sét', () => {
    const e = setup();
    const r = createView(e, 'act.interruptRegion', 0, 0, { size: { w: 300, h: 200 } })!;
    const a = createView(e, 'act.action', 40, 40)!;
    expect(e.lookup.view(a)!.parentId).toBe(r);
    const b = createView(e, 'act.action', 500, 40)!;
    const c = createConnector(e, 'act.controlFlow', { viewId: a }, { viewId: b })!;
    const conn = e.lookup.conn(c) as Connector;
    expect(connLook(getConnector(conn.kind), conn, null, e.lookup).middle).toBe('lightning');
  });
});

describe('Activity: pin bám viền', () => {
  it('đặt Output Pin gần Action → gắn vào Action và nằm đúng trên viền gần nhất', () => {
    const e = setup();
    const a = createView(e, 'act.action', 100, 100)!;
    const ab = e.lookup.view(a)!; // action tự giãn theo chữ
    const p = createView(e, 'act.outputPin', ab.x + ab.w - 4, ab.y + 10)!; // gần cạnh phải
    const pin = e.lookup.view(p)!;
    expect(pin.parentId).toBe(a);
    expect(pin.x + pin.w / 2).toBe(ab.x + ab.w);
    expect(issues(e).some((i) => /Pin không nằm trên viền/.test(i.message))).toBe(false);
    // kéo lệch khỏi viền → cảnh báo, sửa nhanh đưa về viền
    e.apply((tx) => tx.setView(p, { x: ab.x + 30, y: ab.y + 12 }));
    const bad = issues(e).find((i) => /Pin không nằm trên viền/.test(i.message))!;
    expect(bad).toBeDefined();
    e.apply((tx) => bad.fix!.run(tx));
    const fixed = e.lookup.view(p)!;
    const onEdge = [
      fixed.y + fixed.h / 2 - ab.y,
      fixed.y + fixed.h / 2 - ab.y - ab.h,
      fixed.x + fixed.w / 2 - ab.x,
      fixed.x + fixed.w / 2 - ab.x - ab.w,
    ];
    expect(onEdge.some((d) => Math.abs(d) < 1)).toBe(true);
  });
});

describe('Activity: swimlane', () => {
  it('làn co giãn theo kích thước hình; laneAt; kéo vạch ngăn đổi bề rộng', () => {
    const e = setup();
    const s = createView(e, 'act.swimlaneV', 0, 0, { size: { w: 600, h: 400 } })!;
    const v = e.lookup.view(s)!;
    const boxes = laneBoxes(v);
    expect(boxes.map((b) => Math.round(b.len))).toEqual([300, 300]);
    expect(laneAt(v, 450, 200)?.name).toBe('Làn 2');
    const def = getShape('act.swimlaneV')!;
    const ctx = { view: v, props: v.props } as unknown as Parameters<NonNullable<typeof def.dragHandle>>[0];
    const next = def.dragHandle!(ctx, 'div:0', [200, 10], { shift: false })!;
    e.apply((tx) => tx.setViewProps(s, next));
    expect(laneBoxes(e.lookup.view(s)!).map((b) => Math.round(b.len))).toEqual([200, 400]);
  });
});

describe('Activity: kiểm tra', () => {
  it('thiếu Initial/Final, Decision thiếu guard / không có else, node không tới được', () => {
    const e = setup();
    const a = createView(e, 'act.action', 0, 0)!;
    let msgs = issues(e).map((i) => i.message);
    expect(msgs).toEqual(
      expect.arrayContaining(['Sơ đồ chưa có Initial Node', 'Sơ đồ chưa có Activity Final / Flow Final']),
    );
    const i = createView(e, 'act.initial', 0, -100)!;
    const d = createView(e, 'act.decision', 0, 100)!;
    const b = createView(e, 'act.action', -100, 200)!;
    const c = createView(e, 'act.action', 100, 200)!;
    const orphan = createView(e, 'act.action', 400, 400)!;
    createConnector(e, 'act.controlFlow', { viewId: i }, { viewId: a });
    createConnector(e, 'act.controlFlow', { viewId: a }, { viewId: d });
    createConnector(e, 'act.controlFlow', { viewId: d }, { viewId: b }, { props: { guard: 'ok' } });
    createConnector(e, 'act.controlFlow', { viewId: d }, { viewId: c });
    msgs = issues(e).map((x) => x.message);
    expect(msgs).toContain('Decision có nhánh ra thiếu guard');
    expect(msgs).toContain('Decision chưa có nhánh [else]');
    expect(issues(e).some((x) => x.targetId === orphan && /không tới được/.test(x.message))).toBe(true);
  });
});

describe('Activity: sinh từ đặc tả', () => {
  it('sinh Activity từ UC03 (3 làn), sửa đặc tả → sinh lại (Ghi đè) cập nhật, Undo quay lại', () => {
    const doc = new Y.Doc();
    const specId = createDiagram(doc, 'usecase-spec', 'Đặc tả UC03', null, LOCAL, {
      model: uc03.model,
      data: uc03.diagram.data,
    });
    const id = generateNew(doc, specId, ACTIVITY_GENERATOR);
    const meta = diagramsMap(doc).get(id)!;
    expect(meta.name).toBe('Activity - UC03 Check-in xe vào bãi');
    expect(meta.generatedFrom).toMatchObject({ sourceDiagramId: specId, generator: 'spec-activity@1' });
    const views = () => [...viewsMap(doc, id).values()];
    const swim = views().find((v) => v.shape === 'act.swimlaneV')!;
    expect((swim.props.lanes as { name: string }[]).map((l) => l.name)).toEqual(['Sinh viên', 'Bảo vệ', 'Hệ thống']);
    const actions = views().filter((v) => v.shape === 'act.action').length;
    expect(connsMap(doc, id).size).toBeGreaterThan(15);

    // thêm 1 bước vào đặc tả → phiên bản tăng → banner báo; sinh lại ghi đè trong engine (Undo được)
    const spec = readSpec(doc, specId);
    writeSpec(doc, specId, insertStep(spec, 7, { text: 'Lưu nhật ký vào bãi' }), LOCAL);
    expect(readSpec(doc, specId).version).toBeGreaterThan(meta.generatedFrom!.sourceVersion);
    const e = setup(doc, id);
    const um = new Y.UndoManager([viewsMap(doc, id), connsMap(doc, id)], { trackedOrigins: new Set([LOCAL]) });
    regenerateInto(doc, id, ACTIVITY_GENERATOR);
    expect(views().filter((v) => v.shape === 'act.action')).toHaveLength(actions + 1);
    expect(views().some((v) => v.props.sourceStepId && e.lookup.model(v.modelId)?.name === 'Lưu nhật ký vào bãi')).toBe(
      true,
    );
    expect(diagramsMap(doc).get(id)!.generatedFrom!.sourceVersion).toBe(readSpec(doc, specId).version);
    um.undo();
    expect(views().filter((v) => v.shape === 'act.action')).toHaveLength(actions);
  });
});
