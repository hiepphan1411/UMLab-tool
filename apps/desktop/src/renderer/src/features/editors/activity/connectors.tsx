// Đường nối Activity (docs/spec/notation-activity.md mục 2): Control Flow, Object Flow, Exception Handler + luật nối.
import { z } from 'zod';
import type { Connector } from '@umlab/core';
import {
  registerConnector,
  type ComputedLabel,
  type ConnLook,
  type EngineLookup,
  type ViewCtx,
} from '../engine/registry';

type P = Record<string, unknown>;
const str = (v: unknown, d = '') => (v === undefined || v === null ? d : String(v));

export const OBJECT_SHAPES = new Set([
  'act.object',
  'act.centralBuffer',
  'act.dataStore',
  'act.inputPin',
  'act.outputPin',
  'act.valuePin',
  'act.actionInputPin',
  'act.paramNode',
  'act.expansionNode',
]);
const FINALS = new Set(['act.final', 'act.flowFinal']);

/** Các vùng Interruptible chứa hình (theo cha). */
function regionsOf(lookup: EngineLookup, viewId: string | null): Set<string> {
  const out = new Set<string>();
  let v = lookup.view(viewId);
  for (let i = 0; v && i < 16; i++) {
    if (v.shape === 'act.interruptRegion') out.add(v.id);
    v = lookup.view(v.parentId);
  }
  return out;
}

/** Control flow đi từ trong Interruptible Region ra ngoài → luồng ngắt (vẽ tia sét). */
export function interrupts(c: Connector, lookup: EngineLookup): boolean {
  if ((c.props as P).interrupts === true) return true;
  const s = regionsOf(lookup, c.source.viewId);
  if (!s.size) return false;
  const t = regionsOf(lookup, c.target.viewId);
  return [...s].some((r) => !t.has(r));
}

function flowLabels(c: Connector): ComputedLabel[] {
  const p = c.props as P;
  const out: ComputedLabel[] = [];
  const st = [
    p.transformation ? `«transformation» ${str(p.transformation)}` : '',
    p.selection ? `«selection» ${str(p.selection)}` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const parts = [
    str(p.name),
    str(p.guard) ? `[${str(p.guard).replace(/^\[|\]$/g, '')}]` : '',
    str(p.weight) ? `{weight=${str(p.weight)}}` : '',
  ]
    .filter(Boolean)
    .join(' ');
  if (parts) out.push({ role: 'guard', text: parts, pos: 0.5, draggable: true });
  if (st) out.push({ role: 'note', text: st, pos: 0.5, draggable: true, note: true });
  return out;
}

/** Luật chung cho luồng điều khiển/đối tượng. */
function flowAllow(s: ViewCtx, t: ViewCtx, lookup: EngineLookup): true | string {
  if (t.view.shape === 'act.initial') return 'Không có luồng đi vào Initial Node';
  if (FINALS.has(s.view.shape)) return 'Không có luồng đi ra khỏi Final Node';
  const conns = lookup.conns().filter((c) => c.kind === 'act.controlFlow' || c.kind === 'act.objectFlow');
  if (t.view.shape === 'act.fork' && conns.some((c) => c.target.viewId === t.view.id))
    return 'Fork Node chỉ có một luồng vào (nhiều luồng ra)';
  if (s.view.shape === 'act.join' && conns.some((c) => c.source.viewId === s.view.id))
    return 'Join Node chỉ có một luồng ra (nhiều luồng vào)';
  if (s.view.shape.startsWith('act.swimlane') || t.view.shape.startsWith('act.swimlane'))
    return 'Nối vào node trong làn, không nối vào khung swimlane';
  return true;
}

const flowSchema = z.object({
  name: z.string().describe('Tên'),
  guard: z.string().describe('Guard [điều kiện]'),
  weight: z.string().describe('Weight'),
});

registerConnector({
  kind: 'act.controlFlow',
  label: 'Control Flow',
  icon: 'control-flow',
  look: (c, _m, lookup): ConnLook => ({
    line: 'solid',
    start: 'none',
    end: 'arrow-open',
    middle: interrupts(c, lookup) ? 'lightning' : null,
  }),
  defaultRouting: 'orthogonal',
  defaultProps: () => ({ name: '', guard: '', weight: '', interrupts: false }),
  propsSchema: flowSchema.extend({ interrupts: z.boolean().describe('Luồng ngắt (interrupting edge ⚡)') }),
  labels: flowLabels,
  live: true,
  allow: flowAllow,
  selfLoop: false,
});

registerConnector({
  kind: 'act.objectFlow',
  label: 'Object Flow',
  icon: 'object-flow',
  look: { line: 'solid', start: 'none', end: 'arrow-open' },
  defaultRouting: 'orthogonal',
  defaultProps: () => ({
    name: '',
    guard: '',
    weight: '',
    transformation: '',
    selection: '',
    isMulticast: false,
    isMultireceive: false,
  }),
  propsSchema: flowSchema.extend({
    transformation: z.string().describe('«transformation»'),
    selection: z.string().describe('«selection»'),
    isMulticast: z.boolean().describe('isMulticast'),
    isMultireceive: z.boolean().describe('isMultireceive'),
  }),
  labels: flowLabels,
  allow: (s, t, lookup) => {
    const ok = flowAllow(s, t, lookup);
    if (ok !== true) return ok;
    return OBJECT_SHAPES.has(s.view.shape) || OBJECT_SHAPES.has(t.view.shape)
      ? true
      : 'Object Flow cần ít nhất một đầu là Object Node / Pin / Parameter Node';
  },
});

registerConnector({
  kind: 'act.exceptionHandler',
  label: 'Exception Handler',
  icon: 'exception-handler',
  look: { line: 'solid', start: 'none', end: 'arrow-open', middle: 'lightning' },
  defaultRouting: 'straight',
  defaultProps: () => ({ exceptionTypes: '' }),
  propsSchema: z.object({ exceptionTypes: z.string().describe('Kiểu ngoại lệ (cách nhau dấu phẩy)') }),
  labels: (c) =>
    str((c.props as P).exceptionTypes)
      ? [{ role: 'ex', text: str((c.props as P).exceptionTypes), pos: 0.35, draggable: true }]
      : [],
  allow: (s, t) => {
    if (OBJECT_SHAPES.has(s.view.shape) || FINALS.has(s.view.shape) || s.view.shape === 'act.initial')
      return 'Exception Handler đi từ node được bảo vệ (Action)';
    return t.view.shape === 'act.inputPin' ? true : 'Exception Handler trỏ tới Input Pin của action xử lý';
  },
});
