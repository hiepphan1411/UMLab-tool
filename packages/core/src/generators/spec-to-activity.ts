// Đặc tả use case → Activity Diagram (docs/spec/generators.md mục 1). Hàm thuần: specToActivity dựng đồ thị
// (làn / node / luồng), layoutActivity xếp toạ độ (làn dọc, xếp theo tầng), activityDiagram ra views/connectors.
import type { Connector, ModelElement, View } from '../format/types';
import type { Flow, Step, UseCaseSpec } from '../spec/model';
import { uid } from '../util/ids';

export type ActNodeKind = 'initial' | 'action' | 'callBehavior' | 'decision' | 'merge' | 'final' | 'flowFinal';

export interface ActLane {
  id: string;
  name: string;
  /** actor được làn đại diện (`represents`); không có = Hệ thống. */
  actorId?: string;
}

export interface ActNode {
  id: string;
  kind: ActNodeKind;
  name: string;
  laneId: string;
  /** Bước đặc tả sinh ra node (liên kết 2 chiều bước ↔ hình). */
  stepId?: string;
  includeUseCaseId?: string;
}

export interface ActEdge {
  id: string;
  from: string;
  to: string;
  guard?: string;
}

export interface ActivityGraph {
  lanes: ActLane[];
  nodes: ActNode[];
  edges: ActEdge[];
}

export interface GenContext {
  actorName: (id: string) => string;
}

const SYSTEM = 'lane:system';
const laneOf = (s: Step) => (s.performer.kind === 'actor' ? `lane:${s.performer.actorId}` : SYSTEM);

export function specToActivity(spec: UseCaseSpec, ctx: GenContext): ActivityGraph {
  const flows: Flow[] = [...spec.alternativeFlows, ...spec.exceptionFlows];
  const allSteps = [...spec.mainFlow, ...flows.flatMap((f) => f.steps)];
  // làn: actor chính → actor phụ → actor khác (theo thứ tự xuất hiện) → Hệ thống; chỉ performer có bước
  const used = new Set(allSteps.map(laneOf));
  const order: string[] = [];
  const push = (k: string) => used.has(k) && !order.includes(k) && order.push(k);
  for (const a of spec.primaryActors) push(`lane:${a}`);
  for (const a of spec.secondaryActors) push(`lane:${a}`);
  for (const s of allSteps) if (s.performer.kind === 'actor') push(laneOf(s));
  push(SYSTEM);
  if (!order.length) order.push(SYSTEM);
  const lanes: ActLane[] = order.map((k) =>
    k === SYSTEM ? { id: k, name: 'Hệ thống' } : { id: k, name: ctx.actorName(k.slice(5)), actorId: k.slice(5) },
  );

  const nodes: ActNode[] = [];
  const edges: ActEdge[] = [];
  let n = 0;
  const node = (kind: ActNodeKind, name: string, laneId: string, extra: Partial<ActNode> = {}) => {
    const x: ActNode = { id: `n${++n}`, kind, name, laneId, ...extra };
    nodes.push(x);
    return x.id;
  };
  const edge = (from: string, to: string, guard?: string) =>
    edges.push({ id: `e${edges.length + 1}`, from, to, ...(guard ? { guard } : {}) });
  const actionOf = (s: Step) =>
    node(s.includeUseCaseId ? 'callBehavior' : 'action', s.text.trim() || `Bước ${s.no}`, laneOf(s), {
      stepId: s.id,
      ...(s.includeUseCaseId ? { includeUseCaseId: s.includeUseCaseId } : {}),
    });

  const main = spec.mainFlow;
  const firstLane = main[0] ? laneOf(main[0]) : order[0];
  const initial = node('initial', '', firstLane);
  let finalId: string | null = null;
  const activityFinal = (lane: string) => (finalId ??= node('final', '', lane));

  // Merge trước bước m: khi có luồng quay lại m, hoặc bước m có vòng lặp
  const needMerge = new Set<number>();
  for (const f of flows)
    if (f.end.kind === 'returnTo' && f.end.stepNo >= 1 && f.end.stepNo <= main.length) needMerge.add(f.end.stepNo);
  main.forEach((s) => s.loop && needMerge.add(s.no));
  const merge = new Map<number, string>();
  for (const m of [...needMerge].sort((a, b) => a - b)) merge.set(m, node('merge', '', laneOf(main[m - 1])));
  const actions = main.map(actionOf);
  /** Node phải đi vào để tới bước m (merge nếu có). */
  const entry = (m: number) => merge.get(m) ?? actions[m - 1];
  for (const [m, id] of merge) edge(id, actions[m - 1]);

  if (main.length) edge(initial, entry(1));
  else edge(initial, activityFinal(firstLane));

  main.forEach((s, i) => {
    const lane = laneOf(s);
    if (!s.loop) {
      connectBranches(s.no, actions[i], lane);
      return;
    }
    // vòng lặp: [chưa until] quay về merge trước bước, [until] đi tiếp
    const d = node('decision', '', lane, { stepId: s.id });
    edge(actions[i], d);
    edge(d, merge.get(s.no)!, `[chưa ${s.loop.until}]`);
    connectBranches(s.no, d, lane, `[${s.loop.until}]`);
  });

  /**
   * Sau bước n: nếu có luồng rẽ thì Decision (nhánh chính [else] / [điều kiện] từng luồng), rồi nối tới bước kế
   * (hoặc Activity Final nếu là bước cuối).
   */
  function connectBranches(no: number, from: string, lane: string, firstGuard?: string): void {
    const branches = flows.filter((f) => f.branchAt === no);
    const next = no < main.length ? entry(no + 1) : activityFinal(lane);
    if (!branches.length) {
      edge(from, next, firstGuard);
      return;
    }
    const d = node('decision', '', lane, { stepId: main[no - 1].id });
    edge(from, d, firstGuard);
    edge(d, next, '[else]');
    for (const f of branches) {
      const guard = `[${f.condition || f.name}]`;
      let prev = d;
      let g: string | undefined = guard;
      for (const st of f.steps) {
        const a = actionOf(st);
        edge(prev, a, g);
        g = undefined;
        prev = a;
      }
      const lastLane = f.steps.length ? laneOf(f.steps[f.steps.length - 1]) : lane;
      let target: string;
      if (f.end.kind === 'returnTo' && f.end.stepNo >= 1 && f.end.stepNo <= main.length) target = entry(f.end.stepNo);
      else if (f.end.kind === 'endFailure') target = node('flowFinal', '', lastLane);
      else target = activityFinal(lastLane);
      edge(prev, target, g);
    }
  }

  return { lanes, nodes, edges };
}

