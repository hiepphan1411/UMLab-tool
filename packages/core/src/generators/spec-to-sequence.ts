// Đặc tả use case → Sequence Diagram (docs/spec/generators.md mục 2).
//   lifeline: Actor (chính, phụ có bước) → Boundary (màn hình) → Control `<TenUC>Controller` → Entity → hệ thống ngoài;
//   bước actor → message tới Boundary (+ Boundary chuyển cho Control khi bước sau là của hệ thống); bước hệ thống →
//   message tới Entity / hệ thống ngoài (+ reply giá trị trả về), hiển thị → Boundary, còn lại self message;
//   luồng rẽ → `alt [luồng rẽ] / [else]`, bước lặp → `loop`, gọi use case khác → `ref`.
import type { Connector, ModelElement, View } from '../format/types';
import type { Step, UseCaseSpec } from '../spec/model';
import { uid } from '../util/ids';
import { computeSequence, SEQ, type SeqMsgKind } from '../sequence/layout';

export type SeqLifelineKind = 'actor' | 'boundary' | 'control' | 'entity' | 'lifeline';

export interface SeqGenLifeline {
  id: string;
  kind: SeqLifelineKind;
  name: string;
  actorId?: string;
  classId?: string;
}

export interface SeqGenMessage {
  id: string;
  kind: SeqMsgKind;
  from: string;
  to: string;
  name: string;
  stepId?: string;
}

export type SeqGenItem =
  | { type: 'msg'; msg: SeqGenMessage }
  | {
      type: 'fragment';
      id: string;
      operator: 'alt' | 'opt' | 'loop' | 'break';
      operands: { guard: string; items: SeqGenItem[] }[];
    }
  | { type: 'ref'; id: string; name: string; useCaseId: string; covers: string[]; stepId?: string };

export interface SequenceGraph {
  lifelines: SeqGenLifeline[];
  items: SeqGenItem[];
}

export interface SeqGenContext {
  actorName: (id: string) => string;
  /** Tên use case (Control `<TenUC>Controller`, Boundary mặc định). */
  useCaseName: string;
  /** Tên use case được include (ref). */
  useCaseNameOf?: (id: string) => string;
  /** class trong project theo tên (gắn baseClassifier cho entity chưa khai báo classId). */
  classIdOf?: (name: string) => string | undefined;
}

const PREPOSITIONS = new Set([
  'vào',
  'ra',
  'cho',
  'của',
  'trong',
  'tại',
  'từ',
  'với',
  'theo',
  'bằng',
  'qua',
  'lên',
  'xuống',
  'trên',
  'đến',
  'tới',
]);

/** Bỏ dấu tiếng Việt. */
export const unaccent = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

/** "Check-in xe vào bãi" → "CheckInXe" (bỏ cụm giới từ phía sau, không dấu, PascalCase). */
export function controllerBase(useCaseName: string): string {
  const words = useCaseName.trim().split(/\s+/);
  const cut = words.findIndex((w, i) => i > 0 && PREPOSITIONS.has(w.toLowerCase()));
  const kept = (cut > 0 ? words.slice(0, cut) : words).join(' ');
  return pascal(kept) || 'UseCase';
}

export const pascal = (s: string) =>
  unaccent(s)
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join('');

