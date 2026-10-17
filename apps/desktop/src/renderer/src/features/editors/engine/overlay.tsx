import type { Peer } from '@shared/api';
import type { View } from '@umlab/core';
import {
  anchorPt,
  center,
  ellipseBoundary,
  diamondBoundary,
  roundedPath,
  unionBox,
  type Box,
  type Guide,
  type Pt,
} from './geometry';
import type { ConnectDrag } from './engine';
import { getShape } from './registry';
import type { Routed } from './route';

export const HANDLES: [string, number, number][] = [
  ['nw', 0, 0],
  ['n', 0.5, 0],
  ['ne', 1, 0],
  ['e', 1, 0.5],
  ['se', 1, 1],
  ['s', 0.5, 1],
  ['sw', 0, 1],
  ['w', 0, 0.5],
];
const CURSOR: Record<string, string> = {
  nw: 'nwse',
  se: 'nwse',
  ne: 'nesw',
  sw: 'nesw',
  n: 'ns',
  s: 'ns',
  e: 'ew',
  w: 'ew',
};

function outlineFor(v: View, b: Box, sw: number, stroke: string, dash?: string) {
  const o = getShape(v.shape)?.outline;
  if (o === 'ellipse')
    return (
      <ellipse
        cx={b.x + b.w / 2}
        cy={b.y + b.h / 2}
        rx={b.w / 2}
        ry={b.h / 2}
        fill="none"
        stroke={stroke}
        strokeWidth={sw}
        strokeDasharray={dash}
        pointerEvents="none"
      />
    );
  if (o === 'diamond')
    return (
      <polygon
        points={`${b.x + b.w / 2},${b.y} ${b.x + b.w},${b.y + b.h / 2} ${b.x + b.w / 2},${b.y + b.h} ${b.x},${b.y + b.h / 2}`}
        fill="none"
        stroke={stroke}
        strokeWidth={sw}
        strokeDasharray={dash}
        pointerEvents="none"
      />
    );
  return (
    <rect
      x={b.x}
      y={b.y}
      width={b.w}
      height={b.h}
      fill="none"
      stroke={stroke}
      strokeWidth={sw}
      strokeDasharray={dash}
      pointerEvents="none"
    />
  );
}

export interface OverlayProps {
  zoom: number;
  views: Map<string, View>;
  box: (id: string) => Box | null;
  sel: Set<string>;
  selConns: Set<string>;
  hover: string | null;
  routes: Map<string, Routed>;
  guides: Guide[];
  marquee: Box | null;
  lasso: [number, number][] | null;
  connecting: ConnectDrag | null;
  dropTarget: string | null;
  showAnchors: boolean;
  dragging: boolean;
  readOnly: boolean;
  peers: Peer[];
  ink: [number, number][] | null;
  waypoints: (id: string) => { x: number; y: number }[];
}

