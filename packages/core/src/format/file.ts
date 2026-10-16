// Xuất/nhập tệp JSON `umlab` (một sơ đồ hoặc cả project) — docs/spec/json-format.md mục 1–5.
import type { z } from 'zod';
import { referencedModel } from '../project/bundle';
import { clone } from '../util/json';
import { isLegacyUnipark, migrateLegacyUnipark } from './legacy';
import { diagramFileSchema, formatZodIssues, projectFileSchema, viErrorMap } from './schema';
import type { Connector, DiagramFile, DiagramRecord, ModelElement, ProjectBundle, ProjectFile, View } from './types';
import { SCHEMA_VERSION, migrateFile } from './migrations';

/** Bỏ giá trị bằng mặc định để tệp gọn, dễ diff trên Git. */
function cleanView(v: View): View {
  const o = clone(v);
  if (!o.locked) delete o.locked;
  if (!o.hidden) delete o.hidden;
  if (!o.groupId) delete o.groupId;
  return o;
}

function cleanConnector(c: Connector): Connector {
  const o = clone(c);
  if (o.z === undefined) delete o.z;
  return o;
}

export function toDiagramFile(d: DiagramRecord, model: ModelElement[], now = new Date().toISOString()): DiagramFile {
  return {
    format: 'umlab',
    schemaVersion: SCHEMA_VERSION,
    kind: 'diagram',
    exportedAt: now,
    diagram: {
      id: d.id,
      type: d.type,
      name: d.name,
      canvas: clone(d.canvas),
      views: d.views.map(cleanView),
      connectors: d.connectors.map(cleanConnector),
      data: clone(d.data ?? null),
      ...(d.generatedFrom ? { generatedFrom: clone(d.generatedFrom) } : {}),
    },
    model: referencedModel(d, model).map((m) => clone(m)),
  };
}

export function toProjectFile(b: ProjectBundle, now = new Date().toISOString()): ProjectFile {
  return {
    format: 'umlab',
    schemaVersion: SCHEMA_VERSION,
    kind: 'project',
    exportedAt: now,
    project: clone(b.project),
    folders: clone(b.folders),
    diagrams: b.diagrams.map((d) => ({
      id: d.id,
      folderId: d.folderId,
      type: d.type,
      name: d.name,
      order: d.order,
      canvas: clone(d.canvas),
      views: d.views.map(cleanView),
      connectors: d.connectors.map(cleanConnector),
      data: clone(d.data ?? null),
      ...(d.generatedFrom ? { generatedFrom: clone(d.generatedFrom) } : {}),
    })),
    model: clone(b.model),
    ...(b.meta && Object.keys(b.meta).length ? { meta: clone(b.meta) } : {}),
  };
}

/** JSON thụt lề 2, kết thúc bằng xuống dòng. */
export const stringifyFile = (f: unknown) => JSON.stringify(f, null, 2) + '\n';

export class ImportError extends Error {
  constructor(
    message: string,
    public readonly details: string[] = [],
  ) {
    super(message);
  }
}

export type ParsedImport =
  | { kind: 'diagram'; file: DiagramFile }
  | { kind: 'project'; file: ProjectFile; bundle: ProjectBundle }
  | { kind: 'legacy'; bundle: ProjectBundle };

function check<T>(schema: z.ZodType<T>, value: unknown, label: string): T {
  const r = schema.safeParse(value, { errorMap: viErrorMap });
  if (!r.success) throw new ImportError(`Tệp ${label} không đúng định dạng.`, formatZodIssues(r.error));
  return r.data;
}

export function projectFileToBundle(f: ProjectFile, now = new Date().toISOString()): ProjectBundle {
  return {
    project: { ...f.project },
    folders: f.folders,
    diagrams: f.diagrams.map((d, i) => ({
      id: d.id,
      type: d.type,
      name: d.name,
      folderId: d.folderId ?? null,
      order: d.order ?? i,
      createdAt: now,
      updatedAt: now,
      generatedFrom: d.generatedFrom ?? null,
      canvas: d.canvas ?? { background: '#FFFFFF', grid: true },
      views: d.views,
      connectors: d.connectors,
      data: d.data ?? null,
    })),
    model: f.model,
    meta: f.meta ?? {},
  };
}

/** Đọc chuỗi JSON người dùng chọn: tệp sơ đồ, tệp project, hoặc tệp UniPark+ Diagram Studio cũ. */
export function parseImport(text: string): ParsedImport {
  if (text.length > 10 * 1024 * 1024) throw new ImportError('Tệp quá lớn (tối đa 10 MB).');
  let raw: unknown;
  try {
    raw = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch (e) {
    throw new ImportError('Không đọc được JSON: ' + (e instanceof Error ? e.message : 'cú pháp sai'));
  }
  if (isLegacyUnipark(raw)) return { kind: 'legacy', bundle: migrateLegacyUnipark(raw) };
  const o = raw as { format?: unknown; kind?: unknown };
  if (!o || typeof o !== 'object' || o.format !== 'umlab')
    throw new ImportError('Đây không phải tệp UMLab (thiếu "format": "umlab").');
  const migrated = migrateFile(raw);
  if (o.kind === 'diagram')
    return { kind: 'diagram', file: check(diagramFileSchema, migrated, 'sơ đồ') as DiagramFile };
  if (o.kind === 'project') {
    const file = check(projectFileSchema, migrated, 'project') as ProjectFile;
    return { kind: 'project', file, bundle: projectFileToBundle(file) };
  }
  throw new ImportError('Thuộc tính "kind" phải là "diagram" hoặc "project".');
}
