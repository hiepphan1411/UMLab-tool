// Bố cục bảng ERD bằng elkjs (layered): mẫu UniPark+, bảng mới khi parse ORM.
import type { ErdEntity, ErdRelationship } from '@umlab/core';
import { elk } from '../engine/layout';
import { entitySize } from './table';

export type Box = { x: number; y: number; w: number; h: number };

/** Vị trí các bảng (góc trên trái bắt đầu ở `origin`), quan hệ cha → con đi từ trên xuống. */
export async function layoutEntities(
  entities: Pick<ErdEntity, 'id' | 'name' | 'columns'>[],
  rels: Pick<ErdRelationship, 'id' | 'parent' | 'child'>[],
  origin = { x: 40, y: 40 },
): Promise<Map<string, Box>> {
  const ids = new Set(entities.map((e) => e.id));
  const size = new Map(entities.map((e) => [e.id, entitySize(e)]));
  const res = await (
    await elk()
  ).layout({
    id: 'root',
    width: 0,
    height: 0,
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.spacing.nodeNode': '56',
      'elk.layered.spacing.nodeNodeBetweenLayers': '90',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
    },
    children: entities.map((e) => ({ id: e.id, width: size.get(e.id)!.w, height: size.get(e.id)!.h })),
    edges: rels
      .filter((r) => ids.has(r.parent.entityId) && ids.has(r.child.entityId) && r.parent.entityId !== r.child.entityId)
      .map((r) => ({ id: r.id, sources: [r.parent.entityId], targets: [r.child.entityId] })),
  });
  const out = new Map<string, Box>();
  for (const n of res.children ?? []) {
    const s = size.get(n.id)!;
    out.set(n.id, { x: Math.round(origin.x + (n.x ?? 0)), y: Math.round(origin.y + (n.y ?? 0)), w: s.w, h: s.h });
  }
  return out;
}
