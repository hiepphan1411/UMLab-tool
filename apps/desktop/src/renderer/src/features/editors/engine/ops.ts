// Thao tác editor dùng chung: tạo hình/đường nối, xoá, nhân bản, sao chép/dán, căn chỉnh, z-order, nhóm, container.
import {
  deleteModelEverywhere,
  uid,
  viewsMap,
  type Connector,
  type Endpoint,
  type ModelElement,
  type Style,
  type View,
} from '@umlab/core';
import type { Engine } from './engine';
import { inside, unionBox, type Box } from './geometry';
import { accepts, getConnector, getShape, type EngineLookup, type Tx, type ViewCtx } from './registry';

export const GRID = 10;

export function viewCtx(lookup: EngineLookup, v: View): ViewCtx {
  return { view: v, def: getShape(v.shape), model: v.modelId ? (lookup.model(v.modelId) ?? null) : null };
}

const maxZ = (views: Iterable<View>) => {
  let m = 0;
  for (const v of views) m = Math.max(m, v.z ?? 0);
  return m;
};

/** Container sâu nhất nhận loại `type` và chứa điểm (x,y), bỏ qua các id trong `exclude`. */
export function containerAt(
  e: Engine,
  type: string,
  x: number,
  y: number,
  exclude: Set<string> = new Set(),
): View | null {
  const order = e.state.order;
  for (let i = order.length - 1; i >= 0; i--) {
    const v = order[i];
    if (exclude.has(v.id) || v.hidden) continue;
    const def = getShape(v.shape);
    if (!def?.container || !accepts(def, type)) continue;
    const b = e.box(v.id)!;
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return v;
  }
  return null;
}

export interface CreateViewOpts {
  size?: { w: number; h: number };
  props?: Record<string, unknown>;
  model?: Record<string, unknown>;
  style?: Style;
  modelId?: string;
  parentId?: string | null;
  select?: boolean;
}

/** Tạo một hình (và phần tử mô hình nếu loại có modelKind). (x,y) là góc trên trái. */
export function createViewTx(
  tx: Tx,
  e: Engine,
  type: string,
  x: number,
  y: number,
  o: CreateViewOpts = {},
): View | null {
  const def = getShape(type);
  if (!def) return null;
  const size = o.size ?? def.defaultSize;
  let modelId: string | null = o.modelId ?? null;
  if (!modelId && def.modelKind) {
    const base = def.defaultModel?.(e.lookup) ?? { name: def.label, data: {} };
    const m: ModelElement = {
      id: uid('m'),
      kind: def.modelKind,
      name: (o.model?.name as string) ?? base.name,
      data: { ...base.data, ...(o.model ?? {}) },
    };
    delete (m.data as Record<string, unknown>).name;
    tx.addModel(m);
    modelId = m.id;
  }
  const parent =
    o.parentId !== undefined
      ? o.parentId
        ? e.lookup.view(o.parentId)
        : null
      : containerAt(e, def.type, x + size.w / 2, y + size.h / 2);
  const v: View = {
    id: uid('v'),
    shape: def.type,
    modelId,
    x: Math.round(x),
    y: Math.round(y),
    w: size.w,
    h: size.h,
    z: maxZ(e.state.views.values()) + 1,
    parentId: parent?.id ?? null,
    props: { ...(def.defaultProps?.() ?? {}), ...(o.props ?? {}) },
    style: { ...(def.defaultStyle ?? {}), ...(o.style ?? {}) },
  };
  // container mới đặt lên trên các hình có sẵn: đưa xuống dưới để không che
  if (def.container) v.z = Math.min(0, ...[...e.state.views.values()].map((x2) => x2.z ?? 0)) - 1;
  tx.addView(v);
  def.onCreate?.(tx, v);
  return tx.view(v.id) ?? v;
}

export function createView(e: Engine, type: string, x: number, y: number, o: CreateViewOpts = {}): string | null {
  let id: string | null = null;
  e.apply((tx) => {
    const v = createViewTx(tx, e, type, x, y, o);
    id = v?.id ?? null;
    if (v) growParents(tx, e, v.id);
  });
  if (id && o.select !== false) e.select([id]);
  return id;
}

