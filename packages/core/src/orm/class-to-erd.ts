// Parse ORM: Class Diagram → ERD (docs/spec/orm-mapping.md mục 2). Hàm thuần. Id của kết quả suy ra từ id
// class / thuộc tính / association (`mappedFrom.key`) để parse lại không nhân bản (xem orm/sync.ts).
import { parseTypeText, sqlString, umlTypeToSql, type SqlType } from '../erd/dialect';
import { addFkColumns } from '../erd/ops';
import type {
  ChildCardinality,
  Dialect,
  ErdColumn,
  ErdEntity,
  ErdRelationship,
  FkAction,
  ParentCardinality,
} from '../erd/model';
import type { Attribute } from '../uml/parse-member';
import { columnName, tableName, type ColumnNaming, type TableNaming } from './naming';
import type { OrmClass, OrmEnd, OrmInput } from './input';

export type InheritanceStrategy = 'JOINED' | 'SINGLE_TABLE' | 'TABLE_PER_CLASS';

export interface OrmOptions {
  dialect: Dialect;
  tableNaming: TableNaming;
  columnNaming: ColumnNaming;
  inheritance: InheritanceStrategy;
  /** Kiểu khoá tự sinh khi class không có PK: BIGINT tự tăng / UUID. */
  keyType: 'identity' | 'uuid';
  /** Class được chọn (mặc định: defaultOrmSelection). */
  classIds?: string[];
  /** Bảng kiểu tuỳ chỉnh của project: kiểu UML → kiểu SQL. */
  typeMap?: Record<string, string>;
}

export const DEFAULT_ORM_OPTIONS: OrmOptions = {
  dialect: 'postgresql',
  tableNaming: 'snake',
  columnNaming: 'snake',
  inheritance: 'JOINED',
  keyType: 'identity',
};

export interface OrmReport {
  warnings: string[];
  tables: number;
  foreignKeys: number;
  junctionTables: number;
}

/** Phạm vi của lần parse: phần ERD sinh từ class / association ngoài phạm vi không bị đề xuất xoá. */
export interface OrmScope {
  /** Class được chọn (đã parse). */
  classIds: string[];
  /** Association có cả hai đầu thuộc class được chọn. */
  associationIds: string[];
  /** Mọi class / association còn trên Class Diagram. */
  knownClassIds: string[];
  knownAssociationIds: string[];
}

export interface OrmResult {
  entities: ErdEntity[];
  relationships: ErdRelationship[];
  report: OrmReport;
  scope?: OrmScope;
}

const NON_ENTITY = /^(dto|enum|enumeration|controller|service|interface|repository|boundary|utility)$/i;
const ENTITY_ST = /^(entity|table|persistent)$/i;

/** Class chọn mặc định: có «entity»/«table»; nếu không có thì mọi class non-abstract không phải dto/controller/… */
export function defaultOrmSelection(input: OrmInput): string[] {
  const cls = input.classes.filter((c) => c.kind === 'class' || c.kind === 'associationClass');
  const tagged = cls.filter((c) => c.stereotypes.some((s) => ENTITY_ST.test(s)));
  if (tagged.length) return tagged.map((c) => c.id);
  return cls.filter((c) => !c.isAbstract && !c.stereotypes.some((s) => NON_ENTITY.test(s))).map((c) => c.id);
}

// ---------------- multiplicity ----------------
const mult = (m: string) => (m.trim() || '1').replace(/\s/g, '');
const upperMany = (m: string) => {
  const x = mult(m);
  if (x === '*' || x === 'n') return true;
  const up = x.includes('..') ? x.split('..')[1] : x;
  return up === '*' || up === 'n' || Number(up) > 1;
};
const lowerZero = (m: string) => {
  const x = mult(m);
  return x === '*' || x.startsWith('0');
};
const COLLECTION = /^(list|set|collection|array|iterable|sortedset|queue|deque|arraylist|hashset)$/i;

