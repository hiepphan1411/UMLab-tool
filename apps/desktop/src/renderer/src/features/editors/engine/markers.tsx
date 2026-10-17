// Thư viện marker đầu mút (docs/spec/engine.md mục 3) — vẽ bằng path SVG, cỡ theo độ dày nét, màu theo stroke.
import type { ReactNode } from 'react';
import type { Pt } from './geometry';
import type { MarkerKind } from './registry';

const f = (v: number) => Math.round(v * 10) / 10;
const P = (p: Pt) => `${f(p[0])},${f(p[1])}`;

export interface MarkerOut {
  node: ReactNode;
  /** Số px rút ngắn đường để không đè lên marker. */
  inset: number;
}

/**
 * Vẽ marker tại `tip`, `u` là vector đơn vị hướng VÀO đầu mút (từ điểm trước tới tip).
 * `bg` là màu nền để tô ruột hình rỗng.
 */
export function marker(
  kind: MarkerKind,
  tip: Pt,
  u: Pt,
  sw: number,
  color: string,
  bg: string,
  key: string,
): MarkerOut {
  const n: Pt = [-u[1], u[0]];
  const at = (d: number, s = 0): Pt => [tip[0] - u[0] * d + n[0] * s, tip[1] - u[1] * d + n[1] * s];
  const common = { stroke: color, strokeWidth: sw, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  const s = 7 + sw * 2;
  switch (kind) {
    case 'arrow-open': {
      const L = s * 1.05;
      return {
        node: (
          <path key={key} d={`M${P(at(L, L * 0.55))} L${P(tip)} L${P(at(L, -L * 0.55))}`} fill="none" {...common} />
        ),
        inset: sw * 0.6,
      };
    }
    case 'half-arrow': {
      const L = s * 1.05;
      return { node: <path key={key} d={`M${P(at(L, L * 0.55))} L${P(tip)}`} fill="none" {...common} />, inset: 0 };
    }
    case 'arrow-filled': {
      const L = s;
      return {
        node: (
          <path
            key={key}
            d={`M${P(tip)} L${P(at(L, L * 0.45))} L${P(at(L, -L * 0.45))} Z`}
            fill={color}
            stroke={color}
            strokeWidth={1}
            strokeLinejoin="round"
          />
        ),
        inset: L * 0.8,
      };
    }
    case 'triangle-hollow': {
      const L = s * 1.45;
      return {
        node: (
          <path key={key} d={`M${P(tip)} L${P(at(L, L * 0.55))} L${P(at(L, -L * 0.55))} Z`} fill={bg} {...common} />
        ),
        inset: L,
      };
    }
    case 'diamond-hollow':
    case 'diamond-filled': {
      const L = s * 1.1;
      return {
        node: (
          <path
            key={key}
            d={`M${P(tip)} L${P(at(L, L * 0.42))} L${P(at(L * 2, 0))} L${P(at(L, -L * 0.42))} Z`}
            fill={kind === 'diamond-filled' ? color : bg}
            {...common}
          />
        ),
        inset: L * 2,
      };
    }
    case 'circle-plus': {
      const r = 6 + sw;
      const c = at(r);
      return {
        node: (
          <g key={key}>
            <circle cx={f(c[0])} cy={f(c[1])} r={r} fill={bg} {...common} />
            <path
              d={`M${P([c[0] - u[0] * r, c[1] - u[1] * r])} L${P([c[0] + u[0] * r, c[1] + u[1] * r])} M${P([c[0] - n[0] * r, c[1] - n[1] * r])} L${P([c[0] + n[0] * r, c[1] + n[1] * r])}`}
              fill="none"
              {...common}
            />
          </g>
        ),
        inset: r * 2,
      };
    }
    case 'dot-filled': {
      const r = 3.5 + sw * 0.6;
      return { node: <circle key={key} cx={f(tip[0])} cy={f(tip[1])} r={r} fill={color} />, inset: 0 };
    }
    case 'cross-x': {
      const r = 6;
      return {
        node: (
          <path
            key={key}
            d={`M${P(at(r, r))} L${P(at(-r, -r))} M${P(at(r, -r))} L${P(at(-r, r))}`}
            fill="none"
            {...common}
            strokeWidth={Math.max(1.4, sw)}
          />
        ),
        inset: 0,
      };
    }
    case 'lollipop': {
      const r = 7;
      const c = at(r);
      return { node: <circle key={key} cx={f(c[0])} cy={f(c[1])} r={r} fill={bg} {...common} />, inset: r * 2 };
    }
    case 'socket': {
      const r = 9;
      const c = at(-2);
      const a = [c[0] + n[0] * r, c[1] + n[1] * r] as Pt;
      const b = [c[0] - n[0] * r, c[1] - n[1] * r] as Pt;
      const sweep = u[0] * n[1] - u[1] * n[0] > 0 ? 1 : 0;
      return {
        node: <path key={key} d={`M${P(a)} A${r},${r} 0 0 ${sweep} ${P(b)}`} fill="none" {...common} />,
        inset: 0,
      };
    }
    // ---------- crow's foot (ERD) ----------
    case 'cf-one':
    case 'cf-one-only':
    case 'cf-zero-one':
    case 'cf-many':
    case 'cf-one-many':
    case 'cf-zero-many': {
      const w = 7;
      const parts: string[] = [];
      let circle: Pt | null = null;
      const bar = (d: number) => parts.push(`M${P(at(d, w))} L${P(at(d, -w))}`);
      const fork = () => parts.push(`M${P(at(0, w + 1))} L${P(at(14, 0))} L${P(at(0, -w - 1))}`);
      if (kind === 'cf-one') bar(11);
      if (kind === 'cf-one-only') {
        bar(9);
        bar(15);
      }
      if (kind === 'cf-zero-one') {
        bar(9);
        circle = at(21);
      }
      if (kind === 'cf-many') fork();
      if (kind === 'cf-one-many') {
        fork();
        bar(19);
      }
      if (kind === 'cf-zero-many') {
        fork();
        circle = at(23);
      }
      return {
        node: (
          <g key={key}>
            <path d={parts.join(' ')} fill="none" {...common} />
            {circle && <circle cx={f(circle[0])} cy={f(circle[1])} r={5} fill={bg} {...common} />}
          </g>
        ),
        inset: 0,
      };
    }
    default:
      return { node: null, inset: 0 };
  }
}

/** Tia sét giữa đường (Exception Handler, interrupting edge) tại điểm `c`, hướng `u`. */
export function lightning(c: Pt, u: Pt, sw: number, color: string, key: string): ReactNode {
  const n: Pt = [-u[1], u[0]];
  const pt = (a: number, b: number): Pt => [c[0] + u[0] * a + n[0] * b, c[1] + u[1] * a + n[1] * b];
  return (
    <path
      key={key}
      d={`M${P(pt(-14, 0))} L${P(pt(-2, 0))} L${P(pt(-6, 9))} L${P(pt(6, -9))} L${P(pt(2, 0))} L${P(pt(14, 0))}`}
      fill="none"
      stroke={color}
      strokeWidth={sw}
      strokeLinejoin="round"
    />
  );
}

export const dashFor = (line: 'solid' | 'dashed' | 'dotted', sw: number): string | undefined =>
  line === 'dashed'
    ? `${f(Math.max(4, sw * 3.6))} ${f(Math.max(3, sw * 2.6))}`
    : line === 'dotted'
      ? `${f(Math.max(1, sw))} ${f(Math.max(2.5, sw * 2.4))}`
      : undefined;
