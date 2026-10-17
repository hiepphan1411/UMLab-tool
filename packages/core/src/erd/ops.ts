// Thao tác thuần trên ERD (docs/spec/notation-erd.md mục 2–3): sinh cột FK khi nối quan hệ, cập nhật FK khi
// PK cha đổi, bảng trung gian cho N-N, kiểm tra.
import { uid } from '../util/ids';
import { isKeyword, quoteIdent } from './dialect';
import { sameType } from './ddl';
import {
  newColumn,
  type ChildCardinality,
  type Dialect,
  type ErdColumn,
  type ErdEntity,
  type ErdRelationship,
  type ErdSchema,
  type ParentCardinality,
  type RelationshipData,
} from './model';

/** Tên cột FK mặc định: `<bang_cha>_<pk>` (`xe` + `id` → `xe_id`); pk đã có tiền tố tên bảng thì giữ. */
export function fkColumnName(parentName: string, pkName: string, role?: string): string {
  if (role) return `${role}_${pkName}`;
  const p = parentName.toLowerCase();
  return pkName.toLowerCase().startsWith(p + '_') ? pkName : `${parentName}_${pkName}`;
}

const uniqueIn = (names: Set<string>, base: string) => {
  let n = base;
  let i = 2;
  while (names.has(n.toLowerCase())) n = `${base}${i++}`;
  return n;
};

/** Mặc định của từng loại quan hệ (spec mục 2). */
export function relDefaults(kind: RelationshipData['kind']): {
  parent: ParentCardinality;
  child: ChildCardinality;
} {
  if (kind === 'rel11') return { parent: 'one', child: 'zeroOrOne' };
  if (kind === 'relnn') return { parent: 'zeroOrOne', child: 'zeroOrMany' };
  return { parent: 'one', child: 'zeroOrMany' };
}

export interface FkResult {
  columns: ErdColumn[];
  fkColumns: { childColumnId: string; parentColumnId: string }[];
  /** Bảng cha chưa có khoá chính. */
  noPk: boolean;
}

/**
 * Thêm cột FK vào bảng con cho quan hệ `rel` (One-to-Many: `<cha>_id`, kiểu = kiểu PK cha; One-to-One: thêm UNIQUE;
 * identifying: FK nằm trong PK con). Cột trùng tên đã trỏ đúng cột cha thì dùng lại.
 */
export function addFkColumns(
  parent: Pick<ErdEntity, 'id' | 'name' | 'columns'>,
  child: Pick<ErdEntity, 'columns'>,
  rel: Pick<ErdRelationship, 'id' | 'kind' | 'identifying'> & { parent?: { cardinality: ParentCardinality } },
  o: { role?: string; nullable?: boolean } = {},
): FkResult {
  const pks = parent.columns.filter((c) => c.pk);
  if (!pks.length) return { columns: child.columns, fkColumns: [], noPk: true };
  const columns = [...child.columns];
  const names = new Set(columns.map((c) => c.name.toLowerCase()));
  const fkColumns: FkResult['fkColumns'] = [];
  const nullable = o.nullable ?? (!rel.identifying && rel.parent?.cardinality === 'zeroOrOne');
  for (const pk of pks) {
    const want = fkColumnName(parent.name, pk.name, o.role);
    const existing = columns.find(
      (c) => c.name.toLowerCase() === want.toLowerCase() && (!c.fk || c.fk.refEntityId === parent.id),
    );
    const fk = { relationshipId: rel.id, refEntityId: parent.id, refColumnId: pk.id };
    if (existing) {
      const i = columns.indexOf(existing);
      columns[i] = { ...existing, fk, ...(rel.identifying ? { pk: true, nullable: false } : {}) };
      fkColumns.push({ childColumnId: existing.id, parentColumnId: pk.id });
      continue;
    }
    const name = uniqueIn(names, want);
    names.add(name.toLowerCase());
    const col = newColumn(name, pk.type, {
      ...(pk.length !== undefined ? { length: pk.length } : {}),
      ...(pk.precision !== undefined ? { precision: pk.precision } : {}),
      ...(pk.scale !== undefined ? { scale: pk.scale } : {}),
      ...(pk.enumValues ? { enumValues: pk.enumValues } : {}),
      pk: rel.identifying,
      nullable: rel.identifying ? false : nullable,
      unique: rel.kind === 'rel11' && pks.length === 1 && !rel.identifying,
      fk,
    });
    // SERIAL cha → INTEGER ở con
    if (/^(BIG)?SERIAL$/i.test(col.type)) col.type = /^BIG/i.test(col.type) ? 'BIGINT' : 'INTEGER';
    // cột FK identifying xếp cùng nhóm khoá chính (đầu bảng)
    if (rel.identifying) {
      const lastPk = columns.reduce((k, c, i) => (c.pk ? i : k), -1);
      columns.splice(lastPk + 1, 0, col);
    } else columns.push(col);
    fkColumns.push({ childColumnId: col.id, parentColumnId: pk.id });
  }
  return { columns, fkColumns, noPk: false };
}