/** Kiểm luật nối (allow) giữa hai hình. true hoặc lý do. */
export function canConnect(e: Engine, kind: string, srcId: string | null, tgtId: string | null): true | string {
  const def = getConnector(kind);
  if (!def) return 'Loại đường nối không tồn tại';
  if (!srcId || !tgtId) return def.freeEnds ? true : 'Cần nối giữa hai hình';
  const s = e.lookup.view(srcId);
  const t = e.lookup.view(tgtId);
  if (!s || !t) return 'Hình không tồn tại';
  if (srcId === tgtId && !def.selfLoop) return `${def.label} không nối một hình với chính nó`;
  return def.allow ? def.allow(viewCtx(e.lookup, s), viewCtx(e.lookup, t), e.lookup) : true;
}

export function createConnectorTx(
  tx: Tx,
  e: Engine,
  kind: string,
  source: Endpoint,
  target: Endpoint,
  o: { props?: Record<string, unknown>; model?: Record<string, unknown>; style?: Record<string, unknown> } = {},
): Connector | null {
  const def = getConnector(kind);
  if (!def) return null;
  const s = source.viewId ? e.lookup.view(source.viewId) : undefined;
  const t = target.viewId ? e.lookup.view(target.viewId) : undefined;
  let modelId: string | null = null;
  if (def.modelKind && s && t) {
    const base = def.defaultModel?.(viewCtx(e.lookup, s), viewCtx(e.lookup, t)) ?? { name: '', data: {} };
    const m: ModelElement = {
      id: uid('m'),
      kind: def.modelKind,
      name: base.name,
      data: { ...base.data, ...(o.model ?? {}) },
    };
    tx.addModel(m);
    modelId = m.id;
  }
  const c: Connector = {
    id: uid('c'),
    kind: def.kind,
    modelId,
    source,
    target,
    routing: def.defaultRouting,
    waypoints: [],
    labels: [],
    props: { ...(def.defaultProps?.() ?? {}), ...(o.props ?? {}) },
    style: { ...(def.defaultStyle ?? {}), ...(o.style ?? {}) },
    z: tx.lookup.conns().length,
  };
  tx.addConn(c);
  if (def.onCreate && s && t) def.onCreate(tx, c, viewCtx(e.lookup, s), viewCtx(e.lookup, t));
  return tx.conn(c.id) ?? c;
}

export function createConnector(
  e: Engine,
  kind: string,
  source: Endpoint,
  target: Endpoint,
  o: { props?: Record<string, unknown>; model?: Record<string, unknown>; style?: Record<string, unknown> } = {},
): string | null {
  let id: string | null = null;
  e.apply((tx) => {
    id = createConnectorTx(tx, e, kind, source, target, o)?.id ?? null;
  });
  if (id) {
    e.select([], [id]);
    runAfterCreate(e, id);
  }
  return id;
}

/** Gọi ConnectorDef.afterCreate (ngoài giao dịch) cho đường nối vừa tạo. */
export function runAfterCreate(e: Engine, connId: string): void {
  const c = e.lookup.conn(connId);
  if (c) getConnector(c.kind)?.afterCreate?.(e, c);
}

/** Nới container (autoGrow) để bao trọn con, lan lên các cấp cha. */
export function growParents(tx: Tx, e: Engine, childId: string): void {
  let cur = tx.view(childId);
  let guard = 0;
  while (cur?.parentId && guard++ < 12) {
    const p = tx.view(cur.parentId);
    if (!p) break;
    const def = getShape(p.shape);
    if (!def?.container?.autoGrow) break;
    const pad = def.container.padding ?? 16;
    const head = def.container.header ?? 0;
    const kids = [...viewsMap(e.doc, e.diagramId).values()].filter((v) => v.parentId === p.id && !v.hidden);
    const b = unionBox(kids.map((k) => ({ x: k.x, y: k.y, w: k.w, h: k.h })));
    if (!b) break;
    const x1 = Math.min(p.x, b.x - pad);
    const y1 = Math.min(p.y, b.y - pad - head);
    const x2 = Math.max(p.x + p.w, b.x + b.w + pad);
    const y2 = Math.max(p.y + p.h, b.y + b.h + pad);
    if (x1 !== p.x || y1 !== p.y || x2 !== p.x + p.w || y2 !== p.y + p.h)
      tx.setView(p.id, { x: x1, y: y1, w: x2 - x1, h: y2 - y1 });
    cur = tx.view(p.id);
  }
}

