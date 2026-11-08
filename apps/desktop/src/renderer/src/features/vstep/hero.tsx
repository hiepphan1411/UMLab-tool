// Ảnh nền cho thẻ tổng quan: 6 kiểu vẽ bằng SVG (không cần ảnh ngoài), khác hẳn nhau về màu và cảnh.
import { addDays, localDateKey, planProgress, type PlanDay } from '@umlab/core';
import { cn } from '@/lib/cn';
import { WEEKDAY } from './common';

export const HERO_STYLES: { id: string; name: string; ink: 'light' | 'dark' }[] = [
  { id: 'auto', name: 'Theo giờ trong ngày (tự đổi)', ink: 'light' },
  { id: 'dawn', name: 'Bình minh', ink: 'light' },
  { id: 'morning', name: 'Buổi sáng', ink: 'dark' },
  { id: 'noon', name: 'Buổi trưa', ink: 'dark' },
  { id: 'afternoon', name: 'Chiều vàng', ink: 'dark' },
  { id: 'dusk', name: 'Hoàng hôn', ink: 'light' },
  { id: 'evening', name: 'Buổi tối', ink: 'light' },
  { id: 'midnight', name: 'Nửa đêm', ink: 'light' },
  { id: 'ocean', name: 'Biển xanh', ink: 'light' },
  { id: 'forest', name: 'Rừng thông', ink: 'light' },
  { id: 'city', name: 'Thành phố đêm', ink: 'light' },
  { id: 'paper', name: 'Giấy vở', ink: 'dark' },
  { id: 'aurora', name: 'Cực quang', ink: 'light' },
];

/** Cảnh núi theo giờ: 5–7 bình minh, 7–11 sáng, 11–14 trưa, 14–17 chiều, 17–19 hoàng hôn, 19–22 tối, còn lại nửa đêm. */
export function timeScene(d = new Date()): string {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 5 && h < 7) return 'dawn';
  if (h >= 7 && h < 11) return 'morning';
  if (h >= 11 && h < 14) return 'noon';
  if (h >= 14 && h < 17) return 'afternoon';
  if (h >= 17 && h < 19) return 'dusk';
  if (h >= 19 && h < 22) return 'evening';
  return 'midnight';
}

/** Kiểu nền thực tế (auto → cảnh theo giờ hiện tại). */
export const resolveHero = (id: string) => (id === 'auto' ? timeScene() : id);
export const heroInk = (id: string) => HERO_STYLES.find((h) => h.id === resolveHero(id))?.ink ?? 'light';

interface Sky {
  sky: [string, string, string];
  sun?: { cx: number; cy: number; r: number; c: string; glow?: boolean };
  moon?: { cx: number; cy: number; r: number; crescent?: boolean };
  stars?: number;
  clouds?: boolean;
  far: string;
  near: string;
}

const SCENES: Record<string, Sky> = {
  dawn: {
    sky: ['#2c2f73', '#8d5fa8', '#f7a38b'],
    sun: { cx: 300, cy: 212, r: 54, c: '#ffc4a3', glow: true },
    stars: 12,
    far: '#6b4d8f',
    near: '#3a2a5c',
  },
  morning: {
    sky: ['#4fa6ec', '#9fd3f7', '#e6f6ff'],
    sun: { cx: 230, cy: 78, r: 40, c: '#fff3b0', glow: true },
    clouds: true,
    far: '#5b8fb8',
    near: '#2f6b6b',
  },
  noon: {
    sky: ['#1e88e5', '#64b5f6', '#bfe3ff'],
    sun: { cx: 600, cy: 50, r: 36, c: '#fffbe0', glow: true },
    clouds: true,
    far: '#4f8f5f',
    near: '#2e6b3f',
  },
  afternoon: {
    sky: ['#f6a641', '#ffd27a', '#fff0c9'],
    sun: { cx: 900, cy: 128, r: 48, c: '#fff1c1', glow: true },
    far: '#b0794a',
    near: '#6d4a2f',
  },
  dusk: {
    sky: ['#3b2a8f', '#d9567a', '#f6a85b'],
    sun: { cx: 860, cy: 190, r: 70, c: '#ffd27a' },
    far: '#5a2c6e',
    near: '#2e1846',
  },
  evening: {
    sky: ['#141e4f', '#3b2f6e', '#6a4a8c'],
    moon: { cx: 950, cy: 70, r: 26 },
    stars: 34,
    far: '#2a2550',
    near: '#15122e',
  },
  midnight: {
    sky: ['#03050f', '#0a1230', '#142045'],
    moon: { cx: 1010, cy: 62, r: 22, crescent: true },
    stars: 90,
    far: '#0f1630',
    near: '#05080f',
  },
};

