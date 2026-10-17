import { createStore, type StoreApi } from 'zustand';
import type * as Y from 'yjs';
import {
  connsMap,
  dataMap,
  diagramsMap,
  metaMap,
  modelMap,
  viewsMap,
  type Connector,
  type DiagramMeta,
  type ModelElement,
  type View,
} from '@umlab/core';
import { LOCAL, type ProjectSession } from '../../workspace/session';
import type { Box, Guide } from './geometry';
import { buildCtx } from './render';
import { getNormalizer, getShape, type EngineLookup, type PenPoint, type Tx } from './registry';

export type ToolId = string;

export interface ConnectDrag {
  kind: string;
  sourceId: string | null;
  sourcePt: [number, number];
  side?: string;
  t?: number;
  cur: [number, number];
  targetId: string | null;
  targetSide?: string;
  targetT?: number;
  invalid?: string | null;
}

export interface EngineState {
  views: Map<string, View>;
  conns: Map<string, Connector>;
  model: Map<string, ModelElement>;
  /** Thứ tự vẽ: cha trước con, anh em theo z. */
  order: View[];
  version: number;
  /** Tăng khi meta các sơ đồ trong project đổi (hình `live` vẽ lại). */
  metaVersion: number;
  /** Hộp tạm khi kéo/đổi kích thước (chưa ghi vào Y.Doc). */
  preview: Map<string, Box>;
  /** props tạm khi kéo tay nắm riêng của hình (đuôi Callout, đỉnh Polygon). */
  propPreview: Map<string, Record<string, unknown>>;
  /** Waypoint tạm khi kéo đoạn/điểm của đường nối. */
  connPreview: Map<string, Partial<Connector>>;
  sel: Set<string>;
  selConns: Set<string>;
  hover: string | null;
  hoverConn: string | null;
  zoom: number;
  tx: number;
  ty: number;
  tool: ToolId;
  sticky: boolean;
  grid: boolean;
  guides: Guide[];
  marquee: Box | null;
  lasso: [number, number][] | null;
  connecting: ConnectDrag | null;
  /** Container đang được highlight khi thả. */
  dropTarget: string | null;
  editing: { viewId: string; key: string } | null;
  panel: 'none' | 'issues' | 'find';
  /** Đường nét tạm (pencil/pen/calligraphy). */
  ink: [number, number][] | null;
  /** Các điểm đang đặt bằng công cụ Pen. */
  pen: PenPoint[] | null;
  /** Yêu cầu mở một tab bên trái (vd. Inspector bấm "Thêm icon" → tab Icon). */
  leftTab: string | null;
}

const viewportKey = (did: string) => `umlab.vp.${did}`;

/** Bộ điều khiển một editor canvas: trạng thái (zustand) + ghi vào Y.Doc qua giao dịch có undo. */
export class Engine {
  readonly store: StoreApi<EngineState>;
  readonly doc: Y.Doc;
  readonly lookup: EngineLookup;
  private unobs: (() => void)[] = [];
  private lastTouch = 0;
  /** Connector dùng khi kéo từ chấm nối mà không chọn công cụ nối (palette đặt). */
  defaultConnector: string | null = null;
  /** Preset của từng mục palette (biến thể: Dependency «call», Directed Association…). */
  presets = new Map<
    string,
    {
      props?: Record<string, unknown>;
      model?: Record<string, unknown>;
      style?: Record<string, unknown>;
      size?: { w: number; h: number };
    }
  >();
  private childIndex: Map<string, View[]> | null = null;
  /** Ngắt gộp của Y.UndoManager: mỗi lần apply là một bước Undo riêng (thao tác liên tiếp nhanh không bị gộp). */
  undoBoundary: (() => void) | null = null;

