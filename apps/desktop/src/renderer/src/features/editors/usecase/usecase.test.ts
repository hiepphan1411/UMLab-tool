import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import type { Connector, View } from '@umlab/core';
import type { ProjectSession } from '../../workspace/session';
import { Engine } from '../engine/engine';
import { createConnector, createView } from '../engine/ops';
import { getConnector, getShape, getRules, type ViewCtx } from '../engine/registry';
import './index';

const view = (id: string, shape: string): View => ({
  id,
  shape,
  modelId: null,
  x: 0,
  y: 0,
  w: 100,
  h: 60,
  z: 0,
  parentId: null,
  props: {},
  style: {},
});
const ctx = (id: string, shape: string): ViewCtx => ({ view: view(id, shape), def: getShape(shape), model: null });
const UC = (id: string) => ctx(id, 'uc.usecase');
const AC = (id: string) => ctx(id, 'uc.actor');
const CO = (id: string) => ctx(id, 'uc.collaboration');

function setup() {
  const doc = new Y.Doc();
  const session = { doc, setPresence: () => {} } as unknown as ProjectSession;
  return new Engine(session, 'd1', 'usecase', false, 'u1');
}
const allow = (e: Engine, kind: string, s: ViewCtx, t: ViewCtx) => getConnector(kind)!.allow!(s, t, e.lookup);

describe('Use Case: luật allow()', () => {
  const e = setup();
  it('Association: Actor ↔ Use Case; cấm Actor ↔ Actor; UC ↔ UC chỉ cảnh báo', () => {
    expect(allow(e, 'uc.association', AC('a'), UC('u'))).toBe(true);
    expect(allow(e, 'uc.association', UC('u'), AC('a'))).toBe(true);
    expect(allow(e, 'uc.association', AC('a'), AC('b'))).toMatch(/hai actor/);
    expect(allow(e, 'uc.association', UC('u'), UC('v'))).toBe(true);
    expect(getConnector('uc.association')!.warn!(UC('u'), UC('v'), e.lookup)).toMatch(/Include hoặc Extend/);
    expect(allow(e, 'uc.association', AC('a'), ctx('n', 'common.note'))).toMatch(/Actor với Use Case/);
  });
  it('Include: chỉ giữa hai use case, cấm tự include', () => {
    expect(allow(e, 'uc.include', UC('u'), UC('v'))).toBe(true);
    expect(allow(e, 'uc.include', AC('a'), UC('u'))).toBe('Include chỉ nối giữa hai use case');
    expect(allow(e, 'uc.include', UC('u'), UC('u'))).toMatch(/chính nó/);
  });
  it('Extend: chỉ giữa hai use case', () => {
    expect(allow(e, 'uc.extend', UC('u'), UC('v'))).toBe(true);
    expect(allow(e, 'uc.extend', UC('u'), AC('a'))).toMatch(/hai use case/);
  });
  it('Generalization: cùng loại, cấm vòng', () => {
    expect(allow(e, 'uc.generalization', AC('a'), AC('b'))).toBe(true);
    expect(allow(e, 'uc.generalization', UC('u'), UC('v'))).toBe(true);
    expect(allow(e, 'uc.generalization', AC('a'), UC('u'))).toMatch(/Actor → Actor/);
  });
  it('Realization: Collaboration → Use Case', () => {
    expect(allow(e, 'uc.realization', CO('c'), UC('u'))).toBe(true);
    expect(allow(e, 'uc.realization', UC('u'), CO('c'))).toMatch(/Collaboration → Use Case/);
  });
  it('Dependency: bất kỳ phần tử', () => {
    expect(getConnector('uc.dependency')!.allow).toBeUndefined();
  });
});

describe('Use Case: mô hình & kiểm tra', () => {
  it('mã UC tự tăng theo project, không trùng', () => {
    const e = setup();
    const a = createView(e, 'uc.usecase', 0, 0)!;
    const b = createView(e, 'uc.usecase', 200, 0)!;
    const code = (id: string) => e.lookup.model(e.lookup.view(id)!.modelId)!.data.code;
    expect(code(a)).toBe('UC01');
    expect(code(b)).toBe('UC02');
  });

  it('vòng generalization bị chặn; vòng include bị cảnh báo và báo lỗi trong Kiểm tra', () => {
    const e = setup();
    const a = createView(e, 'uc.usecase', 0, 0)!;
    const b = createView(e, 'uc.usecase', 200, 0)!;
    const vc = (id: string): ViewCtx => ({ view: e.lookup.view(id)!, def: getShape('uc.usecase'), model: null });
    createConnector(e, 'uc.generalization', { viewId: a }, { viewId: b });
    expect(allow(e, 'uc.generalization', vc(b), vc(a))).toMatch(/vòng/);
    createConnector(e, 'uc.include', { viewId: a }, { viewId: b });
    expect(getConnector('uc.include')!.warn!(vc(b), vc(a), e.lookup)).toMatch(/vòng include/);
    createConnector(e, 'uc.include', { viewId: b }, { viewId: a });
    createView(e, 'uc.usecase', 0, 300);
    const issues = getRules('usecase').flatMap((r) =>
      r({ lookup: e.lookup, views: e.state.order, conns: [...e.state.conns.values()] as Connector[], shape: getShape }),
    );
    expect(issues.some((i) => i.level === 'error' && /Vòng include/.test(i.message))).toBe(true);
    expect(issues.filter((i) => /chưa nối với actor/.test(i.message))).toHaveLength(1);
  });

  it('Extend lấy tên extension point từ use case gốc (đổi tên → nhãn đổi theo)', () => {
    const e = setup();
    const ext = createView(e, 'uc.usecase', 0, 0)!;
    const base = createView(e, 'uc.usecase', 300, 0)!;
    const bm = e.lookup.view(base)!.modelId!;
    e.apply((tx) => tx.setModelData(bm, { extensionPoints: [{ id: 'ep1', name: 'Số dư không đủ' }] }));
    const cid = createConnector(
      e,
      'uc.extend',
      { viewId: ext },
      { viewId: base },
      { props: { condition: 'ví hết tiền', extensionPoint: 'ep1' } },
    )!;
    const labels = () => getConnector('uc.extend')!.labels!(e.lookup.conn(cid)!, null, e.lookup);
    expect(labels().find((l) => l.role === 'note')!.text).toContain('extension point: Số dư không đủ');
    e.apply((tx) => tx.setModelData(bm, { extensionPoints: [{ id: 'ep1', name: 'Thiếu tiền' }] }));
    expect(labels().find((l) => l.role === 'note')!.text).toContain('extension point: Thiếu tiền');
    expect(labels().find((l) => l.role === 'cond')!.text).toBe('[ví hết tiền]');
  });
});
