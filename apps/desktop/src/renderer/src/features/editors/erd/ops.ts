// Thao tác ERD trên giao dịch của engine: ghi cột (FK con đổi theo PK cha, đánh dấu sửa tay), sinh FK khi nối
// quan hệ, tạo bảng trung gian cho N-N.
import {
  ERD_KINDS,
  addFkColumns,
  buildJunction,
  entityData,
  erdDialect,
  newColumn,
  propagatePk,
  relData,
  relDefaults,
  uid,
  type ErdColumn,
  type ErdEntity,
  type ModelElement,
  type RelationshipData,
  type View,
} from '@umlab/core';
import type { EngineLookup, Tx } from '../engine/registry';

export const asEntity = (m: ModelElement): ErdEntity => ({ ...entityData(m), id: m.id, name: m.name });

export const dialectOf = (lookup: EngineLookup) => erdDialect(lookup.diagram(lookup.diagramId));

const sig = (c: ErdColumn) => {
  const { manuallyEdited: _m, ...rest } = c;
  void _m;
  return JSON.stringify(rest);
};

/**
 * Ghi cột của bảng: cột sinh từ class mà bị đổi → `manuallyEdited` (parse ORM lại sẽ mặc định giữ);
 * PK đổi tên/kiểu → cột FK ở các bảng con cập nhật theo.
 */
export function setEntityColumns(tx: Tx, entityId: string, columns: ErdColumn[]): void {
  const m = tx.model(entityId);
  if (!m) return;
  const before = asEntity(m);
  const old = new Map(before.columns.map((c) => [c.id, c]));
  const cols = columns.map((c) => {
    const o = old.get(c.id);
    return c.mappedFrom && o && sig(o) !== sig(c) ? { ...c, manuallyEdited: true } : c;
  });
  tx.setModelData(entityId, { columns: cols });
  const after = { ...before, columns: cols };
  for (const x of tx.lookup.allModel()) {
    if (x.kind !== ERD_KINDS.entity) continue;
    const child = tx.model(x.id) ?? x;
    const next = propagatePk(before, after, asEntity(child));
    if (next) tx.setModelData(child.id, { columns: next });
  }
}

/** Thêm khoá chính `id` (kiểu khoá tự sinh) cho bảng chưa có PK. */
export function ensurePk(tx: Tx, entityId: string): void {
  const m = tx.model(entityId);
  if (!m || entityData(m).columns.some((c) => c.pk)) return;
  const id = newColumn('id', 'BIGINT', {
    pk: true,
    nullable: false,
    autoIncrement: true,
  });
  setEntityColumns(tx, entityId, [id, ...entityData(m).columns]);
}

/** Sinh cột FK cho quan hệ `relId` (đường nối vừa tạo, cha = nguồn, con = đích). */
export function generateFks(tx: Tx, relId: string): void {
  const rm = tx.model(relId);
  if (!rm) return;
  const r = relData(rm);
  if (r.kind === 'relnn') return;
  const pm = tx.model(r.parent.entityId);
  const cm = tx.model(r.child.entityId);
  if (!pm || !cm) return;
  ensurePk(tx, pm.id);
  const parent = asEntity(tx.model(pm.id)!);
  const child = asEntity(tx.model(cm.id)!);
  // tự tham chiếu: cột FK đặt tên theo vai trò `parent_id`
  const res = addFkColumns(
    parent,
    child,
    { id: relId, kind: r.kind, identifying: r.identifying, parent: r.parent },
    {
      role: parent.id === child.id ? 'parent' : undefined,
    },
  );
  setEntityColumns(tx, child.id, res.columns);
  tx.setModelData(relId, { fkColumns: res.fkColumns });
}

export function newRelData(kind: RelationshipData['kind'], parentId: string, childId: string): RelationshipData {
  const d = relDefaults(kind);
  return {
    kind,
    identifying: false,
    parent: { entityId: parentId, cardinality: d.parent },
    child: { entityId: childId, cardinality: d.child },
    fkColumns: [],
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  };
}

/** Kích thước bảng theo số cột (trước khi engine đo lại). */
export const tableSize = (rows: number) => ({ w: 220, h: Math.round(30 + Math.max(1, rows) * 20 + 10) });

/** Đổi quan hệ N-N (đường `connId`) thành bảng trung gian + 2 quan hệ 1-N identifying. */
export function makeJunction(apply: (fn: (tx: Tx) => void) => void, connId: string): void {
  apply((tx) => {
    const c = tx.conn(connId);
    const rm = c?.modelId ? tx.model(c.modelId) : undefined;
    if (!c || !rm) return;
    const a = tx.view(c.source.viewId ?? '');
    const b = tx.view(c.target.viewId ?? '');
    if (!a?.modelId || !b?.modelId) return;
    ensurePk(tx, a.modelId);
    ensurePk(tx, b.modelId);
    const ea = asEntity(tx.model(a.modelId)!);
    const eb = asEntity(tx.model(b.modelId)!);
    const j = buildJunction(ea, eb);
    const { id, name, ...data } = j.entity;
    tx.addModel({ id, kind: ERD_KINDS.entity, name, data: data as unknown as Record<string, unknown> });
    const sz = tableSize(j.entity.columns.length);
    const cx = (a.x + a.w / 2 + b.x + b.w / 2) / 2;
    const cy = (a.y + a.h / 2 + b.y + b.h / 2) / 2;
    const self = a.id === b.id;
    const z = Math.max(0, ...tx.lookup.views().map((v) => v.z ?? 0)) + 1;
    const view: View = {
      id: uid('v'),
      shape: 'erd.entity',
      modelId: id,
      x: Math.round(self ? a.x + a.w + 80 : cx - sz.w / 2),
      y: Math.round(self ? a.y : cy - sz.h / 2 + 90),
      w: sz.w,
      h: sz.h,
      z,
      parentId: a.parentId,
      props: { autoSize: true },
      style: {},
    };
    tx.addView(view);
    j.relationships.forEach((rel, i) => {
      const { id: rid, name: rname, ...rdata } = rel;
      tx.addModel({
        id: rid,
        kind: ERD_KINDS.relationship,
        name: rname,
        data: rdata as unknown as Record<string, unknown>,
      });
      tx.addConn({
        id: uid('c'),
        kind: 'erd.rel1n',
        modelId: rid,
        source: { viewId: i === 0 ? a.id : b.id },
        target: { viewId: view.id },
        routing: 'orthogonal',
        waypoints: [],
        labels: [],
        props: {},
        style: {},
        z: tx.lookup.conns().length,
      });
    });
    tx.deleteConn(c.id);
    tx.deleteModel(rm.id);
  });
}
