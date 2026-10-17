// Vẽ biểu đồ Gantt (port gLayout / gLeftSVG / gRightSVG / buildGanttExportSVG của tool cũ) bằng JSX SVG.
// Cùng một đường vẽ cho màn hình (exp = false: có vùng bấm, kéo) và ảnh xuất (exp = true: luôn nền sáng).
import { useEffect, useState, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  DAYMS,
  GCOLS,
  GST,
  WD_VI,
  ddm,
  ddmy,
  dn,
  dOf,
  durOf,
  firstOfMonth,
  gSummary,
  isoWeek,
  mondayOf,
  nextMonth,
  reportDay,
  statusOf,
  wdOf,
  type GanttData,
  type GanttTask,
} from '@umlab/core';
import { FONT_CSS } from '../engine/roboto-font';
import { fitText, textW } from '../engine/text';
import { IconGlyph, iconKeyInfo } from '../architecture/icons';

export interface Pal {
  bg: string;
  head: string;
  line: string;
  grid: string;
  text: string;
  muted: string;
  weekend: string;
  alt: string;
  sel: string;
  tint: number;
  today: string;
}
export const PAL_L: Pal = {
  bg: '#FFFFFF',
  head: '#F6F7F9',
  line: '#E6E8EC',
  grid: '#EEF0F3',
  text: '#1B2130',
  muted: '#6B7385',
  weekend: '#F7F8FA',
  alt: '#FBFBFC',
  sel: '#EDF2FE',
  tint: 0.17,
  today: '#E5484D',
};
export const PAL_D: Pal = {
  bg: '#1D2027',
  head: '#242833',
  line: '#313644',
  grid: '#292D37',
  text: '#E5E8EF',
  muted: '#939BAD',
  weekend: '#21242C',
  alt: '#1F222A',
  sel: '#233356',
  tint: 0.3,
  today: '#FF6B6B',
};

function currentPal(): Pal {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--panel').trim().toLowerCase();
  return v && v !== '#ffffff' && v !== '#fff' ? PAL_D : PAL_L;
}

/** Bảng màu theo theme hiện tại, tự đổi khi người dùng đổi Sáng/Tối/Hệ thống. */
export function useGanttPal(): Pal {
  const [p, setP] = useState<Pal>(() => currentPal());
  useEffect(() => {
    const upd = () => setP(currentPal());
    const mo = new MutationObserver(upd);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    const mq = matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', upd);
    return () => {
      mo.disconnect();
      mq.removeEventListener('change', upd);
    };
  }, []);
  return p;
}

export interface GLayout {
  rd: number;
  from: number;
  to: number;
  ppd: number;
  W: number;
  HH: number;
  RH: number;
  x: (d: number) => number;
}

export function gLayout(g: GanttData): GLayout {
  const rd = reportDay(g);
  const ppd = { day: 34, week: 17, month: 5.5 }[g.scale] ?? 17;
  let mn = g.tasks.length ? Math.min(...g.tasks.map((t) => dn(t.start))) : rd - 7;
  let mx = g.tasks.length ? Math.max(...g.tasks.map((t) => dn(t.end))) : rd + 28;
  mn = Math.min(mn, rd);
  mx = Math.max(mx, rd);
  let from: number;
  let to: number;
  if (g.scale === 'month') {
    from = firstOfMonth(mn);
    to = nextMonth(mx);
  } else if (g.scale === 'day') {
    from = mondayOf(mn);
    to = mondayOf(mx) + 7;
  } else {
    from = mondayOf(mn) - 7;
    to = mondayOf(mx) + 14;
  }
  return { rd, from, to, ppd, W: Math.round((to - from) * ppd), HH: 60, RH: 56, x: (d) => (d - from) * ppd };
}

const r1 = (v: number) => Math.round(v * 10) / 10;

function T({
  x,
  y,
  s,
  size,
  weight,
  fill,
  anchor = 'start',
  ls,
}: {
  x: number;
  y: number;
  s: string | number;
  size: number;
  weight: number;
  fill: string;
  anchor?: 'start' | 'middle' | 'end';
  ls?: number;
}) {
  return (
    <text x={r1(x)} y={r1(y)} fontSize={size} fontWeight={weight} fill={fill} textAnchor={anchor} letterSpacing={ls}>
      {s}
    </text>
  );
}

