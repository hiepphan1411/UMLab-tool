// Mô hình ERD vật lý (docs/spec/notation-erd.md mục 1–2). Bảng / quan hệ là ModelElement:
// `erd.entity` (data = EntityData), `erd.relationship` (data = RelationshipData). View / Result set dùng chung
// cấu trúc cột; Stored Procedures, Triggers, Sequence có data riêng.
import { uid } from '../util/ids';
import type { ModelElement } from '../format/types';

export type Dialect = 'postgresql' | 'mysql' | 'sqlserver';
export const DIALECT_IDS: Dialect[] = ['postgresql', 'mysql', 'sqlserver'];
export const isDialect = (v: unknown): v is Dialect => DIALECT_IDS.includes(v as Dialect);

export type ParentCardinality = 'one' | 'zeroOrOne';
export type ChildCardinality = 'one' | 'zeroOrOne' | 'oneOrMany' | 'zeroOrMany';
export type Cardinality = ChildCardinality;
export type FkAction = 'NO ACTION' | 'RESTRICT' | 'CASCADE' | 'SET NULL' | 'SET DEFAULT';
export const FK_ACTIONS: FkAction[] = ['NO ACTION', 'RESTRICT', 'CASCADE', 'SET NULL', 'SET DEFAULT'];

export interface FkRef {
  relationshipId: string;
  refEntityId: string;
  refColumnId: string;
}

/** Nguồn sinh (parse ORM): khoá suy ra từ class / thuộc tính / association — xem orm/class-to-erd.ts. */
export interface MappedFrom {
  key: string;
  classId?: string;
  attributeId?: string;
  associationId?: string;
  strategy?: string;
}

export interface ErdColumn {
  id: string;
  name: string;
  logicalName?: string;
  type: string;
  length?: number;
  precision?: number;
  scale?: number;
  pk: boolean;
  nullable: boolean;
  unique: boolean;
  autoIncrement: boolean;
  default?: string;
  check?: string;
  comment?: string;
  /** Giá trị khi kiểu là enum (PostgreSQL: CREATE TYPE <type>; MySQL: ENUM(...); SQL Server: CHECK IN). */
  enumValues?: string[];
  fk?: FkRef;
  mappedFrom?: MappedFrom;
  manuallyEdited?: boolean;
}

export interface ErdIndex {
  id: string;
  name: string;
  columns: string[];
  unique: boolean;
  method?: 'btree' | 'hash' | 'gin';
}

export interface ErdUnique {
  id: string;
  name: string;
  columns: string[];
}

export interface ErdCheck {
  id: string;
  name: string;
  expr: string;
}

export interface EntityData {
  logicalName: string;
  schema: string;
  comment: string;
  columns: ErdColumn[];
  indexes: ErdIndex[];
  uniqueConstraints: ErdUnique[];
  checks: ErdCheck[];
  mappedFrom?: MappedFrom;
  manuallyEdited?: boolean;
}

export interface RelEnd<C> {
  entityId: string;
  cardinality: C;
}

export interface RelationshipData {
  kind: 'rel11' | 'rel1n' | 'relnn';
  identifying: boolean;
  parent: RelEnd<ParentCardinality>;
  child: RelEnd<ChildCardinality>;
  fkColumns: { childColumnId: string; parentColumnId: string }[];
  onDelete: FkAction;
  onUpdate: FkAction;
  mappedFrom?: MappedFrom;
}

export interface ProcParam {
  name: string;
  type: string;
  mode: 'IN' | 'OUT' | 'INOUT';
}
export interface Procedure {
  id: string;
  name: string;
  params: ProcParam[];
  returns?: string;
  body: string;
}
export interface Trigger {
  id: string;
  name: string;
  timing: 'BEFORE' | 'AFTER' | 'INSTEAD OF';
  events: ('INSERT' | 'UPDATE' | 'DELETE')[];
  entityId: string;
  forEach: 'ROW' | 'STATEMENT';
  body: string;
}
export interface SequenceData {
  start: number;
  increment: number;
  min?: number;
  max?: number;
  cycle: boolean;
}
export interface ViewData {
  definition: string;
  columns: ErdColumn[];
  comment: string;
}

