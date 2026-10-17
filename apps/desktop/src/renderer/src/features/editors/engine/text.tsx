// Đo & ngắt dòng chữ cho SVG (port layoutText/drawLines của tool cũ: hỗ trợ **đậm** trong chuỗi).
import type { ReactNode } from 'react';

export const DIAGRAM_FONT = "Roboto, 'Helvetica Neue', Arial, sans-serif";

let ctx: CanvasRenderingContext2D | null | undefined;
const cache = new Map<string, number>();

function measureCtx(): CanvasRenderingContext2D | null {
  if (ctx !== undefined) return ctx;
  try {
    ctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
  } catch {
    ctx = null;
  }
  return ctx;
}

/** Độ rộng chữ (px) bằng canvas.measureText, có cache. Không có canvas (test) thì ước lượng. */
export function textW(t: string, size: number, weight: number | string = 400, italic = false): number {
  const key = `${size}|${weight}|${italic ? 1 : 0}|${t}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const c = measureCtx();
  let w: number;
  if (c) {
    c.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${DIAGRAM_FONT}`;
    w = c.measureText(t).width;
  } else w = t.length * size * (Number(weight) >= 600 ? 0.58 : 0.54);
  if (cache.size > 20000) cache.clear();
  cache.set(key, w);
  return w;
}

/** Xoá cache đo chữ (sau khi font Roboto nạp xong). */
export const resetTextCache = () => cache.clear();

export interface Run {
  t: string;
  w: number;
  width: number;
  sp: boolean;
  /** Nghiêng (`*chữ*`). */
  it?: boolean;
}
export interface Line {
  runs: Run[];
  width: number;
}

/** Ngắt dòng theo độ rộng tối đa; `**chữ**` in đậm, `*chữ*` nghiêng, dòng bắt đầu bằng "- " thành gạch đầu dòng. */
export function layoutText(text: string, size: number, baseWeight: number, maxW: number): Line[] {
  const lines: Line[] = [];
  String(text ?? '')
    .split('\n')
    .forEach((par) => {
      const toks: { t: string; w: number; sp: boolean; it?: boolean }[] = [];
      let bold = false;
      let it = false;
      const src = /^\s*[-*•] /.test(par) && !/^\s*\*\*/.test(par) ? par.replace(/^(\s*)[-*•] /, '$1• ') : par;
      const parts = src.split(/(\*\*|\*)/);
      parts.forEach((seg, i) => {
        if (seg === '**') {
          bold = !bold;
          return;
        }
        if (seg === '*' && (it || parts.slice(i + 1).includes('*'))) {
          it = !it;
          return;
        }
        seg.split(/(\s+)/).forEach((t) => {
          if (t) toks.push({ t, w: bold ? 700 : baseWeight, sp: /^\s+$/.test(t), it: it || undefined });
        });
      });
      let line: Run[] = [];
      let lw = 0;
      const trim = () => {
        while (line.length && line[line.length - 1].sp) lw -= line.pop()!.width;
      };
      toks.forEach((tk) => {
        const w = textW(tk.t, size, tk.w, !!tk.it);
        if (!tk.sp && line.length && lw + w > maxW + 0.5) {
          trim();
          lines.push({ runs: line, width: lw });
          line = [];
          lw = 0;
        }
        if (tk.sp && !line.length) return;
        line.push({ ...tk, width: w });
        lw += w;
      });
      trim();
      lines.push({ runs: line, width: lw });
    });
  return lines;
}

function mergeRuns(runs: Run[]): { t: string; w: number; it?: boolean }[] {
  const out: { t: string; w: number; it?: boolean }[] = [];
  runs.forEach((r) => {
    const l = out[out.length - 1];
    if (l && l.w === r.w && !!l.it === !!r.it) l.t += r.t;
    else out.push({ t: r.t, w: r.w, it: r.it });
  });
  return out;
}

const rr = (v: number) => Math.round(v * 10) / 10;

/** Vẽ các dòng đã ngắt; x là mốc trái/giữa/phải theo align; y là đỉnh khối chữ. */
export function TextLines({
  lines,
  x,
  y,
  size,
  color,
  align = 'left',
  lh,
  italic,
  underline,
  decoration,
}: {
  lines: Line[];
  x: number;
  y: number;
  size: number;
  color: string;
  align?: 'left' | 'center' | 'right';
  lh: number;
  italic?: boolean;
  underline?: boolean;
  decoration?: string;
}) {
  const anchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start';
  return (
    <>
      {lines.map((ln, i) => {
        const base = y + i * lh + (lh - size) / 2 + size * 0.8;
        return (
          <text
            key={i}
            x={rr(x)}
            y={rr(base)}
            fontSize={size}
            fill={color}
            textAnchor={anchor}
            xmlSpace="preserve"
            fontStyle={italic ? 'italic' : undefined}
            textDecoration={underline ? 'underline' : decoration}
          >
            {mergeRuns(ln.runs).map((r, j) => (
              <tspan key={j} fontWeight={r.w} fontStyle={r.it ? 'italic' : undefined}>
                {r.t}
              </tspan>
            ))}
          </text>
        );
      })}
    </>
  );
}

/** Khối chữ căn trong hộp (giữa theo chiều dọc). Trả về chiều cao thực. */
export function wrapText(text: string, size: number, weight: number, maxW: number, lhK = 1.3) {
  const lines = layoutText(text, size, weight, Math.max(10, maxW));
  const lh = size * lhK;
  return { lines, lh, height: lines.length * lh, width: Math.max(0, ...lines.map((l) => l.width)) };
}

/** Chữ một dòng đơn giản (có thể nghiêng/gạch chân). */
export function Label({
  x,
  y,
  text,
  size = 12,
  weight = 400,
  color = '#1F2937',
  anchor = 'middle',
  italic,
  underline,
  baseline = 'middle',
}: {
  x: number;
  y: number;
  text: ReactNode;
  size?: number;
  weight?: number;
  color?: string;
  anchor?: 'start' | 'middle' | 'end';
  italic?: boolean;
  underline?: boolean;
  baseline?: 'middle' | 'top' | 'bottom';
}) {
  const dy = baseline === 'middle' ? size * 0.35 : baseline === 'top' ? size * 0.8 : 0;
  return (
    <text
      x={rr(x)}
      y={rr(y + dy)}
      fontSize={size}
      fontWeight={weight}
      fill={color}
      textAnchor={anchor}
      fontStyle={italic ? 'italic' : undefined}
      textDecoration={underline ? 'underline' : undefined}
      xmlSpace="preserve"
    >
      {text}
    </text>
  );
}

/** Cắt chữ cho vừa độ rộng, thêm "…". */
export function fitText(str: string, size: number, weight: number, maxW: number): string {
  const s = String(str || '');
  if (textW(s, size, weight) <= maxW) return s;
  let lo = 0;
  let hi = s.length;
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1;
    if (textW(s.slice(0, m) + '…', size, weight) <= maxW) lo = m;
    else hi = m - 1;
  }
  return s.slice(0, lo).trimEnd() + '…';
}
