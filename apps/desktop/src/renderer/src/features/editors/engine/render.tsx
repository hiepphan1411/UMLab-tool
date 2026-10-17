// Dựng SVG cho hình và đường nối — dùng chung cho canvas, xuất ảnh và ảnh thu nhỏ (một đường vẽ duy nhất).
import { memo, type ReactNode } from 'react';
import type { Connector, ModelElement, View } from '@umlab/core';
import { directionAt, pointAt, polyLen, roundedPath, jumpPath, type Box, type Pt } from './geometry';
import { dashFor, lightning, marker } from './markers';
import {
  connLook,
  getConnector,
  getShape,
  type ComputedLabel,
  type ConnLook,
  type EngineLookup,
  type RenderCtx,
  type ShapeDef,
} from './registry';
import { routeConnector, type RouteEnv, type Routed } from './route';
import { textW } from './text';

export const DEFAULT_STYLE = { fill: '#FFFFFF', stroke: '#1F2937', strokeWidth: 1.4 };

export function buildCtx(
  view: View,
  def: ShapeDef | undefined,
  lookup: EngineLookup,
  opts: { zoom?: number; forExport?: boolean; editing?: string | null } = {},
): RenderCtx {
  const model = view.modelId ? (lookup.model(view.modelId) ?? null) : null;
  const props = { ...(def?.defaultProps?.() ?? {}), ...view.props };
  const style = { ...DEFAULT_STYLE, ...(def?.defaultStyle ?? {}), ...view.style } as RenderCtx['style'];
  return {
    view,
    props,
    style,
    model,
    data: (model?.data ?? {}) as Record<string, unknown>,
    lookup,
    zoom: opts.zoom ?? 1,
    forExport: !!opts.forExport,
    editing: opts.editing ?? null,
  };
}

/** Tên hiển thị của một hình (Lớp, tìm kiếm, kiểm tra). */
export function viewName(v: View, lookup: EngineLookup): string {
  const def = getShape(v.shape);
  if (def?.name) return def.name(buildCtx(v, def, lookup));
  const m = v.modelId ? lookup.model(v.modelId) : null;
  if (m?.name) return m.name;
  const p = v.props as Record<string, unknown>;
  const raw = (p.name || p.title || p.text || def?.label || v.shape) as string;
  return String(raw).replace(/\*\*/g, '').split('\n')[0];
}

function MissingShape({ view }: { view: View }) {
  return (
    <>
      <rect
        x={view.x}
        y={view.y}
        width={view.w}
        height={view.h}
        fill="#FFF7ED"
        stroke="#D98A1C"
        strokeDasharray="4 3"
      />
      <text x={view.x + view.w / 2} y={view.y + view.h / 2 + 4} fontSize={11} textAnchor="middle" fill="#9A3412">
        {view.shape}
      </text>
    </>
  );
}

/** Một hình. memo theo tham chiếu view/model (engine giữ object cũ khi không đổi). */
export const ShapeView = memo(function ShapeView({
  view,
  model,
  lookup,
  zoom,
  forExport,
  editing,
  version,
}: {
  view: View;
  model: ModelElement | null | undefined;
  lookup: EngineLookup;
  zoom: number;
  forExport?: boolean;
  editing?: string | null;
  /** Phiên bản dữ liệu liên quan (hình con, phần tử mô hình khác) — đổi để vẽ lại. */
  version?: number;
}) {
  void model;
  void version;
  if (view.hidden) return null;
  const def = getShape(view.shape);
  const ctx = buildCtx(view, def, lookup, { zoom, forExport, editing });
  return (
    <g data-view={forExport ? undefined : view.id} data-shape={forExport ? undefined : view.shape}>
      {def ? def.render(ctx) : <MissingShape view={view} />}
    </g>
  );
});

// ---------------- đường nối ----------------

