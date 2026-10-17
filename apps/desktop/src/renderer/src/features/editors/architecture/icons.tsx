// Thư viện icon của sơ đồ kiến trúc (port iconKeyInfo / iconMarkup / iconMatches của tool cũ).
// Khoá icon: "lucide:server", "brand:postgresql", "custom:barrier" (không tiền tố = lucide).
import { BRANDS, CUSTOM, LUCIDE, LUCIDE_TAGS } from './icon-data';

export interface IconInfo {
  ns: 'lucide' | 'brand' | 'custom';
  name: string;
  label: string;
  brand?: { t: string; c: string; p: string };
}

export function iconKeyInfo(key: string | undefined | null): IconInfo | null {
  const k = String(key || '');
  const [ns, name] = k.includes(':') ? (k.split(':') as [string, string]) : ['lucide', k];
  if (ns === 'brand') {
    const b = BRANDS[name];
    return b ? { ns, name, label: b.t, brand: b } : null;
  }
  if (ns === 'custom') return CUSTOM[name] ? { ns, name, label: name } : null;
  return LUCIDE[name] ? { ns: 'lucide', name, label: name.replace(/-/g, ' ') } : null;
}

const r1 = (v: number) => Math.round(v * 10) / 10;

/** Icon vẽ trong SVG tại (x, y) cỡ `size`. Logo thương hiệu tô màu gốc nếu không truyền màu. */
export function IconGlyph({
  k,
  x,
  y,
  size,
  color,
  stroke = 2,
}: {
  k: string;
  x: number;
  y: number;
  size: number;
  color?: string | null;
  stroke?: number;
}) {
  const info = iconKeyInfo(k);
  if (!info) return null;
  const s = size / 24;
  const transform = `translate(${r1(x)},${r1(y)}) scale(${s})`;
  if (info.ns === 'brand')
    return (
      <g transform={transform}>
        <path d={info.brand!.p} fill={color || '#' + info.brand!.c} />
      </g>
    );
  const inner = info.ns === 'custom' ? CUSTOM[info.name] : LUCIDE[info.name];
  return (
    <g
      transform={transform}
      fill="none"
      stroke={color || '#334155'}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}

/** Ô xem trước icon trong giao diện (tab Icon, Inspector). */
export function IconPreview({ k, size = 20, color }: { k: string; size?: number; color?: string }) {
  const info = iconKeyInfo(k);
  if (!info) return null;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden style={{ flex: 'none' }}>
      <IconGlyph k={k} x={0} y={0} size={24} color={info.ns === 'brand' ? null : (color ?? 'currentColor')} />
    </svg>
  );
}

export const ALL_ICON_KEYS = [
  ...Object.keys(BRANDS).map((k) => 'brand:' + k),
  ...Object.keys(CUSTOM).map((k) => 'custom:' + k),
  ...Object.keys(LUCIDE).map((k) => 'lucide:' + k),
];

/** Từ khoá tiếng Việt → từ khoá tiếng Anh của Lucide (như tool cũ, bổ sung thêm). */
export const VI_TAGS: Record<string, string> = {
  'máy chủ': 'server',
  'dữ liệu': 'database',
  'cơ sở dữ liệu': 'database',
  'điện thoại': 'smartphone',
  người: 'user',
  'người dùng': 'user',
  xe: 'car',
  'ô tô': 'car',
  'xe máy': 'bike',
  'thanh toán': 'credit-card',
  thẻ: 'credit-card',
  'thông báo': 'bell',
  khoá: 'lock',
  'bảo mật': 'shield',
  camera: 'cctv',
  'đám mây': 'cloud',
  mạng: 'network',
  ví: 'wallet',
  'tin nhắn': 'message',
  tệp: 'file',
  'cài đặt': 'settings',
  'bản đồ': 'map',
  'thời gian': 'clock',
  ai: 'brain',
  'bãi xe': 'parking',
  cổng: 'barrier',
  'hàng đợi': 'queue',
  thư: 'mail',
  'biểu đồ': 'chart',
  'báo cáo': 'chart',
  'máy tính': 'monitor',
  'trình duyệt': 'globe',
  'cảm biến': 'radar',
  'bộ nhớ đệm': 'zap',
  'lưu trữ': 'hard-drive',
  'tìm kiếm': 'search',
};

export function iconMatches(key: string, q: string): boolean {
  if (!q) return true;
  const [ns, name] = key.split(':');
  const hay = (
    name +
    ' ' +
    (ns === 'brand' ? BRANDS[name].t : '') +
    ' ' +
    (ns === 'lucide' ? (LUCIDE_TAGS[name] ?? []).join(' ') : '')
  ).toLowerCase();
  const alt = Object.entries(VI_TAGS)
    .filter(([vi]) => vi.includes(q) || q.includes(vi))
    .map(([, en]) => en);
  return hay.includes(q) || alt.some((a) => hay.includes(a));
}

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
