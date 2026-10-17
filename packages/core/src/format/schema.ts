import { z } from 'zod';
import { DIAGRAM_TYPES } from './types';

/** Thông điệp lỗi zod tiếng Việt (ngắn, theo đường dẫn). */
export const viErrorMap: z.ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === 'undefined') return { message: 'thiếu trường bắt buộc' };
      return { message: `phải là ${TYPE_VI[issue.expected] ?? issue.expected}` };
    case z.ZodIssueCode.invalid_enum_value:
      return { message: `phải là một trong: ${issue.options.join(', ')}` };
    case z.ZodIssueCode.invalid_literal:
      return { message: `phải là "${String(issue.expected)}"` };
    case z.ZodIssueCode.too_small:
      return { message: issue.type === 'string' ? 'không được để trống' : `tối thiểu ${issue.minimum}` };
    case z.ZodIssueCode.too_big:
      return { message: `tối đa ${issue.maximum}` };
    default:
      return { message: ctx.defaultError };
  }
};

const TYPE_VI: Record<string, string> = {
  number: 'số',
  string: 'chuỗi',
  boolean: 'true/false',
  array: 'mảng',
  object: 'đối tượng',
  null: 'null',
};

const num = z.number().finite();
const record = z.record(z.unknown());

export const pointSchema = z.object({ x: num, y: num });
export const sideSchema = z.enum(['top', 'right', 'bottom', 'left']);
/** 8 loại chuẩn + 'playground' (sơ đồ thử engine, chỉ bản dev). */
export const diagramTypeSchema = z.enum([...DIAGRAM_TYPES, 'playground']);

export const viewSchema = z.object({
  id: z.string().min(1),
  shape: z.string().min(1),
  modelId: z.string().nullable().default(null),
  x: num,
  y: num,
  w: num.nonnegative(),
  h: num.nonnegative(),
  z: num.default(0),
  parentId: z.string().nullable().default(null),
  props: record.default({}),
  style: record.default({}),
  locked: z.boolean().optional(),
  hidden: z.boolean().optional(),
  groupId: z.string().nullable().optional(),
});

export const endpointSchema = z.object({
  viewId: z.string().nullable(),
  side: sideSchema.optional(),
  t: num.min(0).max(1).optional(),
  x: num.optional(),
  y: num.optional(),
});

export const labelSchema = z.object({
  role: z.string(),
  text: z.string(),
  pos: num.default(0.5),
  dx: num.optional(),
  dy: num.optional(),
});

export const connectorSchema = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  modelId: z.string().nullable().default(null),
  source: endpointSchema,
  target: endpointSchema,
  routing: z.enum(['orthogonal', 'straight', 'curved', 'manual', 'smart']).default('orthogonal'),
  waypoints: z.array(pointSchema).default([]),
  labels: z.array(labelSchema).default([]),
  props: record.default({}),
  style: record.default({}),
  z: num.optional(),
});

export const modelElementSchema = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  name: z.string(),
  data: record.default({}),
});

export const folderSchema = z.object({
  id: z.string().min(1),
  parentId: z.string().nullable().default(null),
  name: z.string().min(1),
  order: num.default(0),
});

export const canvasSchema = z
  .object({
    background: z.string().default('#FFFFFF'),
    grid: z.boolean().default(true),
    notation: z.string().optional(),
  })
  .passthrough();

export const generatedFromSchema = z
  .object({ sourceDiagramId: z.string(), sourceVersion: num, generator: z.string() })
  .nullable();

const diagramBody = {
  id: z.string().min(1),
  type: diagramTypeSchema,
  name: z.string().min(1),
  canvas: canvasSchema.default({ background: '#FFFFFF', grid: true }),
  views: z.array(viewSchema).default([]),
  connectors: z.array(connectorSchema).default([]),
  data: z.unknown().default(null),
  generatedFrom: generatedFromSchema.optional(),
};

export const diagramFileSchema = z.object({
  format: z.literal('umlab'),
  schemaVersion: z.number().int().positive(),
  kind: z.literal('diagram'),
  exportedAt: z.string().default(''),
  diagram: z.object(diagramBody),
  model: z.array(modelElementSchema).default([]),
});

export const projectInfoSchema = z.object({
  id: z.string().default(''),
  name: z.string().min(1),
  description: z.string().default(''),
  color: z.string().default('#2E62E6'),
  icon: z.string().default('folder-kanban'),
});

export const projectFileSchema = z.object({
  format: z.literal('umlab'),
  schemaVersion: z.number().int().positive(),
  kind: z.literal('project'),
  exportedAt: z.string().default(''),
  project: projectInfoSchema,
  folders: z.array(folderSchema).default([]),
  diagrams: z
    .array(z.object({ ...diagramBody, folderId: z.string().nullable().default(null), order: num.optional() }))
    .default([]),
  model: z.array(modelElementSchema).default([]),
  meta: record.optional(),
});

/** Định dạng lỗi zod: tối đa 5 dòng `views[3].w: phải là số`. */
export function formatZodIssues(err: z.ZodError, max = 5): string[] {
  return err.issues.slice(0, max).map((i) => {
    const path = i.path.reduce<string>(
      (acc, p) => (typeof p === 'number' ? `${acc}[${p}]` : acc ? `${acc}.${p}` : String(p)),
      '',
    );
    return `${path || '(gốc)'}: ${i.message}`;
  });
}