export function makeRouteEnv(lookup: EngineLookup, boxOf?: (id: string) => Box | null, smart = true): RouteEnv {
  return {
    box: (id) =>
      boxOf?.(id) ??
      (() => {
        const v = lookup.view(id);
        return v && !v.hidden ? { x: v.x, y: v.y, w: v.w, h: v.h } : null;
      })(),
    outline: (id) => {
      const v = lookup.view(id);
      return v ? getShape(v.shape)?.outline : undefined;
    },
    obstacles: smart
      ? (exclude) =>
          lookup
            .views()
            .filter(
              (v) =>
                !v.hidden &&
                !exclude.includes(v.id) &&
                !getShape(v.shape)?.container &&
                !exclude.includes(v.parentId ?? ''),
            )
            .map((v) => boxOf?.(v.id) ?? { x: v.x, y: v.y, w: v.w, h: v.h })
      : undefined,
  };
}

interface LabelPlaced {
  role: string;
  text: string;
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
  italic?: boolean;
  bold?: boolean;
  draggable?: boolean;
}

/** Vị trí nhãn: nhãn giữa theo pos; nhãn đầu mút bám đầu, tự lật bên để không đè đường. */
export function placeLabels(c: Connector, r: Routed, computed: ComputedLabel[]): LabelPlaced[] {
  const out: LabelPlaced[] = [];
  const stored = new Map((c.labels ?? []).map((l) => [l.role, l]));
  const endCount: Record<string, number> = {};
  for (const lab of computed) {
    if (!lab.text) continue;
    const st = stored.get(lab.role);
    const dx = st?.dx ?? 0;
    const dy = st?.dy ?? 0;
    if (lab.end) {
      const pts = lab.end === 'source' ? r.pts : [...r.pts].reverse();
      const L = polyLen(pts) || 1;
      const p = pointAt(pts, Math.min(0.45, 16 / L));
      const u = directionAt(pts, Math.min(0.45, 16 / L));
      const k = endCount[lab.end] ?? 0;
      endCount[lab.end] = k + 1;
      // hai nhãn ở cùng một đầu: một bên trái, một bên phải đường
      const n: Pt = [-u[1], u[0]];
      const sideSign = k === 0 ? 1 : -1;
      const flip = Math.abs(u[0]) > Math.abs(u[1]) ? (n[1] < 0 ? 1 : -1) : n[0] > 0 ? 1 : -1;
      const off = 11 * sideSign * flip;
      const x = p[0] + n[0] * off;
      const y = p[1] + n[1] * off;
      const anchor: LabelPlaced['anchor'] = Math.abs(n[0] * off) < 3 ? 'middle' : n[0] * off > 0 ? 'start' : 'end';
      out.push({
        role: lab.role,
        text: lab.text,
        x: x + dx,
        y: y + dy,
        anchor,
        italic: lab.italic,
        bold: lab.bold,
        draggable: lab.draggable,
      });
    } else {
      const pos = st?.pos ?? lab.pos ?? 0.5;
      const p = pointAt(r.pts, pos);
      const u = directionAt(r.pts, pos);
      const horizontal = Math.abs(u[0]) >= Math.abs(u[1]);
      const k = endCount['mid'] ?? 0;
      endCount['mid'] = k + 1;
      const base = horizontal ? [p[0], p[1] - 9 - k * 14] : [p[0] + 8, p[1] - k * 14];
      out.push({
        role: lab.role,
        text: lab.text,
        x: base[0] + dx,
        y: base[1] + dy,
        anchor: horizontal ? 'middle' : 'start',
        italic: lab.italic,
        bold: lab.bold,
        draggable: lab.draggable ?? true,
      });
    }
  }
  return out;
}

/** Nhãn mặc định từ connector.labels (đường không khai báo labels() riêng: arch.link, connector chung). */
function storedLabels(c: Connector): ComputedLabel[] {
  return (c.labels ?? [])
    .filter((l) => l.text)
    .map((l) => ({ role: l.role, text: l.text, pos: l.pos, draggable: true }));
}

