// Ghi kết quả parse ORM vào một sơ đồ ERD trong Y.Doc: phần tử mô hình + hình bảng + đường quan hệ.
import type * as Y from 'yjs';
import { ERD_KINDS, type ErdEntity, type ErdRelationship } from '../erd/model';
import { schemaFromModel } from '../erd/doc';
import type { Connector, ModelElement, View } from '../format/types';
import { connsMap, modelMap, viewsMap } from '../project/ydoc';
import { uid } from '../util/ids';
import { clone } from '../util/json';
import type { ErdState, SyncPlan } from './sync';

export type Box = { x: number; y: number; w: number; h: number };

/** Trạng thái ERD hiện tại của sơ đồ (đầu vào diffErd). */
export function erdState(doc: Y.Doc, diagramId: string): ErdState {
  const model = modelMap(doc);
  const ids = new Set<string>();
  for (const v of viewsMap(doc, diagramId).values()) if (v.modelId) ids.add(v.modelId);
  for (const c of connsMap(doc, diagramId).values()) if (c.modelId) ids.add(c.modelId);
  const s = schemaFromModel([...ids].map((id) => model.get(id)).filter((m): m is ModelElement => !!m));
  return { entities: s.entities, relationships: s.relationships };
}

export const entityElement = (e: ErdEntity): ModelElement => {
  const { id, name, ...data } = clone(e);
  return { id, kind: ERD_KINDS.entity, name, data: data as unknown as Record<string, unknown> };
};
export const relationshipElement = (r: ErdRelationship): ModelElement => {
  const { id, name, ...data } = clone(r);
  return { id, kind: ERD_KINDS.relationship, name, data: data as unknown as Record<string, unknown> };
};

/**
 * Ghi kế hoạch đồng bộ vào sơ đồ `diagramId`. Bảng mới đặt theo `place` (hộp đã tính bằng elkjs ở renderer),
 * bảng cũ giữ nguyên vị trí; kích thước bảng cập nhật theo `size` nếu có.
 */
export function writeErdPlan(
  doc: Y.Doc,
  diagramId: string,
  plan: SyncPlan,
  o: { place: (e: ErdEntity) => Box; size?: (e: ErdEntity) => { w: number; h: number }; origin?: unknown },
): void {
  const model = modelMap(doc);
  const views = viewsMap(doc, diagramId);
  const conns = connsMap(doc, diagramId);
  doc.transact(() => {
    const viewOf = (entityId: string) => [...views.values()].find((v) => v.modelId === entityId);
    let z = Math.max(0, ...[...views.values()].map((v) => v.z ?? 0)) + 1;
    for (const e of plan.upsertEntities) {
      model.set(e.id, entityElement(e));
      const v = viewOf(e.id);
      if (!v) {
        const b = o.place(e);
        const view: View = {
          id: uid('v'),
          shape: 'erd.entity',
          modelId: e.id,
          x: Math.round(b.x),
          y: Math.round(b.y),
          w: Math.round(b.w),
          h: Math.round(b.h),
          z: z++,
          parentId: null,
          props: { autoSize: true },
          style: {},
        };
        views.set(view.id, view);
      } else if (o.size && v.props.autoSize !== false) {
        const s = o.size(e);
        views.set(v.id, { ...v, w: Math.max(v.w, Math.round(s.w)), h: Math.round(s.h) });
      }
    }
    for (const id of plan.deleteRelationshipIds) {
      for (const c of [...conns.values()]) if (c.modelId === id) conns.delete(c.id);
      model.delete(id);
    }
    for (const id of plan.deleteEntityIds) {
      for (const v of [...views.values()])
        if (v.modelId === id) {
          for (const c of [...conns.values()])
            if (c.source.viewId === v.id || c.target.viewId === v.id) conns.delete(c.id);
          views.delete(v.id);
        }
      model.delete(id);
    }
    let cz = conns.size;
    for (const r of plan.upsertRelationships) {
      model.set(r.id, relationshipElement(r));
      if ([...conns.values()].some((c) => c.modelId === r.id)) continue;
      const pv = viewOf(r.parent.entityId);
      const cv = viewOf(r.child.entityId);
      if (!pv || !cv) continue;
      const c: Connector = {
        id: uid('c'),
        kind: `erd.${r.kind}`,
        modelId: r.id,
        source: { viewId: pv.id },
        target: { viewId: cv.id },
        routing: 'orthogonal',
        waypoints: [],
        labels: [],
        props: {},
        style: {},
        z: cz++,
      };
      conns.set(c.id, c);
    }
  }, o.origin);
}
