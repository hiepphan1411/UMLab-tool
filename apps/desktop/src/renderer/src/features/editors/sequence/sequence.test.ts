import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { connsMap, createDiagram, diagramsMap, viewsMap, type Connector } from '@umlab/core';
import { LOCAL, type ProjectSession } from '../../workspace/session';
import { Engine } from '../engine/engine';
import { createConnector, createView } from '../engine/ops';
import { getConnector, getRules, getShape, type ViewCtx } from '../engine/registry';
import { routeConnector } from '../engine/route';
import { makeRouteEnv } from '../engine/render';
import { generateNew } from '../generated';
import { SEQUENCE_GENERATOR } from './index';
import { commitMsgDrag, headH, seqResult } from './state';
import uc03 from '@fixtures/uc03-spec.umlab.json';

function setup(doc = new Y.Doc(), id = 'd1') {
  const session = { doc, setPresence: () => {} } as unknown as ProjectSession;
  return new Engine(session, id, 'sequence', false, 'u1');
}
const vc = (e: Engine, id: string): ViewCtx => {
  const view = e.lookup.view(id)!;
  return { view, def: getShape(view.shape), model: view.modelId ? (e.lookup.model(view.modelId) ?? null) : null };
};
const msg = (e: Engine, kind: string, a: string | null, b: string | null, y: number, name = '') =>
  createConnector(
    e,
    kind,
    a ? { viewId: a, y } : { viewId: null, x: 40, y },
    b ? { viewId: b, y } : { viewId: null, x: 900, y },
    {
      props: { name },
    },
  )!;
const num = (e: Engine, id: string) => seqResult(e.lookup).messages.get(id)?.number;
const issues = (e: Engine) =>
  getRules('sequence').flatMap((r) =>
    r({ lookup: e.lookup, views: e.lookup.views(), conns: e.lookup.conns(), shape: getShape }),
  );

/** 5 lifeline đăng nhập (x cách 180). */
function login() {
  const e = setup();
  const ids = ['seq.actor', 'seq.boundary', 'seq.control', 'seq.entity', 'seq.lifeline'].map((s, i) =>
    createView(e, s, 60 + i * 180, 40 + i * 7)!,
  );
  return { e, ids };
}

describe('Sequence: bố cục', () => {
  it('lifeline thẳng hàng đầu, kéo dài theo message; Create hạ hộp đầu; Destroy cắt lifeline', () => {
    const { e, ids } = login();
    const [u, ui, c, dao, s] = ids;
    const tops = ids.map((id) => e.lookup.view(id)!.y);
    expect(new Set(tops).size).toBe(1);
    const m = msg(e, 'seq.sync', u, ui, 600);
    expect(e.lookup.view(ui)!.y + e.lookup.view(ui)!.h).toBeGreaterThanOrEqual(640);
    const create = msg(e, 'seq.create', c, s, 300, 'tao()');
    const sv = e.lookup.view(s)!;
    expect(sv.y + headH(sv) / 2).toBe(300);
    // create trỏ vào cạnh hộp đầu
    const r = routeConnector(e.lookup.conn(create)!, makeRouteEnv(e.lookup))!;
    expect(r.pts[1][0]).toBeCloseTo(sv.x, 0);
    msg(e, 'seq.destroy', c, dao, 400);
    const dv = e.lookup.view(dao)!;
    expect(dv.y + dv.h).toBe(412);
    expect(seqResult(e.lookup).destroyed.get(dao)).toBe(400);
    // message ngang: vẽ lệch y đầu đích → về cùng y
    const skew = createConnector(e, 'seq.async', { viewId: u, y: 500 }, { viewId: c, y: 530 })!;
    expect(e.lookup.conn(skew)!.target.y).toBe(500);
    // duration message được xiên xuống
    const dur = createConnector(e, 'seq.duration', { viewId: u, y: 520 }, { viewId: c, y: 560 })!;
    expect(e.lookup.conn(dur)!.target.y).toBe(560);
    void m;
  });

  it('lifeline chỉ đổi thứ tự theo trục x, giữ khoảng cách tối thiểu 40px', () => {
    const { e, ids } = login();
    // kéo lifeline thứ 3 sang trái quá lifeline thứ 2 → đổi thứ tự, lifeline sau bị đẩy giữ khoảng cách
    e.apply((tx) => tx.setView(ids[2], { x: 230 }));
    const xs = ids.map((id) => e.lookup.view(id)!).sort((a, b) => a.x - b.x);
    for (let i = 1; i < xs.length; i++) expect(xs[i].x).toBeGreaterThanOrEqual(xs[i - 1].x + xs[i - 1].w + 40);
  });
});