/** Bỏ cột FK của một quan hệ (xoá hẳn, hoặc giữ lại làm cột thường). */
export function removeFkColumns(columns: ErdColumn[], relationshipId: string, keep: boolean): ErdColumn[] {
  if (keep)
    return columns.map((c) => {
      if (c.fk?.relationshipId !== relationshipId) return c;
      const { fk: _fk, ...rest } = c;
      void _fk;
      return rest;
    });
  return columns.filter((c) => c.fk?.relationshipId !== relationshipId);
}

/**
 * Bảng cha đổi cột PK (tên/kiểu) → cập nhật cột FK của bảng con trỏ tới nó. Trả về cột mới của con,
 * hoặc null nếu không có gì đổi. Tên FK đổi theo khi đang là tên mặc định (`<cha>_<pk cũ>` hoặc trùng tên pk cũ).
 */
export function propagatePk(
  oldParent: Pick<ErdEntity, 'id' | 'name' | 'columns'>,
  newParent: Pick<ErdEntity, 'id' | 'name' | 'columns'>,
  child: Pick<ErdEntity, 'id' | 'columns'>,
): ErdColumn[] | null {
  let changed = false;
  const columns = child.columns.map((c) => {
    if (c.fk?.refEntityId !== newParent.id) return c;
    const before = oldParent.columns.find((x) => x.id === c.fk!.refColumnId);
    const after = newParent.columns.find((x) => x.id === c.fk!.refColumnId);
    if (!after) return c;
    const next: ErdColumn = { ...c };
    for (const k of ['type', 'length', 'precision', 'scale', 'enumValues'] as const) {
      if (JSON.stringify(c[k]) !== JSON.stringify(after[k])) {
        if (after[k] === undefined) delete next[k];
        else (next as unknown as Record<string, unknown>)[k] = after[k];
      }
    }
    if (/^(BIG)?SERIAL$/i.test(next.type)) next.type = /^BIG/i.test(next.type) ? 'BIGINT' : 'INTEGER';
    if (before && before.name !== after.name) {
      const lc = c.name.toLowerCase();
      if (lc === fkColumnName(oldParent.name, before.name).toLowerCase())
        next.name = fkColumnName(newParent.name, after.name);
      else if (lc === before.name.toLowerCase()) next.name = after.name;
      else if (lc.endsWith('_' + before.name.toLowerCase()))
        next.name = c.name.slice(0, c.name.length - before.name.length) + after.name;
    }
    if (JSON.stringify(next) !== JSON.stringify(c)) changed = true;
    return next;
  });
  return changed ? columns : null;
}

/** Bảng trung gian `a_b` (PK ghép 2 FK) + 2 quan hệ 1-N identifying cho quan hệ N-N giữa a và b. */
export function buildJunction(
  a: Pick<ErdEntity, 'id' | 'name' | 'columns'>,
  b: Pick<ErdEntity, 'id' | 'name' | 'columns'>,
  name = `${a.name}_${b.name}`,
): { entity: ErdEntity; relationships: ErdRelationship[] } {
  const entity: ErdEntity = {
    id: uid('m'),
    name,
    logicalName: '',
    schema: '',
    comment: '',
    columns: [],
    indexes: [],
    uniqueConstraints: [],
    checks: [],
  };
  const relationships: ErdRelationship[] = [];
  for (const p of [a, b]) {
    const rel: ErdRelationship = {
      id: uid('m'),
      name: '',
      kind: 'rel1n',
      identifying: true,
      parent: { entityId: p.id, cardinality: 'one' },
      child: { entityId: entity.id, cardinality: 'zeroOrMany' },
      fkColumns: [],
      onDelete: 'CASCADE',
      onUpdate: 'NO ACTION',
    };
    // tự nối N-N với chính nó: phân biệt 2 cột bằng hậu tố
    const role = a.id === b.id ? `${p.name}${relationships.length + 1}` : undefined;
    const r = addFkColumns(p, entity, rel, { role });
    entity.columns = r.columns;
    rel.fkColumns = r.fkColumns;
    relationships.push(rel);
  }
  return { entity, relationships };
}

