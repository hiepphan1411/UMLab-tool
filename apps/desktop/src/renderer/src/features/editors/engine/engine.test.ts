// Test thuần cho engine (P04): routing orthogonal, hit-test, lịch sử (gộp kéo), bắt dính.
import { beforeAll, describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { connsMap, dataMap, diagramsMap, modelMap, viewsMap, type Connector, type Side, type View } from '@umlab/core';
import { LOCAL, type ProjectSession } from '../../workspace/session';
import { Engine } from './engine';
import { autoOrtho, anchorPt, snapMove, type Box, type Pt } from './geometry';
import { hitView } from './hit';
import { createConnector, createView, nudge } from './ops';
import { registerConnector, registerShape } from './registry';
import { routeConnector, type RouteEnv } from './route';

beforeAll(() => {
  registerShape({ type: 't.box', label: 'Box', icon: 'rectangle', defaultSize: { w: 100, h: 60 }, render: () => null });
  registerShape({
    type: 't.round',
    label: 'Round',
    icon: 'oval',
    outline: 'ellipse',
    defaultSize: { w: 80, h: 80 },
    render: () => null,
    hitTest: (v, x, y) => ((x - v.x - v.w / 2) / (v.w / 2)) ** 2 + ((y - v.y - v.h / 2) / (v.h / 2)) ** 2 <= 1,
  });
  registerConnector({
    kind: 't.arrow',
    label: 'Arrow',
    icon: 'arrow',
    look: { line: 'solid', start: 'none', end: 'arrow-open' },
    defaultRouting: 'orthogonal',
  });
});

// ---------- routing ----------
const A: Box = { x: 0, y: 0, w: 100, h: 60 };
const B: Box = { x: 300, y: 200, w: 100, h: 60 };

function expectOrthogonal(pts: Pt[], p1: Pt, s1: Side, p2: Pt) {
  expect(pts[0]).toEqual(p1);
  expect(pts[pts.length - 1]).toEqual(p2);
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]];
    expect(Math.abs(a[0] - b[0]) < 0.5 || Math.abs(a[1] - b[1]) < 0.5, `đoạn ${i} không vuông góc: ${a} → ${b}`).toBe(
      true,
    );
  }
  // đoạn đầu rời hình theo hướng cạnh nguồn
  const [dx, dy] = [pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]];
  const dir = { top: dy < 0, bottom: dy > 0, left: dx < 0, right: dx > 0 }[s1];
  expect(dir, `đoạn đầu không đi theo cạnh ${s1}`).toBe(true);
}

describe('routing orthogonal', () => {
  const cases: [Side, Side][] = [
    ['right', 'left'],
    ['bottom', 'top'],
    ['right', 'top'],
    ['bottom', 'left'],
    ['right', 'right'],
    ['top', 'top'],
    ['left', 'right'],
  ];
  for (const [s1, s2] of cases) {
    it(`${s1} → ${s2}`, () => {
      const p1 = anchorPt(A, s1, 0.5);
      const p2 = anchorPt(B, s2, 0.5);
      expectOrthogonal(autoOrtho(p1, s1, p2, s2), p1, s1, p2);
    });
  }

  it('right → left thẳng hàng chỉ còn 1 đoạn', () => {
    const p1: Pt = [100, 30];
    const p2: Pt = [300, 30];
    expect(autoOrtho(p1, 'right', p2, 'left')).toEqual([p1, p2]);
  });

  const env = (boxes: Record<string, Box>, outline: Record<string, 'rect' | 'ellipse'> = {}): RouteEnv => ({
    box: (id) => boxes[id] ?? null,
    outline: (id) => outline[id] ?? 'rect',
  });
  const conn = (src: string, tgt: string, routing: Connector['routing'] = 'orthogonal'): Connector => ({
    id: 'c1',
    kind: 't.arrow',
    modelId: null,
    source: { viewId: src },
    target: { viewId: tgt },
    routing,
    waypoints: [],
    labels: [],
    props: {},
    style: {},
  });

  it('tự chọn cạnh hướng về đầu kia', () => {
    const r = routeConnector(conn('a', 'b'), env({ a: A, b: { x: 300, y: 0, w: 100, h: 60 } }))!;
    expect(r.src.side).toBe('right');
    expect(r.tgt.side).toBe('left');
    expect(r.pts).toEqual([
      [100, 30],
      [300, 30],
    ]);
  });

  it('đầu mút trên hình tròn nằm đúng viền', () => {
    const round: Box = { x: 300, y: 0, w: 80, h: 80 };
    const r = routeConnector(conn('a', 'b', 'straight'), env({ a: A, b: round }, { b: 'ellipse' }))!;
    const [x, y] = r.tgt.pt;
    expect(((x - 340) / 40) ** 2 + ((y - 40) / 40) ** 2).toBeCloseTo(1, 3);
  });

  it('tự nối vẽ vòng ở góc trên phải', () => {
    const r = routeConnector(conn('a', 'a'), env({ a: A }))!;
    expect(r.pts.length).toBeGreaterThan(3);
    expect(r.pts[0][1]).toBe(A.y);
    expect(Math.max(...r.pts.map((p) => p[0]))).toBeGreaterThan(A.x + A.w);
  });
});