function Mountains({ id, W, H }: { id: string; W: number; H: number }) {
  const k = SCENES[id] ?? SCENES.dusk;
  const r = rnd(id.length * 31 + 7);
  const stars = Array.from({ length: k.stars ?? 0 }, () => ({
    x: r() * W,
    y: r() * 150,
    s: r() * 1.5 + 0.4,
    o: 0.4 + r() * 0.6,
  }));
  const g = `sky-${id}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={k.sky[0]} />
          <stop offset="0.6" stopColor={k.sky[1]} />
          <stop offset="1" stopColor={k.sky[2]} />
        </linearGradient>
        <radialGradient id={`${g}-glow`}>
          <stop offset="0" stopColor={k.sun?.c ?? '#fff'} stopOpacity="0.55" />
          <stop offset="1" stopColor={k.sun?.c ?? '#fff'} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${g})`} />
      {stars.map((st, i) => (
        <circle key={i} cx={st.x} cy={st.y} r={st.s} fill="#fff" opacity={st.o} />
      ))}
      {k.sun?.glow && <circle cx={k.sun.cx} cy={k.sun.cy} r={k.sun.r * 3} fill={`url(#${g}-glow)`} />}
      {k.sun && <circle cx={k.sun.cx} cy={k.sun.cy} r={k.sun.r} fill={k.sun.c} opacity="0.95" />}
      {k.moon && (
        <g>
          <circle cx={k.moon.cx} cy={k.moon.cy} r={k.moon.r} fill="#f3efd2" />
          {k.moon.crescent && <circle cx={k.moon.cx + 9} cy={k.moon.cy - 5} r={k.moon.r} fill={k.sky[0]} />}
        </g>
      )}
      {k.clouds && (
        <g fill="#fff" opacity="0.85">
          <ellipse cx="420" cy="70" rx="70" ry="18" />
          <ellipse cx="460" cy="58" rx="45" ry="20" />
          <ellipse cx="820" cy="96" rx="90" ry="20" />
          <ellipse cx="870" cy="82" rx="50" ry="22" />
        </g>
      )}
      <path
        d={`M0 ${H} L0 190 L180 120 L330 200 L520 110 L700 210 L880 140 L1050 210 L1200 150 L1200 ${H} Z`}
        fill={k.far}
        opacity="0.9"
      />
      <path d={`M0 ${H} L0 230 L220 180 L420 240 L640 185 L860 245 L1060 195 L1200 230 L1200 ${H} Z`} fill={k.near} />
    </svg>
  );
}

function rnd(seed: number) {
  let s = seed;
  return () => (s = (s * 9301 + 49297) % 233280) / 233280;
}