/** Lớp phủ trên canvas: chọn, tay nắm, chấm nối, đường gióng, khung chọn, xem trước nối, người khác. */
export function Overlay(p: OverlayProps) {
  const z = p.zoom;
  const sw = 1.25 / z;
  const hs = 8 / z;
  const out: React.ReactNode[] = [];
  const selViews = [...p.sel].map((id) => p.views.get(id)).filter((v): v is View => !!v && !v.hidden);

  // người khác: vùng chọn + đang kéo
  for (const peer of p.peers) {
    for (const id of peer.selection ?? []) {
      const v = p.views.get(id);
      const b = v && p.box(id);
      if (!v || !b) continue;
      out.push(
        <g key={`ps-${peer.clientId}-${id}`}>
          {outlineFor(v, { x: b.x - 3 / z, y: b.y - 3 / z, w: b.w + 6 / z, h: b.h + 6 / z }, 2 / z, peer.color)}
        </g>,
      );
    }
    if (peer.dragging)
      for (const id of peer.dragging.ids) {
        const v = p.views.get(id);
        if (!v) continue;
        out.push(
          <rect
            key={`pd-${peer.clientId}-${id}`}
            x={v.x + peer.dragging.dx}
            y={v.y + peer.dragging.dy}
            width={v.w}
            height={v.h}
            fill={peer.color}
            fillOpacity={0.06}
            stroke={peer.color}
            strokeWidth={1.2 / z}
            strokeDasharray={`${5 / z} ${4 / z}`}
            pointerEvents="none"
          />,
        );
      }
  }

  // hover
  const hov = p.hover ? p.views.get(p.hover) : null;
  const hb = hov ? p.box(hov.id) : null;
  if (hov && hb && !p.sel.has(hov.id) && !p.connecting && !p.dragging)
    out.push(<g key="hover">{outlineFor(hov, hb, sw, 'var(--sel)')}</g>);

  // container nhận thả
  if (p.dropTarget) {
    const v = p.views.get(p.dropTarget);
    const b = p.box(p.dropTarget);
    if (v && b)
      out.push(
        <rect
          key="drop"
          x={b.x}
          y={b.y}
          width={b.w}
          height={b.h}
          fill="var(--sel)"
          fillOpacity={0.06}
          stroke="var(--sel)"
          strokeWidth={2 / z}
          strokeDasharray={`${6 / z} ${4 / z}`}
          pointerEvents="none"
        />,
      );
  }

  // chọn
  for (const v of selViews) {
    const b = p.box(v.id);
    if (b) out.push(<g key={'sel' + v.id}>{outlineFor(v, b, sw * 1.4, 'var(--sel)')}</g>);
  }
  if (selViews.length === 1 && !p.readOnly && !p.dragging && !selViews[0].locked) {
    const v = selViews[0];
    const def = getShape(v.shape);
    const b = p.box(v.id)!;
    const res = def?.resizable ?? true;
    if (res && !def?.attach)
      for (const [k, fx, fy] of HANDLES) {
        if (res === 'horizontal' && (k === 'n' || k === 's' || k.length === 2)) continue;
        if (res === 'vertical' && (k === 'e' || k === 'w' || k.length === 2)) continue;
        const x = b.x + b.w * fx;
        const y = b.y + b.h * fy;
        out.push(
          <rect
            key={'h' + k}
            data-handle={k}
            x={x - hs / 2}
            y={y - hs / 2}
            width={hs}
            height={hs}
            rx={1.5 / z}
            fill="#fff"
            stroke="var(--sel)"
            strokeWidth={sw}
            style={{ cursor: `${CURSOR[k]}-resize` }}
          />,
        );
      }
  } else if (selViews.length > 1) {
    const b = unionBox(selViews.map((v) => p.box(v.id)!).filter(Boolean));
    if (b)
      out.push(
        <rect
          key="multi"
          x={b.x}
          y={b.y}
          width={b.w}
          height={b.h}
          fill="none"
          stroke="var(--sel)"
          strokeWidth={sw}
          strokeDasharray={`${4 / z} ${3 / z}`}
          pointerEvents="none"
        />,
      );
  }

  // chấm nối 4 cạnh khi rê
  if (p.showAnchors && hov && hb && !hov.locked && !getShape(hov.shape)?.noPorts) {
    const o = getShape(hov.shape)?.outline;
    for (const side of ['top', 'right', 'bottom', 'left'] as const) {
      let [x, y] = anchorPt(hb, side, 0.5);
      if (o === 'ellipse') [x, y] = ellipseBoundary(hb, [x, y]);
      if (o === 'diamond') [x, y] = diamondBoundary(hb, [x, y]);
      out.push(
        <circle
          key={'a' + side}
          data-anchor={hov.id}
          data-side={side}
          cx={x}
          cy={y}
          r={5 / z}
          fill="#fff"
          stroke="var(--sel)"
          strokeWidth={1.5 / z}
          style={{ cursor: 'crosshair' }}
        />,
      );
    }
  }

  // đường nối đang chọn: 2 đầu, waypoint, đoạn
  for (const id of p.selConns) {
    const r = p.routes.get(id);
    if (!r) continue;
    out.push(
      <path
        key={'cs' + id}
        d={roundedPath(r.pts, 0)}
        fill="none"
        stroke="var(--sel)"
        strokeWidth={3 / z}
        strokeOpacity={0.35}
        pointerEvents="none"
      />,
    );
    if (p.readOnly || p.selConns.size > 1) continue;
    const a = r.pts[0];
    const l = r.pts[r.pts.length - 1];
    out.push(
      <circle
        key="ep-s"
        data-ep="source"
        cx={a[0]}
        cy={a[1]}
        r={5.5 / z}
        fill="var(--sel)"
        stroke="#fff"
        strokeWidth={1.5 / z}
        style={{ cursor: 'move' }}
      />,
    );
    out.push(
      <circle
        key="ep-t"
        data-ep="target"
        cx={l[0]}
        cy={l[1]}
        r={5.5 / z}
        fill="var(--sel)"
        stroke="#fff"
        strokeWidth={1.5 / z}
        style={{ cursor: 'move' }}
      />,
    );
    p.waypoints(id).forEach((w, i) =>
      out.push(
        <rect
          key={'wp' + i}
          data-wp={i}
          x={w.x - 4.5 / z}
          y={w.y - 4.5 / z}
          width={9 / z}
          height={9 / z}
          fill="#fff"
          stroke="var(--sel)"
          strokeWidth={1.5 / z}
          transform={`rotate(45 ${w.x} ${w.y})`}
          style={{ cursor: 'move' }}
        />,
      ),
    );
    // tay nắm giữa đoạn (kéo để dời cả đoạn) — chỉ với đường gấp khúc vuông góc
    if (!r.curved)
      for (let i = 1; i < r.pts.length; i++) {
        const [x1, y1] = r.pts[i - 1];
        const [x2, y2] = r.pts[i];
        const len = Math.hypot(x2 - x1, y2 - y1);
        if (len * z < 36 || i === 1 || i === r.pts.length - 1) continue;
        const hor = Math.abs(y1 - y2) < 0.5;
        const ver = Math.abs(x1 - x2) < 0.5;
        if (!hor && !ver) continue;
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        out.push(
          <rect
            key={'sg' + i}
            data-seg={i}
            x={mx - (hor ? 8 : 3) / z}
            y={my - (hor ? 3 : 8) / z}
            width={(hor ? 16 : 6) / z}
            height={(hor ? 6 : 16) / z}
            rx={2 / z}
            fill="#fff"
            stroke="var(--sel)"
            strokeWidth={1.2 / z}
            style={{ cursor: hor ? 'ns-resize' : 'ew-resize' }}
          />,
        );
      }
  }

  // xem trước nối
  if (p.connecting) {
    const c = p.connecting;
    const a = c.sourcePt;
    const bad = !!c.invalid;
    out.push(
      <path
        key="cprev"
        d={`M${a[0]},${a[1]} L${c.cur[0]},${c.cur[1]}`}
        stroke={bad ? 'var(--danger)' : 'var(--sel)'}
        strokeWidth={1.5 / z}
        strokeDasharray={`${5 / z} ${4 / z}`}
        fill="none"
        pointerEvents="none"
      />,
    );
    if (c.targetId) {
      const t = p.views.get(c.targetId);
      const b = p.box(c.targetId);
      if (t && b) out.push(<g key="ctgt">{outlineFor(t, b, 2 / z, bad ? 'var(--danger)' : 'var(--sel)')}</g>);
      if (b && c.targetSide && !bad) {
        const [x, y] = anchorPt(b, c.targetSide as 'top', c.targetT ?? 0.5);
        out.push(<circle key="ctp" cx={x} cy={y} r={5 / z} fill="var(--sel)" pointerEvents="none" />);
      }
    }
  }

  if (p.marquee) {
    const m = p.marquee;
    out.push(
      <rect
        key="mq"
        x={m.x}
        y={m.y}
        width={m.w}
        height={m.h}
        fill="var(--sel)"
        fillOpacity={0.08}
        stroke="var(--sel)"
        strokeWidth={sw}
        pointerEvents="none"
      />,
    );
  }
  if (p.lasso && p.lasso.length > 1)
    out.push(
      <path
        key="lasso"
        d={'M' + p.lasso.map((q) => q.join(',')).join(' L') + ' Z'}
        fill="var(--sel)"
        fillOpacity={0.06}
        stroke="var(--sel)"
        strokeWidth={sw}
        strokeDasharray={`${4 / z} ${3 / z}`}
        pointerEvents="none"
      />,
    );
  if (p.ink && p.ink.length > 1)
    out.push(
      <path
        key="ink"
        d={'M' + p.ink.map((q) => q.join(',')).join(' L')}
        fill="none"
        stroke="var(--text)"
        strokeWidth={2 / z}
        strokeLinecap="round"
        strokeLinejoin="round"
        pointerEvents="none"
      />,
    );

  for (const g of p.guides) {
    out.push(
      g.v !== undefined ? (
        <line
          key={'gv' + g.v + g.a}
          x1={g.v}
          x2={g.v}
          y1={g.a}
          y2={g.b}
          stroke="var(--guide)"
          strokeWidth={1 / z}
          pointerEvents="none"
        />
      ) : (
        <line
          key={'gh' + g.h + g.a}
          y1={g.h}
          y2={g.h}
          x1={g.a}
          x2={g.b}
          stroke="var(--guide)"
          strokeWidth={1 / z}
          pointerEvents="none"
        />
      ),
    );
  }

  // con trỏ người khác
  for (const peer of p.peers) {
    if (!peer.cursor) continue;
    const { x, y } = peer.cursor;
    const s = 1 / z;
    out.push(
      <g key={'cur' + peer.clientId} transform={`translate(${x},${y}) scale(${s})`} pointerEvents="none">
        <path
          d="M0,0 L0,16 L4.5,12 L7.5,19 L10,18 L7,11 L12.5,11 Z"
          fill={peer.color}
          stroke="#fff"
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
        <g transform="translate(12,20)">
          <rect x={0} y={0} rx={4} height={18} width={peer.name.length * 6.6 + 12} fill={peer.color} />
          <text x={6} y={12.5} fontSize={11} fill="#fff" fontWeight={600} fontFamily="var(--font-ui)">
            {peer.name}
          </text>
        </g>
      </g>,
    );
  }
  return <g className="overlay">{out}</g>;
}

export const boxCenter = (b: Box): Pt => center(b);
