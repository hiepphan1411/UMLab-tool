import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { parseAttribute, type Connector } from '@umlab/core';
import type { ProjectSession } from '../../workspace/session';
import { Engine } from '../engine/engine';
import { createConnector, createView } from '../engine/ops';
import { connLook, getConnector, getRules, getShape, type ViewCtx } from '../engine/registry';
import { assocEnds } from './connectors';
import { suggestTypes, unknownTypes } from './model';
import './index';

function setup() {
  const doc = new Y.Doc();
  const session = { doc, setPresence: () => {} } as unknown as ProjectSession;
  return new Engine(session, 'd1', 'class', false, 'u1');
}
const vc = (e: Engine, id: string): ViewCtx => {
  const view = e.lookup.view(id)!;
  return { view, def: getShape(view.shape), model: view.modelId ? (e.lookup.model(view.modelId) ?? null) : null };
};
const allow = (e: Engine, kind: string, a: string, b: string) =>
  getConnector(kind)!.allow!(vc(e, a), vc(e, b), e.lookup);
const rename = (e: Engine, id: string, name: string) =>
  e.apply((tx) => tx.setModel(e.lookup.view(id)!.modelId!, { name }));

describe('Class: luật nối', () => {
  it('Generalization cùng loại, cấm vòng, cấm kế thừa leaf', () => {
    const e = setup();
    const a = createView(e, 'cls.class', 0, 0)!;
    const b = createView(e, 'cls.class', 300, 0)!;
    const i = createView(e, 'cls.interface', 0, 300)!;
    expect(allow(e, 'cls.generalization', a, b)).toBe(true);
    expect(allow(e, 'cls.generalization', a, i)).toMatch(/cùng loại/);
    createConnector(e, 'cls.generalization', { viewId: a }, { viewId: b });
    expect(allow(e, 'cls.generalization', b, a)).toMatch(/vòng kế thừa/);
    e.apply((tx) => tx.setModelData(e.lookup.view(b)!.modelId!, { isLeaf: true }));
    const c = createView(e, 'cls.class', 600, 0)!;
    expect(allow(e, 'cls.generalization', c, b)).toMatch(/leaf/);
  });

  it('Realization chỉ Class → Interface', () => {
    const e = setup();
    const a = createView(e, 'cls.class', 0, 0)!;
    const i = createView(e, 'cls.interface', 300, 0)!;
    expect(allow(e, 'cls.realization', a, i)).toBe(true);
    expect(allow(e, 'cls.realization', i, a)).toMatch(/Class → Interface/);
    const look = connLook(getConnector('cls.realization'), {} as Connector, null, e.lookup);
    expect(look).toMatchObject({ line: 'dashed', end: 'triangle-hollow' });
  });

  it('Composition: thoi đặc ở đầu tổng thể; cấm vòng; cảnh báo phần thuộc 2 composition', () => {
    const e = setup();
    const phien = createView(e, 'cls.class', 0, 0)!;
    const xe = createView(e, 'cls.class', 300, 0)!;
    const other = createView(e, 'cls.class', 300, 300)!;
    const cid = createConnector(e, 'cls.composition', { viewId: phien }, { viewId: xe })!;
    const c = e.lookup.conn(cid)!;
    const m = e.lookup.model(c.modelId)!;
    expect(connLook(getConnector(c.kind), c, m, e.lookup)).toMatchObject({ start: 'diamond-filled', end: 'none' });
    expect(assocEnds(m)[0].classId).toBe(e.lookup.view(phien)!.modelId);
    expect(allow(e, 'cls.composition', xe, phien)).toMatch(/vòng composition/);
    expect(getConnector('cls.composition')!.warn!(vc(e, other), vc(e, xe), e.lookup)).toMatch(/một composition khác/);
  });

  it('Directed Association: đầu đích navigable, mũi tên mở; non-navigable vẽ ✕', () => {
    const e = setup();
    const a = createView(e, 'cls.class', 0, 0)!;
    const b = createView(e, 'cls.class', 300, 0)!;
    const cid = createConnector(e, 'cls.association', { viewId: a }, { viewId: b }, { props: { directed: true } })!;
    const c = e.lookup.conn(cid)!;
    expect(c.props.directed).toBeUndefined();
    let m = e.lookup.model(c.modelId)!;
    expect(connLook(getConnector(c.kind), c, m, e.lookup)).toMatchObject({ start: 'none', end: 'arrow-open' });
    const ends = assocEnds(m);
    ends[0].navigable = 'no';
    e.apply((tx) => tx.setModelData(m.id, { ends }));
    m = e.lookup.model(c.modelId)!;
    expect(connLook(getConnector(c.kind), c, m, e.lookup).start).toBe('cross-x');
  });
});

describe('Class: kiểu dữ liệu', () => {
  it('kiểu không tồn tại / gợi ý kiểu khi gõ ":"', () => {
    const e = setup();
    const a = createView(e, 'cls.class', 0, 0)!;
    rename(e, a, 'PhienGuiXe');
    const known = new Set(['PhienGuiXe']);
    expect(unknownTypes('List<PhienGuiXe>', known)).toEqual([]);
    expect(unknownTypes('Map<String, Xe>', known)).toEqual(['Xe']);
    expect(unknownTypes('T', known, ['T'])).toEqual([]);
    const s = suggestTypes(e.lookup, '- phien : Ph')!;
    expect(s.from).toBe(10);
    expect(s.items[0]).toBe('PhienGuiXe');
    expect(suggestTypes(e.lookup, '- bienSo : String [')).toBeNull();
  });

  it('Kiểm tra: kiểu không tồn tại có sửa nhanh "Tạo class"', () => {
    const e = setup();
    const a = createView(e, 'cls.class', 0, 0)!;
    e.apply((tx) => tx.setModelData(e.lookup.view(a)!.modelId!, { attributes: [parseAttribute('- xe : Xe [0..*]')!] }));
    const run = () =>
      getRules('class').flatMap((r) =>
        r({ lookup: e.lookup, views: e.state.order, conns: [...e.state.conns.values()], shape: getShape }),
      );
    const issue = run().find((i) => /Kiểu “Xe”/.test(i.message))!;
    expect(issue.fix!.label).toBe('Tạo class Xe');
    e.apply(issue.fix!.run);
    expect(e.state.order.map((v) => e.lookup.model(v.modelId)?.name)).toContain('Xe');
    expect(run().some((i) => /Kiểu “Xe”/.test(i.message))).toBe(false);
  });
});
