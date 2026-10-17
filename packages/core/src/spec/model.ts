// Đặc tả Use Case (docs/spec/usecase-spec-template.md mục 1): schema zod + chuẩn hoá.
import { z } from 'zod';
import { uid } from '../util/ids';

export const performerSchema = z.union([
  z.object({ kind: z.literal('actor'), actorId: z.string() }),
  z.object({ kind: z.literal('system') }),
]);

export const interactionSchema = z.object({
  target: z.enum(['ui', 'controller', 'entity', 'external']),
  targetName: z.string().optional(),
  message: z.string().optional(),
  kind: z.enum(['sync', 'async', 'create', 'destroy']).optional(),
  returns: z.string().optional(),
});

export const stepSchema = z.object({
  id: z.string(),
  no: z.number(),
  performer: performerSchema,
  text: z.string(),
  interaction: interactionSchema.optional(),
  loop: z.object({ until: z.string() }).optional(),
  includeUseCaseId: z.string().optional(),
});

export const flowEndSchema = z.union([
  z.object({ kind: z.literal('returnTo'), stepNo: z.number() }),
  z.object({ kind: z.literal('endSuccess') }),
  z.object({ kind: z.literal('endFailure') }),
]);

export const flowSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  branchAt: z.number(),
  condition: z.string(),
  steps: z.array(stepSchema),
  end: flowEndSchema,
});

const coded = z.object({ code: z.string(), text: z.string() });

export const useCaseSpecSchema = z.object({
  useCaseId: z.string(),
  version: z.number(),
  primaryActors: z.array(z.string()),
  secondaryActors: z.array(z.string()),
  description: z.string(),
  priority: z.enum(['Cao', 'Trung bình', 'Thấp']),
  trigger: z.string(),
  preconditions: z.array(z.string()),
  postconditions: z.object({ success: z.array(z.string()), failure: z.array(z.string()) }),
  mainFlow: z.array(stepSchema),
  alternativeFlows: z.array(flowSchema),
  exceptionFlows: z.array(flowSchema),
  businessRules: z.array(coded),
  nonFunctional: z.array(coded),
  includes: z.array(z.string()),
  extends: z.array(z.string()),
  frequency: z.string().optional(),
  notes: z.string().optional(),
  screens: z.array(z.object({ id: z.string(), name: z.string() })),
  entities: z.array(z.object({ id: z.string(), name: z.string(), classId: z.string().optional() })),
});

export type Performer = z.infer<typeof performerSchema>;
export type Interaction = z.infer<typeof interactionSchema>;
export type Step = z.infer<typeof stepSchema>;
export type FlowEnd = z.infer<typeof flowEndSchema>;
export type Flow = z.infer<typeof flowSchema>;
export type UseCaseSpec = z.infer<typeof useCaseSpecSchema>;
export type SpecSection = keyof UseCaseSpec;

type R = Record<string, unknown>;
const obj = (v: unknown): R => (v && typeof v === 'object' && !Array.isArray(v) ? (v as R) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const s = (v: unknown, d = '') => (typeof v === 'string' ? v : v === undefined || v === null ? d : String(v));
const strs = (v: unknown) =>
  arr(v)
    .map((x) => s(x))
    .filter((x) => x !== '');

export function normStep(raw: unknown, no = 1): Step {
  const r = obj(raw);
  const p = obj(r.performer);
  const st: Step = {
    id: s(r.id) || uid('st'),
    no: Number.isFinite(Number(r.no)) ? Number(r.no) : no,
    performer: p.kind === 'actor' && s(p.actorId) ? { kind: 'actor', actorId: s(p.actorId) } : { kind: 'system' },
    text: s(r.text),
  };
  const it = interactionSchema.safeParse(r.interaction);
  if (it.success) st.interaction = it.data;
  const lp = obj(r.loop);
  if (r.loop && typeof lp.until === 'string') st.loop = { until: lp.until };
  if (s(r.includeUseCaseId)) st.includeUseCaseId = s(r.includeUseCaseId);
  return st;
}

export function normFlow(raw: unknown, prefix: 'A' | 'E', i: number): Flow {
  const r = obj(raw);
  const e = obj(r.end);
  const end: FlowEnd =
    e.kind === 'returnTo' && Number.isFinite(Number(e.stepNo))
      ? { kind: 'returnTo', stepNo: Number(e.stepNo) }
      : e.kind === 'endSuccess'
        ? { kind: 'endSuccess' }
        : { kind: 'endFailure' };
  return {
    id: s(r.id) || uid('fl'),
    code: s(r.code) || `${prefix}${i + 1}`,
    name: s(r.name),
    branchAt: Number.isFinite(Number(r.branchAt)) ? Number(r.branchAt) : 1,
    condition: s(r.condition),
    steps: arr(r.steps).map((x, j) => normStep(x, j + 1)),
    end,
  };
}

const PRIORITIES = ['Cao', 'Trung bình', 'Thấp'] as const;

/** Chuẩn hoá đặc tả (thiếu trường → giá trị mặc định; số bước đánh lại 1..n). */
export function normSpec(raw: unknown): UseCaseSpec {
  const r = obj(raw);
  const post = obj(r.postconditions);
  const coded = (v: unknown, pre: string) =>
    arr(v).map((x, i) => {
      const o = obj(x);
      return { code: s(o.code) || `${pre}${String(i + 1).padStart(2, '0')}`, text: s(o.text ?? x) };
    });
  const spec: UseCaseSpec = {
    useCaseId: s(r.useCaseId),
    version: Number.isFinite(Number(r.version)) ? Number(r.version) : 1,
    primaryActors: strs(r.primaryActors),
    secondaryActors: strs(r.secondaryActors),
    description: s(r.description),
    priority: (PRIORITIES as readonly string[]).includes(s(r.priority))
      ? (s(r.priority) as UseCaseSpec['priority'])
      : 'Trung bình',
    trigger: s(r.trigger),
    preconditions: strs(r.preconditions),
    postconditions: { success: strs(post.success), failure: strs(post.failure) },
    mainFlow: arr(r.mainFlow).map((x, i) => normStep(x, i + 1)),
    alternativeFlows: arr(r.alternativeFlows).map((x, i) => normFlow(x, 'A', i)),
    exceptionFlows: arr(r.exceptionFlows).map((x, i) => normFlow(x, 'E', i)),
    businessRules: coded(r.businessRules, 'BR'),
    nonFunctional: coded(r.nonFunctional, 'NFR'),
    includes: strs(r.includes),
    extends: strs(r.extends),
    screens: arr(r.screens).map((x) => ({ id: s(obj(x).id) || uid('sc'), name: s(obj(x).name ?? x) })),
    entities: arr(r.entities).map((x) => {
      const o = obj(x);
      const e: UseCaseSpec['entities'][number] = { id: s(o.id) || uid('en'), name: s(o.name ?? x) };
      if (s(o.classId)) e.classId = s(o.classId);
      return e;
    }),
  };
  if (r.frequency !== undefined) spec.frequency = s(r.frequency);
  if (r.notes !== undefined) spec.notes = s(r.notes);
  spec.mainFlow.forEach((st, i) => (st.no = i + 1));
  for (const f of [...spec.alternativeFlows, ...spec.exceptionFlows]) f.steps.forEach((st, i) => (st.no = i + 1));
  return spec;
}

export const emptySpec = (useCaseId = ''): UseCaseSpec => normSpec({ useCaseId });