/** Gán lại cha sau khi kéo: container sâu nhất chứa tâm hình (không phải chính nó/con cháu). */
export function reparent(tx: Tx, e: Engine, ids: string[]): void {
  const moving = e.descendants(ids);
  for (const id of ids) {
    const v = tx.view(id);
    if (!v) continue;
    const def = getShape(v.shape);
    if (def?.attach) continue;
    const c = containerAt(e, v.shape, v.x + v.w / 2, v.y + v.h / 2, moving);
    const np = c?.id ?? null;
    if (np !== (v.parentId ?? null)) {
      tx.setView(id, { parentId: np });
      // lồng tối đa 10 cấp
      let depth = 0;
      let p = np ? tx.view(np) : undefined;
      while (p?.parentId && depth < 12) {
        depth++;
        p = tx.view(p.parentId);
      }
      if (depth > 10) tx.setView(id, { parentId: v.parentId });
    }
    growParents(tx, e, id);
  }
}

/** Xoá hình đã chọn (kèm con cháu và đường nối dính vào), hoặc đường nối đã chọn. */
export function deleteSelection(e: Engine): void {
  const { sel, selConns, views } = e.state;
  if (!sel.size && !selConns.size) return;
  const ids = e.descendants([...sel].filter((id) => !views.get(id)?.locked));
  const gone: [Connector, ModelElement | null][] = [];
  e.apply((tx) => {
    for (const c of e.lookup.conns()) {
      if (
        selConns.has(c.id) ||
        (c.source.viewId && ids.has(c.source.viewId)) ||
        (c.target.viewId && ids.has(c.target.viewId))
      ) {
        gone.push([c, c.modelId ? (tx.model(c.modelId) ?? null) : null]);
        getConnector(c.kind)?.onDelete?.(tx, c);
        tx.deleteConn(c.id);
      }
    }
    for (const id of ids) tx.deleteView(id);
  });
  e.clearSelection();
  for (const [c, m] of gone) getConnector(c.kind)?.afterDelete?.(e, c, m);
}

export { modelUsages } from '@umlab/core';

/** Xoá khỏi mô hình (Ctrl+Delete): xoá phần tử và MỌI view/đường nối tham chiếu nó ở mọi sơ đồ (core). */
export function deleteFromModel(e: Engine, modelIds: string[]): void {
  e.apply(() => deleteModelEverywhere(e.doc, modelIds));
  e.clearSelection();
}

// ---------------- sao chép / dán ----------------
const CLIP_KEY = 'umlab.clipboard';
interface Clip {
  projectId: string;
  diagramId: string;
  views: View[];
  conns: Connector[];
  model: ModelElement[];
}

export function copySelection(e: Engine): number {
  const ids = e.descendants(e.state.sel);
  if (!ids.size) return 0;
  const views = [...ids].map((id) => e.lookup.view(id)!).filter(Boolean);
  const conns = e.lookup
    .conns()
    .filter((c) => (!c.source.viewId || ids.has(c.source.viewId)) && (!c.target.viewId || ids.has(c.target.viewId)));
  const mids = new Set([...views.map((v) => v.modelId), ...conns.map((c) => c.modelId)].filter(Boolean) as string[]);
  const model = [...mids].map((id) => e.lookup.model(id)!).filter(Boolean);
  const clip: Clip = { projectId: e.session.projectId, diagramId: e.diagramId, views, conns, model };
  try {
    localStorage.setItem(CLIP_KEY, JSON.stringify(clip));
  } catch {}
  // ghi đè clipboard hệ thống để ảnh chụp cũ trong đó không chen vào lần dán tiếp theo
  void globalThis.navigator?.clipboard?.writeText?.(`UMLab: ${views.length} đối tượng`).catch(() => {});
  return views.length;
}

/** Dán: cùng project giữ modelId (cùng phần tử); khác project tạo bản sao phần tử mô hình. */
export function paste(e: Engine, at?: { x: number; y: number }): number {
  let clip: Clip | null = null;
  try {
    clip = JSON.parse(localStorage.getItem(CLIP_KEY) || 'null');
  } catch {}
  if (!clip?.views?.length) return 0;
  return insertCopies(
    e,
    clip.views,
    clip.conns,
    clip.model,
    clip.projectId === e.session.projectId,
    at,
    clip.diagramId === e.diagramId ? 24 : 0,
  );
}

