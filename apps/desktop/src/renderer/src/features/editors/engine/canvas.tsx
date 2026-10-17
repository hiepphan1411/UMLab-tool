import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { useStore } from 'zustand';
import type { Connector, Side, View } from '@umlab/core';
import { useSessionState } from '../../workspace/session';
import { toast, useTipStore } from '@/ui';
import type { Engine, EngineState } from './engine';
import {
  clamp,
  intersects,
  nearestSegment,
  nearEdge,
  nearestSide,
  projectT,
  pointAt,
  r1,
  snapMove,
  type Box,
  type Pt,
} from './geometry';
import { hitView } from './hit';
import { Minimap } from './minimap';
import {
  GRID,
  canConnect,
  containerAt,
  createConnector,
  createView,
  finishPen,
  growParents,
  pointInPoly,
  reparent,
  viewCtx,
  viewsInBox,
} from './ops';
import { Overlay } from './overlay';
import { getConnector, getDropHandlers, getShape, type ShapeHandle, type TextRegion } from './registry';
import { ConnectorView, ShapeView, buildCtx, contentBox, makeRouteEnv } from './render';
import { routeConnector, type Routed } from './route';
import { TextEditor } from './text-edit';

type Drag =
  | { mode: 'pan'; sx: number; sy: number; tx: number; ty: number }
  | {
      mode: 'move';
      sx: number;
      sy: number;
      ids: string[];
      box: Box;
      moved: boolean;
      start: Map<string, Box>;
      wp: Map<string, { x: number; y: number }[]>;
    }
  | { mode: 'resize'; id: string; h: string; sx: number; sy: number; o: Box; aspect: boolean }
  | { mode: 'marquee'; sx: number; sy: number; base: Set<string> }
  | { mode: 'lasso'; base: Set<string> }
  | { mode: 'connect'; kind: string }
  | { mode: 'reconnect'; connId: string; end: 'source' | 'target' }
  | { mode: 'waypoint'; connId: string; i: number }
  | { mode: 'segment'; connId: string; i: number; hor: boolean; pts0: Pt[]; sx: number; sy: number }
  | {
      mode: 'label';
      connId: string;
      role: string;
      sx: number;
      sy: number;
      dx0: number;
      dy0: number;
      mid: boolean;
      pts: Pt[];
    }
  | { mode: 'draw'; type: string; sx: number; sy: number; cur: Pt }
  | { mode: 'ink'; type: string }
  | { mode: 'pen'; i: number; sx: number; sy: number }
  | { mode: 'shandle'; id: string; key: string }
  | { mode: 'catalog'; fromId: string };

export interface CanvasApi {
  toWorld(cx: number, cy: number): Pt;
  center(): Pt;
  fit(onlySel?: boolean): void;
  zoomAt(z: number, cx?: number, cy?: number): void;
  editText(viewId: string, key?: string): void;
}

const CLICK_PX = 4;