export function HeroBg({ id }: { id: string }) {
  const W = 1200;
  const H = 280;
  const sid = resolveHero(id);
  if (sid in SCENES) return <Mountains id={sid} W={W} H={H} />;
  switch (sid) {
    case 'ocean':
      return (
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
          <defs>
            <linearGradient id="oc-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0b4f8a" />
              <stop offset="1" stopColor="#1fa2c7" />
            </linearGradient>
          </defs>
          <rect width={W} height={H} fill="url(#oc-sky)" />
          <circle cx="980" cy="70" r="38" fill="#fff6c9" opacity="0.9" />
          {[0, 1, 2, 3].map((i) => (
            <path
              key={i}
              d={`M0 ${150 + i * 34} C 150 ${130 + i * 34}, 300 ${172 + i * 34}, 450 ${150 + i * 34} S 750 ${130 + i * 34}, 900 ${150 + i * 34} S 1100 ${170 + i * 34}, 1200 ${148 + i * 34} V ${H} H 0 Z`}
              fill={['#2bb3d6', '#1690b8', '#0d6f98', '#08557a'][i]}
              opacity={0.85}
            />
          ))}
        </svg>
      );
    case 'forest': {
      const r = rnd(7);
      const trees = Array.from({ length: 46 }, (_, i) => ({ x: i * 28 + r() * 14, h: 70 + r() * 90, row: i % 2 }));
      return (
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
          <defs>
            <linearGradient id="fo-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1f5e3b" />
              <stop offset="1" stopColor="#4c9a5f" />
            </linearGradient>
          </defs>
          <rect width={W} height={H} fill="url(#fo-sky)" />
          <circle cx="220" cy="64" r="30" fill="#e9f7d9" opacity="0.6" />
          {trees.map((t, i) => (
            <path
              key={i}
              d={`M${t.x} ${H} l14 -${t.h} l14 ${t.h} Z`}
              fill={t.row ? '#173f28' : '#215a37'}
              opacity={t.row ? 1 : 0.85}
            />
          ))}
        </svg>
      );
    }
    case 'city': {
      const r = rnd(3);
      const blds = Array.from({ length: 30 }, (_, i) => ({ x: i * 42, w: 34 + r() * 10, h: 60 + r() * 150 }));
      const stars = Array.from({ length: 60 }, () => ({ x: r() * W, y: r() * 120, s: r() * 1.6 + 0.4 }));
      return (
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
          <rect width={W} height={H} fill="#0e1430" />
          {stars.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.s} fill="#fff" opacity="0.7" />
          ))}
          <circle cx="1040" cy="60" r="26" fill="#f4f1d0" />
          {blds.map((b, i) => (
            <g key={i}>
              <rect x={b.x} y={H - b.h} width={b.w} height={b.h} fill="#1b2350" />
              {Array.from({ length: Math.floor(b.h / 18) }, (_, k) =>
                [0, 1, 2].map((c) =>
                  r() > 0.55 ? (
                    <rect
                      key={`${k}-${c}`}
                      x={b.x + 5 + c * 10}
                      y={H - b.h + 8 + k * 18}
                      width="5"
                      height="8"
                      fill="#ffd36b"
                      opacity="0.85"
                    />
                  ) : null,
                ),
              )}
            </g>
          ))}
        </svg>
      );
    }
    case 'paper':
      return (
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
          <rect width={W} height={H} fill="#fbf6e9" />
          {Array.from({ length: 12 }, (_, i) => (
            <line key={i} x1="0" x2={W} y1={30 + i * 24} y2={30 + i * 24} stroke="#b9d3ee" strokeWidth="1.2" />
          ))}
          <line x1="70" x2="70" y1="0" y2={H} stroke="#e8a0a0" strokeWidth="2" />
          <g opacity="0.16" fill="#1b2130" fontFamily="Georgia, serif" fontSize="64" fontStyle="italic">
            <text x="760" y="120">
              listen, read
            </text>
            <text x="820" y="220">
              write, speak
            </text>
          </g>
        </svg>
      );
    case 'aurora':
      return (
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
          <defs>
            <filter id="au-blur">
              <feGaussianBlur stdDeviation="40" />
            </filter>
          </defs>
          <rect width={W} height={H} fill="#061a24" />
          <g filter="url(#au-blur)" opacity="0.9">
            <ellipse cx="300" cy="90" rx="280" ry="60" fill="#22e3a6" />
            <ellipse cx="720" cy="130" rx="320" ry="55" fill="#7b5cff" />
            <ellipse cx="1050" cy="70" rx="220" ry="50" fill="#1fc8e3" />
          </g>
          <path
            d={`M0 ${H} L0 230 L160 200 L300 240 L470 190 L620 235 L800 205 L980 240 L1200 210 L1200 ${H} Z`}
            fill="#03100f"
          />
        </svg>
      );
    default:
      return (
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
          <defs>
            <linearGradient id="du-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3b2a8f" />
              <stop offset="0.6" stopColor="#d9567a" />
              <stop offset="1" stopColor="#f6a85b" />
            </linearGradient>
          </defs>
          <rect width={W} height={H} fill="url(#du-sky)" />
          <circle cx="860" cy="190" r="70" fill="#ffd27a" opacity="0.9" />
          <path
            d={`M0 ${H} L0 190 L180 120 L330 200 L520 110 L700 210 L880 140 L1050 210 L1200 150 L1200 ${H} Z`}
            fill="#5a2c6e"
            opacity="0.85"
          />
          <path
            d={`M0 ${H} L0 230 L220 180 L420 240 L640 185 L860 245 L1060 195 L1200 230 L1200 ${H} Z`}
            fill="#2e1846"
          />
        </svg>
      );
  }
}

/** Lịch mini tháng hiện tại: tô màu ngày đã xong việc, ngày thi; bấm để mở Lịch học tại ngày đó. */
export function MiniCalendar({
  days,
  done,
  onPick,
}: {
  days: PlanDay[];
  done: Record<string, Record<string, boolean>>;
  onPick: (date: string) => void;
}) {
  const today = localDateKey();
  const first = today.slice(0, 8) + '01';
  const dow = (new Date(first + 'T00:00:00').getDay() + 6) % 7;
  const start = addDays(first, -dow);
  const byDate = new Map(days.map((d) => [d.date, d]));
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const month = today.slice(5, 7);
  return (
    <>
      <div className="vs-mini-cal">
        {[1, 2, 3, 4, 5, 6, 0].map((w) => (
          <span key={w} className="h">
            {WEEKDAY[w]}
          </span>
        ))}
        {cells.map((d) => {
          const day = byDate.get(d);
          const p = day && day.phase !== 0 ? planProgress([day], done) : null;
          const cls =
            day?.phase === 0 ? 'exam' : p && p.total && p.done === p.total ? 'full' : p && p.done ? 'part' : '';
          return (
            <button
              key={d}
              className={cn(cls, d.slice(5, 7) !== month && 'out', d === today && 'today')}
              title={day ? (day.phase === 0 ? 'Ngày thi' : `${p?.done}/${p?.total} việc`) : ''}
              onClick={() => onPick(d)}
            >
              {+d.slice(8)}
            </button>
          );
        })}
      </div>
      <div className="vs-mini-legend">
        <span>
          <i style={{ background: 'var(--ok)' }} />
          Xong hết
        </span>
        <span>
          <i style={{ background: 'color-mix(in srgb, var(--ok) 25%, var(--panel))' }} />
          Làm một phần
        </span>
        <span>
          <i style={{ background: 'var(--danger)' }} />
          Ngày thi
        </span>
      </div>
    </>
  );
}