const opName = (s: string) => s.replace(/\(.*$/s, '').trim();
const clean = (s: string) => s.trim().replace(/[.。]+$/, '');
const DISPLAY = /^(hiển thị|thông báo|báo lỗi)/i;

export function specToSequence(spec: UseCaseSpec, ctx: SeqGenContext): SequenceGraph {
  const lifelines: SeqGenLifeline[] = [];
  const add = (l: Omit<SeqGenLifeline, 'id'>) => {
    const ex = lifelines.find((x) => x.kind === l.kind && x.name === l.name);
    if (ex) return ex.id;
    const id = uid('ll');
    lifelines.push({ ...l, id });
    return id;
  };
  const allSteps = [
    ...spec.mainFlow,
    ...spec.alternativeFlows.flatMap((f) => f.steps),
    ...spec.exceptionFlows.flatMap((f) => f.steps),
  ];
  const acting = new Set(allSteps.flatMap((s) => (s.performer.kind === 'actor' ? [s.performer.actorId] : [])));
  const actorIds = [...spec.primaryActors, ...spec.secondaryActors.filter((a) => acting.has(a))];
  for (const a of acting) if (!actorIds.includes(a)) actorIds.push(a);
  const actorLl = new Map(actorIds.map((a) => [a, add({ kind: 'actor', name: ctx.actorName(a), actorId: a })]));
  const screens = spec.screens.length ? spec.screens.map((s) => s.name) : [`Giao diện ${ctx.useCaseName}`];
  for (const s of screens) add({ kind: 'boundary', name: s });
  const boundary0 = lifelines.find((l) => l.kind === 'boundary')!.id;
  const control = add({ kind: 'control', name: `${controllerBase(ctx.useCaseName)}Controller` });
  const entity = (name: string, classId?: string) =>
    add({ kind: 'entity', name, classId: classId ?? ctx.classIdOf?.(name) });
  for (const e of spec.entities) entity(e.name, e.classId);
  // entity / hệ thống ngoài được nhắc trong bước nhưng chưa khai báo
  for (const s of allSteps)
    if (s.interaction?.target === 'entity' && s.interaction.targetName) entity(s.interaction.targetName);
  for (const s of allSteps)
    if (s.interaction?.target === 'external')
      add({ kind: 'lifeline', name: s.interaction.targetName || 'Hệ thống ngoài' });
  const boundaryOf = (name?: string) =>
    (name && lifelines.find((l) => l.kind === 'boundary' && l.name === name)?.id) || boundary0;

  // ------- trạng thái mô phỏng: Boundary đang chờ Control xử lý lượt của actor -------
  interface State {
    actor: string | null;
    boundary: string;
    /** bước actor vừa gửi tới Boundary, chưa chuyển cho Control. */
    pending: string | null;
    /** Control đang xử lý (đã chuyển). */
    open: boolean;
  }
  let st: State = {
    actor: actorLl.get(spec.primaryActors[0] ?? '') ?? null,
    boundary: boundary0,
    pending: null,
    open: false,
  };
  const msg = (kind: SeqMsgKind, from: string, to: string, name: string, stepId?: string): SeqGenItem => ({
    type: 'msg',
    msg: { id: uid('msg'), kind, from, to, name, stepId },
  });

  const emitStep = (s: Step, last: boolean): SeqGenItem[] => {
    const out: SeqGenItem[] = [];
    const it = s.interaction;
    const text = clean(s.text) || `Bước ${s.no}`;
    if (s.includeUseCaseId) {
      const covers = [st.actor, st.boundary, control].filter(Boolean) as string[];
      out.push({
        type: 'ref',
        id: uid('ref'),
        name: ctx.useCaseNameOf?.(s.includeUseCaseId) ?? text,
        useCaseId: s.includeUseCaseId,
        covers,
        stepId: s.id,
      });
      return out;
    }
    if (s.performer.kind === 'actor') {
      const a = actorLl.get(s.performer.actorId)!;
      const b = boundaryOf(it?.target === 'ui' ? it.targetName : undefined);
      const name = it?.message || text;
      out.push(msg(it?.kind === 'async' ? 'async' : 'sync', a, b, name, s.id));
      st = { actor: a, boundary: b, pending: name, open: false };
      return out;
    }
    // bước hệ thống: Boundary chuyển lượt của actor cho Control
    if (st.pending !== null) {
      const n = pascal(opName(st.pending)) || 'YeuCau';
      out.push(msg('sync', st.boundary, control, `xuLy${n}()`));
      st = { ...st, pending: null, open: true };
    }
    if (it?.target === 'entity' || it?.target === 'external') {
      const to =
        it.target === 'entity'
          ? entity(it.targetName || spec.entities[0]?.name || 'Entity')
          : add({ kind: 'lifeline', name: it.targetName || 'Hệ thống ngoài' });
      const kind: SeqMsgKind =
        it.kind === 'create' ? 'create' : it.kind === 'async' ? 'async' : it.kind === 'destroy' ? 'destroy' : 'sync';
      out.push(msg(kind, control, to, it.message || text, s.id));
      if (it.returns && kind !== 'async' && kind !== 'destroy') out.push(msg('reply', to, control, it.returns));
      return out;
    }
    if (it?.target === 'ui' || DISPLAY.test(text)) {
      const b = boundaryOf(it?.target === 'ui' ? it.targetName : undefined);
      if (last && st.open && st.actor) {
        // kết thúc luồng: trả kết quả về Boundary rồi về actor
        out.push(msg('reply', control, b, it?.message || text, s.id));
        out.push(msg('reply', b, st.actor, ''));
        st = { ...st, open: false };
      } else out.push(msg('sync', control, b, it?.message || `hienThi("${text}")`, s.id));
      return out;
    }
    out.push(msg('self', control, control, it?.message || text, s.id));
    return out;
  };

  /** Bước lặp → `loop [until …]` bao các message của bước (message Boundary chuyển cho Control nằm ngoài). */
  const withLoop = (s: Step, items: SeqGenItem[]): SeqGenItem[] => {
    if (!s.loop) return items;
    const lead = items[0]?.type === 'msg' && !items[0].msg.stepId ? [items[0]] : [];
    const body = items.slice(lead.length);
    return [
      ...lead,
      {
        type: 'fragment',
        id: uid('frag'),
        operator: 'loop',
        operands: [{ guard: `until ${s.loop.until}`, items: body }],
      },
    ];
  };

  const emitSteps = (steps: Step[], endsFlow: boolean) =>
    steps.flatMap((s, i) => withLoop(s, emitStep(s, endsFlow && i === steps.length - 1)));

  const flows = [...spec.alternativeFlows, ...spec.exceptionFlows];
  const guardOf = (name: string, cond: string) => {
    const g = clean(name) || clean(cond);
    return g ? g[0].toLowerCase() + g.slice(1) : 'điều kiện';
  };

  /** Luồng chính từ bước số `from` tới `to` (gồm), lồng alt tại các điểm rẽ. */
  const emitMain = (from: number, to: number): SeqGenItem[] => {
    const out: SeqGenItem[] = [];
    let n = from;
    while (n <= to) {
      const s = spec.mainFlow.find((x) => x.no === n);
      if (!s) {
        n++;
        continue;
      }
      const branches = flows.filter((f) => f.branchAt === n);
      out.push(...withLoop(s, emitStep(s, !branches.length && n === spec.mainFlow.length)));
      if (!branches.length) {
        n++;
        continue;
      }
      // phần luồng chính bị rẽ: tới trước bước quay lại, hoặc tới hết nếu luồng rẽ kết thúc
      const rangeEnd = Math.min(
        to,
        Math.max(...branches.map((f) => (f.end.kind === 'returnTo' ? f.end.stepNo - 1 : to))),
      );
      const saved = st;
      const operands = branches.map((f) => {
        st = saved;
        const items = emitSteps(f.steps, f.end.kind !== 'returnTo');
        return { guard: guardOf(f.name, f.condition), items };
      });
      st = saved;
      operands.push({ guard: 'else', items: emitMain(n + 1, rangeEnd) });
      out.push({ type: 'fragment', id: uid('frag'), operator: 'alt', operands });
      n = rangeEnd + 1;
    }
    return out;
  };

  const items = emitMain(1, spec.mainFlow.length);
  // kết thúc thành công: Control → Boundary → actor
  if (st.open && st.actor) {
    items.push(msg('reply', control, st.boundary, spec.postconditions.success[0] ?? ''));
    items.push(msg('reply', st.boundary, st.actor, ''));
  }
  // bỏ lifeline không có message nào (trừ actor chính, boundary đầu, control)
  const used = new Set<string>([boundary0, control, ...(actorIds[0] ? [actorLl.get(actorIds[0])!] : [])]);
  const walk = (xs: SeqGenItem[]) => {
    for (const x of xs) {
      if (x.type === 'msg') used.add(x.msg.from).add(x.msg.to);
      else if (x.type === 'ref') x.covers.forEach((c) => used.add(c));
      else x.operands.forEach((o) => walk(o.items));
    }
  };
  walk(items);
  const declared = new Set(spec.entities.map((e) => e.name));
  return {
    lifelines: lifelines.filter((l) => used.has(l.id) || (l.kind === 'entity' && declared.has(l.name))),
    items,
  };
}

// ------------------------------------------------------------ bố cục ------------------------------------------------

/** ~6.6px/ký tự ở cỡ 12.5px. */
const textW = (s: string, px = 6.6) => Math.round(s.length * px);
export const SEQ_HEAD: Record<SeqLifelineKind, number> = {
  lifeline: 40,
  actor: 64,
  boundary: 64,
  control: 64,
  entity: 64,
};
export const seqHeadWidth = (kind: SeqLifelineKind, name: string) =>
  kind === 'lifeline' ? Math.max(100, textW(name) + 28) : Math.max(80, textW(name) + 16);

export interface SeqLayout {
  lifelines: Map<string, { cx: number; w: number; top: number; head: number }>;
  messages: Map<string, { y: number }>;
  fragments: Map<string, { x: number; y: number; w: number; h: number; dividers: number[] }>;
  refs: Map<string, { x: number; y: number; w: number; h: number }>;
  bottom: number;
  width: number;
}

/** Bố cục cố định (generators.md mục 2): lifeline cách nhau max(160, tên + 40); message cách 36px; fragment +28 đầu, +12 cuối. */
export function layoutSequence(g: SequenceGraph, o: { top?: number; left?: number } = {}): SeqLayout {
  const top = o.top ?? 40;
  const idx = new Map(g.lifelines.map((l, i) => [l.id, i]));
  const widths = g.lifelines.map((l) => seqHeadWidth(l.kind, l.name));
  // khoảng cách tối thiểu giữa 2 lifeline kề nhau theo nhãn message
  const need = g.lifelines.map(() => 0);
  const walkMsgs = (xs: SeqGenItem[], f: (m: SeqGenMessage) => void) => {
    for (const x of xs)
      if (x.type === 'msg') f(x.msg);
      else if (x.type === 'fragment') x.operands.forEach((op) => walkMsgs(op.items, f));
  };
  walkMsgs(g.items, (m) => {
    const a = idx.get(m.from)!;
    const b = idx.get(m.to)!;
    if (a === b) return;
    const lo = Math.min(a, b);
    const span = Math.abs(a - b);
    const w = (textW(m.name) + 50) / span;
    for (let i = lo + 1; i <= lo + span; i++) need[i] = Math.max(need[i], w);
  });
  const cxs: number[] = [];
  g.lifelines.forEach((_, i) => {
    if (i === 0) cxs.push((o.left ?? 40) + widths[0] / 2);
    else cxs.push(cxs[i - 1] + Math.max(160, (widths[i - 1] + widths[i]) / 2 + 40, need[i]));
  });
  const head = Math.max(...g.lifelines.map((l) => SEQ_HEAD[l.kind]));
  const lay: SeqLayout = {
    lifelines: new Map(g.lifelines.map((l, i) => [l.id, { cx: cxs[i], w: widths[i], top, head: SEQ_HEAD[l.kind] }])),
    messages: new Map(),
    fragments: new Map(),
    refs: new Map(),
    bottom: 0,
    width: 0,
  };
  let y = top + head + 36;
  const cols = (xs: SeqGenItem[]): number[] => {
    const out: number[] = [];
    for (const x of xs)
      if (x.type === 'msg') out.push(idx.get(x.msg.from)!, idx.get(x.msg.to)!);
      else if (x.type === 'ref') out.push(...x.covers.map((c) => idx.get(c)!));
      else x.operands.forEach((op) => out.push(...cols(op.items)));
    return out;
  };
  /** trả về [x1, x2] đã dùng (để fragment ngoài bao trọn fragment trong). */
  const place = (xs: SeqGenItem[]): [number, number] => {
    let x1 = Infinity;
    let x2 = -Infinity;
    for (const x of xs) {
      if (x.type === 'msg') {
        lay.messages.set(x.msg.id, { y });
        const a = cxs[idx.get(x.msg.from)!];
        const b = cxs[idx.get(x.msg.to)!];
        x1 = Math.min(x1, a, b);
        x2 = Math.max(x2, a, b + (x.msg.from === x.msg.to ? SEQ.selfW + 10 : 0));
        if (x.msg.kind === 'create') {
          const l = lay.lifelines.get(x.msg.to)!;
          l.top = y - l.head / 2;
          y += l.head / 2;
        }
        y += x.msg.from === x.msg.to ? 36 + SEQ.selfH : 36;
      } else if (x.type === 'ref') {
        const cs = x.covers.map((c) => idx.get(c)!);
        const rx1 = cxs[Math.min(...cs)] - 50;
        const rx2 = cxs[Math.max(...cs)] + 50;
        lay.refs.set(x.id, { x: rx1, y: y - 22, w: rx2 - rx1, h: 40 });
        x1 = Math.min(x1, rx1);
        x2 = Math.max(x2, rx2);
        y += 54;
      } else {
        // khung bắt đầu ngay dưới message trước; nhãn message nằm trên đường ~14px
        const cs = cols([x]);
        const f0 = y - 22;
        y += 28;
        const dividers: number[] = [];
        let fx1 = cxs[Math.min(...cs)] - 60;
        let fx2 = cxs[Math.max(...cs)] + 60;
        x.operands.forEach((op, i) => {
          if (i > 0) {
            dividers.push(y - 22 - f0);
            y += 24;
          }
          if (!op.items.length) y += 12;
          const [a, b] = place(op.items);
          fx1 = Math.min(fx1, a - 14);
          fx2 = Math.max(fx2, b + 14);
        });
        const bottom = y - 22;
        lay.fragments.set(x.id, { x: fx1, y: f0, w: fx2 - fx1, h: bottom - f0, dividers });
        y += 12;
        x1 = Math.min(x1, fx1);
        x2 = Math.max(x2, fx2);
      }
    }
    return [x1, x2];
  };
  place(g.items);
  lay.bottom = y + 20;
  lay.width = cxs.length ? cxs[cxs.length - 1] + widths[widths.length - 1] / 2 : 0;
  return lay;
}

const SHAPE: Record<SeqLifelineKind, string> = {
  lifeline: 'seq.lifeline',
  actor: 'seq.actor',
  boundary: 'seq.boundary',
  control: 'seq.control',
  entity: 'seq.entity',
};

/** Đồ thị + bố cục → views / connectors / model (lifeline dùng `uml.lifeline`, actor dùng chính Actor của project). */
export function sequenceDiagram(
  g: SequenceGraph,
  lay: SeqLayout,
  o: { refDiagramOf?: (useCaseId: string) => string | undefined } = {},
): { views: View[]; connectors: Connector[]; model: ModelElement[] } {
  const views: View[] = [];
  const model: ModelElement[] = [];
  const viewOf = new Map<string, string>();
  let z = 0;
  const frags: View[] = [];
  const walk = (xs: SeqGenItem[]) => {
    for (const x of xs) {
      if (x.type === 'fragment') {
        const b = lay.fragments.get(x.id)!;
        frags.push({
          id: uid('v'),
          shape: 'seq.fragment',
          modelId: null,
          ...b,
          z: 0,
          parentId: null,
          props: {
            operator: x.operator,
            operands: x.operands.map((op, i) => ({ guard: op.guard, y: i === 0 ? 0 : b.dividers[i - 1] })),
            min: '',
            max: '',
          },
          style: {},
        } as View);
        x.operands.forEach((op) => walk(op.items));
      } else if (x.type === 'ref') {
        const b = lay.refs.get(x.id)!;
        frags.push({
          id: uid('v'),
          shape: 'seq.ref',
          modelId: null,
          ...b,
          z: 0,
          parentId: null,
          props: {
            name: x.name,
            refDiagramId: o.refDiagramOf?.(x.useCaseId) ?? '',
            arguments: '',
            returnValue: '',
            ...(x.stepId ? { sourceStepId: x.stepId } : {}),
          },
          style: {},
        });
      }
    }
  };
  walk(g.items);
  // fragment ngoài vẽ trước (bên dưới)
  for (const f of frags.sort((a, b) => b.w * b.h - a.w * a.h)) views.push({ ...f, z: z++ });
  for (const l of g.lifelines) {
    const p = lay.lifelines.get(l.id)!;
    const id = uid('v');
    viewOf.set(l.id, id);
    let modelId: string | null = l.actorId ?? null;
    if (!modelId) {
      const m: ModelElement =
        l.kind === 'actor'
          ? {
              id: uid('m'),
              kind: 'uml.actor',
              name: l.name,
              data: { description: '', isBusiness: false, type: 'user' },
            }
          : {
              id: uid('m'),
              kind: 'uml.lifeline',
              name: l.name,
              data: { baseClassifier: l.classId ?? '', stereotype: l.kind === 'lifeline' ? '' : l.kind },
            };
      model.push(m);
      modelId = m.id;
    }
    views.push({
      id,
      shape: SHAPE[l.kind],
      modelId,
      x: Math.round(p.cx - p.w / 2),
      y: Math.round(p.top),
      w: p.w,
      h: Math.round(lay.bottom - p.top),
      z: z++,
      parentId: null,
      props: {},
      style: {},
    });
  }
  const connectors: Connector[] = [];
  const walkMsgs = (xs: SeqGenItem[]) => {
    for (const x of xs)
      if (x.type === 'msg') {
        const y = lay.messages.get(x.msg.id)!.y;
        connectors.push({
          id: uid('c'),
          kind: `seq.${x.msg.kind}`,
          modelId: null,
          source: { viewId: viewOf.get(x.msg.from)!, y },
          target: { viewId: viewOf.get(x.msg.to)!, y },
          routing: 'straight',
          waypoints: [],
          labels: [],
          props: { name: x.msg.name, ...(x.msg.stepId ? { sourceStepId: x.msg.stepId } : {}) },
          style: {},
          z: z++,
        });
      } else if (x.type === 'fragment') x.operands.forEach((op) => walkMsgs(op.items));
  };
  walkMsgs(g.items);
  return { views, connectors, model };
}

/** Đánh số / activation của sơ đồ sinh ra (để test & kiểm tra nhanh). */
export function sequenceNumbers(g: SequenceGraph, lay: SeqLayout): Map<string, string> {
  const msgs: { id: string; kind: SeqMsgKind; from: string; to: string; y: number }[] = [];
  const alternatives: { y: number; dividers: number[] }[] = [];
  const walk = (xs: SeqGenItem[]) => {
    for (const x of xs)
      if (x.type === 'msg') msgs.push({ ...x.msg, y: lay.messages.get(x.msg.id)!.y });
      else if (x.type === 'fragment') {
        const f = lay.fragments.get(x.id)!;
        if (x.operator === 'alt') alternatives.push({ y: f.y, dividers: f.dividers.map((d) => f.y + d) });
        x.operands.forEach((op) => walk(op.items));
      }
  };
  walk(g.items);
  const r = computeSequence(
    g.lifelines.map((l) => ({ id: l.id, cx: lay.lifelines.get(l.id)!.cx })),
    msgs,
    { alternatives },
  );
  return new Map([...r.messages].map(([id, m]) => [id, m.number]));
}
