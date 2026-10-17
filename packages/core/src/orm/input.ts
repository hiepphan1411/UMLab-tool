// Đầu vào parse ORM: class / association / generalization lấy từ Class Diagram (docs/spec/notation-class.md).
// Generalization không có phần tử mô hình (chỉ là đường nối giữa 2 hình) nên phải đọc theo sơ đồ.
import type * as Y from 'yjs';
import { connsMap, modelMap, viewsMap } from '../project/ydoc';
import type { ModelElement } from '../format/types';
import type { Attribute } from '../uml/parse-member';

export type OrmClassKind =
  'class' | 'interface' | 'enumeration' | 'datatype' | 'primitive' | 'signal' | 'associationClass';

export interface OrmClass {
  id: string;
  name: string;
  kind: OrmClassKind;
  stereotypes: string[];
  isAbstract: boolean;
  attributes: Attribute[];
  literals: string[];
  /** Association class: association được gắn. */
  associationId?: string;
}

export interface OrmEnd {
  classId: string | null;
  role: string;
  multiplicity: string;
  navigable: 'yes' | 'no' | 'unspecified';
  aggregation: 'none' | 'shared' | 'composite';
}

export interface OrmAssociation {
  id: string;
  name: string;
  ends: [OrmEnd, OrmEnd];
}

export interface OrmGeneralization {
  id: string;
  childId: string;
  parentId: string;
}

export interface OrmInput {
  classes: OrmClass[];
  associations: OrmAssociation[];
  generalizations: OrmGeneralization[];
}

const KIND: Record<string, OrmClassKind> = {
  'uml.class': 'class',
  'uml.interface': 'interface',
  'uml.enumeration': 'enumeration',
  'uml.datatype': 'datatype',
  'uml.primitive': 'primitive',
  'uml.signal': 'signal',
  'uml.associationClass': 'associationClass',
};

const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export function ormClass(m: ModelElement, associationId?: string): OrmClass | null {
  const kind = KIND[m.kind];
  if (!kind) return null;
  const d = m.data;
  return {
    id: m.id,
    name: m.name,
    kind,
    stereotypes: arr<string>(d.stereotypes),
    isAbstract: !!d.isAbstract,
    attributes: arr<Attribute>(d.attributes),
    literals: arr<{ name: string }>(d.literals).map((l) => l.name),
    ...(associationId ? { associationId } : {}),
  };
}

export function ormAssociation(m: ModelElement): OrmAssociation | null {
  if (m.kind !== 'uml.association') return null;
  const e = arr<Partial<OrmEnd>>(m.data.ends);
  if (e.length !== 2) return null; // N-ary bỏ qua
  const end = (x: Partial<OrmEnd>): OrmEnd => ({
    classId: x.classId ?? null,
    role: x.role ?? '',
    multiplicity: x.multiplicity ?? '',
    navigable: x.navigable ?? 'unspecified',
    aggregation: x.aggregation ?? 'none',
  });
  return { id: m.id, name: m.name, ends: [end(e[0]), end(e[1])] };
}

/** Đọc class / association / generalization có trên Class Diagram `diagramId`. */
export function ormInputFromDiagram(doc: Y.Doc, diagramId: string): OrmInput {
  const model = modelMap(doc);
  const views = [...viewsMap(doc, diagramId).values()];
  const conns = [...connsMap(doc, diagramId).values()];
  const viewModel = new Map(views.map((v) => [v.id, v.modelId]));
  const classes: OrmClass[] = [];
  const seen = new Set<string>();
  for (const v of views) {
    const m = v.modelId ? model.get(v.modelId) : undefined;
    if (!m || seen.has(m.id)) continue;
    seen.add(m.id);
    const assocConn =
      typeof v.props.associationId === 'string' ? conns.find((c) => c.id === v.props.associationId) : undefined;
    const c = ormClass(m, assocConn?.modelId ?? undefined);
    if (c) classes.push(c);
  }
  const associations: OrmAssociation[] = [];
  const generalizations: OrmGeneralization[] = [];
  for (const c of conns) {
    if (c.kind === 'cls.generalization') {
      const childId = viewModel.get(c.source.viewId ?? '');
      const parentId = viewModel.get(c.target.viewId ?? '');
      if (childId && parentId) generalizations.push({ id: c.id, childId, parentId });
      continue;
    }
    const m = c.modelId ? model.get(c.modelId) : undefined;
    const a = m ? ormAssociation(m) : null;
    if (a && !associations.some((x) => x.id === a.id)) associations.push(a);
  }
  return { classes, associations, generalizations };
}
