// Đồng bộ ERD khi parse ORM lại (docs/spec/orm-mapping.md mục 3): khớp theo `mappedFrom.key` (suy ra từ class /
// thuộc tính / association) → chỉ sửa phần đã đổi; bảng/cột người dùng sửa tay (`manuallyEdited`) mặc định
// "Giữ chỉnh sửa tay"; phần không còn trong class diagram đề xuất xoá (mặc định không tick).
import { typeText } from '../erd/dialect';
import type { ErdColumn, ErdEntity, ErdRelationship, MappedFrom } from '../erd/model';
import { uid } from '../util/ids';
import { clone, jsonEqual } from '../util/json';
import type { OrmResult } from './class-to-erd';

export type DiffOp = 'add' | 'change' | 'remove';

export interface ErdDiffItem {
  key: string;
  op: DiffOp;
  level: 'table' | 'column' | 'fk';
  /** Tên bảng (nhóm hiển thị). */
  table: string;
  label: string;
  detail?: string;
  /** Đích đã sửa tay → mặc định giữ (không tick). */
  manual?: boolean;
  defaultOn: boolean;
}

export interface ErdState {
  entities: ErdEntity[];
  relationships: ErdRelationship[];
}

export interface SyncPlan {
  /** Bảng ghi lại (thêm mới hoặc sửa). */
  upsertEntities: ErdEntity[];
  newEntityIds: string[];
  deleteEntityIds: string[];
  upsertRelationships: ErdRelationship[];
  newRelationshipIds: string[];
  deleteRelationshipIds: string[];
}

const keyOf = (x: { mappedFrom?: { key: string } }) => x.mappedFrom?.key;
/** Trường của cột do parse ORM quyết định (so sánh / ghi đè khi đồng bộ). */
const COL_FIELDS = [
  'name',
  'type',
  'length',
  'precision',
  'scale',
  'pk',
  'nullable',
  'unique',
  'autoIncrement',
  'default',
  'enumValues',
] as const;
const colSig = (c: ErdColumn) => Object.fromEntries(COL_FIELDS.map((k) => [k, c[k] ?? null]));
const colDesc = (c: ErdColumn) =>
  `${c.name} ${c.enumValues?.length ? 'ENUM' : typeText(c)}${c.pk ? ' PK' : ''}${c.nullable || c.pk ? '' : ' NOT NULL'}${c.unique ? ' UNIQUE' : ''}`;
const isFkCol = (c: ErdColumn) => !!c.fk && /^(fk|inherit):/.test(keyOf(c) ?? '');
const relSig = (r: ErdRelationship) => ({
  kind: r.kind,
  identifying: r.identifying,
  parent: r.parent,
  child: r.child,
  onDelete: r.onDelete,
  onUpdate: r.onUpdate,
});
const CARD: Record<string, string> = { one: '1', zeroOrOne: '0..1', oneOrMany: '1..*', zeroOrMany: '0..*' };

/** Gán id thật: bảng/quan hệ/cột đã có (khớp theo khoá) giữ id cũ, mục mới sinh id mới; sửa mọi tham chiếu. */
function remap(cur: ErdState, next: OrmResult): ErdState {
  const ent = new Map<string, string>();
  const col = new Map<string, string>();
  const rel = new Map<string, string>();
  const curEnt = new Map(cur.entities.filter(keyOf).map((e) => [keyOf(e)!, e]));
  const curRel = new Map(cur.relationships.filter(keyOf).map((r) => [keyOf(r)!, r]));
  for (const e of next.entities) {
    const old = curEnt.get(keyOf(e) ?? '');
    ent.set(e.id, old?.id ?? uid('m'));
    const oldCols = new Map((old?.columns ?? []).filter(keyOf).map((c) => [keyOf(c)!, c.id]));
    for (const c of e.columns) col.set(`${e.id}|${c.id}`, oldCols.get(keyOf(c) ?? '') ?? uid('col'));
  }
  for (const r of next.relationships) rel.set(r.id, curRel.get(keyOf(r) ?? '')?.id ?? uid('m'));
  const entOwner = new Map(next.entities.map((e) => [e.id, e]));
  const colId = (entId: string, id: string) => col.get(`${entId}|${id}`) ?? id;
  return {
    entities: next.entities.map((e) => ({
      ...clone(e),
      id: ent.get(e.id)!,
      columns: e.columns.map((c) => ({
        ...clone(c),
        id: colId(e.id, c.id),
        ...(c.fk
          ? {
              fk: {
                relationshipId: rel.get(c.fk.relationshipId) ?? c.fk.relationshipId,
                refEntityId: ent.get(c.fk.refEntityId) ?? c.fk.refEntityId,
                refColumnId: entOwner.has(c.fk.refEntityId)
                  ? colId(c.fk.refEntityId, c.fk.refColumnId)
                  : c.fk.refColumnId,
              },
            }
          : {}),
      })),
    })),
    relationships: next.relationships.map((r) => ({
      ...clone(r),
      id: rel.get(r.id)!,
      parent: { ...r.parent, entityId: ent.get(r.parent.entityId) ?? r.parent.entityId },
      child: { ...r.child, entityId: ent.get(r.child.entityId) ?? r.child.entityId },
      fkColumns: r.fkColumns.map((f) => ({
        childColumnId: colId(r.child.entityId, f.childColumnId),
        parentColumnId: colId(r.parent.entityId, f.parentColumnId),
      })),
    })),
  };
}

