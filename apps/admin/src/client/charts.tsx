// Biểu đồ cột một chuỗi (một màu accent — một chuỗi nên không cần chú thích; tiêu đề gọi tên chuỗi): cột mảnh, đầu
// bo 4px bám đường đáy, khe 2px giữa các cột, lưới nhạt, tooltip khi rê chuột, bảng ẩn cho trình đọc màn hình.
import { useState } from 'react';

export interface Bar {
  key: string;
  label: string;
  value: number;
  /** Dòng phụ trong tooltip. */
  note?: string;
}

const niceMax = (v: number) => {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / p / (v / p > 5 ? 2 : 1)) * p * (v / p > 5 ? 2 : 1);
};

/** Đường bo 4px chỉ ở đầu cột (phía giá trị), đáy vuông bám baseline. */
function barPath(x: number, y: number, w: number, h: number, horizontal: boolean): string {
  const r = Math.min(4, w / 2, h);
  if (h <= 0) return '';
  if (!horizontal)
    return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
  // ngang: x = đáy, w = độ dài, h = bề dày
  return `M${x},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x} Z`;
}

export function BarChart({
  title,
  data,
  horizontal = false,
  unit,
}: {
  title: string;
  data: Bar[];
  horizontal?: boolean;
  unit: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const ticks = [0, max / 2, max];
  const W = 560;
  const rowH = 26;
  const H = horizontal ? data.length * rowH + 24 : 220;
  const padL = horizontal ? 120 : 36;
  const padB = horizontal ? 20 : 28;
  const plotW = W - padL - 12;
  const plotH = H - padB - 10;
  const band = horizontal ? rowH : plotW / Math.max(1, data.length);
  const thick = Math.min(horizontal ? 14 : 22, band - 2);
  const h = hover === null ? null : data[hover];
  return (
    <figure className="chart">
      <figcaption className="chart-title">{title}</figcaption>
      <div className="chart-box" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title}>
          {ticks.map((t) => {
            const p = horizontal ? padL + (t / max) * plotW : 10 + plotH - (t / max) * plotH;
            return horizontal ? (
              <g key={t}>
                <line x1={p} x2={p} y1={4} y2={H - padB} className="grid" />
                <text x={p} y={H - 4} className="axis" textAnchor="middle">
                  {Math.round(t)}
                </text>
              </g>
            ) : (
              <g key={t}>
                <line x1={padL} x2={W - 12} y1={p} y2={p} className="grid" />
                <text x={padL - 6} y={p + 4} className="axis" textAnchor="end">
                  {Math.round(t)}
                </text>
              </g>
            );
          })}
          {data.map((d, i) => {
            const len = (d.value / max) * (horizontal ? plotW : plotH);
            const c = horizontal ? 4 + i * band + (band - thick) / 2 : padL + i * band + (band - thick) / 2;
            const dim = hover !== null && hover !== i;
            return (
              <g key={d.key} onMouseEnter={() => setHover(i)} data-bar={d.key}>
                {/* vùng bắt chuột lớn hơn cột */}
                <rect
                  x={horizontal ? padL : padL + i * band}
                  y={horizontal ? 4 + i * band : 10}
                  width={horizontal ? plotW : band}
                  height={horizontal ? band : plotH}
                  fill="transparent"
                />
                <path
                  d={horizontal ? barPath(padL, c, len, thick, true) : barPath(c, 10 + plotH - len, thick, len, false)}
                  className="bar"
                  opacity={dim ? 0.45 : 1}
                />
                {horizontal ? (
                  <text x={padL - 8} y={c + thick / 2 + 4} className="axis" textAnchor="end">
                    {d.label}
                  </text>
                ) : (
                  (data.length <= 8 || i % 2 === 0 || i === data.length - 1) && (
                    <text x={c + thick / 2} y={H - 8} className="axis" textAnchor="middle">
                      {d.label}
                    </text>
                  )
                )}
              </g>
            );
          })}
          <line
            x1={padL}
            x2={horizontal ? padL : W - 12}
            y1={horizontal ? 4 : 10 + plotH}
            y2={horizontal ? H - padB : 10 + plotH}
            className="baseline"
          />
        </svg>
        {h && (
          <div
            className="chart-tip"
            role="status"
            style={
              horizontal
                ? { left: `${((padL + ((h.value / max) * plotW) / 2) / W) * 100}%`, top: `${hover! * rowH}px` }
                : { left: `${((padL + hover! * band + band / 2) / W) * 100}%`, top: '4px' }
            }
          >
            <b>{h.label}</b>
            <span>
              {h.value.toLocaleString('vi-VN')} {unit}
            </span>
            {h.note && <span className="muted">{h.note}</span>}
          </div>
        )}
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th>{d.label}</th>
              <td>
                {d.value} {unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
