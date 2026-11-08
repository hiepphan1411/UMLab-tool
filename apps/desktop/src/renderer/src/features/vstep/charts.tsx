// Biểu đồ nhỏ cho mục Tiến độ (SVG tự vẽ, một chuỗi dữ liệu → không cần chú giải; rê chuột xem giá trị).
import { useState } from 'react';

export interface BarDatum {
  label: string;
  value: number;
  tip: string;
}

/** Cột điểm theo lần làm (0–10) + đường mục tiêu. */
export function ScoreBars({
  data,
  target,
  max = 10,
  height = 170,
}: {
  data: BarDatum[];
  target?: number;
  max?: number;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (!data.length) return <p className="text-muted">Chưa có dữ liệu để vẽ.</p>;
  const W = Math.max(320, data.length * 34 + 40);
  const H = height;
  const pad = { l: 28, r: 8, t: 10, b: 22 };
  const ih = H - pad.t - pad.b;
  const bw = Math.min(26, (W - pad.l - pad.r) / data.length - 4);
  const x = (i: number) => pad.l + i * ((W - pad.l - pad.r) / data.length) + 2;
  const y = (v: number) => pad.t + ih - (Math.min(v, max) / max) * ih;
  const ticks = [0, max / 2, max];
  return (
    <div className="ch-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="ch-svg" role="img" aria-label="Biểu đồ điểm theo lần làm">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="ch-grid" />
            <text x={pad.l - 6} y={y(t) + 3} className="ch-axis" textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        {target != null && (
          <g>
            <line x1={pad.l} x2={W - pad.r} y1={y(target)} y2={y(target)} className="ch-target" />
            <text x={W - pad.r} y={y(target) - 4} className="ch-axis" textAnchor="end">
              mục tiêu {target}
            </text>
          </g>
        )}
        {data.map((d, i) => {
          const top = y(d.value);
          const h = Math.max(2, pad.t + ih - top);
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={x(i) - 2} y={pad.t} width={bw + 4} height={ih} fill="transparent" />
              <path
                d={`M${x(i)},${pad.t + ih} v${-(h - 4)} q0,-4 4,-4 h${bw - 8} q4,0 4,4 v${h - 4} z`}
                className="ch-bar"
                opacity={hover == null || hover === i ? 1 : 0.45}
              />
              {i % Math.ceil(data.length / 10) === 0 && (
                <text x={x(i) + bw / 2} y={H - 6} className="ch-axis" textAnchor="middle">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover != null && (
        <div className="ch-tip" style={{ left: `${((x(hover) + bw / 2) / W) * 100}%` }}>
          {data[hover].tip}
        </div>
      )}
    </div>
  );
}

/** Thanh ngang: tỉ lệ hoàn thành từng nhóm. */
export function ProgressRows({ rows }: { rows: { label: string; done: number; total: number }[] }) {
  return (
    <div className="ch-rows">
      {rows.map((r) => {
        const pct = r.total ? Math.round((r.done / r.total) * 100) : 0;
        return (
          <div key={r.label} className="ch-row" title={`${r.label}: ${r.done}/${r.total}`}>
            <span className="ch-row-l">{r.label}</span>
            <span className="ch-row-bar">
              <i style={{ width: `${pct}%` }} />
            </span>
            <span className="ch-row-v">
              {r.done}/{r.total}
            </span>
          </div>
        );
      })}
    </div>
  );
}