  constructor(
    readonly session: ProjectSession,
    readonly diagramId: string,
    readonly diagramType: string,
    readonly readOnly: boolean,
    readonly userId: string,
  ) {
    this.doc = session.doc;
    const vp = this.loadViewport();
    this.store = createStore<EngineState>(() => ({
      views: new Map(),
      conns: new Map(),
      model: new Map(),
      order: [],
      version: 0,
      metaVersion: 0,
      preview: new Map(),
      connPreview: new Map(),
      propPreview: new Map(),
      sel: new Set(),
      selConns: new Set(),
      hover: null,
      hoverConn: null,
      zoom: vp?.zoom ?? 1,
      tx: vp?.tx ?? 60,
      ty: vp?.ty ?? 60,
      tool: 'tool:select',
      sticky: false,
      grid: true,
      guides: [],
      marquee: null,
      lasso: null,
      connecting: null,
      dropTarget: null,
      editing: null,
      panel: 'none',
      ink: null,
      pen: null,
      leftTab: null,
    }));
    const vm = viewsMap(this.doc, diagramId);
    const cm = connsMap(this.doc, diagramId);
    const mm = modelMap(this.doc);
    const getState = () => this.store.getState();
    const children = (pid: string) => this.children(pid);
    const doc = this.doc;
    this.lookup = {
      doc: this.doc,
      diagramId,
      view: (id) => (id ? getState().views.get(id) : undefined),
      conn: (id) => (id ? getState().conns.get(id) : undefined),
      model: (id) => (id ? getState().model.get(id) : undefined),
      views: () => getState().order,
      conns: () => [...getState().conns.values()],
      children,
      diagram: (id) => diagramsMap(doc).get(id),
      diagrams: () => [...diagramsMap(doc).values()],
      allModel: () => [...getState().model.values()],
      project: () => {
        const p = session.getSnapshot?.().project;
        return p
          ? {
              name: p.name,
              ownerName: p.members.find((m) => m.userId === p.ownerId)?.name ?? '',
              members: Object.fromEntries(p.members.map((m) => [m.userId, m.name])),
            }
          : null;
      },
    };
    this.syncAll();
    const onV = (ev: Y.YMapEvent<View>) => this.syncKeys('views', ev.keysChanged);
    const onC = (ev: Y.YMapEvent<Connector>) => this.syncKeys('conns', ev.keysChanged);
    const onM = (ev: Y.YMapEvent<ModelElement>) => this.syncKeys('model', ev.keysChanged);
    const dmap = diagramsMap(this.doc);
    const onD = () => this.store.setState({ metaVersion: this.store.getState().metaVersion + 1 });
    dmap.observe(onD);
    this.unobs.push(() => dmap.unobserve(onD));
    vm.observe(onV);
    cm.observe(onC);
    mm.observe(onM);
    this.unobs.push(
      () => vm.unobserve(onV),
      () => cm.unobserve(onC),
      () => mm.unobserve(onM),
    );
  }

  destroy(): void {
    this.unobs.forEach((f) => f());
    this.saveViewport();
  }

  get meta(): DiagramMeta | undefined {
    return diagramsMap(this.doc).get(this.diagramId);
  }

  // ---------- đồng bộ Y.Doc → store (chỉ thay object của khoá vừa đổi) ----------
  private syncAll(): void {
    this.store.setState({
      views: new Map(viewsMap(this.doc, this.diagramId).entries()),
      conns: new Map(connsMap(this.doc, this.diagramId).entries()),
      model: new Map(modelMap(this.doc).entries()),
    });
    this.after(true);
  }

  private syncKeys(which: 'views' | 'conns' | 'model', keys: Set<string>): void {
    const src =
      which === 'views'
        ? viewsMap(this.doc, this.diagramId)
        : which === 'conns'
          ? connsMap(this.doc, this.diagramId)
          : modelMap(this.doc);
    const next = new Map(this.store.getState()[which] as Map<string, unknown>);
    for (const k of keys) {
      const v = src.get(k);
      if (v === undefined) next.delete(k);
      else next.set(k, v);
    }
    this.store.setState({ [which]: next } as Partial<EngineState>);
    this.after(which === 'views');
  }

  private after(viewsChanged: boolean): void {
    const st = this.store.getState();
    const patch: Partial<EngineState> = { version: st.version + 1 };
    if (viewsChanged) {
      patch.order = drawOrder(st.views);
      this.childIndex = null;
    }
    const sel = new Set([...st.sel].filter((id) => st.views.has(id)));
    const selConns = new Set([...st.selConns].filter((id) => st.conns.has(id)));
    if (sel.size !== st.sel.size) patch.sel = sel;
    if (selConns.size !== st.selConns.size) patch.selConns = selConns;
    this.store.setState(patch);
  }