export function Canvas({
  engine,
  apiRef,
  onContextMenu,
  onCatalogDrop,
  onDoubleClickView,
  background,
}: {
  engine: Engine;
  apiRef?: React.MutableRefObject<CanvasApi | null>;
  onContextMenu?: (e: React.MouseEvent, target: { view?: View; conn?: Connector; at: Pt }) => void;
  onCatalogDrop?: (fromId: string, targetId: string | null, at: Pt, client: { x: number; y: number }) => void;
  onDoubleClickView?: (v: View) => boolean;
  background: string;
}) {
  const s = useStore(engine.store);
  const session = useSessionState(engine.session);
  const peers = useMemo(
    () => session.peers.filter((p) => p.diagramId === engine.diagramId),
    [session.peers, engine.diagramId],
  );
  const wrap = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const space = useRef(false);
  const lastClick = useRef<{ t: number; x: number; y: number }>({ t: 0, x: 0, y: 0 });
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [editing, setEditing] = useState<{ viewId: string; region: TextRegion } | null>(null);
  const [catalogHover, setCatalogHover] = useState<string | null>(null);
  const [penCur, setPenCur] = useState<Pt | null>(null);
  const ro = engine.readOnly;

  // ---------- kích thước khung ----------
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    obs.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => obs.disconnect();
  }, []);

  const toWorld = (cx: number, cy: number): Pt => {
    const r = wrap.current!.getBoundingClientRect();
    const st = engine.state;
    return [(cx - r.left - st.tx) / st.zoom, (cy - r.top - st.ty) / st.zoom];
  };

  const zoomAt = (z: number, cx?: number, cy?: number) => {
    const r = wrap.current!.getBoundingClientRect();
    const st = engine.state;
    z = clamp(z, 0.1, 6);
    const px = (cx ?? r.left + r.width / 2) - r.left;
    const py = (cy ?? r.top + r.height / 2) - r.top;
    const wx = (px - st.tx) / st.zoom;
    const wy = (py - st.ty) / st.zoom;
    engine.set({ zoom: z, tx: px - wx * z, ty: py - wy * z });
  };

  const fit = (onlySel = false) => {
    const st = engine.state;
    const views = onlySel && st.sel.size ? st.order.filter((v) => st.sel.has(v.id)) : st.order;
    const b = contentBox(views, onlySel ? [] : [...st.conns.values()], engine.lookup);
    const r = wrap.current!.getBoundingClientRect();
    if (!b || !r.width) return engine.set({ zoom: 1, tx: 60, ty: 60 });
    const z = clamp(Math.min((r.width - 80) / b.w, (r.height - 80) / b.h), 0.1, 2);
    engine.set({ zoom: z, tx: (r.width - b.w * z) / 2 - b.x * z, ty: (r.height - b.h * z) / 2 - b.y * z });
  };

  const regionsOf = (v: View): TextRegion[] => {
    const def = getShape(v.shape);
    return def?.textRegions ? def.textRegions(buildCtx(v, def, engine.lookup)) : [];
  };

  const editText = (viewId: string, key?: string, at?: Pt) => {
    if (ro) return;
    const v = engine.lookup.view(viewId);
    if (!v || v.locked) return;
    const regs = regionsOf(v);
    if (!regs.length) return;
    let r = key ? regs.find((x) => x.key === key) : undefined;
    if (!r && at)
      r = regs.find(
        (x) => at[0] >= x.box.x && at[0] <= x.box.x + x.box.w && at[1] >= x.box.y && at[1] <= x.box.y + x.box.h,
      );
    r ??= regs[0];
    engine.set({ editing: { viewId, key: r.key } });
    setEditing({ viewId, region: r });
  };

  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = {
      toWorld,
      center: () => {
        const r = wrap.current!.getBoundingClientRect();
        return toWorld(r.left + r.width / 2, r.top + r.height / 2);
      },
      fit,
      zoomAt,
      editText: (id, key) => editText(id, key),
    };
  });

  // lần đầu mở sơ đồ: vừa màn hình nếu chưa có khung nhìn đã lưu
  useEffect(() => {
    if (!engine.hasSavedViewport && engine.state.order.length) requestAnimationFrame(() => fit());
    const t = setInterval(() => engine.saveViewport(), 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  // ---------- đường nối đã định tuyến ----------
  const routes = useMemo(() => {
    const env = makeRouteEnv(engine.lookup, (id) => {
      const v = s.views.get(id);
      if (!v || v.hidden) return null;
      return s.preview.get(id) ?? { x: v.x, y: v.y, w: v.w, h: v.h };
    });
    const out = new Map<string, Routed>();
    for (const c of s.conns.values()) {
      const pc = s.connPreview.get(c.id);
      const r = routeConnector(pc ? { ...c, ...pc } : c, env);
      if (r) out.set(c.id, r);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.views, s.conns, s.preview, s.connPreview]);

  const lineJumps = !!engine.meta?.canvas?.lineJumps;
  const allPts = useMemo(() => (lineJumps ? [...routes.values()].map((r) => r.pts) : null), [routes, lineJumps]);

  // ---------- culling ----------
  const viewport: Box = { x: -s.tx / s.zoom, y: -s.ty / s.zoom, w: size.w / s.zoom, h: size.h / s.zoom };
  // ô lưới 200px của khung nhìn (chỉ đổi khi cuộn đủ xa) — dựng lại danh sách hình hiển thị
  const cellX = s.order.length > 300 ? Math.round(viewport.x / 200) : 0;
  const cellY = s.order.length > 300 ? Math.round(viewport.y / 200) : 0;
  const visible = useMemo(() => {
    if (s.order.length <= 300) return s.order;
    const m = 200 / s.zoom;
    const vp = { x: viewport.x - m, y: viewport.y - m, w: viewport.w + 2 * m, h: viewport.h + 2 * m };
    return s.order.filter(
      (v) =>
        s.sel.has(v.id) ||
        s.preview.has(v.id) ||
        intersects(vp, { x: v.x, y: v.y, w: v.w, h: v.h }) ||
        getShape(v.shape)?.container,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.order, s.sel, s.preview, cellX, cellY, s.zoom]);

  // ---------- con trỏ / presence ----------
  const sendCursor = (p: Pt | null) => engine.session.setPresence({ cursor: p ? { x: p[0], y: p[1] } : null });

  const viewAtEvent = (target: EventTarget | null): View | null => {
    const el = (target as Element | null)?.closest?.('[data-view]') as HTMLElement | null;
    const id = el?.getAttribute('data-view');
    const v = id ? engine.lookup.view(id) : undefined;
    return v && !v.locked ? v : null;
  };

  const viewAtPoint = (x: number, y: number, exclude?: Set<string>): View | null =>
    hitView(engine.state.order, (id) => engine.box(id), x, y, exclude);

  // ---------- pointer ----------
  const onPointerDown = (ev: RPointerEvent<HTMLDivElement>) => {
    if (ev.button === 2) return;
    if ((ev.target as Element).closest('textarea, input, .menu')) return;
    wrap.current?.focus({ preventScroll: true });
    const [wx, wy] = toWorld(ev.clientX, ev.clientY);
    const t = ev.target as Element;
    const st = engine.state;
    useTipStore.getState().hide();
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);

    // phát hiện double-click thủ công (pointer capture làm dblclick gốc không ổn định)
    const now = performance.now();
    const isDouble =
      now - lastClick.current.t < 420 &&
      Math.hypot(ev.clientX - lastClick.current.x, ev.clientY - lastClick.current.y) < 6;
    lastClick.current = { t: isDouble ? 0 : now, x: ev.clientX, y: ev.clientY };
    if (isDouble && st.tool === 'tool:select' && onDouble(t, wx, wy)) return;

    // công cụ Pen: bấm từng điểm, kéo để tạo tay cầm; nhấp đúp kết thúc; bấm điểm đầu để khép kín
    const penShape = getShape(st.tool);
    if (penShape?.pen && !ro && ev.button === 0 && !space.current) {
      const pts = st.pen ?? [];
      if (isDouble && pts.length >= 2) {
        finishPen(engine, false);
        return;
      }
      if (pts.length >= 3 && Math.hypot(wx - pts[0].x, wy - pts[0].y) * st.zoom < 9) {
        finishPen(engine, true);
        return;
      }
      engine.set({ pen: [...pts, { x: r1(wx), y: r1(wy) }] });
      drag.current = { mode: 'pen', i: pts.length, sx: wx, sy: wy };
      return;
    }

    if (ev.button === 1 || space.current || st.tool === 'tool:hand') {
      drag.current = { mode: 'pan', sx: ev.clientX, sy: ev.clientY, tx: st.tx, ty: st.ty };
      wrap.current?.classList.add('panning');
      return;
    }
    if (ro) {
      const v = viewAtEvent(t);
      const cEl = t.closest('[data-conn]');
      if (v) engine.select([v.id]);
      else if (cEl) engine.select([], [cEl.getAttribute('data-conn')!]);
      else engine.clearSelection();
      drag.current = { mode: 'pan', sx: ev.clientX, sy: ev.clientY, tx: st.tx, ty: st.ty };
      return;
    }

    const shandle = t.closest('[data-shandle]');
    if (shandle && st.sel.size === 1) {
      drag.current = { mode: 'shandle', id: [...st.sel][0], key: shandle.getAttribute('data-shandle')! };
      return;
    }
    const handle = t.closest('[data-handle]');
    const anchor = t.closest('[data-anchor]');
    const ep = t.closest('[data-ep]');
    const wp = t.closest('[data-wp]');
    const seg = t.closest('[data-seg]');
    const label = t.closest('[data-label]');
    const catalog = t.closest('[data-catalog]');

    if (catalog) {
      const id = catalog.getAttribute('data-catalog')!;
      const v = engine.lookup.view(id)!;
      const b = engine.box(id)!;
      engine.set({
        connecting: {
          kind: 'catalog',
          sourceId: id,
          sourcePt: [b.x + b.w, b.y + b.h / 2],
          cur: [wx, wy],
          targetId: null,
        },
      });
      drag.current = { mode: 'catalog', fromId: v.id };
      return;
    }
    if (handle && st.sel.size === 1) {
      const id = [...st.sel][0];
      const v = engine.lookup.view(id)!;
      drag.current = {
        mode: 'resize',
        id,
        h: handle.getAttribute('data-handle')!,
        sx: wx,
        sy: wy,
        o: { x: v.x, y: v.y, w: v.w, h: v.h },
        aspect: !!getShape(v.shape)?.aspectLock,
      };
      return;
    }
    const selConn = st.selConns.size === 1 ? engine.lookup.conn([...st.selConns][0]) : undefined;
    if (wp && selConn) {
      drag.current = { mode: 'waypoint', connId: selConn.id, i: Number(wp.getAttribute('data-wp')) };
      return;
    }
    if (seg && selConn) {
      const r = routes.get(selConn.id);
      if (r) {
        const i = Number(seg.getAttribute('data-seg'));
        const hor = Math.abs(r.pts[i - 1][1] - r.pts[i][1]) < 0.5;
        drag.current = {
          mode: 'segment',
          connId: selConn.id,
          i,
          hor,
          pts0: r.pts.map((p) => [...p] as Pt),
          sx: wx,
          sy: wy,
        };
      }
      return;
    }
    if (ep && selConn) {
      drag.current = { mode: 'reconnect', connId: selConn.id, end: ep.getAttribute('data-ep') as 'source' | 'target' };
      return;
    }
    if (label) {
      const cEl = label.closest('[data-conn]');
      const c = cEl ? engine.lookup.conn(cEl.getAttribute('data-conn')) : undefined;
      if (c) {
        const role = label.getAttribute('data-label')!;
        const stored = c.labels.find((l) => l.role === role);
        const r = routes.get(c.id);
        const def = getConnector(c.kind);
        const computed = def
          ?.labels?.(c, c.modelId ? (engine.lookup.model(c.modelId) ?? null) : null, engine.lookup)
          .find((l) => l.role === role);
        engine.select([], [c.id]);
        drag.current = {
          mode: 'label',
          connId: c.id,
          role,
          sx: wx,
          sy: wy,
          dx0: stored?.dx ?? 0,
          dy0: stored?.dy ?? 0,
          mid: !computed?.end,
          pts: r?.pts ?? [],
        };
        return;
      }
    }

    // công cụ connector (palette) hoặc chấm nối
    const toolConn = getConnector(st.tool);
    const viewHit = viewAtEvent(t);
    if (anchor || (toolConn && viewHit) || (toolConn?.freeEnds && !viewHit)) {
      const kind = toolConn ? st.tool : defaultConnectorFor(engine);
      if (!kind) return;
      let src: { id: string | null; pt: Pt; side?: Side; t?: number };
      if (anchor) {
        const id = anchor.getAttribute('data-anchor')!;
        const side = anchor.getAttribute('data-side') as Side;
        const b = engine.box(id)!;
        const p = [
          Number((anchor as SVGCircleElement).getAttribute('cx')),
          Number((anchor as SVGCircleElement).getAttribute('cy')),
        ] as Pt;
        src = { id, pt: p, side, t: 0.5 };
        void b;
      } else if (viewHit) {
        const b = engine.box(viewHit.id)!;
        const ns = nearestSide(b, wx, wy);
        src = nearEdge(b, wx, wy, 12 / st.zoom)
          ? { id: viewHit.id, pt: [wx, wy], side: ns.side, t: ns.t }
          : { id: viewHit.id, pt: [wx, wy] };
      } else src = { id: null, pt: [wx, wy] };
      engine.set({
        connecting: {
          kind,
          sourceId: src.id,
          sourcePt: src.pt,
          side: src.side,
          t: src.t,
          cur: [wx, wy],
          targetId: null,
        },
      });
      drag.current = { mode: 'connect', kind };
      return;
    }

    // công cụ hình (đặt / kéo vẽ / vẽ tay)
    const toolShape = getShape(st.tool);
    if (toolShape) {
      if (toolShape.ink) {
        engine.set({ ink: [[wx, wy]] });
        drag.current = { mode: 'ink', type: toolShape.type };
      } else drag.current = { mode: 'draw', type: st.tool, sx: wx, sy: wy, cur: [wx, wy] };
      return;
    }

    const cEl = t.closest('[data-conn]');
    if (cEl && !viewHit) {
      const id = cEl.getAttribute('data-conn')!;
      if (ev.shiftKey) {
        const n = new Set(st.selConns);
        if (n.has(id)) n.delete(id);
        else n.add(id);
        engine.select(st.sel, n);
      } else engine.select([], [id]);
      return;
    }

    if (viewHit) {
      let sel = new Set(st.sel);
      if (ev.shiftKey || ev.ctrlKey || ev.metaKey) {
        if (sel.has(viewHit.id)) sel.delete(viewHit.id);
        else sel.add(viewHit.id);
        engine.select(sel, st.selConns);
      } else if (!sel.has(viewHit.id)) {
        engine.select([viewHit.id]);
      }
      sel = engine.state.sel;
      const roots = [...sel].filter((id) => !engine.lookup.view(id)?.locked);
      const movers = [...engine.descendants(roots)].filter((id) => !engine.lookup.view(id)?.locked);
      const start = new Map<string, Box>();
      for (const id of movers) start.set(id, engine.box(id)!);
      const wpStart = new Map<string, { x: number; y: number }[]>();
      const ms = new Set(movers);
      for (const c of engine.lookup.conns())
        if (
          c.waypoints.length &&
          c.source.viewId &&
          ms.has(c.source.viewId) &&
          c.target.viewId &&
          ms.has(c.target.viewId)
        )
          wpStart.set(c.id, c.waypoints);
      const box = unionOf(roots.map((id) => engine.box(id)!));
      drag.current = { mode: 'move', sx: wx, sy: wy, ids: movers, box, moved: false, start, wp: wpStart };
      return;
    }

    // vùng trống
    const base = ev.shiftKey ? new Set(st.sel) : new Set<string>();
    if (!ev.shiftKey) engine.clearSelection();
    if (st.tool === 'tool:lasso') {
      engine.set({ lasso: [[wx, wy]] });
      drag.current = { mode: 'lasso', base };
    } else {
      drag.current = { mode: 'marquee', sx: wx, sy: wy, base };
      engine.set({ marquee: { x: wx, y: wy, w: 0, h: 0 } });
    }
  };

  const onPointerMove = (ev: RPointerEvent<HTMLDivElement>) => {
    const [wx, wy] = toWorld(ev.clientX, ev.clientY);
    sendCursor([wx, wy]);
    const d = drag.current;
    const st = engine.state;
    if (st.pen) setPenCur([wx, wy]);
    if (!d) {
      const t = ev.target as Element;
      const anchor = t.closest('[data-anchor]');
      const v = anchor ? engine.lookup.view(anchor.getAttribute('data-anchor')) : viewAtEvent(t);
      const nh = v ? v.id : t.closest('[data-catalog]') ? st.hover : null;
      if (nh !== st.hover) engine.set({ hover: nh });
      if (v && !ro && st.tool === 'tool:select' && getShape(v.shape)?.catalog?.length) setCatalogHover(v.id);
      else if (!t.closest('[data-catalog]')) setCatalogHover(null);
      return;
    }
    if (d.mode === 'pan') {
      engine.set({ tx: d.tx + ev.clientX - d.sx, ty: d.ty + ev.clientY - d.sy });
      return;
    }
    if (d.mode === 'move') {
      let dx = wx - d.sx;
      let dy = wy - d.sy;
      if (!d.moved && Math.hypot(dx, dy) * st.zoom < CLICK_PX) return;
      d.moved = true;
      const moving = new Set(d.ids);
      const others = st.order
        .filter(
          (v) =>
            !moving.has(v.id) &&
            !v.hidden &&
            intersects({ x: v.x - 400, y: v.y - 400, w: v.w + 800, h: v.h + 800 }, d.box),
        )
        .map((v) => ({ x: v.x, y: v.y, w: v.w, h: v.h }));
      const snap = ev.altKey
        ? { dx, dy, guides: [] }
        : snapMove(d.box, dx, dy, others, 6 / st.zoom, st.grid ? GRID : null);
      dx = snap.dx;
      dy = snap.dy;
      const preview = new Map<string, Box>();
      for (const [id, b] of d.start) {
        const def = getShape(engine.lookup.view(id)!.shape);
        if (def?.attach && !d.ids.includes(engine.lookup.view(id)!.parentId ?? '')) {
          preview.set(id, attachToBorder(engine, id, { ...b, x: b.x + dx, y: b.y + dy }));
        } else preview.set(id, { ...b, x: r1(b.x + dx), y: r1(b.y + dy) });
      }
      const connPreview = new Map<string, Partial<Connector>>();
      for (const [cid, pts] of d.wp)
        connPreview.set(cid, { waypoints: pts.map((p) => ({ x: r1(p.x + dx), y: r1(p.y + dy) })) });
      // container nhận thả
      const first = engine.lookup.view([...st.sel][0] ?? d.ids[0]);
      const nb = first ? preview.get(first.id) : null;
      const target =
        first && nb && !getShape(first.shape)?.attach
          ? containerAt(engine, first.shape, nb.x + nb.w / 2, nb.y + nb.h / 2, moving)
          : null;
      engine.set({
        preview,
        connPreview,
        guides: snap.guides,
        dropTarget: target && target.id !== first?.parentId ? target.id : null,
      });
      engine.session.setPresence({ dragging: { ids: [...st.sel], dx, dy } });
      return;
    }
    if (d.mode === 'resize') {
      const v = engine.lookup.view(d.id)!;
      const def = getShape(v.shape);
      const min = def?.minSize ?? { w: 16, h: 16 };
      const o = d.o;
      const dx = wx - d.sx;
      const dy = wy - d.sy;
      let { x, y, w, h } = o;
      if (d.h.includes('e')) w = Math.max(min.w, o.w + dx);
      if (d.h.includes('s')) h = Math.max(min.h, o.h + dy);
      if (d.h.includes('w')) {
        w = Math.max(min.w, o.w - dx);
        x = o.x + o.w - w;
      }
      if (d.h.includes('n')) {
        h = Math.max(min.h, o.h - dy);
        y = o.y + o.h - h;
      }
      if (d.aspect || ev.shiftKey) {
        const k = Math.max(w / o.w, h / o.h);
        const nw = Math.max(min.w, o.w * k);
        const nh = Math.max(min.h, o.h * k);
        if (d.h.includes('w')) x = o.x + o.w - nw;
        if (d.h.includes('n')) y = o.y + o.h - nh;
        w = nw;
        h = nh;
      }
      const g = st.grid && !ev.altKey ? 1 : 0.1;
      const rb = {
        x: Math.round(x / g) * g,
        y: Math.round(y / g) * g,
        w: Math.round(w / g) * g,
        h: Math.round(h / g) * g,
      };
      engine.set({ preview: new Map([[d.id, rb]]) });
      return;
    }
    if (d.mode === 'marquee') {
      const b = { x: Math.min(d.sx, wx), y: Math.min(d.sy, wy), w: Math.abs(wx - d.sx), h: Math.abs(wy - d.sy) };
      engine.set({ marquee: b });
      engine.select(new Set([...d.base, ...viewsInBox(engine, b)]));
      return;
    }
    if (d.mode === 'lasso') {
      const pts = [...(st.lasso ?? []), [wx, wy] as [number, number]];
      engine.set({ lasso: pts });
      return;
    }
    if (d.mode === 'ink') {
      engine.set({ ink: [...(st.ink ?? []), [wx, wy]] });
      return;
    }
    if (d.mode === 'pen') {
      if (Math.hypot(wx - d.sx, wy - d.sy) * st.zoom < 3 || !st.pen) return;
      engine.set({ pen: st.pen.map((p, i) => (i === d.i ? { ...p, cx: r1(wx), cy: r1(wy) } : p)) });
      return;
    }
    if (d.mode === 'shandle') {
      const v = engine.lookup.view(d.id);
      const def = v ? getShape(v.shape) : undefined;
      if (!v || !def?.dragHandle) return;
      const cur = engine.viewWithPreview(v);
      const patch = def.dragHandle(buildCtx(cur, def, engine.lookup), d.key, [wx, wy], { shift: ev.shiftKey });
      if (patch) engine.set({ propPreview: new Map([[v.id, { ...(st.propPreview.get(v.id) ?? {}), ...patch }]]) });
      return;
    }
    if (d.mode === 'draw') {
      d.cur = [wx, wy];
      const b = { x: Math.min(d.sx, wx), y: Math.min(d.sy, wy), w: Math.abs(wx - d.sx), h: Math.abs(wy - d.sy) };
      engine.set({ marquee: b });
      return;
    }
    if (d.mode === 'connect' || d.mode === 'catalog') {
      const c = st.connecting!;
      const exclude = new Set<string>();
      let target = viewAtPoint(wx, wy, exclude);
      const def = getConnector(c.kind);
      if (target && target.id === c.sourceId && !def?.selfLoop && d.mode === 'connect') target = null;
      let invalid: string | null = null;
      let side: Side | undefined;
      let tt: number | undefined;
      if (target) {
        const b = engine.box(target.id)!;
        if (nearEdge(b, wx, wy, 12 / st.zoom)) {
          const ns = nearestSide(b, wx, wy);
          side = ns.side;
          tt = ns.t;
        }
        if (d.mode === 'connect') {
          const ok = canConnect(engine, c.kind, c.sourceId, target.id);
          invalid = ok === true ? null : ok;
        }
      }
      engine.set({
        connecting: { ...c, cur: [wx, wy], targetId: target?.id ?? null, targetSide: side, targetT: tt, invalid },
      });
      if (invalid) useTipStore.getState().showAt(invalid, ev.clientX, ev.clientY, 'error');
      else useTipStore.getState().hide();
      wrap.current?.classList.toggle('not-allowed', !!invalid);
      return;
    }
    if (d.mode === 'waypoint') {
      const c = engine.lookup.conn(d.connId)!;
      const r = routes.get(c.id);
      let x = wx;
      let y = wy;
      if (r) {
        const prev = r.pts[d.i];
        const next = r.pts[d.i + 2];
        const tol = 6 / st.zoom;
        for (const p of [prev, next]) {
          if (!p) continue;
          if (Math.abs(p[0] - x) < tol) x = p[0];
          if (Math.abs(p[1] - y) < tol) y = p[1];
        }
      }
      const w = [...c.waypoints];
      w[d.i] = { x: r1(x), y: r1(y) };
      engine.set({ connPreview: new Map([[c.id, { waypoints: w, routing: 'manual' }]]) });
      return;
    }
    if (d.mode === 'segment') {
      const pts = d.pts0.map((p) => [...p] as Pt);
      const delta = d.hor ? wy - d.sy : wx - d.sx;
      const k = d.hor ? 1 : 0;
      pts[d.i - 1][k] += delta;
      pts[d.i][k] += delta;
      const inner = pts.slice(1, -1).map((p) => ({ x: r1(p[0]), y: r1(p[1]) }));
      engine.set({ connPreview: new Map([[d.connId, { waypoints: inner, routing: 'manual' }]]) });
      return;
    }
    if (d.mode === 'reconnect') {
      const c = engine.lookup.conn(d.connId)!;
      const other = d.end === 'source' ? c.target.viewId : c.source.viewId;
      const t = viewAtPoint(wx, wy);
      let end: Connector['source'];
      if (t && (t.id !== other || getConnector(c.kind)?.selfLoop)) {
        const tb = engine.box(t.id)!;
        const ns = nearestSide(tb, wx, wy);
        end =
          c.routing === 'straight' || c.routing === 'curved' || !nearEdge(tb, wx, wy, 12 / st.zoom)
            ? { viewId: t.id }
            : { viewId: t.id, side: ns.side, t: ns.t };
      } else if (getConnector(c.kind)?.freeEnds) end = { viewId: null, x: wx, y: wy };
      else end = { viewId: null, x: wx, y: wy };
      engine.set({ connPreview: new Map([[c.id, { [d.end]: end } as Partial<Connector>]]) });
      return;
    }
    if (d.mode === 'label') {
      const c = engine.lookup.conn(d.connId)!;
      void c;
      if (d.mid && d.pts.length) {
        const pos = clamp(projectT(d.pts, [wx, wy]), 0.02, 0.98);
        const p = pointAt(d.pts, pos);
        engine.set({
          connPreview: new Map([
            [d.connId, { labels: upsertLabel(c.labels, d.role, { pos, dx: r1(wx - p[0]), dy: r1(wy - p[1]) + 9 }) }],
          ]),
        });
      } else
        engine.set({
          connPreview: new Map([
            [
              d.connId,
              { labels: upsertLabel(c.labels, d.role, { dx: r1(d.dx0 + wx - d.sx), dy: r1(d.dy0 + wy - d.sy) }) },
            ],
          ]),
        });
    }
  };

  const endPointer = (ev: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    wrap.current?.classList.remove('panning', 'not-allowed');
    useTipStore.getState().hide();
    const st = engine.state;
    const [wx, wy] = toWorld(ev.clientX, ev.clientY);
    if (!d) return;
    const clear: Partial<EngineState> = { guides: [], marquee: null, lasso: null, dropTarget: null };
    if (d.mode === 'move') {
      engine.session.setPresence({ dragging: null });
      if (d.moved) {
        const preview = st.preview;
        engine.apply((tx) => {
          for (const [id, b] of preview) tx.setView(id, { x: b.x, y: b.y, w: b.w, h: b.h });
          for (const [cid, p] of st.connPreview) tx.setConn(cid, p);
          reparent(
            tx,
            engine,
            [...st.sel].filter((id) => preview.has(id)),
          );
        });
      }
      engine.set({ ...clear, preview: new Map(), connPreview: new Map() });
      return;
    }
    if (d.mode === 'resize') {
      const b = st.preview.get(d.id);
      if (b)
        engine.apply((tx) => {
          tx.setView(d.id, b);
          growParents(tx, engine, d.id);
        });
      engine.set({ ...clear, preview: new Map() });
      return;
    }
    if (d.mode === 'lasso') {
      const poly = st.lasso ?? [];
      if (poly.length > 2) {
        const ids = st.order
          .filter((v) => !v.hidden && !v.locked && pointInPoly(v.x + v.w / 2, v.y + v.h / 2, poly))
          .map((v) => v.id);
        engine.select(new Set([...d.base, ...ids]));
      }
      engine.set(clear);
      return;
    }
    if (d.mode === 'pen') return;
    if (d.mode === 'shandle') {
      const p = st.propPreview.get(d.id);
      engine.set({ ...clear, propPreview: new Map() });
      if (p) engine.apply((tx) => tx.setViewProps(d.id, p));
      return;
    }
    if (d.mode === 'ink') {
      const pts = st.ink ?? [];
      engine.set({ ink: null });
      const def = getShape(d.type);
      const made = def?.ink?.(pts);
      if (made) {
        createView(engine, d.type, made.x, made.y, {
          size: { w: made.w, h: made.h },
          props: made.props,
          parentId: null,
        });
        if (!st.sticky) engine.set({ tool: 'tool:select' });
      }
      return;
    }
    if (d.mode === 'draw') {
      const def = getShape(d.type);
      const b = st.marquee;
      engine.set(clear);
      if (!def) return;
      const big = b && b.w * st.zoom > 8 && b.h * st.zoom > 8;
      const w = big ? Math.max(def.minSize?.w ?? 16, b!.w) : def.defaultSize.w;
      const h = big
        ? Math.max(def.minSize?.h ?? 16, def.aspectLock ? (b!.w * def.defaultSize.h) / def.defaultSize.w : b!.h)
        : def.defaultSize.h;
      const x = big ? b!.x : d.sx - w / 2;
      const y = big ? b!.y : d.sy - h / 2;
      const pre = presetOf(engine);
      const id = createView(engine, d.type, snapV(x, st.grid), snapV(y, st.grid), {
        ...pre,
        size: big ? { w, h } : (pre.size ?? { w, h }),
      });
      if (!st.sticky) engine.set({ tool: 'tool:select' });
      if (id && getShape(d.type)?.textRegions && !def.container) requestAnimationFrame(() => editText(id));
      if (id) placed(id);
      return;
    }
    if (d.mode === 'connect' || d.mode === 'catalog') {
      const c = st.connecting;
      engine.set({ ...clear, connecting: null });
      if (!c) return;
      if (d.mode === 'catalog') {
        const moved = Math.hypot(wx - c.sourcePt[0], wy - c.sourcePt[1]) * st.zoom > 12;
        if (moved) onCatalogDrop?.(d.fromId, c.targetId, [wx, wy], { x: ev.clientX, y: ev.clientY });
        return;
      }
      if (c.invalid) return;
      const def = getConnector(c.kind);
      // đường thẳng / cong: đầu mút tự bám viền hướng về đầu kia (không khoá cạnh) để không cắt qua hình
      const auto = def?.defaultRouting === 'straight' || def?.defaultRouting === 'curved';
      const src = c.sourceId
        ? auto
          ? { viewId: c.sourceId }
          : { viewId: c.sourceId, side: c.side as Side, t: c.t }
        : { viewId: null, x: c.sourcePt[0], y: c.sourcePt[1] };
      let tgt: Connector['target'] | null = null;
      if (c.targetId)
        tgt = auto ? { viewId: c.targetId } : { viewId: c.targetId, side: c.targetSide as Side, t: c.targetT };
      else if (def?.freeEnds && Math.hypot(wx - c.sourcePt[0], wy - c.sourcePt[1]) > 10)
        tgt = { viewId: null, x: wx, y: wy };
      if (!tgt) return;
      const sv = src.viewId ? engine.lookup.view(src.viewId) : undefined;
      const tv = tgt.viewId ? engine.lookup.view(tgt.viewId) : undefined;
      const warn =
        def?.warn && sv && tv ? def.warn(viewCtx(engine.lookup, sv), viewCtx(engine.lookup, tv), engine.lookup) : null;
      createConnector(engine, c.kind, src, tgt, presetOf(engine, c.kind));
      if (warn) toast('⚠ ' + warn, { ms: 4000 });
      if (!st.sticky) engine.set({ tool: 'tool:select' });
      return;
    }
    if (d.mode === 'waypoint' || d.mode === 'segment' || d.mode === 'label' || d.mode === 'reconnect') {
      const p = st.connPreview.get(d.connId);
      engine.set({ ...clear, connPreview: new Map() });
      if (!p) return;
      if (d.mode === 'reconnect') {
        const c = engine.lookup.conn(d.connId)!;
        const end = (p as Record<string, Connector['source']>)[d.end];
        const other = d.end === 'source' ? c.target : c.source;
        if (!end.viewId && !getConnector(c.kind)?.freeEnds) return;
        const ok =
          end.viewId && other.viewId
            ? canConnect(
                engine,
                c.kind,
                d.end === 'source' ? end.viewId : other.viewId,
                d.end === 'source' ? other.viewId : end.viewId,
              )
            : true;
        if (ok !== true) {
          useTipStore.getState().showAt(ok, ev.clientX, ev.clientY, 'error');
          setTimeout(() => useTipStore.getState().hide(), 1800);
          return;
        }
      }
      engine.apply((tx) => tx.setConn(d.connId, p));
      return;
    }
    engine.set(clear);
  };

  /** Hook ShapeDef.onPlaced sau khi người dùng đặt hình. */
  const placed = (id: string) => {
    const v = engine.lookup.view(id);
    const def = v ? getShape(v.shape) : undefined;
    if (!v || !def?.onPlaced) return;
    def.onPlaced(v, {
      apply: (fn) => engine.apply(fn),
      lookup: engine.lookup,
      remove: () => engine.apply((tx) => tx.deleteView(id)),
    });
  };

  // ---------- nhấp đúp ----------
  const onDouble = (t: Element, wx: number, wy: number): boolean => {
    const st = engine.state;
    const wpEl = t.closest('[data-wp]');
    const selConn = st.selConns.size === 1 ? engine.lookup.conn([...st.selConns][0]) : undefined;
    if (wpEl && selConn && !ro) {
      const i = Number(wpEl.getAttribute('data-wp'));
      engine.apply((tx) =>
        tx.setConn(selConn.id, (c) => {
          const w = c.waypoints.filter((_, j) => j !== i);
          return {
            ...c,
            waypoints: w,
            routing: w.length ? 'manual' : (getConnector(c.kind)?.defaultRouting ?? 'orthogonal'),
          };
        }),
      );
      return true;
    }
    const cEl = t.closest('[data-conn]');
    const v = viewAtEvent(t);
    if (cEl && !v && !ro) {
      const c = engine.lookup.conn(cEl.getAttribute('data-conn'))!;
      const r = routes.get(c.id);
      if (!r || r.curved) return true;
      const i = nearestSegment([wx, wy], r.pts);
      const inner = r.pts.slice(1, -1).map((p) => ({ x: r1(p[0]), y: r1(p[1]) }));
      inner.splice(i - 1, 0, { x: r1(wx), y: r1(wy) });
      engine.apply((tx) => tx.setConn(c.id, { waypoints: inner, routing: 'manual' }));
      engine.select([], [c.id]);
      return true;
    }
    if (v) {
      if (onDoubleClickView?.(v)) return true;
      editText(v.id, undefined, [wx, wy]);
      return true;
    }
    return false;
  };

  // ---------- bánh xe ----------
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const st = engine.state;
      if (ev.ctrlKey || ev.metaKey) zoomAt(st.zoom * Math.exp(-ev.deltaY * 0.0022), ev.clientX, ev.clientY);
      else if (ev.shiftKey) engine.set({ tx: st.tx - ev.deltaY });
      else engine.set({ tx: st.tx - ev.deltaX, ty: st.ty - ev.deltaY });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  // Space giữ để kéo khung nhìn
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target as HTMLElement).closest('input, textarea, [contenteditable]')) {
        if (!space.current) wrap.current?.classList.add('pan');
        space.current = true;
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        space.current = false;
        wrap.current?.classList.remove('pan');
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // ---------- thả từ palette ----------
  const dropHandlers = useMemo(() => getDropHandlers(engine.diagramType), [engine.diagramType]);
  const acceptsDrop = (types: readonly string[]) =>
    types.includes('text/x-umlab-tool') ||
    types.includes('text/x-umlab-model') ||
    dropHandlers.some((h) => h.types.some((t) => types.includes(t)));
  const onDrop = (ev: React.DragEvent) => {
    if (ro) return;
    const [wx, wy] = toWorld(ev.clientX, ev.clientY);
    const tool = ev.dataTransfer.getData('text/x-umlab-tool');
    if (!tool) {
      const types = [...ev.dataTransfer.types];
      const hs = dropHandlers.filter((h) => h.types.some((t) => types.includes(t)));
      if (!hs.length) return;
      ev.preventDefault();
      const ctx = {
        engine,
        at: [wx, wy] as Pt,
        shift: ev.shiftKey,
        target: viewAtPoint(wx, wy),
        editText: (id: string) => requestAnimationFrame(() => editText(id)),
      };
      const dt = ev.dataTransfer;
      void (async () => {
        for (const h of hs) if (await h.drop(dt, ctx)) return;
      })();
      return;
    }
    ev.preventDefault();
    const def = getShape(tool);
    if (def) {
      const pre = presetOf(engine, tool);
      const sz = pre.size ?? def.defaultSize;
      const id = createView(
        engine,
        tool,
        snapV(wx - sz.w / 2, engine.state.grid),
        snapV(wy - sz.h / 2, engine.state.grid),
        pre,
      );
      if (id && def.textRegions && !def.container) requestAnimationFrame(() => editText(id));
      if (id) placed(id);
    }
    const mid = ev.dataTransfer.getData('text/x-umlab-model');
    if (mid) ev.preventDefault();
  };

  const st = s;
  const editingKey = st.editing?.viewId ? st.editing : null;
  const bg = background;
  const content = useMemo(
    () => (st.order.length ? contentBox(st.order, [], engine.lookup) : null),
    [st.order, engine.lookup],
  );
  const catalogView = catalogHover ? st.views.get(catalogHover) : null;
  // tay nắm riêng của hình đang chọn một mình
  let shapeHandles: ShapeHandle[] = [];
  if (st.sel.size === 1 && !ro) {
    const v0 = st.views.get([...st.sel][0]);
    const def0 = v0 ? getShape(v0.shape) : undefined;
    if (v0 && def0?.handles && !v0.locked && !(drag.current && drag.current.mode === 'move')) {
      const b0 = engine.box(v0.id)!;
      shapeHandles = def0.handles(buildCtx({ ...engine.viewWithPreview(v0), ...b0 }, def0, engine.lookup));
    }
  }
  const catB = catalogView ? engine.box(catalogView.id) : null;

  return (
    <div
      ref={wrap}
      tabIndex={0}
      className={
        'canvas-wrap' +
        (st.grid ? ' grid' : '') +
        (st.tool !== 'tool:select' && st.tool !== 'tool:hand' ? ' tool-active' : '') +
        (st.tool === 'tool:hand' ? ' pan' : '')
      }
      style={{
        backgroundSize: `${GRID * 2 * st.zoom}px ${GRID * 2 * st.zoom}px`,
        backgroundPosition: `${st.tx}px ${st.ty}px`,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onPointerLeave={() => {
        if (!drag.current) {
          sendCursor(null);
          engine.set({ hover: null });
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        const [wx, wy] = toWorld(e.clientX, e.clientY);
        const v = viewAtEvent(e.target);
        const cEl = (e.target as Element).closest('[data-conn]');
        const c = cEl ? engine.lookup.conn(cEl.getAttribute('data-conn')) : undefined;
        if (v && !engine.state.sel.has(v.id)) engine.select([v.id]);
        if (c && !v) engine.select([], [c.id]);
        onContextMenu?.(e, { view: v ?? undefined, conn: v ? undefined : c, at: [wx, wy] });
      }}
      onDragOver={(e) => {
        if (!ro && acceptsDrop(e.dataTransfer.types)) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }
      }}
      onDrop={onDrop}
      data-testid="canvas"
    >
      <svg className="stage" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy="1.2" stdDeviation="1.4" floodColor="#1F2937" floodOpacity=".14" />
          </filter>
        </defs>
        <g
          transform={`translate(${st.tx},${st.ty}) scale(${st.zoom})`}
          fontFamily="Roboto, 'Helvetica Neue', Arial, sans-serif"
        >
          {visible.map((v) => {
            const p = st.preview.get(v.id);
            const pp = st.propPreview.get(v.id);
            const base = pp ? { ...v, props: { ...v.props, ...pp } } : v;
            const view = p ? { ...base, ...p } : base;
            return (
              <ShapeView
                key={v.id}
                view={view}
                model={v.modelId ? st.model.get(v.modelId) : null}
                lookup={engine.lookup}
                zoom={st.zoom}
                editing={editingKey && editingKey.viewId === v.id ? editingKey.key : null}
                version={
                  getShape(v.shape)?.live
                    ? st.version * 1000 + st.metaVersion
                    : getShape(v.shape)?.container || v.modelId
                      ? st.version
                      : 0
                }
              />
            );
          })}
          {[...st.conns.values()].map((c) => {
            const r = routes.get(c.id);
            if (!r) return null;
            const sv = c.source.viewId ? st.views.get(c.source.viewId) : null;
            const tv = c.target.viewId ? st.views.get(c.target.viewId) : null;
            if (sv?.hidden || tv?.hidden) return null;
            const pc = st.connPreview.get(c.id);
            return (
              <ConnectorView
                key={c.id}
                conn={pc ? { ...c, ...pc } : c}
                routed={r}
                lookup={engine.lookup}
                bg={bg}
                model={c.modelId ? st.model.get(c.modelId) : null}
                jumps={allPts ? allPts.filter((x) => x !== r.pts) : undefined}
                version={getConnector(c.kind)?.live ? st.version : 0}
              />
            );
          })}
          <Overlay
            zoom={st.zoom}
            views={st.views}
            box={(id) => engine.box(id)}
            sel={st.sel}
            selConns={st.selConns}
            hover={st.hover}
            routes={routes}
            guides={st.guides}
            marquee={st.marquee}
            lasso={st.lasso}
            connecting={st.connecting}
            dropTarget={st.dropTarget}
            showAnchors={!ro && (st.tool === 'tool:select' || !!getConnector(st.tool)) && !drag.current}
            dragging={!!drag.current && (drag.current.mode === 'move' || drag.current.mode === 'resize')}
            readOnly={ro}
            peers={peers}
            ink={st.ink}
            pen={st.pen}
            penCursor={penCur}
            shapeHandles={shapeHandles}
            waypoints={(id) =>
              (st.connPreview.get(id)?.waypoints ?? engine.lookup.conn(id)?.waypoints ?? []) as {
                x: number;
                y: number;
              }[]
            }
          />
          {catB && !drag.current && (
            <g
              data-catalog={catalogView!.id}
              transform={`translate(${catB.x + catB.w + 14 / st.zoom},${catB.y + catB.h / 2})`}
              style={{ cursor: 'grab' }}
            >
              <circle r={9 / st.zoom} fill="var(--accent)" stroke="#fff" strokeWidth={1.5 / st.zoom} />
              <path
                d={`M${-4 / st.zoom},0 H${4 / st.zoom} M${1 / st.zoom},${-3 / st.zoom} L${4 / st.zoom},0 L${1 / st.zoom},${3 / st.zoom}`}
                stroke="#fff"
                strokeWidth={1.6 / st.zoom}
                fill="none"
                strokeLinecap="round"
              />
              <title>Kéo để tạo nhanh phần tử nối tiếp</title>
            </g>
          )}
        </g>
      </svg>
      {editing && (
        <TextEditor
          key={editing.viewId + editing.region.key}
          engine={engine}
          region={editing.region}
          onDone={() => {
            setEditing(null);
            engine.set({ editing: null });
            wrap.current?.focus({ preventScroll: true });
          }}
          onTab={(dir) => {
            const v = engine.lookup.view(editing.viewId);
            if (!v) return;
            const regs = regionsOf(v);
            const i = regs.findIndex((r) => r.key === editing.region.key);
            const next = regs[(i + dir + regs.length) % regs.length];
            if (next && next.key !== editing.region.key) requestAnimationFrame(() => editText(v.id, next.key));
          }}
        />
      )}
      <Minimap
        views={st.order}
        content={content}
        viewport={viewport}
        onMove={(cx, cy) => engine.set({ tx: size.w / 2 - cx * st.zoom, ty: size.h / 2 - cy * st.zoom })}
      />
    </div>
  );
}

function unionOf(boxes: Box[]): Box {
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  for (const b of boxes) {
    x1 = Math.min(x1, b.x);
    y1 = Math.min(y1, b.y);
    x2 = Math.max(x2, b.x + b.w);
    y2 = Math.max(y2, b.y + b.h);
  }
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

const snapV = (v: number, grid: boolean) => (grid ? Math.round(v / GRID) * GRID : Math.round(v));

function upsertLabel(
  labels: Connector['labels'],
  role: string,
  patch: Partial<Connector['labels'][number]>,
): Connector['labels'] {
  const out = labels.map((l) => (l.role === role ? { ...l, ...patch } : l));
  if (!out.some((l) => l.role === role)) out.push({ role, text: '', pos: 0.5, ...patch });
  return out;
}

/** Connector mặc định khi kéo từ chấm nối (công cụ đang chọn hoặc connector đầu tiên của palette). */
function defaultConnectorFor(e: Engine): string | null {
  if (getConnector(e.state.tool)) return e.state.tool;
  return e.defaultConnector;
}

/** Preset của công cụ đang chọn (biến thể palette như Dependency «call»). */
function presetOf(
  e: Engine,
  tool = e.state.tool,
): {
  props?: Record<string, unknown>;
  model?: Record<string, unknown>;
  style?: Record<string, unknown>;
  size?: { w: number; h: number };
} {
  return e.presets.get(tool) ?? {};
}

/** Hình bám viền (pin): giữ trên viền của cha. */
function attachToBorder(e: Engine, id: string, b: Box): Box {
  const v = e.lookup.view(id)!;
  const parent = v.parentId ? e.box(v.parentId) : null;
  if (!parent) return b;
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const d = [
    Math.abs(cy - parent.y),
    Math.abs(cx - (parent.x + parent.w)),
    Math.abs(cy - (parent.y + parent.h)),
    Math.abs(cx - parent.x),
  ];
  const side = d.indexOf(Math.min(...d));
  const clampX = clamp(cx, parent.x, parent.x + parent.w);
  const clampY = clamp(cy, parent.y, parent.y + parent.h);
  const pos: Pt =
    side === 0
      ? [clampX, parent.y]
      : side === 1
        ? [parent.x + parent.w, clampY]
        : side === 2
          ? [clampX, parent.y + parent.h]
          : [parent.x, clampY];
  return { x: r1(pos[0] - b.w / 2), y: r1(pos[1] - b.h / 2), w: b.w, h: b.h };
}
