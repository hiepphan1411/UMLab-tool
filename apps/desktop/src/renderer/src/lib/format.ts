const rtf = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' });

/** "2 giờ trước", "hôm qua"… */
export function timeAgo(iso: string | number | Date): string {
  const t = new Date(iso).getTime();
  const diff = (t - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 45) return 'vừa xong';
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day');
  if (abs < 86400 * 365) return rtf.format(Math.round(diff / (86400 * 30)), 'month');
  return rtf.format(Math.round(diff / (86400 * 365)), 'year');
}

export const hhmm = (t: number | Date) =>
  new Date(t).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

export const dateTime = (t: number | string | Date) =>
  new Date(t).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

export function bytes(n: number): string {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(2) + ' MB';
}

/** Tên tệp không dấu: "Sơ đồ Use Case" → "so-do-use-case". */
export const slug = (s: string) =>
  (s || 'so-do')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'so-do';

export const initials = (name: string) => {
  const w = name.trim().split(/\s+/).filter(Boolean);
  if (!w.length) return '?';
  return (w[w.length - 1][0] ?? '?').toUpperCase();
};