  children(parentId: string): View[] {
    if (!this.childIndex) {
      const idx = new Map<string, View[]>();
      for (const v of this.store.getState().order) {
        if (!v.parentId) continue;
        const arr = idx.get(v.parentId) ?? [];
        arr.push(v);
        idx.set(v.parentId, arr);
      }
      this.childIndex = idx;
    }
    return this.childIndex.get(parentId) ?? [];
  }

  /** Mọi con cháu của các view (để kéo container kéo theo con). */
  descendants(ids: Iterable<string>): Set<string> {
    const out = new Set<string>();
    const walk = (id: string, depth: number) => {
      if (out.has(id) || depth > 12) return;
      out.add(id);
      for (const c of this.children(id)) walk(c.id, depth + 1);
    };
    for (const id of ids) walk(id, 0);
    return out;
  }

  // ---------- ghi ----------
  /** Thực hiện thay đổi trong một transaction (một bước undo, gửi đồng bộ một lần). */
  apply(fn: (tx: Tx) => void): void {
    if (this.readOnly) return;
    this.undoBoundary?.();
    const vm = viewsMap(this.doc, this.diagramId);
    const cm = connsMap(this.doc, this.diagramId);
    const mm = modelMap(this.doc);
    const dm = dataMap(this.doc, this.diagramId);
    const meta = metaMap(this.doc);
    // lookup đọc thẳng Y.Doc (giá trị mới nhất trong giao dịch)
    const lookup: EngineLookup = {
      ...this.lookup,
      view: (id) => (id ? vm.get(id) : undefined),
      conn: (id) => (id ? cm.get(id) : undefined),
      model: (id) => (id ? mm.get(id) : undefined),
    };
    const touchedViews = new Set<string>();
    const touchedModels = new Set<string>();
    const tx: Tx = {
      lookup,
      view: (id) => vm.get(id),
      conn: (id) => cm.get(id),
      model: (id) => mm.get(id),
      allViews: () => [...vm.values()],
      allConns: () => [...cm.values()],
      addView: (v) => {
        vm.set(v.id, v);
        touchedViews.add(v.id);
      },
      setView: (id, patch) => {
        const cur = vm.get(id);
        if (!cur) return;
        vm.set(id, typeof patch === 'function' ? patch(cur) : { ...cur, ...patch, id });
        touchedViews.add(id);
      },
      setViewProps: (id, patch) => {
        const cur = vm.get(id);
        if (cur) vm.set(id, { ...cur, props: { ...cur.props, ...patch } });
        touchedViews.add(id);
      },
      deleteView: (id) => vm.delete(id),
      addConn: (c) => cm.set(c.id, c),
      setConn: (id, patch) => {
        const cur = cm.get(id);
        if (!cur) return;
        cm.set(id, typeof patch === 'function' ? patch(cur) : { ...cur, ...patch, id });
      },
      setConnProps: (id, patch) => {
        const cur = cm.get(id);
        if (cur) cm.set(id, { ...cur, props: { ...cur.props, ...patch } });
      },
      deleteConn: (id) => cm.delete(id),
      addModel: (m) => {
        mm.set(m.id, m);
        touchedModels.add(m.id);
      },
      setModel: (id, patch) => {
        const cur = mm.get(id);
        if (!cur) return;
        mm.set(id, typeof patch === 'function' ? patch(cur) : { ...cur, ...patch, id });
        touchedModels.add(id);
      },
      setModelData: (id, patch) => {
        const cur = mm.get(id);
        if (cur) mm.set(id, { ...cur, data: { ...cur.data, ...patch } });
        touchedModels.add(id);
      },
      deleteModel: (id) => mm.delete(id),
      setData: (key, value) => {
        if (value === undefined) dm.delete(key);
        else dm.set(key, value);
      },
      meta: (key) => meta.get(key),
      setMeta: (key, value) => meta.set(key, value),
    };
    this.doc.transact(() => {
      fn(tx);
      getNormalizer(this.diagramType)?.(tx);
      this.autoMeasure(vm, lookup, touchedViews, touchedModels);
      this.touch();
    }, LOCAL);
  }

