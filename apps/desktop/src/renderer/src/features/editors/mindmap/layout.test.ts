import { describe, expect, it } from 'vitest';
import { normMindmap } from '@umlab/core';
import { computeLayout, hitNode } from './layout';

const sample = (layout: 'both' | 'right', off?: { dx: number; dy: number }) =>
  normMindmap({
    layout,
    nodes: [
      { id: 'r', kind: 'root', title: 'Trung tâm' },
      { id: 'a', parentId: 'r', order: 0, title: 'Nhánh A', off },
      { id: 'a1', parentId: 'a', order: 0, title: 'A1' },
      { id: 'a2', parentId: 'a', order: 1, title: 'A2' },
      { id: 'b', parentId: 'r', order: 1, title: 'Nhánh B' },
      { id: 'c', parentId: 'r', order: 2, title: 'Nhánh C', collapsed: true },
      { id: 'c1', parentId: 'c', order: 0, title: 'C1' },
    ],
  });

describe('Bố cục mindmap', () => {
  it('hai phía: nhánh chia trái/phải, con nằm cùng phía với cha, nhánh thu gọn ẩn con', () => {
    const L = computeLayout(sample('both'));
    const r = L.boxes.get('r')!;
    expect(r.x).toBe(0);
    const sides = ['a', 'b', 'c'].map((id) => Math.sign(L.boxes.get(id)!.x));
    expect(sides).toContain(1);
    expect(sides).toContain(-1);
    const a = L.boxes.get('a')!;
    expect(Math.sign(L.boxes.get('a1')!.x - a.x)).toBe(a.dir);
    expect(L.boxes.has('c1')).toBe(false);
    expect(L.boxes.get('c')!.hidden).toBe(1);
    // anh em không chồng nhau theo chiều dọc
    const a1 = L.boxes.get('a1')!;
    const a2 = L.boxes.get('a2')!;
    expect(a2.y - a2.h / 2).toBeGreaterThanOrEqual(a1.y + a1.h / 2);
  });

  it('một phía: mọi nhánh ở bên phải', () => {
    const L = computeLayout(sample('right'));
    for (const id of ['a', 'b', 'c']) expect(L.boxes.get(id)!.x).toBeGreaterThan(0);
  });

  it('độ lệch kéo tay dời cả nhánh con theo', () => {
    const L0 = computeLayout(sample('right'));
    const a0 = L0.boxes.get('a')!;
    const r = L0.boxes.get('r')!;
    const L1 = computeLayout(sample('right', { dx: a0.x - r.x + 100, dy: a0.y - r.y + 50 }));
    expect(L1.boxes.get('a')!.x - a0.x).toBeCloseTo(100);
    expect(L1.boxes.get('a1')!.x - L0.boxes.get('a1')!.x).toBeCloseTo(100);
    expect(L1.boxes.get('a1')!.y - L0.boxes.get('a1')!.y).toBeCloseTo(50);
    const a1 = L1.boxes.get('a1')!;
    expect(hitNode(L1, a1.x, a1.y)).toBe('a1');
    expect(hitNode(L1, a1.x, a1.y, new Set(['a1']))).toBeNull();
  });
});
