// Icon riêng của từng loại sơ đồ (24×24, tự vẽ): thu nhỏ đúng hình dạng sơ đồ đó thay vì icon chung.
// Nét theo `currentColor`; mảng nền nhạt theo màu loại sơ đồ (--dg-fill) để thẻ trông như một sơ đồ mini.
import type { DiagramType } from '@umlab/core';

type P = { size: number; color: string };

const wrap = (size: number, color: string, children: React.ReactNode) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ color, flex: 'none' }}
    aria-hidden
  >
    {children}
  </svg>
);
const soft = (color: string) => ({ fill: color, fillOpacity: 0.16 });

const ICONS: Record<DiagramType, (p: P) => React.ReactNode> = {
  // actor que + use case elip + association
  usecase: ({ size, color }) =>
    wrap(
      size,
      color,
      <>
        <circle cx="5" cy="6" r="2.2" />
        <path d="M5 8.2v6M2 10.8h6M5 14.2 2.6 19M5 14.2 7.4 19" />
        <path d="M8.6 11.5h3.2" strokeDasharray="0" />
        <ellipse cx="17.2" cy="11.5" rx="5.6" ry="3.6" {...soft(color)} />
      </>,
    ),
  // tài liệu đặc tả dạng bảng 2 cột
  'usecase-spec': ({ size, color }) =>
    wrap(
      size,
      color,
      <>
        <path d="M5 2.5h10l4 4v15H5z" {...soft(color)} />
        <path d="M15 2.5v4h4" />
        <path d="M5 10h14M5 14h14M5 18h14M10 10v11.5" strokeWidth={1.2} />
      </>,
    ),
  // nút đầu → action → decision → action
  activity: ({ size, color }) =>
    wrap(
      size,
      color,
      <>
        <circle cx="12" cy="2.9" r="1.6" fill="currentColor" stroke="none" />
        <path d="M12 4.5v1.5" />
        <rect x="6.5" y="6" width="11" height="4.4" rx="2.2" {...soft(color)} />
        <path d="M12 10.4v1.4" />
        <path d="m12 11.8 3 3-3 3-3-3z" {...soft(color)} />
        <path d="M9 14.8H4.5v3.6M15 14.8h4.5v3.6" />
        <rect x="2" y="18.4" width="5" height="3.4" rx="1.7" />
        <rect x="17" y="18.4" width="5" height="3.4" rx="1.7" />
      </>,
    ),
  // 2 lifeline + message + activation
  sequence: ({ size, color }) =>
    wrap(
      size,
      color,
      <>
        <rect x="1.8" y="2" width="7.4" height="4" rx="0.8" {...soft(color)} />
        <rect x="14.8" y="2" width="7.4" height="4" rx="0.8" {...soft(color)} />
        <path d="M5.5 6v16M18.5 6v16" strokeDasharray="1.6 1.8" strokeWidth={1.2} />
        <rect x="17.4" y="9.2" width="2.2" height="8" fill="currentColor" stroke="none" opacity={0.85} />
        <path d="M5.5 10.5h11.2M14.4 8.6l2.4 1.9-2.4 1.9" />
        <path d="M17.2 16h-11.7" strokeDasharray="1.6 1.6" strokeWidth={1.3} />
      </>,
    ),
  // classifier 3 ngăn + generalization
  class: ({ size, color }) =>
    wrap(
      size,
      color,
      <>
        <rect x="2" y="9" width="11" height="12.5" rx="1" />
        <path d="M2 9h11v3.6H2z" {...soft(color)} />
        <path d="M2 16.7h11" strokeWidth={1.2} />
        <rect x="13.5" y="2" width="8.5" height="7" rx="1" {...soft(color)} />
        <path d="M13 10.6 17.8 9" />
        <path d="m15.6 8.2 2.6.6-.9 2.5z" fill="currentColor" stroke="none" />
      </>,
    ),
  // 2 bảng + đường crow's foot
  erd: ({ size, color }) =>
    wrap(
      size,
      color,
      <>
        <rect x="1.8" y="2.5" width="9" height="8.5" rx="1.2" />
        <path d="M1.8 2.5h9v3H1.8z" {...soft(color)} />
        <rect x="13.2" y="13" width="9" height="8.5" rx="1.2" />
        <path d="M13.2 13h9v3h-9z" {...soft(color)} />
        <path d="M6.3 11v6.2h6.9" />
        <path d="M4.8 13.3h3M10.4 15.5l2.8 1.7-2.8 1.7" strokeWidth={1.3} />
      </>,
    ),
  // các node + database nối nhau
  architecture: ({ size, color }) =>
    wrap(
      size,
      color,
      <>
        <rect x="8.2" y="1.8" width="7.6" height="5.4" rx="1.2" {...soft(color)} />
        <rect x="1.8" y="15.4" width="7" height="5.4" rx="1.2" />
        <ellipse cx="18.6" cy="15.6" rx="3.6" ry="1.4" {...soft(color)} />
        <path d="M15 15.6v4.8c0 .8 1.6 1.4 3.6 1.4s3.6-.6 3.6-1.4v-4.8" />
        <path d="M12 7.2v3.6M5.3 15.4v-4.6h13.3v3.4" />
      </>,
    ),
  // thanh tiến độ so le + trục thời gian
  gantt: ({ size, color }) =>
    wrap(
      size,
      color,
      <>
        <path d="M2.5 2.5v19h19" strokeWidth={1.3} />
        <rect x="5" y="4.5" width="8" height="3.4" rx="1" {...soft(color)} />
        <rect x="9" y="10" width="9.5" height="3.4" rx="1" {...soft(color)} />
        <rect x="13" y="15.5" width="7" height="3.4" rx="1" {...soft(color)} />
        <path d="M13 6.2h1.5v5.5M18.5 11.7h.5v5.5" strokeWidth={1.1} />
      </>,
    ),
};

export function DiagramGlyph({ type, size, color }: { type: DiagramType; size: number; color: string }) {
  const f = ICONS[type];
  return <>{f ? f({ size, color }) : null}</>;
}