  /** Tự giãn hình theo nội dung (ShapeDef.measure) cho các hình vừa sửa hoặc có phần tử mô hình vừa sửa. */
  private autoMeasure(vm: Y.Map<View>, lookup: EngineLookup, views: Set<string>, models: Set<string>): void {
    if (!views.size && !models.size) return;
    for (const v of vm.values()) {
      if (!views.has(v.id) && !(v.modelId && models.has(v.modelId))) continue;
      const def = getShape(v.shape);
      if (!def?.measure) continue;
      const m = def.measure(buildCtx(v, def, lookup));
      if (!m) continue;
      const w = m.w !== undefined ? Math.round(m.w) : v.w;
      const h = m.h !== undefined ? Math.round(m.h) : v.h;
      if (Math.abs(w - v.w) >= 1 || Math.abs(h - v.h) >= 1) vm.set(v.id, { ...v, w, h });
    }
  }

  /** Cập nhật updatedAt của sơ đồ (tối đa mỗi 3 giây) để dashboard/thumbnail biết đã đổi. */
  private touch(): void {
    const now = Date.now();
    if (now - this.lastTouch < 3000) return;
    this.lastTouch = now;
    const m = diagramsMap(this.doc).get(this.diagramId);
    if (m)
      diagramsMap(this.doc).set(this.diagramId, {
        ...m,
        updatedAt: new Date(now).toISOString(),
        updatedBy: this.userId,
      });
  }

  // ---------- tiện ích trạng thái ----------
  get state(): EngineState {
    return this.store.getState();
  }
  set(patch: Partial<EngineState>): void {
    this.store.setState(patch);
  }
  select(ids: Iterable<string>, conns: Iterable<string> = []): void {
    // Element Group: chọn một hình là chọn cả nhóm
    const views = this.state.views;
    const out = new Set<string>();
    for (const id of ids) {
      out.add(id);
      const g = views.get(id)?.groupId;
      if (g) for (const v of views.values()) if (v.groupId === g) out.add(v.id);
    }
    this.store.setState({ sel: out, selConns: new Set(conns) });
    this.session.setPresence({ selection: [...out, ...conns] });
  }
  clearSelection(): void {
    this.select([], []);
  }

  /** View với props tạm (đang kéo tay nắm riêng) áp vào. */
  viewWithPreview(v: View): View {
    const p = this.state.propPreview.get(v.id);
    return p ? { ...v, props: { ...v.props, ...p } } : v;
  }

  /** View với hộp tạm (đang kéo) áp vào. */
  box(id: string): Box | null {
    const st = this.state;
    const p = st.preview.get(id);
    const v = st.views.get(id);
    if (!v) return null;
    return p ?? { x: v.x, y: v.y, w: v.w, h: v.h };
  }

  // ---------- viewport ----------
  private loadViewport(): { zoom: number; tx: number; ty: number } | null {
    try {
      const v = JSON.parse(localStorage.getItem(viewportKey(this.diagramId)) || 'null');
      return v && Number.isFinite(v.zoom) ? v : null;
    } catch {
      return null;
    }
  }
  saveViewport(): void {
    const { zoom, tx, ty } = this.state;
    try {
      localStorage.setItem(viewportKey(this.diagramId), JSON.stringify({ zoom, tx, ty }));
    } catch {}
  }
  get hasSavedViewport(): boolean {
    return !!this.loadViewport();
  }
}

/** Thứ tự vẽ: duyệt cây theo parentId (cha trước con), anh em theo z rồi id. */
export function drawOrder(views: Map<string, View>): View[] {
  const kids = new Map<string | null, View[]>();
  for (const v of views.values()) {
    const p = v.parentId && views.has(v.parentId) && v.parentId !== v.id ? v.parentId : null;
    const arr = kids.get(p) ?? [];
    arr.push(v);
    kids.set(p, arr);
  }
  for (const arr of kids.values()) arr.sort((a, b) => (a.z ?? 0) - (b.z ?? 0) || (a.id < b.id ? -1 : 1));
  const out: View[] = [];
  const seen = new Set<string>();
  const walk = (pid: string | null, depth: number) => {
    for (const v of kids.get(pid) ?? []) {
      if (seen.has(v.id) || depth > 12) continue;
      seen.add(v.id);
      out.push(v);
      walk(v.id, depth + 1);
    }
  };
  walk(null, 0);
  // phần tử nằm trong vòng cha-con lỗi vẫn được vẽ
  for (const v of views.values()) if (!seen.has(v.id)) out.push(v);
  return out;
}

export const shapeOf = (v: View) => getShape(v.shape);
