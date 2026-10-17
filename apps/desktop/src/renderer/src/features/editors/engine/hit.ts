import type { View } from '@umlab/core';
import type { Box } from './geometry';
import { getShape } from './registry';

/** Hình trên cùng tại (x,y) theo thứ tự vẽ; bỏ hình ẩn/khoá/loại trừ. Dùng hitTest riêng của shape nếu có. */
export function hitView(
  order: View[],
  boxOf: (id: string) => Box | null,
  x: number,
  y: number,
  exclude?: Set<string>,
): View | null {
  for (let i = order.length - 1; i >= 0; i--) {
    const v = order[i];
    if (v.hidden || v.locked || exclude?.has(v.id)) continue;
    const b = boxOf(v.id);
    if (!b) continue;
    const def = getShape(v.shape);
    if (def?.hitTest ? def.hitTest({ ...v, ...b }, x, y) : x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h)
      return v;
  }
  return null;
}