export const ConnectorView = memo(function ConnectorView({
  conn,
  routed,
  lookup,
  bg,
  forExport,
  model,
  jumps,
}: {
  conn: Connector;
  routed: Routed;
  lookup: EngineLookup;
  bg: string;
  forExport?: boolean;
  model: ModelElement | null | undefined;
  jumps?: Pt[][];
}) {
  const def = getConnector(conn.kind);
  const look: ConnLook = connLook(def, conn, model ?? null, lookup);
  const props = conn.props as Record<string, unknown>;
  const color = look.stroke ?? (conn.style.stroke as string) ?? '#1F2937';
  const sw = look.width ?? Number(conn.style.strokeWidth ?? 1.3);
  const pts = routed.pts.map((p) => [...p] as Pt);
  if (pts.length < 2) return null;
  const nodes: ReactNode[] = [];
  const shrink = (i: number, j: number, k: number) => {
    if (k <= 0) return;
    const dx = pts[i][0] - pts[j][0];
    const dy = pts[i][1] - pts[j][1];
    const L = Math.hypot(dx, dy) || 1;
    const kk = Math.min(k, L - 1);
    pts[i] = [pts[i][0] - (dx / L) * kk, pts[i][1] - (dy / L) * kk];
  };
  const tipEnd = routed.pts[routed.pts.length - 1];
  const tipStart = routed.pts[0];
  const uEnd = directionAt(routed.pts, 1);
  const uStart0 = directionAt(routed.pts, 0);
  const uStart: Pt = [-uStart0[0], -uStart0[1]];
  const mEnd = marker(look.end, tipEnd, uEnd, sw, color, bg, 'me');
  const mStart = marker(look.start, tipStart, uStart, sw, color, bg, 'ms');
  shrink(pts.length - 1, pts.length - 2, mEnd.inset);
  shrink(0, 1, mStart.inset);
  const radius = Number(props.radius ?? (routed.curved ? 0 : 6));
  const d =
    jumps && jumps.length && !routed.curved ? jumpPath(pts, jumps) : roundedPath(pts, routed.curved ? 0 : radius);
  if (!forExport)
    nodes.push(
      <path
        key="hit"
        d={roundedPath(routed.pts, 0)}
        fill="none"
        stroke="transparent"
        strokeWidth={14}
        style={{ cursor: 'pointer' }}
      />,
    );
  if (look.double) {
    nodes.push(<path key="dbl1" d={d} fill="none" stroke={color} strokeWidth={sw * 3.4} strokeLinejoin="round" />);
    nodes.push(<path key="dbl2" d={d} fill="none" stroke={bg} strokeWidth={sw * 1.4} strokeLinejoin="round" />);
  } else
    nodes.push(
      <path
        key="line"
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dashFor(look.line, sw)}
      />,
    );
  nodes.push(mEnd.node, mStart.node);
  if (look.middle === 'lightning')
    nodes.push(lightning(pointAt(routed.pts, 0.5), directionAt(routed.pts, 0.5), sw, color, 'zz'));

  // nhãn
  const computed: ComputedLabel[] = def?.labels ? def.labels(conn, model ?? null, lookup) : storedLabels(conn);
  if (look.stereotype) computed.unshift({ role: 'stereotype', text: `«${look.stereotype}»`, pos: 0.5 });
  const placed = placeLabels(conn, routed, computed);
  const boxed = conn.kind === 'arch.link';
  for (const l of placed) {
    if (boxed) {
      const fs = 12;
      const lines = l.text.split('\n');
      const w = Math.max(...lines.map((t) => textW(t, fs, 500))) + 12;
      const lh = fs * 1.3;
      const h = lines.length * lh + 6;
      const p = pointAt(routed.pts, (conn.labels?.find((x) => x.role === l.role)?.pos as number) ?? 0.5);
      const cx = p[0] + (conn.labels?.find((x) => x.role === l.role)?.dx ?? 0);
      const cy = p[1] + (conn.labels?.find((x) => x.role === l.role)?.dy ?? 0);
      nodes.push(
        <g
          key={'lb' + l.role}
          data-label={forExport ? undefined : l.role}
          style={forExport ? undefined : { cursor: 'move' }}
        >
          <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={4} fill={bg} stroke={color} strokeWidth={0.8} />
          {lines.map((t, i) => (
            <text
              key={i}
              x={cx}
              y={cy - h / 2 + 3 + i * lh + lh * 0.78}
              fontSize={fs}
              fontWeight={500}
              fill={color}
              textAnchor="middle"
            >
              {t}
            </text>
          ))}
        </g>,
      );
      continue;
    }
    nodes.push(
      <text
        key={'lb' + l.role}
        data-label={forExport || !l.draggable ? undefined : l.role}
        x={l.x}
        y={l.y + 4}
        fontSize={12}
        fill={color}
        textAnchor={l.anchor}
        fontStyle={l.italic ? 'italic' : undefined}
        fontWeight={l.bold ? 600 : undefined}
        paintOrder="stroke"
        stroke={bg}
        strokeWidth={3}
        strokeLinejoin="round"
        style={forExport || !l.draggable ? undefined : { cursor: 'move' }}
      >
        {l.text}
      </text>,
    );
  }
  return <g data-conn={forExport ? undefined : conn.id}>{nodes}</g>;
});

