import { useRef } from 'react';
import type { View } from '@umlab/core';
import type { Box } from './geometry';

/** Minimap góc dưới phải: toàn bộ hình + khung nhìn hiện tại; bấm/kéo để di chuyển. */
export function Minimap({
  views,
  content,
  viewport,
  onMove,
}: {
  views: View[];
  content: Box | null;
  viewport: Box;
  onMove: (cx: number, cy: number) => void;
}) {
  const ref = useRef<SVGSVGElement>(null);
  if (!content) return null;
  const W = 180;
  const H = 120;
  const b = {
    x: Math.min(content.x, viewport.x) - 40,
    y: Math.min(content.y, viewport.y) - 40,
    w: 0,
    h: 0,
  };
  b.w = Math.max(content.x + content.w, viewport.x + viewport.w) + 40 - b.x;
  b.h = Math.max(content.y + content.h, viewport.y + viewport.h) + 40 - b.y;
  const k = Math.min(W / b.w, H / b.h);
  const toWorld = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return [(e.clientX - r.left) / k + b.x, (e.clientY - r.top) / k + b.y] as const;
  };
  return (
    <div
      className="absolute right-3 bottom-3 z-10 overflow-hidden rounded-lg border border-line bg-panel shadow-md"
      style={{ width: W, height: H }}
    >
      <svg
        ref={ref}
        width={W}
        height={H}
        aria-label="Minimap"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          onMove(...toWorld(e));
        }}
        onPointerMove={(e) => {
          if (e.buttons & 1) onMove(...toWorld(e));
        }}
      >
        <g transform={`scale(${k}) translate(${-b.x},${-b.y})`}>
          {views.map((v) =>
            v.hidden ? null : (
              <rect
                key={v.id}
                x={v.x}
                y={v.y}
                width={v.w}
                height={v.h}
                fill="var(--muted)"
                fillOpacity={0.25}
                stroke="var(--muted)"
                strokeWidth={1 / k}
                strokeOpacity={0.4}
              />
            ),
          )}
          <rect
            x={viewport.x}
            y={viewport.y}
            width={viewport.w}
            height={viewport.h}
            fill="var(--accent)"
            fillOpacity={0.08}
            stroke="var(--accent)"
            strokeWidth={1.5 / k}
          />
        </g>
      </svg>
    </div>
  );
}
