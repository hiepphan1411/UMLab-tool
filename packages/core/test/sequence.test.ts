import { describe, expect, it } from 'vitest';
import {
  computeSequence,
  controllerBase,
  layoutSequence,
  SEQ,
  sequenceDiagram,
  sequenceNumbers,
  specToSequence,
  type SeqGenItem,
  type SeqMessageIn,
  type SequenceGraph,
} from '../src';
import { normSpec } from '../src';
import { UC03, UC03_MODEL } from './fixtures/uc03';

// Đăng nhập: 5 lifeline, 12 message, 1 alt 2 operand
const LL = ['U', 'UI', 'C', 'DAO', 'S'].map((id, i) => ({ id, cx: 100 + i * 180, headHalf: 50 }));
const LOGIN: SeqMessageIn[] = [
  { id: 'm1', kind: 'sync', from: 'U', to: 'UI', y: 100 },
  { id: 'm2', kind: 'sync', from: 'UI', to: 'C', y: 140 },
  { id: 'm3', kind: 'sync', from: 'C', to: 'DAO', y: 180 },
  { id: 'm4', kind: 'reply', from: 'DAO', to: 'C', y: 220 },
  { id: 'm5', kind: 'self', from: 'C', to: 'C', y: 260 },
  // alt [đúng mật khẩu] (y 290, vạch ngăn 400)
  { id: 'm6', kind: 'create', from: 'C', to: 'S', y: 320 },
  { id: 'm7', kind: 'reply', from: 'S', to: 'C', y: 350 },
  { id: 'm8', kind: 'reply', from: 'C', to: 'UI', y: 380 },
  // [else]
  { id: 'm9', kind: 'reply', from: 'C', to: 'UI', y: 430 },
  { id: 'm10', kind: 'reply', from: 'UI', to: 'U', y: 460 },
  { id: 'm11', kind: 'sync', from: 'U', to: 'UI', y: 510 },
  { id: 'm12', kind: 'sync', from: 'UI', to: 'C', y: 550 },
];
const ALT = [{ y: 290, dividers: [400] }];
const numbers = (r: ReturnType<typeof computeSequence>) =>
  Object.fromEntries([...r.messages].map(([id, m]) => [id, m.number]));
const act = (r: ReturnType<typeof computeSequence>, msgId: string) => r.activations.find((a) => a.msgId === msgId);