// ---------------- bố cục: làn dọc, xếp tầng theo đường dài nhất (bỏ cạnh ngược) ----------------

export interface ActLayout {
  lanes: { id: string; x: number; w: number }[];
  nodes: Map<string, { x: number; y: number; w: number; h: number }>;
  width: number;
  height: number;
  header: number;
}

/** Kích thước ước lượng (renderer tự giãn lại khi sửa). */
export function actNodeSize(n: Pick<ActNode, 'kind' | 'name'>): { w: number; h: number } {
  if (n.kind === 'initial') return { w: 26, h: 26 };
  if (n.kind === 'final' || n.kind === 'flowFinal') return { w: 28, h: 28 };
  if (n.kind === 'decision' || n.kind === 'merge') return { w: 36, h: 36 };
  // chữ 12.5px ~ 6.6px/ký tự, xuống dòng khi > 200px
  const chars = n.name.length;
  const w = Math.min(200, Math.max(110, Math.round(chars * 6.6) + 28));
  const lines = Math.max(1, Math.ceil((chars * 6.6) / (w - 24)));
  return { w, h: Math.max(42, 20 + lines * 17) };
}

export function layoutActivity(
  g: ActivityGraph,
  size: (n: ActNode) => { w: number; h: number } = actNodeSize,
  o: { header?: number; gapY?: number; gapX?: number; padX?: number } = {},
): ActLayout {
  const header = o.header ?? 34;
  const gapY = o.gapY ?? 44;
  const gapX = o.gapX ?? 32;
  const padX = o.padX ?? 28;
  const out = new Map<string, string[]>();
  for (const e of g.edges) out.set(e.from, [...(out.get(e.from) ?? []), e.to]);
  // cạnh ngược (vòng lặp / quay lại) bằng DFS
  const back = new Set<string>();
  const state = new Map<string, 1 | 2>();
  const dfs = (u: string) => {
    state.set(u, 1);
    for (const v of out.get(u) ?? []) {
      if (state.get(v) === 1) back.add(`${u}>${v}`);
      else if (!state.has(v)) dfs(v);
    }
    state.set(u, 2);
  };
  for (const n of g.nodes) if (!state.has(n.id)) dfs(n.id);
  // tầng = đường dài nhất từ gốc trên DAG (Kahn)
  const indeg = new Map(g.nodes.map((n) => [n.id, 0]));
  const fwd = g.edges.filter((e) => !back.has(`${e.from}>${e.to}`));
  for (const e of fwd) indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
  const rank = new Map(g.nodes.map((n) => [n.id, 0]));
  const queue = g.nodes.filter((n) => !indeg.get(n.id)).map((n) => n.id);
  while (queue.length) {
    const u = queue.shift()!;
    for (const e of fwd)
      if (e.from === u) {
        rank.set(e.to, Math.max(rank.get(e.to)!, rank.get(u)! + 1));
        indeg.set(e.to, indeg.get(e.to)! - 1);
        if (!indeg.get(e.to)) queue.push(e.to);
      }
  }
  const maxRank = Math.max(0, ...rank.values());
  const sizes = new Map(g.nodes.map((n) => [n.id, size(n)]));
  // mỗi (tầng, làn): các node xếp ngang trong làn
  const cell = (r: number, lane: string) => g.nodes.filter((n) => rank.get(n.id) === r && n.laneId === lane);
  const laneW = g.lanes.map((l) => {
    let w = 180;
    for (let r = 0; r <= maxRank; r++) {
      const c = cell(r, l.id);
      const sum = c.reduce((s, n) => s + sizes.get(n.id)!.w, 0) + Math.max(0, c.length - 1) * gapX;
      w = Math.max(w, sum + padX * 2);
    }
    return w;
  });
  const lanes: ActLayout['lanes'] = [];
  let x = 0;
  g.lanes.forEach((l, i) => {
    lanes.push({ id: l.id, x, w: laneW[i] });
    x += laneW[i];
  });
  const nodes = new Map<string, { x: number; y: number; w: number; h: number }>();
  let y = header + 28;
  for (let r = 0; r <= maxRank; r++) {
    const row = g.nodes.filter((n) => rank.get(n.id) === r);
    if (!row.length) continue;
    const rowH = Math.max(...row.map((n) => sizes.get(n.id)!.h));
    for (const l of lanes) {
      const c = cell(r, l.id);
      if (!c.length) continue;
      const total = c.reduce((s, n) => s + sizes.get(n.id)!.w, 0) + (c.length - 1) * gapX;
      let cx = l.x + (l.w - total) / 2;
      for (const n of c) {
        const s = sizes.get(n.id)!;
        nodes.set(n.id, { x: Math.round(cx), y: Math.round(y + (rowH - s.h) / 2), w: s.w, h: s.h });
        cx += s.w + gapX;
      }
    }
    y += rowH + gapY;
  }
  return { lanes, nodes, width: x, height: y + 8, header };
}