/** Nội dung sơ đồ tĩnh (xuất ảnh / thumbnail): hình theo thứ tự vẽ rồi đường nối. */
export function StaticDiagram({
  views,
  conns,
  lookup,
  bg,
  jumps,
}: {
  views: View[];
  conns: Connector[];
  lookup: EngineLookup;
  bg: string;
  jumps?: boolean;
}) {
  const env = makeRouteEnv(lookup);
  const routes = new Map<string, Routed>();
  for (const c of conns) {
    const r = routeConnector(c, env);
    if (r) routes.set(c.id, r);
  }
  const all = jumps ? [...routes.values()].map((r) => r.pts) : undefined;
  return (
    <>
      {views.map((v) => (
        <ShapeView
          key={v.id}
          view={v}
          model={v.modelId ? lookup.model(v.modelId) : null}
          lookup={lookup}
          zoom={1}
          forExport
        />
      ))}
      {conns.map((c) => {
        const r = routes.get(c.id);
        if (!r) return null;
        const src = c.source.viewId ? lookup.view(c.source.viewId) : null;
        const tgt = c.target.viewId ? lookup.view(c.target.viewId) : null;
        if (src?.hidden || tgt?.hidden) return null;
        return (
          <ConnectorView
            key={c.id}
            conn={c}
            routed={r}
            lookup={lookup}
            bg={bg}
            forExport
            model={c.modelId ? lookup.model(c.modelId) : null}
            jumps={all?.filter((p) => p !== r.pts)}
          />
        );
      })}
    </>
  );
}

export function contentBox(views: View[], conns: Connector[], lookup: EngineLookup): Box | null {
  const env = makeRouteEnv(lookup, undefined, false);
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  for (const v of views) {
    if (v.hidden) continue;
    x1 = Math.min(x1, v.x);
    y1 = Math.min(y1, v.y);
    x2 = Math.max(x2, v.x + v.w);
    y2 = Math.max(y2, v.y + v.h);
  }
  for (const c of conns) {
    const r = routeConnector(c, env);
    if (!r) continue;
    for (const p of r.pts) {
      x1 = Math.min(x1, p[0] - 14);
      y1 = Math.min(y1, p[1] - 14);
      x2 = Math.max(x2, p[0] + 14);
      y2 = Math.max(y2, p[1] + 14);
    }
  }
  return isFinite(x1) ? { x: x1, y: y1, w: x2 - x1, h: y2 - y1 } : null;
}