// ---------------- kiểm tra (spec mục 3) ----------------

export interface ErdIssue {
  level: 'error' | 'warning' | 'info';
  code: 'no-pk' | 'fk-target' | 'fk-type' | 'dup-table' | 'dup-column' | 'keyword' | 'nn' | 'fk-missing';
  message: string;
  /** id bảng / quan hệ liên quan. */
  targetId: string;
  columnId?: string;
}

export function validateErd(s: ErdSchema, dialect: Dialect): ErdIssue[] {
  const out: ErdIssue[] = [];
  const byId = new Map(s.entities.map((e) => [e.id, e]));
  const tables = new Map<string, string>();
  for (const e of s.entities) {
    const key = (e.schema ? e.schema + '.' : '') + e.name.trim().toLowerCase();
    if (tables.has(key) && tables.get(key) !== e.id)
      out.push({ level: 'error', code: 'dup-table', message: `Trùng tên bảng “${e.name}”`, targetId: e.id });
    else tables.set(key, e.id);
    if (!e.columns.some((c) => c.pk))
      out.push({ level: 'warning', code: 'no-pk', message: `Bảng “${e.name}” chưa có khoá chính`, targetId: e.id });
    if (isKeyword(e.name, dialect))
      out.push({
        level: 'warning',
        code: 'keyword',
        message: `Tên bảng “${e.name}” là từ khoá SQL — sẽ đặt trong ${quoteIdent(e.name, dialect, true)} hoặc nên đổi tên`,
        targetId: e.id,
      });
    const cols = new Set<string>();
    for (const c of e.columns) {
      const lc = c.name.trim().toLowerCase();
      if (cols.has(lc))
        out.push({
          level: 'error',
          code: 'dup-column',
          message: `Bảng “${e.name}” trùng tên cột “${c.name}”`,
          targetId: e.id,
          columnId: c.id,
        });
      cols.add(lc);
      if (isKeyword(c.name, dialect))
        out.push({
          level: 'warning',
          code: 'keyword',
          message: `Cột “${e.name}.${c.name}” là từ khoá SQL — sẽ đặt trong ${quoteIdent(c.name, dialect, true)} hoặc nên đổi tên`,
          targetId: e.id,
          columnId: c.id,
        });
      if (!c.fk) continue;
      const ref = byId.get(c.fk.refEntityId);
      const rc = ref?.columns.find((x) => x.id === c.fk!.refColumnId);
      if (!ref || !rc) {
        out.push({
          level: 'warning',
          code: 'fk-missing',
          message: `Cột “${e.name}.${c.name}” trỏ tới bảng/cột không còn tồn tại`,
          targetId: e.id,
          columnId: c.id,
        });
        continue;
      }
      const uniqueRef =
        rc.pk ||
        rc.unique ||
        ref.uniqueConstraints.some(
          (u) => u.columns.length === 1 && (u.columns[0] === rc.id || u.columns[0] === rc.name),
        );
      // FK ghép trỏ tới PK ghép: hợp lệ khi đủ cột PK
      const composite = ref.columns.filter((x) => x.pk).length > 1 && rc.pk;
      if (!uniqueRef && !composite)
        out.push({
          level: 'error',
          code: 'fk-target',
          message: `FK “${e.name}.${c.name}” trỏ tới “${ref.name}.${rc.name}” không phải PK/UNIQUE`,
          targetId: e.id,
          columnId: c.id,
        });
      if (!sameType(c, rc))
        out.push({
          level: 'error',
          code: 'fk-type',
          message: `Kiểu FK “${e.name}.${c.name}” khác kiểu “${ref.name}.${rc.name}”`,
          targetId: e.id,
          columnId: c.id,
        });
    }
  }
  for (const r of s.relationships)
    if (r.kind === 'relnn')
      out.push({
        level: 'warning',
        code: 'nn',
        message: `Quan hệ N-N “${byId.get(r.parent.entityId)?.name ?? '?'} — ${byId.get(r.child.entityId)?.name ?? '?'}” chưa có bảng trung gian (DDL bỏ qua)`,
        targetId: r.id,
      });
  return out;
}