/** Kiểu đơn của thuộc tính (bỏ List<…>, […]) + có phải nhiều giá trị. */
function elementType(a: Attribute): { base: string; many: boolean } {
  let t = a.type.trim();
  let many = upperMany(a.multiplicity || '1');
  const g = t.match(/^([\w.]+)\s*<\s*(.+)\s*>$/);
  if (g && COLLECTION.test(g[1])) {
    t = g[2].trim();
    many = true;
  }
  if (t.endsWith('[]') && !/^byte\[\]$/i.test(t)) {
    t = t.slice(0, -2);
    many = true;
  }
  return { base: t, many };
}

const isTransient = (a: Attribute) =>
  a.isStatic ||
  a.isDerived ||
  a.stereotypes.some((s) => /^transient$/i.test(s)) ||
  a.constraints.some((c) => /^transient$/i.test(c));
const isPkAttr = (a: Attribute) =>
  a.constraints.some((c) => /^id$/i.test(c)) || a.stereotypes.some((s) => /^(pk|id)$/i.test(s)) || a.name === 'id';
const isUniqueAttr = (a: Attribute) => a.constraints.some((c) => /^unique$/i.test(c));

/** Giá trị mặc định UML → biểu thức SQL. */
function defaultSql(v: string | null, t: SqlType | null, dialect: Dialect, enumVals?: string[]): string | undefined {
  if (v === null || v === undefined || v.trim() === '') return undefined;
  let s = v.trim();
  if (/^-?\d+(\.\d+)?$/.test(s)) return s;
  if (/^(true|false)$/i.test(s)) {
    const on = /^true$/i.test(s);
    return t?.type === 'BOOLEAN' ? (on ? 'TRUE' : 'FALSE') : on ? '1' : '0';
  }
  if (/^null$/i.test(s)) return 'NULL';
  if (/^(now\(\)|current_timestamp|LocalDateTime\.now\(\)|Instant\.now\(\)|new Date\(\))$/i.test(s))
    return dialect === 'sqlserver' ? 'SYSDATETIME()' : 'CURRENT_TIMESTAMP';
  if (/^(".*"|'.*')$/.test(s)) s = s.slice(1, -1);
  if (enumVals) s = s.replace(/^[\w]+\./, '');
  return sqlString(s);
}

interface Ctx {
  o: OrmOptions;
  byId: Map<string, OrmClass>;
  byName: Map<string, OrmClass>;
  warnings: string[];
}

const keyCol = (key: string) => `col:${key}`;

/** Cột từ một thuộc tính kiểu cơ bản / enum. */
function attrColumn(ctx: Ctx, cls: OrmClass, a: Attribute, name: string, keyBase: string): ErdColumn {
  const { base } = elementType(a);
  const en = ctx.byName.get(base);
  const col: ErdColumn = {
    id: keyCol(keyBase),
    name,
    type: 'VARCHAR',
    pk: isPkAttr(a),
    nullable: lowerZero(a.multiplicity || '1'),
    unique: isUniqueAttr(a),
    autoIncrement: false,
    mappedFrom: { key: keyBase, classId: cls.id, attributeId: a.id },
  };
  if (en?.kind === 'enumeration') {
    col.type = tableName(en.name, 'snake');
    col.enumValues = en.literals.length ? [...en.literals] : ['VALUE'];
    col.default = defaultSql(a.default, null, ctx.o.dialect, col.enumValues);
  } else {
    const st = umlTypeToSql(base, ctx.o.dialect, ctx.o.typeMap);
    if (st) Object.assign(col, st);
    else {
      Object.assign(col, parseTypeText(base || 'VARCHAR'));
      col.type = base || 'VARCHAR';
      ctx.warnings.push(`Kiểu lạ “${base}” (${cls.name}.${a.name}) — giữ nguyên, hãy sửa trong ERD hoặc bảng kiểu`);
    }
    col.default = defaultSql(a.default, st, ctx.o.dialect);
  }
  if (col.default === undefined) delete col.default;
  if (col.pk) col.nullable = false;
  return col;
}