export const newColumn = (name = 'cot_moi', type = 'VARCHAR', o: Partial<ErdColumn> = {}): ErdColumn => ({
  id: uid('col'),
  name,
  type,
  pk: false,
  nullable: true,
  unique: false,
  autoIncrement: false,
  ...o,
});

export const emptyEntityData = (): EntityData => ({
  logicalName: '',
  schema: '',
  comment: '',
  columns: [],
  indexes: [],
  uniqueConstraints: [],
  checks: [],
});

const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const str = (v: unknown) => (typeof v === 'string' ? v : '');

/** Chuẩn hoá một cột (dữ liệu cũ / thiếu trường). */
export function normColumn(c: Partial<ErdColumn>): ErdColumn {
  return {
    ...c,
    id: c.id || uid('col'),
    name: str(c.name),
    type: str(c.type) || 'VARCHAR',
    pk: !!c.pk,
    nullable: c.pk ? false : c.nullable !== false,
    unique: !!c.unique,
    autoIncrement: !!c.autoIncrement,
  };
}

export function entityData(m: ModelElement | null | undefined): EntityData {
  const d = (m?.data ?? {}) as Partial<EntityData>;
  return {
    ...d,
    logicalName: str(d.logicalName),
    schema: str(d.schema),
    comment: str(d.comment),
    columns: arr<Partial<ErdColumn>>(d.columns).map(normColumn),
    indexes: arr<ErdIndex>(d.indexes),
    uniqueConstraints: arr<ErdUnique>(d.uniqueConstraints),
    checks: arr<ErdCheck>(d.checks),
  };
}

export function relData(m: ModelElement | null | undefined): RelationshipData {
  const d = (m?.data ?? {}) as Partial<RelationshipData>;
  return {
    ...d,
    kind: d.kind ?? 'rel1n',
    identifying: !!d.identifying,
    parent: { entityId: d.parent?.entityId ?? '', cardinality: d.parent?.cardinality ?? 'one' },
    child: { entityId: d.child?.entityId ?? '', cardinality: d.child?.cardinality ?? 'zeroOrMany' },
    fkColumns: arr(d.fkColumns),
    onDelete: d.onDelete ?? 'NO ACTION',
    onUpdate: d.onUpdate ?? 'NO ACTION',
  };
}

export function viewData(m: ModelElement | null | undefined): ViewData {
  const d = (m?.data ?? {}) as Partial<ViewData>;
  return {
    definition: str(d.definition),
    columns: arr<Partial<ErdColumn>>(d.columns).map(normColumn),
    comment: str(d.comment),
  };
}

export function sequenceData(m: ModelElement | null | undefined): SequenceData {
  const d = (m?.data ?? {}) as Partial<SequenceData>;
  // min/max nhập dạng chuỗi trong Inspector ('' = mặc định)
  const num = (v: unknown, def?: number) => {
    const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
    return typeof n === 'number' && Number.isFinite(n) ? n : def;
  };
  return {
    start: num(d.start, 1)!,
    increment: num(d.increment, 1)!,
    min: num(d.min),
    max: num(d.max),
    cycle: !!d.cycle,
  };
}

export const ERD_KINDS = {
  entity: 'erd.entity',
  relationship: 'erd.relationship',
  view: 'erd.view',
  resultset: 'erd.resultset',
  procedures: 'erd.procedures',
  triggers: 'erd.triggers',
  sequence: 'erd.sequence',
} as const;

/** Bảng (dạng phẳng, dùng cho DDL / kiểm tra / parse ORM). */
export interface ErdEntity extends EntityData {
  id: string;
  name: string;
}
export interface ErdRelationship extends RelationshipData {
  id: string;
  name: string;
}

/** Toàn bộ nội dung một ERD ở dạng thuần (không phụ thuộc canvas). */
export interface ErdSchema {
  entities: ErdEntity[];
  relationships: ErdRelationship[];
  views: ({ id: string; name: string } & ViewData)[];
  sequences: ({ id: string; name: string } & SequenceData)[];
  procedures: Procedure[];
  triggers: Trigger[];
}

export const emptySchema = (): ErdSchema => ({
  entities: [],
  relationships: [],
  views: [],
  sequences: [],
  procedures: [],
  triggers: [],
});

/** Cột khoá chính của bảng. */
export const pkColumns = (e: Pick<EntityData, 'columns'>) => e.columns.filter((c) => c.pk);
