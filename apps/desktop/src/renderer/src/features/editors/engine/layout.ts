// Tự bố cục bằng elkjs (layered) cho vùng chọn hoặc cả sơ đồ: hướng trên-xuống / trái-phải.
import type { Engine } from './engine';
import { getShape } from './registry';

type ElkNode = {
  id: string;
  x?: number;
  y?: number;
  width: number;
  height: number;
  children?: ElkNode[];
  edges?: { id: string; sources: string[]; targets: string[] }[];
  layoutOptions?: Record<string, string>;
};
type ElkApi = { layout(graph: ElkNode): Promise<ElkNode> };

let elkPromise: Promise<ElkApi> | null = null;
export function elk(): Promise<ElkApi> {
  elkPromise ??= import('elkjs/lib/elk.bundled.js').then((m) => new (m.default as unknown as new () => ElkApi)());
  return elkPromise;
}

export async function autoLayout(e: Engine, direction: 'DOWN' | 'RIGHT', onlySelection: boolean): Promise<number> {
  const st = e.state;
  const pool = onlySelection && st.sel.size > 1 ? [...st.sel] : st.order.filter((v) => !v.parentId).map((v) => v.id);
  const ids = pool.filter((id) => {
    const v = e.lookup.view(id);
    return v && !v.locked && !v.hidden && !getShape(v.shape)?.attach;
  });
  if (ids.length < 2) return 0;
  const set = new Set(ids);
  const top = (id: string | null): string | null => {
    let cur = id ? e.lookup.view(id) : undefined;
    let g = 0;
    while (cur && !set.has(cur.id) && cur.parentId && g++ < 12) cur = e.lookup.view(cur.parentId);
    return cur && set.has(cur.id) ? cur.id : null;
  };
  const edges = e.lookup
    .conns()
    .map((c) => ({ id: c.id, s: top(c.source.viewId), t: top(c.target.viewId) }))
    .filter((x) => x.s && x.t && x.s !== x.t)
    .map((x) => ({ id: x.id, sources: [x.s!], targets: [x.t!] }));
  const nodes = ids.map((id) => {
    const v = e.lookup.view(id)!;
    return { id, width: v.w, height: v.h };
  });
  const minX = Math.min(...ids.map((id) => e.lookup.view(id)!.x));
  const minY = Math.min(...ids.map((id) => e.lookup.view(id)!.y));
  const res = await (
    await elk()
  ).layout({
    id: 'root',
    width: 0,
    height: 0,
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction,
      'elk.spacing.nodeNode': '36',
      'elk.layered.spacing.nodeNodeBetweenLayers': '56',
      'elk.edgeRouting': 'ORTHOGONAL',
    },
    children: nodes,
    edges,
  });
  e.apply((tx) => {
    for (const n of res.children ?? []) {
      const v = tx.view(n.id);
      if (!v) continue;
      const nx = Math.round(minX + (n.x ?? 0));
      const ny = Math.round(minY + (n.y ?? 0));
      const dx = nx - v.x;
      const dy = ny - v.y;
      for (const k of e.descendants([n.id])) tx.setView(k, (kv) => ({ ...kv, x: kv.x + dx, y: kv.y + dy }));
    }
    // bỏ điểm uốn cũ của các đường liên quan để định tuyến lại
    for (const c of e.lookup.conns())
      if (set.has(top(c.source.viewId) ?? '') && c.waypoints.length)
        tx.setConn(c.id, { waypoints: [], routing: 'orthogonal' });
  });
  return ids.length;
}