describe('Sequence: đánh số + kéo message', () => {
  it('12 message + alt 2 operand: số lồng đúng; kéo message 3 xuống dưới message 5 → đánh số lại', () => {
    const { e, ids } = login();
    const [u, ui, c, dao, s] = ids;
    const m: string[] = [];
    m.push(msg(e, 'seq.sync', u, ui, 140, 'nhapThongTin'));
    m.push(msg(e, 'seq.sync', ui, c, 180, 'dangNhap'));
    m.push(msg(e, 'seq.sync', c, dao, 220, 'timTheoEmail'));
    m.push(msg(e, 'seq.async', c, dao, 250, 'ghiLog'));
    m.push(msg(e, 'seq.self', c, c, 280, 'kiemTraMatKhau'));
    createView(e, 'seq.fragment', 300, 320, {
      size: { w: 600, h: 200 },
      props: {
        operator: 'alt',
        operands: [
          { guard: 'đúng', y: 0 },
          { guard: 'else', y: 120 },
        ],
      },
    });
    m.push(msg(e, 'seq.create', c, s, 360, 'tao'));
    m.push(msg(e, 'seq.reply', s, c, 400, 'phien'));
    m.push(msg(e, 'seq.reply', c, ui, 420, 'ok'));
    m.push(msg(e, 'seq.reply', c, ui, 470, 'loi'));
    m.push(msg(e, 'seq.reply', ui, u, 500, 'thongBao'));
    m.push(msg(e, 'seq.sync', u, ui, 560, 'dangXuat'));
    m.push(msg(e, 'seq.sync', ui, c, 600, 'xuLyDangXuat'));
    expect(m.map((id) => num(e, id))).toEqual([
      '1',
      '1.1',
      '1.1.1',
      '1.1.2',
      '1.1.3',
      '1.1.4',
      '',
      '',
      '',
      '',
      '2',
      '2.1',
    ]);
    // activation của Controller kéo dài qua cả hai operand
    const act = seqResult(e.lookup).activations.find((a) => a.msgId === m[1])!;
    expect([act.y1, act.y2]).toEqual([180, 470]);
    expect(issues(e).filter((i) => /Reply/.test(i.message))).toEqual([]);
    // kéo message thứ 3 (1.1.1) xuống dưới message thứ 5 (không Shift: chỉ dời message đó)
    e.apply((tx) => commitMsgDrag(tx, e.lookup.conn(m[2])!, 70, { shift: false }));
    expect(m.slice(0, 5).map((id) => num(e, id))).toEqual(['1', '1.1', '1.1.3', '1.1.1', '1.1.2']);
    // Shift + kéo: chèn khoảng trống — message + fragment phía dưới cùng dời
    const yBefore = e.lookup.conn(m[11])!.source.y!;
    const frag = e.lookup.views().find((v) => v.shape === 'seq.fragment')!;
    e.apply((tx) => commitMsgDrag(tx, e.lookup.conn(m[4])!, 40, { shift: true }));
    expect(e.lookup.conn(m[11])!.source.y).toBe(yBefore + 40);
    expect(e.lookup.view(frag.id)!.y).toBe(frag.y + 40);
    void dao;
  });
});

describe('Sequence: luật nối + kiểm tra', () => {
  it('message chỉ giữa lifeline; Self chỉ về chính nó; reply lạc, alt 1 operand (sửa nhanh opt), lifeline không có message', () => {
    const { e, ids } = login();
    const [u, ui, c] = ids;
    const note = createView(e, 'common.note', 900, 100)!;
    const allow = (k: string, a: string, b: string) => getConnector(k)!.allow!(vc(e, a), vc(e, b), e.lookup);
    expect(allow('seq.sync', u, ui)).toBe(true);
    expect(allow('seq.sync', u, note)).toMatch(/lifeline/);
    expect(allow('seq.self', c, ui)).toMatch(/chính lifeline/);
    expect(allow('seq.self', c, c)).toBe(true);
    msg(e, 'seq.sync', u, ui, 150);
    const stray = msg(e, 'seq.reply', c, u, 200);
    const f = createView(e, 'seq.fragment', 100, 260, {
      size: { w: 300, h: 100 },
      props: { operator: 'alt', operands: [{ guard: 'x', y: 0 }] },
    })!;
    const list = issues(e);
    expect(list.find((i) => i.targetId === stray)?.message).toMatch(/Reply không khớp/);
    const one = list.find((i) => i.targetId === f && /opt/.test(i.message))!;
    e.apply((tx) => one.fix!.run(tx));
    expect(e.lookup.view(f)!.props.operator).toBe('opt');
    expect(list.filter((i) => /không có message/.test(i.message)).length).toBe(2);
  });
});

describe('Sequence: sinh từ đặc tả', () => {
  it('UC03 → CheckInXeController, entity đã khai báo, alt [thẻ không hợp lệ] / [biển số không khớp]', () => {
    const doc = new Y.Doc();
    const specId = createDiagram(doc, 'usecase-spec', 'Đặc tả UC03', null, LOCAL, {
      model: uc03.model,
      data: uc03.diagram.data,
    });
    const id = generateNew(doc, specId, SEQUENCE_GENERATOR);
    expect(diagramsMap(doc).get(id)!.name).toBe('Sequence - UC03 Check-in xe vào bãi');
    const e = setup(doc, id);
    const names = e.lookup
      .views()
      .filter((v) => v.modelId)
      .map((v) => e.lookup.model(v.modelId)!.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'Sinh viên',
        'CheckInXeController',
        'TheRFID',
        'Xe',
        'GoiThang',
        'ViDienTu',
        'PhienGuiXe',
      ]),
    );
    const guards = [...viewsMap(doc, id).values()]
      .filter((v) => v.shape === 'seq.fragment')
      .map((v) => `${String(v.props.operator)} [${(v.props.operands as { guard: string }[])[0].guard}]`);
    expect(guards).toEqual(expect.arrayContaining(['alt [thẻ không hợp lệ]', 'alt [biển số không khớp]']));
    // actor lifeline dùng chính Actor của project
    expect(e.lookup.views().find((v) => v.shape === 'seq.actor')!.modelId).toBe('m_sv');
    const conns = [...connsMap(doc, id).values()] as Connector[];
    const first = conns.sort((a, b) => a.source.y! - b.source.y!).slice(0, 3);
    expect(first.map((c) => num(e, c.id))).toEqual(['1', '1.1', '1.1.1']);
    expect(issues(e).filter((i) => i.level !== 'info')).toEqual([]);
  });
});
