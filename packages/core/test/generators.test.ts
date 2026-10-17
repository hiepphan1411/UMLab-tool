import { describe, expect, it } from 'vitest';
import { activityDiagram, layoutActivity, normSpec, specToActivity, type ActivityGraph } from '../src';
import { UC03, UC03_MODEL } from './fixtures/uc03';

const ctx = { actorName: (id: string) => UC03_MODEL.find((m) => m.id === id)?.name ?? id };
const count = (g: ActivityGraph, kind: string) => g.nodes.filter((n) => n.kind === kind).length;

/** Cấu trúc gọn để so snapshot: "loại(tên)@làn" và cạnh "a -[guard]-> b". */
function structure(g: ActivityGraph) {
  const label = (id: string) => {
    const n = g.nodes.find((x) => x.id === id)!;
    const lane = g.lanes.find((l) => l.id === n.laneId)!.name;
    return `${n.kind}${n.name ? `(${n.name})` : ''}@${lane}`;
  };
  return {
    lanes: g.lanes.map((l) => l.name),
    edges: g.edges.map((e) => `${label(e.from)} -${e.guard ?? ''}-> ${label(e.to)}`),
  };
}

const overlaps = (boxes: { x: number; y: number; w: number; h: number }[]) => {
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) return true;
    }
  return false;
};

describe('Sinh Activity từ đặc tả (generators.md mục 1)', () => {
  it('UC03: 3 làn, 3 Decision, 1 Merge, 2 Flow Final, 1 Activity Final; không hình nào đè nhau', () => {
    const g = specToActivity(UC03, ctx);
    expect(g.lanes.map((l) => l.name)).toEqual(['Sinh viên', 'Bảo vệ', 'Hệ thống']);
    expect(count(g, 'decision')).toBe(3);
    expect(count(g, 'merge')).toBe(1);
    expect(count(g, 'flowFinal')).toBe(2);
    expect(count(g, 'final')).toBe(1);
    expect(count(g, 'initial')).toBe(1);
    expect(count(g, 'action')).toBe(7 + 2 + 1 + 1);
    expect(structure(g)).toMatchSnapshot();
    const lay = layoutActivity(g);
    expect(overlaps([...lay.nodes.values()])).toBe(false);
    // mỗi node nằm trong làn của nó
    for (const n of g.nodes) {
      const b = lay.nodes.get(n.id)!;
      const l = lay.lanes.find((x) => x.id === n.laneId)!;
      expect(b.x).toBeGreaterThanOrEqual(l.x);
      expect(b.x + b.w).toBeLessThanOrEqual(l.x + l.w);
    }
    const d = activityDiagram(g, lay);
    expect(d.views.filter((v) => v.shape === 'act.swimlaneV')).toHaveLength(1);
    expect(d.views.filter((v) => v.props.sourceStepId === 's2')).toHaveLength(2); // action + decision sau bước 2
    expect(d.connectors.every((c) => c.kind === 'act.controlFlow')).toBe(true);
    expect(d.connectors.some((c) => c.props.guard === 'Thẻ không tồn tại trong hệ thống')).toBe(true);
    expect(d.model.every((m) => m.kind === 'uml.action')).toBe(true);
  });

  it('chỉ luồng chính: Initial → các Action tuần tự → Activity Final', () => {
    const spec = normSpec({
      useCaseId: 'uc',
      primaryActors: ['m_sv'],
      mainFlow: [
        { id: 'a', performer: { kind: 'actor', actorId: 'm_sv' }, text: 'Nhập email' },
        { id: 'b', performer: { kind: 'system' }, text: 'Kiểm tra' },
        { id: 'c', performer: { kind: 'system' }, text: 'Đăng nhập' },
      ],
    });
    const g = specToActivity(spec, ctx);
    expect(structure(g)).toMatchSnapshot();
    expect(g.edges).toHaveLength(4);
    expect(overlaps([...layoutActivity(g).nodes.values()])).toBe(false);
  });

  it('bước có vòng lặp: Merge trước bước, Decision [chưa until] quay lại, [until] đi tiếp', () => {
    const spec = normSpec({
      useCaseId: 'uc',
      primaryActors: ['m_sv'],
      mainFlow: [
        { id: 'a', performer: { kind: 'actor', actorId: 'm_sv' }, text: 'Quét thẻ' },
        { id: 'b', performer: { kind: 'system' }, text: 'Đọc thẻ', loop: { until: 'đọc được' } },
        { id: 'c', performer: { kind: 'system' }, text: 'Mở cổng' },
      ],
    });
    const g = specToActivity(spec, ctx);
    expect(count(g, 'merge')).toBe(1);
    expect(count(g, 'decision')).toBe(1);
    const s = structure(g);
    expect(s.edges).toContain('decision@Hệ thống -[chưa đọc được]-> merge@Hệ thống');
    expect(s.edges).toContain('decision@Hệ thống -[đọc được]-> action(Mở cổng)@Hệ thống');
    expect(s).toMatchSnapshot();
    expect(overlaps([...layoutActivity(g).nodes.values()])).toBe(false);
  });
});