// ---------- hit-test ----------
describe('hit-test', () => {
  const v = (
    id: string,
    shape: string,
    x: number,
    y: number,
    w: number,
    h: number,
    extra: Partial<View> = {},
  ): View => ({
    id,
    shape,
    modelId: null,
    x,
    y,
    w,
    h,
    z: 0,
    parentId: null,
    props: {},
    style: {},
    ...extra,
  });
  const order = [
    v('bottom', 't.box', 0, 0, 200, 200),
    v('top', 't.box', 50, 50, 50, 50),
    v('round', 't.round', 300, 0, 100, 100),
  ];
  const boxOf = (id: string) => order.find((o) => o.id === id) ?? null;

  it('chọn hình trên cùng theo thứ tự vẽ', () => {
    expect(hitView(order, boxOf, 60, 60)?.id).toBe('top');
    expect(hitView(order, boxOf, 10, 10)?.id).toBe('bottom');
    expect(hitView(order, boxOf, 250, 250)).toBeNull();
  });

  it('bỏ qua hình ẩn, khoá và loại trừ', () => {
    const o2 = [order[0], { ...order[1], hidden: true }];
    expect(hitView(o2, boxOf, 60, 60)?.id).toBe('bottom');
    const o3 = [order[0], { ...order[1], locked: true }];
    expect(hitView(o3, boxOf, 60, 60)?.id).toBe('bottom');
    expect(hitView(order, boxOf, 60, 60, new Set(['top']))?.id).toBe('bottom');
  });

  it('dùng hitTest riêng của shape (góc hộp ngoài hình tròn không trúng)', () => {
    expect(hitView(order, boxOf, 350, 50)?.id).toBe('round');
    expect(hitView(order, boxOf, 305, 5)).toBeNull();
  });
});

// ---------- bắt dính ----------
describe('snapMove', () => {
  it('bám lưới khi không có hình để gióng', () => {
    const r = snapMove({ x: 0, y: 0, w: 50, h: 50 }, 13, 27, [], 6, 10);
    expect(r).toEqual({ dx: 10, dy: 30, guides: [] });
  });
  it('gióng mép trái với hình khác (ưu tiên hơn lưới)', () => {
    const r = snapMove({ x: 0, y: 0, w: 50, h: 50 }, 98, 300, [{ x: 101, y: 0, w: 200, h: 40 }], 6, 10);
    expect(r.dx).toBe(101);
    expect(r.dy).toBe(300);
    expect(r.guides[0].v).toBe(101);
  });
});

// ---------- lịch sử ----------
function setup() {
  const doc = new Y.Doc();
  const session = { doc, setPresence: () => {} } as unknown as ProjectSession;
  const did = 'd1';
  const engine = new Engine(session, did, 'playground', false, 'u1');
  const um = new Y.UndoManager(
    [viewsMap(doc, did), connsMap(doc, did), dataMap(doc, did), modelMap(doc), diagramsMap(doc)],
    {
      trackedOrigins: new Set([LOCAL]),
      captureTimeout: 450,
    },
  );
  return { doc, engine, um, did };
}

describe('lịch sử (Y.UndoManager)', () => {
  it('kéo liên tục (preview) chỉ ghi một bước undo khi thả', () => {
    const { engine, um } = setup();
    const id = createView(engine, 't.box', 0, 0)!;
    um.stopCapturing();
    for (let i = 1; i <= 30; i++) engine.set({ preview: new Map([[id, { x: i * 5, y: i * 2, w: 100, h: 60 }]]) });
    expect(engine.lookup.view(id)!.x).toBe(0);
    engine.set({ preview: new Map() });
    engine.apply((tx) => tx.setView(id, { x: 150, y: 60 }));
    expect(um.undoStack.length).toBe(2);
    um.undo();
    expect(engine.lookup.view(id)).toMatchObject({ x: 0, y: 0 });
    um.redo();
    expect(engine.lookup.view(id)).toMatchObject({ x: 150, y: 60 });
  });

  it('dịch bằng phím liên tục gộp thành một bước; stopCapturing tách bước', () => {
    const { engine, um } = setup();
    const id = createView(engine, 't.box', 0, 0)!;
    um.stopCapturing();
    for (let i = 0; i < 5; i++) nudge(engine, 1, 0);
    expect(engine.lookup.view(id)!.x).toBe(5);
    expect(um.undoStack.length).toBe(2);
    um.stopCapturing();
    nudge(engine, 10, 0);
    expect(um.undoStack.length).toBe(3);
    um.undo();
    expect(engine.lookup.view(id)!.x).toBe(5);
    um.undo();
    expect(engine.lookup.view(id)!.x).toBe(0);
  });

  it('undo/redo 50 bước đúng trạng thái', () => {
    const { engine, um } = setup();
    const a = createView(engine, 't.box', 0, 0)!;
    const b = createView(engine, 't.box', 300, 0)!;
    createConnector(engine, 't.arrow', { viewId: a }, { viewId: b });
    um.stopCapturing();
    const snaps: string[] = [];
    const snap = () => JSON.stringify([...engine.state.views.values()].map((v) => [v.id, v.x, v.y]).sort());
    for (let i = 0; i < 50; i++) {
      snaps.push(snap());
      engine.apply((tx) => tx.setView(i % 2 ? a : b, (v) => ({ ...v, x: v.x + 10 * (i + 1), y: v.y + i })));
      um.stopCapturing();
    }
    const final = snap();
    for (let i = 49; i >= 0; i--) {
      um.undo();
      expect(snap()).toBe(snaps[i]);
    }
    expect(engine.state.conns.size).toBe(1);
    for (let i = 0; i < 50; i++) um.redo();
    expect(snap()).toBe(final);
  });

  it('chỉ hoàn tác thao tác của mình, không đụng thay đổi từ máy khác', () => {
    const { doc, engine, um, did } = setup();
    const id = createView(engine, 't.box', 0, 0)!;
    um.stopCapturing();
    doc.transact(() => {
      const cur = viewsMap(doc, did).get(id)!;
      viewsMap(doc, did).set('remote', { ...cur, id: 'remote', x: 500 });
    }, 'remote');
    um.undo();
    expect(engine.state.views.has(id)).toBe(false);
    expect(engine.state.views.has('remote')).toBe(true);
  });
});