export function duplicateSelection(e: Engine): number {
  const ids = e.descendants(e.state.sel);
  const views = [...ids].map((id) => e.lookup.view(id)!).filter(Boolean);
  const conns = e.lookup
    .conns()
    .filter((c) => c.source.viewId && ids.has(c.source.viewId) && c.target.viewId && ids.has(c.target.viewId));
  return insertCopies(e, views, conns, [], true, undefined, 20);
}

function insertCopies(
  e: Engine,
  views: View[],
  conns: Connector[],
  model: ModelElement[],
  sameProject: boolean,
  at: { x: number; y: number } | undefined,
  off: number,
): number {
  if (!views.length) return 0;
  const map = new Map<string, string>();
  views.forEach((v) => map.set(v.id, uid('v')));
  const b = unionBox(views.map((v) => ({ x: v.x, y: v.y, w: v.w, h: v.h })))!;
  const dx = at ? at.x - b.x : off;
  const dy = at ? at.y - b.y : off;
  const z0 = maxZ(e.state.views.values());
  const newIds: string[] = [];
  e.apply((tx) => {
    const mmap = new Map<string, string>();
    for (const m of model) {
      if (sameProject && e.lookup.model(m.id)) continue;
      const nid = sameProject ? m.id : uid('m');
      mmap.set(m.id, nid);
      tx.addModel({ ...m, id: nid });
    }
    const groupMap = new Map<string, string>();
    const groupFor = (g: string) => {
      if (!groupMap.has(g)) groupMap.set(g, uid('grp'));
      return groupMap.get(g)!;
    };
    views.forEach((v, i) => {
      const id = map.get(v.id)!;
      newIds.push(id);
      tx.addView({
        ...v,
        id,
        x: v.x + dx,
        y: v.y + dy,
        z: z0 + 1 + i,
        locked: false,
        parentId: v.parentId && map.has(v.parentId) ? map.get(v.parentId)! : null,
        modelId: v.modelId ? (mmap.get(v.modelId) ?? v.modelId) : null,
        groupId: v.groupId ? groupFor(v.groupId) : null,
      });
    });
    for (const c of conns) {
      const s = c.source.viewId ? map.get(c.source.viewId) : null;
      const t = c.target.viewId ? map.get(c.target.viewId) : null;
      if ((c.source.viewId && !s) || (c.target.viewId && !t)) continue;
      tx.addConn({
        ...c,
        id: uid('c'),
        source: { ...c.source, viewId: s ?? null },
        target: { ...c.target, viewId: t ?? null },
        waypoints: c.waypoints.map((p) => ({ x: p.x + dx, y: p.y + dy })),
        modelId: c.modelId ? (mmap.get(c.modelId) ?? c.modelId) : null,
      });
    }
  });
  e.select(newIds);
  return newIds.length;
}

// ---------------- căn chỉnh / sắp xếp ----------------
export type AlignCmd = 'al' | 'ac' | 'ar' | 'at' | 'am' | 'ab' | 'dh' | 'dv' | 'samew' | 'sameh';

export function align(e: Engine, cmd: AlignCmd): void {
  const sel = [...e.state.sel].map((id) => e.lookup.view(id)!).filter((v) => v && !v.locked);
  if (sel.length < 2) return;
  const b = unionBox(sel)!;
  e.apply((tx) => {
    const set = (v: View, patch: Partial<View>) => {
      const dx = (patch.x ?? v.x) - v.x;
      const dy = (patch.y ?? v.y) - v.y;
      tx.setView(v.id, patch);
      if (dx || dy)
        for (const k of e.descendants([v.id]))
          if (k !== v.id) tx.setView(k, (kv) => ({ ...kv, x: kv.x + dx, y: kv.y + dy }));
    };
    if (cmd === 'dh' || cmd === 'dv') {
      const k = cmd === 'dh' ? 'x' : 'y';
      const sz = cmd === 'dh' ? 'w' : 'h';
      const s = [...sel].sort((a, c) => a[k] - c[k]);
      const total = s.reduce((a, c) => a + c[sz], 0);
      const gap = (b[sz] - total) / (s.length - 1);
      let pos = b[k];
      s.forEach((v) => {
        set(v, { [k]: Math.round(pos * 10) / 10 });
        pos += v[sz] + gap;
      });
      return;
    }
    for (const v of sel) {
      if (cmd === 'al') set(v, { x: b.x });
      if (cmd === 'ar') set(v, { x: b.x + b.w - v.w });
      if (cmd === 'ac') set(v, { x: Math.round((b.x + b.w / 2 - v.w / 2) * 10) / 10 });
      if (cmd === 'at') set(v, { y: b.y });
      if (cmd === 'ab') set(v, { y: b.y + b.h - v.h });
      if (cmd === 'am') set(v, { y: Math.round((b.y + b.h / 2 - v.h / 2) * 10) / 10 });
      if (cmd === 'samew') set(v, { w: sel[0].w });
      if (cmd === 'sameh') set(v, { h: sel[0].h });
    }
  });
}

