// Gọi API của server quản trị (cùng origin). Lỗi → Error mang thông điệp tiếng Việt từ server.
import type { Overview, UserDetail, UserRow } from '../server/types';

export type { Overview, UserDetail, UserRow };

async function req<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const r = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: method === 'POST' ? { 'Content-Type': 'application/json', 'X-UMLab-Admin': '1' } : {},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await r.json().catch(() => ({}))) as { error?: string };
  if (!r.ok) throw Object.assign(new Error(data.error ?? `Lỗi ${r.status}`), { status: r.status });
  return data as T;
}

export const api = {
  session: () => req<{ user: string | null; configured: boolean }>('GET', '/api/session'),
  login: (email: string, password: string) => req<{ user: string }>('POST', '/api/login', { email, password }),
  logout: () => req<{ ok: true }>('POST', '/api/logout'),
  overview: () => req<Overview>('GET', '/api/overview'),
  users: (q = '') => req<UserRow[]>('GET', `/api/users?q=${encodeURIComponent(q)}`),
  createUser: (input: { name: string; email: string; password: string }) =>
    req<{ user: UserRow; tempPassword?: string }>('POST', '/api/users', input),
  user: (id: string) => req<UserDetail>('GET', `/api/users/${encodeURIComponent(id)}`),
  resetPassword: (id: string) =>
    req<{ tempPassword: string }>('POST', `/api/users/${encodeURIComponent(id)}/reset-password`),
  logoutAll: (id: string) => req<{ ok: true }>('POST', `/api/users/${encodeURIComponent(id)}/logout-all`),
};

export const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleString('vi-VN') : '—');
export const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

export function timeAgo(iso: string | null): string {
  if (!iso) return 'chưa có';
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 60) return 'vừa xong';
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  if (s < 30 * 86400) return `${Math.floor(s / 86400)} ngày trước`;
  return fmtDay(iso);
}

export const TYPE_LABEL: Record<string, string> = {
  usecase: 'Use Case',
  'usecase-spec': 'Đặc tả Use Case',
  activity: 'Activity',
  sequence: 'Sequence',
  class: 'Class',
  erd: 'ERD',
  architecture: 'Kiến trúc',
  gantt: 'Gantt',
};