describe('Sequence: đánh số lồng + activation', () => {
  it('chuỗi đăng nhập: số thứ tự 1 / 1.1 / 1.1.1…, reply không đánh số, activation mở/đóng đúng', () => {
    const r = computeSequence(LL, LOGIN, { alternatives: ALT });
    expect(numbers(r)).toEqual({
      m1: '1',
      m2: '1.1',
      m3: '1.1.1',
      m4: '',
      m5: '1.1.2',
      m6: '1.1.3',
      m7: '',
      m8: '',
      m9: '',
      m10: '',
      m11: '2',
      m12: '2.1',
    });
    expect(r.issues).toEqual([]);
    expect(act(r, 'm1')).toMatchObject({ lifelineId: 'UI', y1: 100, y2: 460, depth: 0 });
    // activation Controller kéo dài qua cả hai operand của alt (reply ở nhánh 1 không cắt nhánh else)
    expect(act(r, 'm2')).toMatchObject({ lifelineId: 'C', y1: 140, y2: 430 });
    expect(r.activations.filter((a) => a.msgId === 'm2')).toHaveLength(1);
    expect(act(r, 'm3')).toMatchObject({ lifelineId: 'DAO', y1: 180, y2: 220 });
    expect(act(r, 'm6')).toMatchObject({ lifelineId: 'S', y1: 320, y2: 350 });
    // lượt mới: cha kết thúc sau con
    expect(act(r, 'm12')!.y2).toBeLessThan(act(r, 'm11')!.y2);
    // đầu mút: m2 rời cạnh phải activation UI, tới cạnh trái activation C
    expect(r.messages.get('m2')!.pts).toEqual([
      [280 + SEQ.actW / 2, 140],
      [460 - SEQ.actW / 2, 140],
    ]);
    // create trỏ vào cạnh hộp đầu lifeline đích
    expect(r.messages.get('m6')!.pts[1]).toEqual([820 - 50, 320]);
    // self message: vòng ra phải rồi quay về
    expect(r.messages.get('m5')!.pts).toHaveLength(4);
  });

  it('kéo message thứ 3 xuống dưới message thứ 5 → đánh số lại', () => {
    const moved = LOGIN.map((m) => (m.id === 'm3' ? { ...m, y: 270 } : m.id === 'm4' ? { ...m, y: 280 } : m));
    const r = computeSequence(LL, moved, { alternatives: ALT });
    expect(numbers(r)).toMatchObject({ m5: '1.1.1', m3: '1.1.2', m6: '1.1.3', m11: '2' });
    expect(r.issues).toEqual([]);
  });

  it('recursive → activation lồng lệch phải; reply lạc → cảnh báo; message sau Destroy → cảnh báo; tắt đánh số', () => {
    const r = computeSequence(LL, [
      { id: 'a', kind: 'sync', from: 'U', to: 'C', y: 100 },
      { id: 'b', kind: 'recursive', from: 'C', to: 'C', y: 140 },
      { id: 'c', kind: 'reply', from: 'DAO', to: 'U', y: 200 },
      { id: 'd', kind: 'destroy', from: 'C', to: 'S', y: 240 },
      { id: 'e', kind: 'sync', from: 'C', to: 'S', y: 280 },
    ]);
    expect(act(r, 'b')).toMatchObject({ lifelineId: 'C', depth: 1, y1: 140 + SEQ.selfH });
    expect(r.messages.get('b')!.number).toBe('1.1');
    expect(r.issues).toEqual([
      { msgId: 'c', kind: 'unmatchedReply' },
      { msgId: 'e', kind: 'afterDestroy' },
    ]);
    expect(r.destroyed.get('S')).toBe(240);
    const off = computeSequence(LL, LOGIN.slice(0, 3), { numbering: false });
    expect([...off.messages.values()].every((m) => m.number === '')).toBe(true);
  });

  it('found / lost message: đầu tự do', () => {
    const r = computeSequence(LL, [
      { id: 'f', kind: 'found', from: null, to: 'C', y: 100, fromX: 300 },
      { id: 'l', kind: 'lost', from: 'C', to: null, y: 140, toX: 700 },
    ]);
    expect(r.messages.get('f')!.pts[0]).toEqual([300, 100]);
    expect(r.messages.get('l')!.pts[1]).toEqual([700, 140]);
    expect(numbers(r)).toEqual({ f: '1', l: '1.1' });
  });
});

const ctx = {
  actorName: (id: string) => UC03_MODEL.find((m) => m.id === id)?.name ?? id,
  useCaseName: 'Check-in xe vào bãi',
};
const guards = (xs: SeqGenItem[]): string[] =>
  xs.flatMap((x) =>
    x.type === 'fragment'
      ? [`${x.operator} [${x.operands[0].guard}]`, ...x.operands.flatMap((o) => guards(o.items))]
      : [],
  );
function structure(g: SequenceGraph) {
  const name = (id: string) => g.lifelines.find((l) => l.id === id)!.name;
  const lines: string[] = [];
  const walk = (xs: SeqGenItem[], ind: string) => {
    for (const x of xs)
      if (x.type === 'msg') lines.push(`${ind}${name(x.msg.from)} -${x.msg.kind}-> ${name(x.msg.to)}: ${x.msg.name}`);
      else if (x.type === 'ref') lines.push(`${ind}ref ${x.name}`);
      else {
        lines.push(`${ind}${x.operator}`);
        x.operands.forEach((o) => {
          lines.push(`${ind} [${o.guard}]`);
          walk(o.items, ind + '   ');
        });
      }
  };
  walk(g.items, '');
  return { lifelines: g.lifelines.map((l) => `${l.kind}:${l.name}`), lines };
}