// ---------------- ra sơ đồ ----------------

const SHAPE: Record<ActNodeKind, string> = {
  initial: 'act.initial',
  action: 'act.action',
  callBehavior: 'act.callBehavior',
  decision: 'act.decision',
  merge: 'act.merge',
  final: 'act.final',
  flowFinal: 'act.flowFinal',
};

/** Đồ thị + bố cục → views / connectors / model (Action dùng phần tử `uml.action`). */
export function activityDiagram(
  g: ActivityGraph,
  lay: ActLayout,
  o: { behaviorOf?: (useCaseId: string) => string | undefined; origin?: { x: number; y: number } } = {},
): { views: View[]; connectors: Connector[]; model: ModelElement[] } {
  const ox = o.origin?.x ?? 40;
  const oy = o.origin?.y ?? 40;
  const views: View[] = [];
  const model: ModelElement[] = [];
  const swim = uid('v');
  views.push({
    id: swim,
    shape: 'act.swimlaneV',
    modelId: null,
    x: ox,
    y: oy,
    w: lay.width,
    h: lay.height,
    z: 0,
    parentId: null,
    props: {
      header: lay.header,
      lanes: g.lanes.map((l, i) => ({
        id: l.id,
        name: l.name,
        size: lay.lanes[i].w,
        ...(l.actorId ? { represents: l.actorId } : {}),
      })),
    },
    style: {},
  });
  const viewOf = new Map<string, string>();
  let z = 1;
  for (const n of g.nodes) {
    const b = lay.nodes.get(n.id)!;
    const id = uid('v');
    viewOf.set(n.id, id);
    let modelId: string | null = null;
    if (n.kind === 'action' || n.kind === 'callBehavior') {
      const m: ModelElement = {
        id: uid('m'),
        kind: 'uml.action',
        name: n.name,
        data:
          n.kind === 'callBehavior'
            ? { behavior: o.behaviorOf?.(n.includeUseCaseId ?? '') ?? '', useCaseId: n.includeUseCaseId ?? '' }
            : {},
      };
      model.push(m);
      modelId = m.id;
    }
    views.push({
      id,
      shape: SHAPE[n.kind],
      modelId,
      x: ox + b.x,
      y: oy + b.y,
      w: b.w,
      h: b.h,
      z: z++,
      parentId: swim,
      props: {
        ...(n.stepId ? { sourceStepId: n.stepId } : {}),
        laneId: n.laneId,
        ...(n.kind === 'action' || n.kind === 'callBehavior' ? { autoSize: true } : {}),
      },
      style: {},
    });
  }
  const connectors: Connector[] = g.edges.map((e) => ({
    id: uid('c'),
    kind: 'act.controlFlow',
    modelId: null,
    source: { viewId: viewOf.get(e.from)! },
    target: { viewId: viewOf.get(e.to)! },
    routing: 'orthogonal',
    waypoints: [],
    labels: [],
    props: { name: '', guard: e.guard ? e.guard.replace(/^\[|\]$/g, '') : '', weight: '' },
    style: {},
    z: z++,
  }));
  return { views, connectors, model };
}
