// Đọc ERD của một sơ đồ trong Y.Doc thành ErdSchema thuần (DDL, kiểm tra, parse ORM lại).
import type * as Y from 'yjs';
import { connsMap, diagramsMap, modelMap, viewsMap } from '../project/ydoc';
import type { DiagramMeta, ModelElement } from '../format/types';
import {
  ERD_KINDS,
  emptySchema,
  entityData,
  isDialect,
  relData,
  sequenceData,
  viewData,
  type Dialect,
  type ErdSchema,
  type Procedure,
  type Trigger,
} from './model';

/** Dialect của sơ đồ ERD (lưu ở `canvas.dialect`, mặc định PostgreSQL). */
export const erdDialect = (meta: Pick<DiagramMeta, 'canvas'> | null | undefined): Dialect =>
  isDialect(meta?.canvas?.dialect) ? meta.canvas.dialect : 'postgresql';

/** Gom ERD từ danh sách phần tử mô hình (mỗi phần tử một lần). */
export function schemaFromModel(elements: ModelElement[]): ErdSchema {
  const s = emptySchema();
  const seen = new Set<string>();
  for (const m of elements) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    if (m.kind === ERD_KINDS.entity) s.entities.push({ ...entityData(m), id: m.id, name: m.name });
    else if (m.kind === ERD_KINDS.relationship) s.relationships.push({ ...relData(m), id: m.id, name: m.name });
    else if (m.kind === ERD_KINDS.view) s.views.push({ ...viewData(m), id: m.id, name: m.name });
    else if (m.kind === ERD_KINDS.sequence) s.sequences.push({ ...sequenceData(m), id: m.id, name: m.name });
    else if (m.kind === ERD_KINDS.procedures)
      s.procedures.push(...((Array.isArray(m.data.procedures) ? m.data.procedures : []) as Procedure[]));
    else if (m.kind === ERD_KINDS.triggers)
      s.triggers.push(...((Array.isArray(m.data.triggers) ? m.data.triggers : []) as Trigger[]));
  }
  return s;
}

/** Phần tử mô hình ERD có hình/đường nối trên sơ đồ `diagramId` (theo thứ tự vẽ). */
export function erdElements(doc: Y.Doc, diagramId: string): ModelElement[] {
  const model = modelMap(doc);
  const views = [...viewsMap(doc, diagramId).values()].sort(
    (a, b) => (a.z ?? 0) - (b.z ?? 0) || a.y - b.y || a.x - b.x,
  );
  const conns = [...connsMap(doc, diagramId).values()];
  const ids = [...views.map((v) => v.modelId), ...conns.map((c) => c.modelId)];
  return ids.map((id) => (id ? model.get(id) : undefined)).filter((m): m is ModelElement => !!m);
}

export function erdSchemaFromDiagram(doc: Y.Doc, diagramId: string): { schema: ErdSchema; dialect: Dialect } {
  return {
    schema: schemaFromModel(erdElements(doc, diagramId)),
    dialect: erdDialect(diagramsMap(doc).get(diagramId)),
  };
}