export interface SyncDiff {
  items: ErdDiffItem[];
  /** Kết quả parse đã gán id thật (dùng cho planSync). */
  next: ErdState;
}

/** Phần tử sinh từ class / association nằm trong phạm vi parse (hoặc nguồn đã bị xoá) → được đề xuất xoá. */
function scopeOf(result: OrmResult) {
  const s = result.scope;
  if (!s) return () => true;
  const cls = new Set(s.classIds);
  const assoc = new Set(s.associationIds);
  const knownCls = new Set(s.knownClassIds);
  const knownAssoc = new Set(s.knownAssociationIds);
  return (mf: MappedFrom | undefined) => {
    if (!mf) return true;
    if (mf.associationId) return !knownAssoc.has(mf.associationId) || assoc.has(mf.associationId);
    if (mf.classId) return !knownCls.has(mf.classId) || cls.has(mf.classId);
    return true;
  };
}

export function diffErd(cur: ErdState, result: OrmResult): SyncDiff {
  const next = remap(cur, result);
  const inScope = scopeOf(result);
  const items: ErdDiffItem[] = [];
  const curById = new Map(cur.entities.map((e) => [e.id, e]));
  const nextById = new Map(next.entities.map((e) => [e.id, e]));
  const nameOf = (id: string) => nextById.get(id)?.name ?? curById.get(id)?.name ?? '?';
  const nextKeys = new Set(next.entities.map(keyOf));
  for (const e of next.entities) {
    const old = curById.get(e.id);
    const k = keyOf(e)!;
    if (!old) {
      items.push({
        key: `t+:${k}`,
        op: 'add',
        level: 'table',
        table: e.name,
        label: `Bảng ${e.name}`,
        detail: `${e.columns.filter((c) => !isFkCol(c)).length} cột`,
        defaultOn: true,
      });
      continue;
    }
    if (old.name !== e.name)
      items.push({
        key: `tn:${k}`,
        op: 'change',
        level: 'table',
        table: e.name,
        label: `Đổi tên bảng`,
        detail: `${old.name} → ${e.name}`,
        manual: !!old.manuallyEdited,
        defaultOn: !old.manuallyEdited,
      });
    const oldCols = new Map(old.columns.filter(keyOf).map((c) => [keyOf(c)!, c]));
    const newKeys = new Set(e.columns.map(keyOf));
    for (const c of e.columns) {
      if (isFkCol(c)) continue;
      const ck = keyOf(c)!;
      const oc = oldCols.get(ck);
      if (!oc)
        items.push({
          key: `c+:${k}:${ck}`,
          op: 'add',
          level: 'column',
          table: e.name,
          label: `Cột ${c.name}`,
          detail: colDesc(c),
          defaultOn: true,
        });
      else if (!jsonEqual(colSig(oc), colSig(c)))
        items.push({
          key: `c~:${k}:${ck}`,
          op: 'change',
          level: 'column',
          table: e.name,
          label: `Cột ${c.name}`,
          detail: `${colDesc(oc)} → ${colDesc(c)}`,
          manual: !!oc.manuallyEdited,
          defaultOn: !oc.manuallyEdited,
        });
    }
    for (const [ck, oc] of oldCols)
      if (!newKeys.has(ck) && !isFkCol(oc) && inScope(oc.mappedFrom))
        items.push({
          key: `c-:${k}:${ck}`,
          op: 'remove',
          level: 'column',
          table: old.name,
          label: `Cột ${oc.name}`,
          detail: colDesc(oc),
          defaultOn: false,
        });
  }
  for (const e of cur.entities)
    if (keyOf(e) && !nextKeys.has(keyOf(e)) && inScope(e.mappedFrom))
      items.push({
        key: `t-:${keyOf(e)}`,
        op: 'remove',
        level: 'table',
        table: e.name,
        label: `Bảng ${e.name}`,
        defaultOn: false,
      });

  const curRel = new Map(cur.relationships.map((r) => [r.id, r]));
  const nextRelKeys = new Set(next.relationships.map(keyOf));
  const fkDesc = (r: ErdRelationship, ents: Map<string, ErdEntity>) => {
    const child = ents.get(r.child.entityId);
    const cols = (child?.columns ?? []).filter((c) => c.fk?.relationshipId === r.id).map((c) => c.name);
    return `${nameOf(r.child.entityId)}(${cols.join(', ')}) → ${nameOf(r.parent.entityId)} · ${CARD[r.parent.cardinality]}:${CARD[r.child.cardinality]}${r.onDelete !== 'NO ACTION' ? ' · ON DELETE ' + r.onDelete : ''}`;
  };
  for (const r of next.relationships) {
    const old = curRel.get(r.id);
    const k = keyOf(r)!;
    const table = nameOf(r.child.entityId);
    if (!old)
      items.push({
        key: `r+:${k}`,
        op: 'add',
        level: 'fk',
        table,
        label: 'Khoá ngoại',
        detail: fkDesc(r, nextById),
        defaultOn: true,
      });
    else {
      const oldCols = (curById.get(old.child.entityId)?.columns ?? []).filter((c) => c.fk?.relationshipId === old.id);
      const newCols = (nextById.get(r.child.entityId)?.columns ?? []).filter((c) => c.fk?.relationshipId === r.id);
      const colsChanged = !jsonEqual(oldCols.map(colSig), newCols.map(colSig));
      if (!jsonEqual(relSig(old), relSig(r)) || colsChanged) {
        const manual = oldCols.some((c) => c.manuallyEdited);
        items.push({
          key: `r~:${k}`,
          op: 'change',
          level: 'fk',
          table,
          label: 'Khoá ngoại',
          detail: `${fkDesc(old, curById)} → ${fkDesc(r, nextById)}`,
          manual,
          defaultOn: !manual,
        });
      }
    }
  }
  for (const r of cur.relationships)
    if (keyOf(r) && !nextRelKeys.has(keyOf(r)) && inScope(r.mappedFrom))
      items.push({
        key: `r-:${keyOf(r)}`,
        op: 'remove',
        level: 'fk',
        table: nameOf(r.child.entityId),
        label: 'Khoá ngoại',
        detail: fkDesc(r, curById),
        defaultOn: false,
      });
  return { items, next };
}

