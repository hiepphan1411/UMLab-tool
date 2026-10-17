// Mẫu "ERD UniPark+": parse ORM Class Diagram UniPark+ (JOINED, PostgreSQL) rồi bố cục bằng elkjs.
import {
  classToErd,
  entityElement,
  ormAssociation,
  ormClass,
  relationshipElement,
  uid,
  unipkClassModel,
  type Connector,
  type ModelElement,
  type OrmInput,
  type View,
} from '@umlab/core';
import type { DiagramInit } from '../editor-registry';
import { layoutEntities } from './layout';

export function unipkOrmInput(): OrmInput {
  const { classes, links } = unipkClassModel();
  return {
    classes: classes.map((c) => ormClass(c.model)!),
    associations: links.map((l) => (l.model ? ormAssociation(l.model) : null)).filter((a) => !!a),
    generalizations: links
      .filter((l) => l.kind === 'cls.generalization')
      .map((l) => ({ id: uid('g'), childId: l.from, parentId: l.to })),
  };
}

export async function unipkErdTemplate(): Promise<DiagramInit> {
  const r = classToErd(unipkOrmInput());
  // bỏ dấu vết nguồn (mẫu không liên kết với Class Diagram nào)
  const entities = r.entities.map((e) => ({ ...e, id: uid('m'), mappedFrom: undefined }));
  const idMap = new Map(r.entities.map((e, i) => [e.id, entities[i].id]));
  const relMap = new Map(r.relationships.map((x) => [x.id, uid('m')]));
  for (const e of entities) {
    delete e.mappedFrom;
    e.columns = e.columns.map((c) => {
      const { mappedFrom: _m, ...rest } = c;
      void _m;
      return c.fk
        ? {
            ...rest,
            fk: {
              ...c.fk,
              refEntityId: idMap.get(c.fk.refEntityId)!,
              relationshipId: relMap.get(c.fk.relationshipId)!,
            },
          }
        : rest;
    });
  }
  const rels = r.relationships.map((x) => {
    const { mappedFrom: _m, ...rest } = x;
    void _m;
    return {
      ...rest,
      id: relMap.get(x.id)!,
      parent: { ...x.parent, entityId: idMap.get(x.parent.entityId)! },
      child: { ...x.child, entityId: idMap.get(x.child.entityId)! },
    };
  });
  const pos = await layoutEntities(entities, rels);
  const model: ModelElement[] = [...entities.map(entityElement), ...rels.map(relationshipElement)];
  const viewOf = new Map<string, string>();
  const views: View[] = entities.map((e, z) => {
    const b = pos.get(e.id)!;
    const id = uid('v');
    viewOf.set(e.id, id);
    return { id, shape: 'erd.entity', modelId: e.id, ...b, z, parentId: null, props: { autoSize: true }, style: {} };
  });
  const connectors: Connector[] = rels.map((x, z) => ({
    id: uid('c'),
    kind: `erd.${x.kind}`,
    modelId: x.id,
    source: { viewId: viewOf.get(x.parent.entityId)! },
    target: { viewId: viewOf.get(x.child.entityId)! },
    routing: 'orthogonal',
    waypoints: [],
    labels: [],
    props: {},
    style: {},
    z,
  }));
  return { views, connectors, model };
}