describe('Sinh Sequence từ đặc tả (generators.md mục 2)', () => {
  it('tên Control: bỏ cụm giới từ, không dấu, PascalCase', () => {
    expect(controllerBase('Check-in xe vào bãi')).toBe('CheckInXe');
    expect(controllerBase('Đăng nhập')).toBe('DangNhap');
    expect(controllerBase('Nạp tiền vào ví điện tử')).toBe('NapTien');
  });

  it('UC03: alt [thẻ không hợp lệ], alt [biển số không khớp], CheckInXeController, entity đã khai báo', () => {
    const g = specToSequence(UC03, ctx);
    const names = g.lifelines.map((l) => l.name);
    expect(names).toContain('CheckInXeController');
    for (const e of ['TheRFID', 'Xe', 'GoiThang', 'ViDienTu', 'PhienGuiXe']) expect(names).toContain(e);
    expect(g.lifelines.filter((l) => l.kind === 'actor').map((l) => l.name)).toEqual(['Sinh viên', 'Bảo vệ']);
    expect(g.lifelines.find((l) => l.name === 'AI Service')?.kind).toBe('lifeline');
    expect(guards(g.items)).toEqual(['alt [thẻ không hợp lệ]', 'alt [biển số không khớp]', 'alt [không đủ số dư]']);
    expect(structure(g)).toMatchSnapshot();
    const lay = layoutSequence(g);
    const num = sequenceNumbers(g, lay);
    const first = g.items.slice(0, 3).map((x) => (x.type === 'msg' ? num.get(x.msg.id) : ''));
    expect(first).toEqual(['1', '1.1', '1.1.1']);
    // create hạ hộp đầu PhienGuiXe xuống đúng độ cao message
    const pg = g.lifelines.find((l) => l.name === 'PhienGuiXe')!;
    const create = (function find(xs: SeqGenItem[]): string | undefined {
      for (const x of xs) {
        if (x.type === 'msg' && x.msg.kind === 'create') return x.msg.id;
        if (x.type === 'fragment')
          for (const o of x.operands) {
            const r = find(o.items);
            if (r) return r;
          }
      }
      return undefined;
    })(g.items)!;
    const lp = lay.lifelines.get(pg.id)!;
    expect(lp.top + lp.head / 2).toBe(lay.messages.get(create)!.y);
    // views / connectors
    const d = sequenceDiagram(g, lay);
    expect(d.views.filter((v) => v.shape === 'seq.fragment')).toHaveLength(3);
    expect(d.views.find((v) => v.shape === 'seq.control')).toBeDefined();
    expect(d.connectors.every((c) => c.source.y === c.target.y && c.kind.startsWith('seq.'))).toBe(true);
    // fragment ngoài bao trọn fragment trong
    const fr = d.views.filter((v) => v.shape === 'seq.fragment');
    const outer = fr[0];
    for (const f of fr.slice(1)) {
      expect(f.x).toBeGreaterThanOrEqual(outer.x);
      expect(f.x + f.w).toBeLessThanOrEqual(outer.x + outer.w);
      expect(f.y + f.h).toBeLessThanOrEqual(outer.y + outer.h);
    }
  });

  it('chỉ luồng chính, có bước lặp và gọi use case khác → loop + ref; kết thúc thành công có reply về actor', () => {
    const spec = normSpec({
      useCaseId: 'uc',
      primaryActors: ['a'],
      screens: [{ id: 's', name: 'Màn hình ví' }],
      mainFlow: [
        { id: 's1', no: 1, performer: { kind: 'actor', actorId: 'a' }, text: 'Chọn nạp tiền.' },
        { id: 's2', no: 2, performer: { kind: 'system' }, text: 'Đăng nhập', includeUseCaseId: 'uc_login' },
        {
          id: 's3',
          no: 3,
          performer: { kind: 'system' },
          text: 'Gửi yêu cầu tới cổng thanh toán.',
          interaction: { target: 'external', targetName: 'VNPay', message: 'thanhToan(soTien)', returns: 'ketQua' },
          loop: { until: 'thành công hoặc quá 3 lần' },
        },
        { id: 's4', no: 4, performer: { kind: 'system' }, text: 'Cộng số dư.' },
      ],
      postconditions: { success: ['Số dư đã tăng'], failure: [] },
    });
    const g = specToSequence(spec, {
      ...ctx,
      actorName: () => 'Sinh viên',
      useCaseName: 'Nạp tiền vào ví',
      useCaseNameOf: () => 'Đăng nhập',
    });
    expect(structure(g)).toMatchSnapshot();
    expect(g.items.some((x) => x.type === 'ref' && x.name === 'Đăng nhập')).toBe(true);
    expect(guards(g.items)).toEqual(['loop [until thành công hoặc quá 3 lần]']);
    const last = g.items[g.items.length - 1];
    expect(last.type === 'msg' && last.msg.kind).toBe('reply');
    expect(g.lifelines.find((l) => l.kind === 'control')!.name).toBe('NapTienController');
  });
});