function keyColumn(o: OrmOptions, classId: string): ErdColumn {
  const st = o.keyType === 'uuid' ? umlTypeToSql('UUID', o.dialect)! : ({ type: 'BIGINT' } satisfies SqlType);
  return {
    id: keyCol(`pk:${classId}`),
    name: 'id',
    ...st,
    pk: true,
    nullable: false,
    unique: false,
    autoIncrement: true,
    mappedFrom: { key: `pk:${classId}`, classId },
  };
}

export function classToErd(input: OrmInput, options: Partial<OrmOptions> = {}): OrmResult {
  const o: OrmOptions = { ...DEFAULT_ORM_OPTIONS, ...options };
  const ctx: Ctx = {
    o,
    byId: new Map(input.classes.map((c) => [c.id, c])),
    byName: new Map(input.classes.map((c) => [c.name, c])),
    warnings: [],
  };
  const selected = new Set((o.classIds ?? defaultOrmSelection(input)).filter((id) => ctx.byId.has(id)));
  const isEmbeddable = (c: OrmClass | undefined) =>
    !!c && (c.kind === 'datatype' || c.stereotypes.some((s) => /^embeddable$/i.test(s)));
  // class đã chọn nhưng là embeddable / enum thì không thành bảng
  for (const id of [...selected]) {
    const c = ctx.byId.get(id)!;
    if (isEmbeddable(c) || (c.kind !== 'class' && c.kind !== 'associationClass')) selected.delete(id);
  }
  // association class gắn với association: thành bảng trung gian, không thành bảng riêng
  const assocClassOf = new Map<string, OrmClass>();
  for (const c of input.classes)
    if (c.kind === 'associationClass' && c.associationId && input.associations.some((a) => a.id === c.associationId)) {
      assocClassOf.set(c.associationId, c);
      selected.delete(c.id);
    }

  // ---- kế thừa ----
  const parentOf = new Map<string, string>();
  for (const g of input.generalizations)
    if (selected.has(g.childId) && selected.has(g.parentId) && !parentOf.has(g.childId))
      parentOf.set(g.childId, g.parentId);
  const rootOf = (id: string) => {
    let cur = id;
    for (let i = 0; i < 32 && parentOf.has(cur); i++) cur = parentOf.get(cur)!;
    return cur;
  };
  const ancestors = (id: string) => {
    const out: string[] = [];
    let cur = parentOf.get(id);
    for (let i = 0; cur && i < 32; i++, cur = parentOf.get(cur)) out.push(cur);
    return out;
  };
  const strategy = o.inheritance;
  /** class → id bảng chứa nó (null nếu không có bảng: abstract trong TABLE_PER_CLASS). */
  const tableOfClass = new Map<string, string | null>();
  for (const id of selected) {
    const c = ctx.byId.get(id)!;
    if (strategy === 'SINGLE_TABLE') tableOfClass.set(id, `ent:${rootOf(id)}`);
    else if (strategy === 'TABLE_PER_CLASS' && c.isAbstract && [...parentOf.values()].includes(id))
      tableOfClass.set(id, null);
    else tableOfClass.set(id, `ent:${id}`);
  }

  const entities = new Map<string, ErdEntity>();
  const relationships: ErdRelationship[] = [];
  const newEntity = (id: string, name: string, key: string, extra: Partial<ErdEntity> = {}): ErdEntity => {
    const e: ErdEntity = {
      id,
      name,
      logicalName: '',
      schema: '',
      comment: '',
      columns: [],
      indexes: [],
      uniqueConstraints: [],
      checks: [],
      mappedFrom: { key, ...extra.mappedFrom },
      ...extra,
    };
    entities.set(id, e);
    return e;
  };
  const tn = (s: string) => tableName(s, o.tableNaming);
  const cn = (s: string) => columnName(s, o.columnNaming);

  /** Thêm cột từ thuộc tính của `cls` vào bảng `e` (embeddable → gộp có tiền tố; [*] → bảng phụ). */
  const addAttrs = (
    e: ErdEntity,
    cls: OrmClass,
    opt: { forceNullable?: boolean; prefix?: string; noPk?: boolean } = {},
  ) => {
    for (const a of cls.attributes) {
      if (isTransient(a) || !a.name) continue;
      const { base, many } = elementType(a);
      const target = ctx.byName.get(base);
      const pre = opt.prefix ?? '';
      if (target && isEmbeddable(target)) {
        if (many) {
          ctx.warnings.push(`${cls.name}.${a.name}: tập hợp kiểu embeddable chưa hỗ trợ — bỏ qua`);
          continue;
        }
        addAttrs(e, target, {
          forceNullable: opt.forceNullable || lowerZero(a.multiplicity || '1'),
          prefix: `${pre}${a.name}_`,
          noPk: true,
        });
        continue;
      }
      if (target && selected.has(target.id)) {
        // thuộc tính kiểu entity → khoá ngoại (giống association N-1)
        if (!many) refs.push({ from: e, cls, attr: a, target: target.id });
        else ctx.warnings.push(`${cls.name}.${a.name}: tập hợp entity nên vẽ thành association — bỏ qua`);
        continue;
      }
      if (target && target.kind === 'class' && !selected.has(target.id)) {
        ctx.warnings.push(`${cls.name}.${a.name}: kiểu “${target.name}” không được chọn — bỏ qua cột`);
        continue;
      }
      if (many) {
        sideTables.push({ owner: e, cls, attr: a });
        continue;
      }
      const key = `attr:${a.id}${pre ? ':' + pre : ''}`;
      const col = attrColumn(ctx, cls, a, cn(pre + a.name), key);
      if (opt.noPk || opt.forceNullable) col.pk = false;
      if (opt.forceNullable) col.nullable = true;
      if (col.pk && opt.noPk === undefined && e.columns.some((x) => x.pk && x.mappedFrom?.key.startsWith('inherit:'))) {
        // JOINED: bảng con đã có PK kế thừa → id riêng thành cột UNIQUE
        col.pk = false;
        col.unique = true;
      }
      if (e.columns.some((x) => x.name.toLowerCase() === col.name.toLowerCase())) {
        ctx.warnings.push(`${cls.name}: trùng tên cột “${col.name}” — bỏ cột sau`);
        continue;
      }
      e.columns.push(col);
    }
  };
  const refs: { from: ErdEntity; cls: OrmClass; attr: Attribute; target: string }[] = [];
  const sideTables: { owner: ErdEntity; cls: OrmClass; attr: Attribute }[] = [];

  // ---- bảng theo class (cha trước con để JOINED lấy được PK cha) ----
  const depth = (id: string) => ancestors(id).length;
  const order = [...selected].sort((a, b) => depth(a) - depth(b));
  for (const id of order) {
    const cls = ctx.byId.get(id)!;
    const tid = tableOfClass.get(id);
    if (!tid) continue;
    if (strategy === 'SINGLE_TABLE' && tid !== `ent:${id}`) continue; // gộp vào bảng gốc ở dưới
    const e = newEntity(tid, tn(cls.name), `class:${id}`, {
      mappedFrom: { key: `class:${id}`, classId: id, strategy: parentOf.has(id) ? strategy : undefined },
    });
    if (!e.mappedFrom!.strategy) delete e.mappedFrom!.strategy;
    if (strategy === 'JOINED' && parentOf.has(id)) {
      const parent = entities.get(`ent:${parentOf.get(id)!}`)!;
      const relId = `rel:gen:${id}`;
      for (const pk of parent.columns.filter((c) => c.pk))
        e.columns.push({
          ...pk,
          id: keyCol(`inherit:${id}:${pk.mappedFrom?.key ?? pk.id}`),
          autoIncrement: false,
          unique: false,
          default: undefined,
          fk: { relationshipId: relId, refEntityId: parent.id, refColumnId: pk.id },
          mappedFrom: { key: `inherit:${id}:${pk.mappedFrom?.key ?? pk.id}`, classId: id },
        });
      for (const c of e.columns) if (c.default === undefined) delete c.default;
      relationships.push({
        id: relId,
        name: '',
        kind: 'rel11',
        identifying: true,
        parent: { entityId: parent.id, cardinality: 'one' },
        child: { entityId: e.id, cardinality: 'zeroOrOne' },
        fkColumns: e.columns
          .filter((c) => c.fk?.relationshipId === relId)
          .map((c) => ({
            childColumnId: c.id,
            parentColumnId: c.fk!.refColumnId,
          })),
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
        mappedFrom: { key: `gen:${id}`, classId: id },
      });
    }
    if (strategy === 'TABLE_PER_CLASS') for (const anc of ancestors(id).reverse()) addAttrs(e, ctx.byId.get(anc)!);
    addAttrs(e, cls);
    if (strategy === 'SINGLE_TABLE') {
      const subs = [...selected].filter((x) => x !== id && rootOf(x) === id).sort((a, b) => depth(a) - depth(b));
      for (const s of subs) addAttrs(e, ctx.byId.get(s)!, { forceNullable: true });
      if (subs.length)
        e.columns.push({
          id: keyCol(`dtype:${id}`),
          name: 'dtype',
          type: 'VARCHAR',
          length: 31,
          pk: false,
          nullable: false,
          unique: false,
          autoIncrement: false,
          mappedFrom: { key: `dtype:${id}`, classId: id },
        });
    }
    if (!e.columns.some((c) => c.pk)) e.columns.unshift(keyColumn(o, id));
    // PK lên đầu
    e.columns.sort((a, b) => Number(b.pk) - Number(a.pk));
  }

  const entOf = (classId: string | null): ErdEntity | null => {
    if (!classId) return null;
    const tid = tableOfClass.get(classId);
    return tid ? (entities.get(tid) ?? null) : null;
  };

  // ---- bảng phụ cho thuộc tính [*] ----
  for (const { owner, cls, attr } of sideTables) {
    const id = `ent:attr:${attr.id}`;
    const e = newEntity(id, `${owner.name}_${cn(attr.name)}`, `attr:${cls.id}:${attr.id}`, {
      mappedFrom: { key: `attr:${cls.id}:${attr.id}`, classId: cls.id, attributeId: attr.id },
    });
    const relId = `rel:attr:${attr.id}`;
    const r = addFkColumns(owner, e, { id: relId, kind: 'rel1n', identifying: true });
    e.columns = r.columns.map((c) => ({
      ...c,
      id: keyCol(`fk:${relId}:${c.fk!.refColumnId}`),
      mappedFrom: { key: `fk:${relId}:${c.fk!.refColumnId}` },
    }));
    const value = attrColumn(
      ctx,
      cls,
      { ...attr, multiplicity: '1', constraints: [] },
      'value',
      `attr:${attr.id}:value`,
    );
    value.pk = true;
    value.nullable = false;
    e.columns.push(value);
    relationships.push({
      id: relId,
      name: '',
      kind: 'rel1n',
      identifying: true,
      parent: { entityId: owner.id, cardinality: 'one' },
      child: { entityId: e.id, cardinality: 'zeroOrMany' },
      fkColumns: e.columns.filter((c) => c.fk).map((c) => ({ childColumnId: c.id, parentColumnId: c.fk!.refColumnId })),
      onDelete: 'CASCADE',
      onUpdate: 'NO ACTION',
      mappedFrom: { key: `attr:${attr.id}`, classId: cls.id, attributeId: attr.id },
    });
  }

  /** Thêm FK từ `child` tới `parent` (id cột suy ra từ khoá quan hệ). */
  const link = (
    key: string,
    parent: ErdEntity,
    child: ErdEntity,
    o2: {
      kind: 'rel11' | 'rel1n';
      identifying?: boolean;
      role?: string;
      parentCard: ParentCardinality;
      childCard: ChildCardinality;
      nullable: boolean;
      onDelete?: FkAction;
      name?: string;
      mappedFrom: ErdRelationship['mappedFrom'];
    },
  ): ErdRelationship => {
    const relId = `rel:${key}`;
    const rel: ErdRelationship = {
      id: relId,
      name: o2.name ?? '',
      kind: o2.kind,
      identifying: !!o2.identifying,
      parent: { entityId: parent.id, cardinality: o2.parentCard },
      child: { entityId: child.id, cardinality: o2.childCard },
      fkColumns: [],
      onDelete: o2.onDelete ?? 'NO ACTION',
      onUpdate: 'NO ACTION',
      mappedFrom: o2.mappedFrom,
    };
    const before = new Set(child.columns.map((c) => c.id));
    const role = o2.role ? cn(o2.role) : undefined;
    const r = addFkColumns(parent, child, rel, { role, nullable: o2.nullable });
    child.columns = r.columns.map((c) => {
      if (before.has(c.id) || !c.fk) return c;
      const k = `fk:${key}:${c.fk.refColumnId}`;
      return { ...c, id: keyCol(k), mappedFrom: { key: k } };
    });
    // tên mặc định theo quy tắc cột (camelCase: xeId)
    if (o.columnNaming === 'camel') for (const c of child.columns) if (!before.has(c.id) && c.fk) c.name = cn(c.name);
    rel.fkColumns = child.columns
      .filter((c) => c.fk?.relationshipId === relId)
      .map((c) => ({ childColumnId: c.id, parentColumnId: c.fk!.refColumnId }));
    relationships.push(rel);
    return rel;
  };

  // ---- thuộc tính kiểu entity ----
  for (const r of refs) {
    const parent = entOf(r.target);
    if (!parent) continue;
    const zero = lowerZero(r.attr.multiplicity || '1');
    link(`attr:${r.attr.id}`, parent, r.from, {
      kind: 'rel1n',
      role: r.attr.name,
      parentCard: zero ? 'zeroOrOne' : 'one',
      childCard: 'zeroOrMany',
      nullable: zero,
      mappedFrom: { key: `attr:${r.attr.id}`, classId: r.cls.id, attributeId: r.attr.id },
    });
  }

  // ---- association ----
  let junctions = 0;
  for (const as of input.associations) {
    const [a, b] = as.ends;
    const ea = entOf(a.classId);
    const eb = entOf(b.classId);
    const ac = assocClassOf.get(as.id);
    if (!ea || !eb) {
      const known = (x: OrmEnd) => x.classId && selected.has(x.classId);
      if (known(a) || known(b)) {
        const other = [a, b].find((x) => !x.classId || !entOf(x.classId));
        const nm = other?.classId ? ctx.byId.get(other.classId)?.name : '?';
        if (other?.classId && tableOfClass.get(other.classId) === null)
          ctx.warnings.push(`Association tới class abstract “${nm}” (TABLE_PER_CLASS) — bỏ qua`);
      }
      continue;
    }
    const mappedFrom = { key: `assoc:${as.id}`, associationId: as.id };
    const manyA = upperMany(a.multiplicity);
    const manyB = upperMany(b.multiplicity);
    if ((manyA && manyB) || ac) {
      // N-N (hoặc có association class) → bảng trung gian
      const name = ac ? tn(ac.name) : `${ea.name}_${eb.name}`;
      const j = newEntity(`ent:assoc:${as.id}`, name, `assoc:${as.id}`, {
        mappedFrom: { key: `assoc:${as.id}`, associationId: as.id, ...(ac ? { classId: ac.id } : {}) },
      });
      junctions++;
      const self = ea.id === eb.id;
      for (const [end, other, ent, suffix] of [
        [a, b, ea, 'a'],
        [b, a, eb, 'b'],
      ] as const) {
        const role = end.role || (self ? `${ent.name}_${suffix}` : undefined);
        const rel = link(`assoc:${as.id}:${suffix}`, ent, j, {
          kind: 'rel1n',
          identifying: true,
          role,
          parentCard: 'one',
          childCard: lowerZero(other.multiplicity) ? 'zeroOrMany' : 'oneOrMany',
          nullable: false,
          onDelete: 'CASCADE',
          mappedFrom: { key: `assoc:${as.id}:${suffix}`, associationId: as.id },
        });
        void rel;
      }
      if (ac) addAttrs(j, ac, { noPk: true });
      continue;
    }
    // 1–* : FK ở phía *;  1–1 / 1–0..1: FK + UNIQUE ở phía 0..1 / phần (composition) / phía điều hướng
    const za = lowerZero(a.multiplicity);
    const zb = lowerZero(b.multiplicity);
    let [parentEnd, childEnd]: [OrmEnd, OrmEnd] = [a, b];
    if (manyA !== manyB) {
      if (manyA) [parentEnd, childEnd] = [b, a];
    } else if (za !== zb) {
      if (za) [parentEnd, childEnd] = [b, a];
    } else if (a.aggregation !== 'none' || b.aggregation !== 'none') {
      if (b.aggregation !== 'none') [parentEnd, childEnd] = [b, a];
    } else if (b.navigable === 'yes' && a.navigable !== 'yes') {
      // a → b điều hướng được: class phía a giữ tham chiếu → FK nằm ở bảng của a
      [parentEnd, childEnd] = [b, a];
    }
    const parent = entOf(parentEnd.classId)!;
    const child = entOf(childEnd.classId)!;
    const composite = parentEnd.aggregation === 'composite';
    const shared = parentEnd.aggregation === 'shared';
    const one = !upperMany(childEnd.multiplicity);
    const nullable = shared ? true : composite ? false : lowerZero(parentEnd.multiplicity);
    const role = parentEnd.role || (parent.id === child.id ? 'parent' : undefined);
    const rel = link(`assoc:${as.id}`, parent, child, {
      kind: one ? 'rel11' : 'rel1n',
      role,
      parentCard: nullable ? 'zeroOrOne' : 'one',
      childCard: one
        ? lowerZero(childEnd.multiplicity)
          ? 'zeroOrOne'
          : 'one'
        : lowerZero(childEnd.multiplicity)
          ? 'zeroOrMany'
          : 'oneOrMany',
      nullable,
      onDelete: composite ? 'CASCADE' : shared ? 'SET NULL' : 'NO ACTION',
      name: as.name,
      mappedFrom,
    });
    if (one)
      for (const c of child.columns)
        if (c.fk?.relationshipId === rel.id && parent.columns.filter((x) => x.pk).length === 1) c.unique = true;
  }

  const result = [...entities.values()];
  const fkCount = new Set(
    result.flatMap((e) => e.columns.filter((c) => c.fk).map((c) => `${e.id}|${c.fk!.relationshipId}`)),
  ).size;
  const parsed = new Set([...selected, ...[...assocClassOf.values()].map((c) => c.id)]);
  return {
    entities: result,
    relationships,
    scope: {
      classIds: [...parsed],
      associationIds: input.associations
        .filter((a) => a.ends.every((e) => e.classId && parsed.has(e.classId)))
        .map((a) => a.id),
      knownClassIds: input.classes.map((c) => c.id),
      knownAssociationIds: input.associations.map((a) => a.id),
    },
    report: {
      warnings: [...new Set(ctx.warnings)],
      tables: result.length,
      foreignKeys: fkCount,
      junctionTables: junctions,
    },
  };
}
