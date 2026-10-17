// Thao tác trên luồng sự kiện: thêm/chèn/xoá/kéo bước của luồng chính kèm đánh số lại và cập nhật tham chiếu
// `branchAt` / `returnTo` của các luồng thay thế, ngoại lệ (tham chiếu bám theo bước, không theo số).
import { uid } from '../util/ids';
import { clone } from '../util/json';
import type { Flow, Performer, Step, UseCaseSpec } from './model';

const renumber = (steps: Step[]) => steps.forEach((s, i) => (s.no = i + 1));

/** Áp một thay đổi lên luồng chính rồi chuyển các tham chiếu số bước theo id bước. */
export function editMainFlow(spec: UseCaseSpec, mutate: (steps: Step[]) => Step[] | void): UseCaseSpec {
  const next = clone(spec);
  const idAt = new Map(next.mainFlow.map((s) => [s.no, s.id]));
  const out = mutate(next.mainFlow);
  if (out) next.mainFlow = out;
  renumber(next.mainFlow);
  const noOf = new Map(next.mainFlow.map((s) => [s.id, s.no]));
  const remap = (no: number) => {
    const id = idAt.get(no);
    // bước bị xoá → giữ số cũ để phần Kiểm tra báo "bước không tồn tại"
    return id && noOf.has(id) ? noOf.get(id)! : no;
  };
  for (const f of [...next.alternativeFlows, ...next.exceptionFlows]) {
    f.branchAt = remap(f.branchAt);
    if (f.end.kind === 'returnTo') f.end = { kind: 'returnTo', stepNo: remap(f.end.stepNo) };
  }
  return next;
}

/** Performer xen kẽ: sau actor là Hệ thống; sau Hệ thống là actor gần nhất (hoặc actor chính đầu tiên). */
export function nextPerformer(steps: Step[], after: number, primaryActors: string[]): Performer {
  const prev = steps[after];
  if (prev?.performer.kind === 'actor') return { kind: 'system' };
  for (let i = after; i >= 0; i--) {
    const p = steps[i]?.performer;
    if (p?.kind === 'actor') return { ...p };
  }
  return primaryActors[0] ? { kind: 'actor', actorId: primaryActors[0] } : { kind: 'system' };
}

export const newStep = (performer: Performer, text = ''): Step => ({ id: uid('st'), no: 0, performer, text });

/** Chèn bước mới vào luồng chính tại vị trí index (0-based). */
export function insertStep(spec: UseCaseSpec, index: number, step?: Partial<Step>): UseCaseSpec {
  return editMainFlow(spec, (steps) => {
    const i = Math.max(0, Math.min(steps.length, index));
    const st = { ...newStep(nextPerformer(steps, i - 1, spec.primaryActors)), ...step, id: step?.id ?? uid('st') };
    steps.splice(i, 0, st as Step);
  });
}

export function removeStep(spec: UseCaseSpec, stepId: string): UseCaseSpec {
  return editMainFlow(spec, (steps) => steps.filter((s) => s.id !== stepId));
}

/** Kéo bước từ vị trí from sang to (0-based). */
export function moveStep(spec: UseCaseSpec, from: number, to: number): UseCaseSpec {
  return editMainFlow(spec, (steps) => {
    if (from < 0 || from >= steps.length) return;
    const [s] = steps.splice(from, 1);
    steps.splice(Math.max(0, Math.min(steps.length, to)), 0, s);
  });
}

export function updateStep(spec: UseCaseSpec, stepId: string, patch: Partial<Step>): UseCaseSpec {
  const next = clone(spec);
  for (const list of [
    next.mainFlow,
    ...next.alternativeFlows.map((f) => f.steps),
    ...next.exceptionFlows.map((f) => f.steps),
  ]) {
    const i = list.findIndex((s) => s.id === stepId);
    if (i >= 0) {
      const merged: Step = { ...list[i], ...patch, id: stepId, no: list[i].no };
      for (const k of ['interaction', 'loop', 'includeUseCaseId'] as const)
        if (patch[k] === undefined && k in patch) delete merged[k];
      list[i] = merged;
    }
  }
  return next;
}

// ---------------- luồng thay thế / ngoại lệ ----------------

export type FlowKind = 'alternativeFlows' | 'exceptionFlows';
const prefixOf = (k: FlowKind) => (k === 'alternativeFlows' ? 'A' : 'E');

/** Đánh lại mã A1, A2… / E1, E2… theo thứ tự (giữ nguyên tên, bước). */
export function recodeFlows(spec: UseCaseSpec): UseCaseSpec {
  const next = clone(spec);
  next.alternativeFlows.forEach((f, i) => (f.code = `A${i + 1}`));
  next.exceptionFlows.forEach((f, i) => (f.code = `E${i + 1}`));
  for (const f of [...next.alternativeFlows, ...next.exceptionFlows]) renumber(f.steps);
  return next;
}

export function addFlow(
  spec: UseCaseSpec,
  kind: FlowKind,
  branchAt: number,
  name = '',
): { spec: UseCaseSpec; flow: Flow } {
  const next = clone(spec);
  const list = next[kind];
  const flow: Flow = {
    id: uid('fl'),
    code: `${prefixOf(kind)}${list.length + 1}`,
    name: name || (kind === 'alternativeFlows' ? 'Luồng thay thế' : 'Ngoại lệ'),
    branchAt,
    condition: '',
    steps: [{ ...newStep({ kind: 'system' }), no: 1 }],
    end:
      kind === 'alternativeFlows'
        ? { kind: 'returnTo', stepNo: Math.min(branchAt + 1, Math.max(1, spec.mainFlow.length)) }
        : { kind: 'endFailure' },
  };
  list.push(flow);
  return { spec: recodeFlows(next), flow };
}

export function updateFlow(spec: UseCaseSpec, flowId: string, patch: Partial<Flow>): UseCaseSpec {
  const next = clone(spec);
  for (const k of ['alternativeFlows', 'exceptionFlows'] as const)
    next[k] = next[k].map((f) => (f.id === flowId ? { ...f, ...patch, id: f.id } : f));
  return recodeFlows(next);
}

export function removeFlow(spec: UseCaseSpec, flowId: string): UseCaseSpec {
  const next = clone(spec);
  next.alternativeFlows = next.alternativeFlows.filter((f) => f.id !== flowId);
  next.exceptionFlows = next.exceptionFlows.filter((f) => f.id !== flowId);
  return recodeFlows(next);
}

/** Bước trong một luồng rẽ: chèn / xoá / kéo (đánh số A1.1, A1.2… tự động). */
export function editFlowSteps(
  spec: UseCaseSpec,
  flowId: string,
  mutate: (steps: Step[]) => Step[] | void,
): UseCaseSpec {
  const next = clone(spec);
  for (const k of ['alternativeFlows', 'exceptionFlows'] as const)
    for (const f of next[k])
      if (f.id === flowId) {
        const out = mutate(f.steps);
        if (out) f.steps = out;
        renumber(f.steps);
      }
  return next;
}

/** Nhãn bước trong luồng rẽ: "A1.2". */
export const flowStepLabel = (f: Pick<Flow, 'code'>, s: Pick<Step, 'no'>) => `${f.code}.${s.no}`;