export function zOrder(e: Engine, cmd: 'front' | 'back' | 'fwd' | 'bwd'): void {
  const ids = [...e.state.sel];
  if (!ids.length) return;
  const siblingsOf = (v: View) => e.state.order.filter((x) => (x.parentId ?? null) === (v.parentId ?? null));
  e.apply((tx) => {
    for (const id of ids) {
      const v = tx.view(id);
      if (!v) continue;
      const sib = siblingsOf(v).sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
      const i = sib.findIndex((x) => x.id === id);
      const zs = sib.map((x) => x.z ?? 0);
      if (cmd === 'front') tx.setView(id, { z: Math.max(...zs) + 1 });
      if (cmd === 'back') tx.setView(id, { z: Math.min(...zs) - 1 });
      if (cmd === 'fwd' && i < sib.length - 1) {
        tx.setView(id, { z: sib[i + 1].z ?? 0 });
        tx.setView(sib[i + 1].id, { z: v.z ?? 0 });
      }
      if (cmd === 'bwd' && i > 0) {
        tx.setView(id, { z: sib[i - 1].z ?? 0 });
        tx.setView(sib[i - 1].id, { z: v.z ?? 0 });
      }
    }
  });
}

export function groupSelection(e: Engine, on: boolean): void {
  const ids = [...e.state.sel];
  if (on && ids.length < 2) return;
  const g = on ? uid('grp') : null;
  e.apply((tx) => ids.forEach((id) => tx.setView(id, { groupId: g })));
}

export function toggleFlag(e: Engine, flag: 'locked' | 'hidden', ids = [...e.state.sel]): void {
  if (!ids.length) return;
  const on = !ids.every((id) => e.lookup.view(id)?.[flag]);
  e.apply((tx) => ids.forEach((id) => tx.setView(id, { [flag]: on || undefined })));
}

export function nudge(e: Engine, dx: number, dy: number): void {
  const ids = e.descendants([...e.state.sel].filter((id) => !e.lookup.view(id)?.locked));
  if (!ids.size) return;
  e.apply((tx) => {
    for (const id of ids)
      tx.setView(id, (v) => ({ ...v, x: Math.round((v.x + dx) * 10) / 10, y: Math.round((v.y + dy) * 10) / 10 }));
    for (const c of e.lookup.conns()) {
      if (
        c.waypoints.length &&
        c.source.viewId &&
        ids.has(c.source.viewId) &&
        c.target.viewId &&
        ids.has(c.target.viewId)
      )
        tx.setConn(c.id, { waypoints: c.waypoints.map((p) => ({ x: p.x + dx, y: p.y + dy })) });
    }
  });
}

/** Hình nằm trọn trong hộp (chọn bằng khung). */
export function viewsInBox(e: Engine, b: Box): string[] {
  return e.state.order
    .filter((v) => !v.hidden && !v.locked && inside({ x: v.x, y: v.y, w: v.w, h: v.h }, b))
    .map((v) => v.id);
}

/** Điểm trong đa giác (chọn vùng tự do). */
export function pointInPoly(x: number, y: number, poly: [number, number][]): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-9) + xi) c = !c;
  }
  return c;
}

/** Kết thúc nét Pen đang đặt: tạo hình từ các điểm (khép kín hoặc hở). */
export function finishPen(e: Engine, closed: boolean): void {
  const pts = e.state.pen;
  e.set({ pen: null });
  const def = getShape(e.state.tool);
  if (!pts || pts.length < 2 || !def?.pen) return;
  const made = def.pen(pts, closed);
  if (!made) return;
  createView(e, def.type, made.x, made.y, { size: { w: made.w, h: made.h }, props: made.props, parentId: null });
  if (!e.state.sticky) e.set({ tool: 'tool:select' });
}