/** Kế hoạch ghi theo các mục được tick. Bảng cũ giữ cột/index/chú thích người dùng thêm. */
export function planSync(cur: ErdState, diff: SyncDiff, selected: Set<string>): SyncPlan {
  const { next } = diff;
  const on = (k: string) => selected.has(k);
  const curById = new Map(cur.entities.map((e) => [e.id, e]));
  const curRelById = new Map(cur.relationships.map((r) => [r.id, r]));
  const relKey = new Map(next.relationships.map((r) => [r.id, keyOf(r)!]));
  /** Quan hệ sẽ tồn tại sau khi áp dụng. */
  const relLive = (id: string) => {
    if (curRelById.has(id)) return !on(`r-:${keyOf(curRelById.get(id)!)}`);
    const k = relKey.get(id);
    return !!k && on(`r+:${k}`);
  };
  const plan: SyncPlan = {
    upsertEntities: [],
    newEntityIds: [],
    deleteEntityIds: [],
    upsertRelationships: [],
    newRelationshipIds: [],
    deleteRelationshipIds: [],
  };
  const deleted = new Set<string>();
  for (const e of cur.entities) if (keyOf(e) && on(`t-:${keyOf(e)}`)) deleted.add(e.id);
  const entityLive = (id: string) =>
    !deleted.has(id) && (curById.has(id) || on(`t+:${keyOf(next.entities.find((x) => x.id === id) ?? {})}`));

  for (const e of next.entities) {
    const k = keyOf(e)!;
    const old = curById.get(e.id);
    const fkOk = (c: ErdColumn) => !c.fk || (relLive(c.fk.relationshipId) && entityLive(c.fk.refEntityId));
    if (!old) {
      if (!on(`t+:${k}`)) continue;
      plan.upsertEntities.push({ ...e, columns: e.columns.filter(fkOk) });
      plan.newEntityIds.push(e.id);
      continue;
    }
    if (deleted.has(old.id)) continue;
    const nextCols = new Map(e.columns.map((c) => [keyOf(c)!, c]));
    const oldKeys = new Set(old.columns.map(keyOf).filter(Boolean));
    const columns: ErdColumn[] = [];
    for (const c of old.columns) {
      const ck = keyOf(c);
      if (!ck) {
        columns.push(c);
        continue;
      }
      const nc = nextCols.get(ck);
      if (isFkCol(c)) {
        const rk = keyOf(curRelById.get(c.fk!.relationshipId) ?? {});
        if (rk && on(`r-:${rk}`)) continue;
        if (nc && rk && on(`r~:${rk}`)) columns.push({ ...c, ...stripId(nc), id: c.id, manuallyEdited: false });
        else columns.push(c);
        continue;
      }
      if (!nc) {
        if (!on(`c-:${k}:${ck}`)) columns.push(c);
        continue;
      }
      if (on(`c~:${k}:${ck}`)) {
        const patch = Object.fromEntries(COL_FIELDS.map((f) => [f, nc[f]]));
        const merged = { ...c, ...patch, manuallyEdited: false } as ErdColumn;
        for (const f of COL_FIELDS) if (merged[f] === undefined) delete merged[f];
        columns.push(merged);
      } else columns.push(c);
    }
    for (const c of e.columns) {
      const ck = keyOf(c)!;
      if (oldKeys.has(ck)) continue;
      const take = isFkCol(c)
        ? on(`r+:${relKeyOfCol(c, diff)}`) || on(`r~:${relKeyOfCol(c, diff)}`)
        : on(`c+:${k}:${ck}`);
      if (!take || !fkOk(c)) continue;
      // cột PK mới lên nhóm PK đầu bảng
      if (c.pk) columns.splice(columns.filter((x) => x.pk).length, 0, c);
      else columns.push(c);
    }
    const renamed = on(`tn:${k}`) ? e.name : old.name;
    const updated: ErdEntity = { ...old, name: renamed, columns, ...(on(`tn:${k}`) ? { manuallyEdited: false } : {}) };
    if (!jsonEqual(updated, old)) plan.upsertEntities.push(updated);
  }
  plan.deleteEntityIds = [...deleted];
  for (const r of next.relationships) {
    const k = keyOf(r)!;
    const old = curRelById.get(r.id);
    if (!entityLive(r.parent.entityId) || !entityLive(r.child.entityId)) continue;
    if (!old && on(`r+:${k}`)) {
      plan.upsertRelationships.push(r);
      plan.newRelationshipIds.push(r.id);
    } else if (old && on(`r~:${k}`)) plan.upsertRelationships.push({ ...old, ...r, name: old.name || r.name });
  }
  for (const r of cur.relationships) {
    const gone = (keyOf(r) && on(`r-:${keyOf(r)}`)) || deleted.has(r.parent.entityId) || deleted.has(r.child.entityId);
    if (gone) plan.deleteRelationshipIds.push(r.id);
  }
  // bảng con của quan hệ bị xoá mà chưa nằm trong upsert: bỏ cột FK của quan hệ đó
  for (const id of plan.deleteRelationshipIds) {
    const r = curRelById.get(id)!;
    if (deleted.has(r.child.entityId)) continue;
    const inPlan = plan.upsertEntities.find((e) => e.id === r.child.entityId);
    const base = inPlan ?? curById.get(r.child.entityId);
    if (!base) continue;
    const cols = base.columns.filter((c) => c.fk?.relationshipId !== id);
    if (cols.length === base.columns.length) continue;
    if (inPlan) inPlan.columns = cols;
    else plan.upsertEntities.push({ ...base, columns: cols });
  }
  return plan;
}

function stripId(c: ErdColumn): Omit<ErdColumn, 'id'> {
  const { id: _id, ...rest } = c;
  void _id;
  return rest;
}

function relKeyOfCol(c: ErdColumn, diff: SyncDiff): string {
  return keyOf(diff.next.relationships.find((r) => r.id === c.fk?.relationshipId) ?? {}) ?? '';
}

/** Các mục tick sẵn. */
export const defaultSelection = (items: ErdDiffItem[]) => new Set(items.filter((i) => i.defaultOn).map((i) => i.key));