const PEOPLE_COLORS = ['#2E6BE6', '#D9463E', '#1F9D66', '#7C5CC4', '#D98A1C', '#0E8A9B', '#C2417E'];
export function personColor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PEOPLE_COLORS[h % PEOPLE_COLORS.length];
}
export function initials(name: string) {
  const w = name.trim().split(/\s+/);
  return w.length > 1 && /^cả/i.test(w[0]) ? 'CN' : (w[w.length - 1][0] || '?').toUpperCase();
}
export const splitPeople = (owner: string) =>
  String(owner || '')
    .split(/\s*(?:\+|,|&|\/)\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

export const isModule = (g: GanttData) => g.board === 'module';

// ---------------- cột trái ----------------

export function leftWidth(g: GanttData) {
  return GCOLS.filter((c) => g.columns[c.k]).reduce((a, c) => a + c.w, 0);
}

export function GanttLeft({
  g,
  L,
  P,
  exp,
  sel,
}: {
  g: GanttData;
  L: GLayout;
  P: Pal;
  exp: boolean;
  sel?: string | null;
}) {
  const cols = GCOLS.filter((c) => g.columns[c.k]);
  const W = leftWidth(g);
  const H = L.HH + g.tasks.length * L.RH;
  const out: ReactNode[] = [
    <rect key="bg" width={W} height={H} fill={P.bg} />,
    <rect key="hd" width={W} height={L.HH} fill={P.head} />,
  ];
  let x = 0;
  for (const c of cols) {
    out.push(
      <T
        key={'h' + c.k}
        x={x + 14}
        y={L.HH - 20}
        s={(c.k === 'name' && isModule(g) ? 'Module' : c.l).toUpperCase()}
        size={11}
        weight={600}
        fill={P.muted}
        ls={0.6}
      />,
    );
    x += c.w;
  }
  g.tasks.forEach((t, i) => {
    const y = L.HH + i * L.RH;
    const st = statusOf(t, L.rd);
    const col = GST[st].c;
    const cy = y + L.RH / 2;
    const on = !exp && sel === t.id;
    const rowBg = on ? P.sel : i % 2 ? P.alt : P.bg;
    const cells: ReactNode[] = [<rect key="r" x={0} y={y} width={W} height={L.RH} fill={rowBg} />];
    let cx = 0;
    for (const c of cols) {
      const w = c.w;
      const k = c.k;
      if (k === 'code') {
        cells.push(
          t.type === 'milestone' ? (
            <path key="cd" d={`M${cx + 16},${cy - 5.5} l5.5,5.5 l-5.5,5.5 l-5.5,-5.5z`} fill={col} />
          ) : (
            <circle key="cd" cx={cx + 16} cy={cy} r={4.5} fill={col} />
          ),
          <T
            key="ct"
            x={cx + 28}
            y={cy + 4.5}
            s={fitText(t.code || '—', 13, 600, w - 34)}
            size={13}
            weight={600}
            fill={P.text}
          />,
        );
      } else if (k === 'name') {
        let nx = cx + 14;
        if (!g.columns.code) {
          cells.push(<circle key="nd" cx={cx + 12} cy={cy} r={4} fill={col} />);
          nx += 8;
        }
        if (t.icon && iconKeyInfo(t.icon)) {
          cells.push(
            <rect key="ib" x={nx} y={cy - 14} width={28} height={28} rx={7} fill={col} fillOpacity={0.12} />,
            <IconGlyph key="ic" k={t.icon} x={nx + 5} y={cy - 9} size={18} color={col} stroke={2} />,
          );
          nx += 38;
        }
        const sub =
          t.type === 'milestone'
            ? `Mốc · ${ddmy(dn(t.start))}`
            : `${ddm(dn(t.start))} – ${ddm(dn(t.end))} · ${durOf(t)} ngày` +
              (t.items.length ? ` · ${t.items.filter((it) => it.done).length}/${t.items.length} hạng mục` : '');
        cells.push(
          <T
            key="nm"
            x={nx}
            y={cy - 3}
            s={fitText(t.name, 13.5, 500, cx + w - nx - 8)}
            size={13.5}
            weight={500}
            fill={P.text}
          />,
          <T
            key="ns"
            x={nx}
            y={cy + 14}
            s={fitText(sub, 11.5, 400, cx + w - nx - 8)}
            size={11.5}
            weight={400}
            fill={P.muted}
          />,
        );
      } else if (k === 'start' || k === 'end') {
        cells.push(<T key={k} x={cx + 14} y={cy + 4.5} s={ddmy(dn(t[k]))} size={12.5} weight={400} fill={P.text} />);
      } else if (k === 'days') {
        cells.push(
          <T
            key="d"
            x={cx + 14}
            y={cy + 4.5}
            s={t.type === 'milestone' ? '—' : durOf(t)}
            size={12.5}
            weight={500}
            fill={P.text}
          />,
        );
      } else if (k === 'owner') {
        const ppl = splitPeople(t.owner);
        ppl.slice(0, 3).forEach((p, j) => {
          const ax = cx + 24 + j * 15;
          const ini = initials(p);
          cells.push(
            <circle key={'av' + j} cx={ax} cy={cy} r={11} fill={personColor(p)} stroke={rowBg} strokeWidth={2} />,
            <T
              key={'ai' + j}
              x={ax}
              y={cy + 4}
              s={ini}
              size={ini.length > 1 ? 9 : 11}
              weight={700}
              fill="#FFFFFF"
              anchor="middle"
            />,
          );
        });
        const tx = cx + 24 + Math.min(ppl.length, 3) * 15 + (ppl.length ? 2 : -10);
        cells.push(
          <T
            key="on"
            x={tx}
            y={cy + 4.5}
            s={fitText(ppl.join(', ') || '—', 12.5, 400, cx + w - tx - 8)}
            size={12.5}
            weight={400}
            fill={P.text}
          />,
        );
      } else if (k === 'progress') {
        const bw = 56;
        const bar = (
          <>
            <rect x={cx + 14} y={cy - 3} width={bw} height={6} rx={3} fill={P.grid} />
            <rect x={cx + 14} y={cy - 3} width={r1((bw * t.progress) / 100)} height={6} rx={3} fill={col} />
            <T x={cx + 14 + bw + 9} y={cy + 4.5} s={t.progress + '%'} size={12.5} weight={600} fill={P.text} />
          </>
        );
        cells.push(
          exp ? (
            <g key="pg">{bar}</g>
          ) : (
            <g key="pg" data-gprog={t.id} style={{ cursor: 'pointer' }}>
              <rect x={cx + 4} y={cy - 16} width={w - 8} height={32} rx={7} fill={P.grid} fillOpacity={on ? 1 : 0} />
              {bar}
              <IconGlyph k="lucide:pencil" x={cx + w - 20} y={cy - 6} size={12} color={P.muted} stroke={2} />
            </g>
          ),
        );
      } else if (k === 'status') {
        const lbl = GST[st].n;
        const pw = textW(lbl, 11.5, 600) + (st === 'done' ? 34 : 22);
        cells.push(
          <rect key="sb" x={cx + 12} y={cy - 11} width={r1(pw)} height={22} rx={11} fill={col} fillOpacity={0.13} />,
        );
        if (st === 'done')
          cells.push(
            <circle key="sc" cx={cx + 24} cy={cy} r={6} fill={col} />,
            <path
              key="sk"
              d={`M${cx + 21.3},${cy} l2,2 l3.5,-3.8`}
              fill="none"
              stroke="#fff"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />,
          );
        cells.push(
          <T key="st" x={cx + (st === 'done' ? 35 : 23)} y={cy + 4} s={lbl} size={11.5} weight={600} fill={col} />,
        );
      }
      if (cx > 0)
        cells.push(<line key={'v' + k} x1={cx} x2={cx} y1={y} y2={y + L.RH} stroke={P.line} strokeOpacity={0.6} />);
      cx += w;
    }
    cells.push(<line key="bl" x1={0} x2={W} y1={y + L.RH} y2={y + L.RH} stroke={P.line} />);
    out.push(
      <g key={t.id} data-gr={exp ? undefined : t.id} style={exp ? undefined : { cursor: 'pointer' }}>
        {cells}
      </g>,
    );
  });
  out.push(
    <line key="hl" x1={0} x2={W} y1={L.HH} y2={L.HH} stroke={P.line} />,
    <line key="rl" x1={W - 0.5} x2={W - 0.5} y1={0} y2={H} stroke={P.line} />,
  );
  return <>{out}</>;
}

// ---------------- khung thời gian bên phải ----------------

export function GanttRight({
  g,
  L,
  P,
  exp,
  sel,
}: {
  g: GanttData;
  L: GLayout;
  P: Pal;
  exp: boolean;
  sel?: string | null;
}) {
  const W = L.W;
  const H = L.HH + g.tasks.length * L.RH;
  const X = L.x;
  const top = 28;
  const out: ReactNode[] = [<rect key="bg" width={W} height={H} fill={P.bg} />];
  g.tasks.forEach((t, i) =>
    out.push(
      <rect
        key={'row' + t.id}
        data-gr={exp ? undefined : t.id}
        x={0}
        y={L.HH + i * L.RH}
        width={W}
        height={L.RH}
        fill={!exp && sel === t.id ? P.sel : i % 2 ? P.alt : P.bg}
      />,
    ),
  );
  if (g.weekends && g.scale !== 'month')
    for (let d = L.from; d < L.to; d++) {
      const w = wdOf(d);
      if (w === 0 || w === 6)
        out.push(<rect key={'we' + d} x={r1(X(d))} y={L.HH} width={r1(L.ppd)} height={H - L.HH} fill={P.weekend} />);
    }
  out.push(<rect key="hd" width={W} height={L.HH} fill={P.head} />);
  if (g.scale === 'month') {
    const y0 = dOf(L.from).getUTCFullYear();
    for (let y = y0; Math.round(Date.UTC(y, 0, 1) / DAYMS) < L.to; y++) {
      const a = Math.max(L.from, Math.round(Date.UTC(y, 0, 1) / DAYMS));
      out.push(
        <T key={'y' + y} x={X(a) + 10} y={19} s={'Năm ' + y} size={12} weight={600} fill={P.text} />,
        <line key={'yl' + y} x1={r1(X(a))} x2={r1(X(a))} y1={0} y2={top} stroke={P.line} />,
      );
    }
    for (let m = L.from; m < L.to; m = nextMonth(m)) {
      const e = Math.min(nextMonth(m), L.to);
      out.push(
        <T
          key={'m' + m}
          x={(X(m) + X(e)) / 2}
          y={top + 20}
          s={'Tháng ' + (dOf(m).getUTCMonth() + 1)}
          size={12}
          weight={500}
          fill={P.text}
          anchor="middle"
        />,
        <line key={'ml' + m} x1={r1(X(m))} x2={r1(X(m))} y1={top} y2={H} stroke={P.line} />,
      );
    }
  } else {
    for (let m = firstOfMonth(L.from); m < L.to; m = nextMonth(m)) {
      const a = Math.max(m, L.from);
      const e = Math.min(nextMonth(m), L.to);
      const d = dOf(m);
      const lbl = `Tháng ${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`;
      let lx = X(a) + 10;
      const lw = textW(lbl, 12, 600);
      const tpx = X(L.rd) + L.ppd / 2;
      const tpw = textW('Hôm nay ' + ddm(L.rd), 10.5, 600) + 14;
      if (g.scale !== 'day' && lx < tpx + tpw / 2 + 6 && lx + lw > tpx - tpw / 2 - 6) lx = tpx + tpw / 2 + 10;
      if (X(e) - lx > lw + 4) out.push(<T key={'mo' + m} x={lx} y={19} s={lbl} size={12} weight={600} fill={P.text} />);
      if (a > L.from) out.push(<line key={'mol' + m} x1={r1(X(a))} x2={r1(X(a))} y1={0} y2={top} stroke={P.line} />);
    }
    if (g.scale === 'day') {
      for (let d = L.from; d < L.to; d++) {
        const cx = X(d) + L.ppd / 2;
        const w = wdOf(d);
        const isT = d === L.rd;
        if (isT)
          out.push(
            <rect
              key={'td' + d}
              x={r1(X(d) + 3)}
              y={top + 3}
              width={r1(L.ppd - 6)}
              height={L.HH - top - 6}
              rx={6}
              fill={P.today}
            />,
          );
        out.push(
          <T
            key={'wd' + d}
            x={cx}
            y={top + 13}
            s={WD_VI[w]}
            size={9.5}
            weight={500}
            fill={isT ? '#FFFFFF' : P.muted}
            anchor="middle"
          />,
          <T
            key={'dd' + d}
            x={cx}
            y={top + 26}
            s={dOf(d).getUTCDate()}
            size={12}
            weight={isT ? 700 : 500}
            fill={isT ? '#FFFFFF' : P.text}
            anchor="middle"
          />,
          <line
            key={'dl' + d}
            x1={r1(X(d))}
            x2={r1(X(d))}
            y1={w === 1 ? top : L.HH}
            y2={H}
            stroke={w === 1 ? P.line : P.grid}
          />,
        );
      }
    } else {
      for (let d = mondayOf(L.from); d < L.to; d += 7) {
        const a = Math.max(d, L.from);
        const cx = X(a) + L.ppd * 3.5;
        out.push(
          <T
            key={'wk' + d}
            x={cx}
            y={top + 14}
            s={'Tuần ' + isoWeek(d)}
            size={11.5}
            weight={600}
            fill={P.text}
            anchor="middle"
          />,
          <T key={'wkd' + d} x={cx} y={top + 27} s={ddm(d)} size={10.5} weight={400} fill={P.muted} anchor="middle" />,
          <line key={'wkl' + d} x1={r1(X(a))} x2={r1(X(a))} y1={top} y2={H} stroke={P.grid} />,
        );
      }
    }
  }
  out.push(
    <line key="tl" x1={0} x2={W} y1={top} y2={top} stroke={P.line} />,
    <line key="hl" x1={0} x2={W} y1={L.HH} y2={L.HH} stroke={P.line} />,
  );
  g.tasks.forEach((t, i) =>
    out.push(
      <line key={'rl' + t.id} x1={0} x2={W} y1={L.HH + (i + 1) * L.RH} y2={L.HH + (i + 1) * L.RH} stroke={P.grid} />,
    ),
  );
  // vạch hôm nay (ngày báo cáo)
  const tx = X(L.rd) + L.ppd / 2;
  out.push(
    <line
      key="today"
      x1={r1(tx)}
      x2={r1(tx)}
      y1={L.HH}
      y2={H}
      stroke={P.today}
      strokeWidth={1.5}
      strokeDasharray="4 3"
    />,
  );
  if (g.scale !== 'day') {
    const lbl = 'Hôm nay ' + ddm(L.rd);
    const lw = textW(lbl, 10.5, 600) + 14;
    out.push(
      <line key="tdl" x1={r1(tx)} x2={r1(tx)} y1={24} y2={L.HH} stroke={P.today} strokeWidth={1.5} />,
      <rect key="tdr" x={r1(tx - lw / 2)} y={4} width={r1(lw)} height={20} rx={10} fill={P.today} />,
      <T key="tdt" x={tx} y={18} s={lbl} size={10.5} weight={600} fill="#FFFFFF" anchor="middle" />,
    );
  }
  // thanh
  g.tasks.forEach((t, i) =>
    out.push(<Bar key={'bar' + t.id} t={t} i={i} L={L} P={P} exp={exp} on={!exp && sel === t.id} />),
  );
  return <>{out}</>;
}

function Bar({ t, i, L, P, exp, on }: { t: GanttTask; i: number; L: GLayout; P: Pal; exp: boolean; on: boolean }) {
  const st = statusOf(t, L.rd);
  const c = GST[st].c;
  const y0 = L.HH + i * L.RH;
  const sd = dn(t.start);
  const X = L.x;
  const bx = X(sd) + 1;
  const bw = Math.max(L.ppd - 2, durOf(t) * L.ppd - 2);
  const bh = 24;
  const by = y0 + (L.RH - bh) / 2;
  if (t.type === 'milestone') {
    const mx = X(sd) + L.ppd / 2;
    const my = y0 + L.RH / 2;
    const r = 10;
    return (
      <g data-gt={exp ? undefined : t.id}>
        <path
          d={`M${r1(mx)},${r1(my - r)} L${r1(mx + r)},${r1(my)} L${r1(mx)},${r1(my + r)} L${r1(mx - r)},${r1(my)} Z`}
          fill={c}
          stroke={on ? P.text : c}
          strokeWidth={on ? 2 : 1}
          data-gh={exp ? undefined : 'move'}
          style={exp ? undefined : { cursor: 'grab' }}
        />
        <text x={r1(mx + 16)} y={r1(my + 4.5)} fontSize={12.5}>
          <tspan fontWeight={700} fill={c}>
            {t.code || 'Mốc'}
          </tspan>
          <tspan fill={P.muted} fontWeight={400}>
            {' '}
            {t.name} · {ddm(sd)}
          </tspan>
        </text>
      </g>
    );
  }
  const pw = (bw * t.progress) / 100;
  const cid = 'gc_' + t.id + (exp ? '_x' : '');
  const inner = bw >= 76 ? fitText(t.code, 11.5, 600, bw - 16) : '';
  return (
    <g data-gt={exp ? undefined : t.id}>
      <defs>
        <clipPath id={cid}>
          <rect x={r1(bx)} y={r1(by)} width={r1(bw)} height={bh} rx={6} />
        </clipPath>
        <clipPath id={cid + 'p'}>
          <rect x={r1(bx)} y={r1(by)} width={r1(pw)} height={bh} />
        </clipPath>
      </defs>
      <rect x={r1(bx)} y={r1(by)} width={r1(bw)} height={bh} rx={6} fill={c} fillOpacity={P.tint} />
      <rect x={r1(bx)} y={r1(by)} width={r1(pw)} height={bh} fill={c} clipPath={`url(#${cid})`} />
      <rect
        x={r1(bx + 0.5)}
        y={r1(by + 0.5)}
        width={r1(bw - 1)}
        height={bh - 1}
        rx={5.5}
        fill="none"
        stroke={on ? P.text : c}
        strokeOpacity={on ? 1 : 0.55}
        strokeWidth={on ? 1.6 : 1}
      />
      {inner && (
        <>
          <T x={bx + 8} y={by + 16} s={inner} size={11.5} weight={600} fill={c} />
          <g clipPath={`url(#${cid}p)`}>
            <T x={bx + 8} y={by + 16} s={inner} size={11.5} weight={600} fill="#FFFFFF" />
          </g>
        </>
      )}
      <text x={r1(bx + bw + 8)} y={r1(by + 16.5)} fontSize={12.5}>
        <tspan fontWeight={700} fill={c}>
          {t.progress}%
        </tspan>
        <tspan fill={P.muted} fontWeight={400}>
          {' '}
          {inner ? t.name : (t.code ? t.code + ' · ' : '') + t.name}
        </tspan>
      </text>
      {!exp && (
        <>
          <rect
            data-gh="move"
            x={r1(bx + 6)}
            y={r1(by)}
            width={r1(Math.max(4, bw - 12))}
            height={bh}
            fill="transparent"
            style={{ cursor: 'grab' }}
          />
          <rect
            data-gh="start"
            x={r1(bx - 4)}
            y={r1(by)}
            width={10}
            height={bh}
            fill="transparent"
            style={{ cursor: 'ew-resize' }}
          />
          <rect
            data-gh="end"
            x={r1(bx + bw - 6)}
            y={r1(by)}
            width={10}
            height={bh}
            fill="transparent"
            style={{ cursor: 'ew-resize' }}
          />
          {on && (
            <path
              data-gh="prog"
              d={`M${r1(bx + pw)},${r1(by + bh - 2)} l6,9 h-12 z`}
              fill={P.bg}
              stroke={c}
              strokeWidth={1.5}
              style={{ cursor: 'col-resize' }}
            />
          )}
        </>
      )}
    </g>
  );
}

// ---------------- ảnh xuất: tiêu đề + chú thích + bảng ----------------

export function ganttExportSVG(g: GanttData, o: { padding: number; bg: string | null; embedFont?: boolean }) {
  const P = PAL_L;
  const L = gLayout(g);
  const lw = leftWidth(g);
  const h = L.HH + g.tasks.length * L.RH;
  const sm = gSummary(g);
  const pad = o.padding;
  const topH = 92;
  const W = Math.ceil(pad * 2 + lw + L.W);
  const H = Math.ceil(pad * 2 + topH + h);
  let lx = pad;
  const legend = Object.entries(GST).map(([k, v]) => {
    const x = lx;
    lx += 15 + textW(v.n, 12, 500) + 18;
    return (
      <g key={k}>
        <rect x={x} y={pad + 64} width={10} height={10} rx={3} fill={v.c} />
        <T x={x + 15} y={pad + 73} s={v.n} size={12} weight={500} fill={P.text} />
      </g>
    );
  });
  const body = renderToStaticMarkup(
    <g fontFamily="Roboto, 'Helvetica Neue', Arial, sans-serif">
      <T x={pad} y={pad + 24} s={g.title} size={22} weight={700} fill={P.text} />
      <T
        x={pad}
        y={pad + 48}
        s={`Ngày báo cáo ${ddmy(sm.rd)} · ${g.tasks.length ? ddm(sm.mn) + ' – ' + ddmy(sm.mx) : ''} · Tiến độ chung ${sm.overall}% (kế hoạch ${sm.planned}%)`}
        size={13}
        weight={400}
        fill={P.muted}
      />
      {legend}
      <g transform={`translate(${pad},${pad + topH})`}>
        <GanttLeft g={g} L={L} P={P} exp />
      </g>
      <g transform={`translate(${pad + lw},${pad + topH})`}>
        <GanttRight g={g} L={L} P={P} exp />
      </g>
      <rect x={pad + 0.5} y={pad + topH + 0.5} width={lw + L.W - 1} height={h - 1} fill="none" stroke={P.line} />
    </g>,
  );
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    (o.embedFont ? `<style>${FONT_CSS}</style>` : '') +
    (o.bg ? `<rect width="${W}" height="${H}" fill="${o.bg}"/>` : '') +
    body +
    '</svg>';
  return { svg, W, H };
}

/** Ảnh thu nhỏ 320×200: các thanh theo trạng thái trên lưới. */
export function ganttThumbSVG(g: GanttData): string | null {
  if (!g.tasks.length) return null;
  const rd = reportDay(g);
  const mn = Math.min(...g.tasks.map((t) => dn(t.start)));
  const mx = Math.max(...g.tasks.map((t) => dn(t.end))) + 1;
  const W = 320;
  const H = 200;
  const pad = 14;
  const n = Math.min(g.tasks.length, 12);
  const rh = (H - pad * 2) / Math.max(n, 5);
  const k = (W - pad * 2) / Math.max(1, mx - mn);
  const bars = g.tasks
    .slice(0, 12)
    .map((t, i) => {
      const c = GST[statusOf(t, rd)].c;
      const x = pad + (dn(t.start) - mn) * k;
      const w = Math.max(4, durOf(t) * k);
      const y = pad + i * rh + rh * 0.2;
      const bh = rh * 0.6;
      if (t.type === 'milestone')
        return `<rect x="${r1(x - bh / 2)}" y="${r1(y)}" width="${r1(bh)}" height="${r1(bh)}" fill="${c}" transform="rotate(45 ${r1(x)} ${r1(y + bh / 2)})"/>`;
      return `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(bh)}" rx="3" fill="${c}" fill-opacity=".22"/><rect x="${r1(x)}" y="${r1(y)}" width="${r1((w * t.progress) / 100)}" height="${r1(bh)}" rx="3" fill="${c}"/>`;
    })
    .join('');
  const tx =
    rd >= mn && rd <= mx
      ? `<line x1="${r1(pad + (rd - mn) * k)}" x2="${r1(pad + (rd - mn) * k)}" y1="6" y2="${H - 6}" stroke="#E5484D" stroke-dasharray="3 2"/>`
      : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#FFFFFF"/>${bars}${tx}</svg>`;
}
