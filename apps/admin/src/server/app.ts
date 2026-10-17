// API của trang quản trị (JSON dưới /api). Mọi route trừ /api/login và /api/session cần phiên quản trị; request ghi
// (POST) phải có header `X-UMLab-Admin: 1` (trình duyệt không gửi được header tuỳ ý sang trang khác mà không qua CORS —
// server không bật CORS) + cookie SameSite=Strict → chống CSRF.
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Db } from 'mongodb';
import { COOKIE, configured, issue, login, parseCookies, verify } from './auth';
import type { AdminConfig } from './config';
import { AdminError, createUser, listUsers, logoutEverywhere, overview, resetUserPassword, userDetail } from './data';

const MAX_BODY = 64 * 1024;

function send(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > MAX_BODY) throw new AdminError(413, 'Dữ liệu quá lớn.');
    chunks.push(c as Buffer);
  }
  if (!size) return {};
  try {
    const v = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    throw new AdminError(400, 'JSON không hợp lệ.');
  }
}

// Secure khi chạy sau HTTPS (Vercel đặt x-forwarded-proto); chạy http://127.0.0.1 thì trình duyệt sẽ bỏ cookie Secure
const cookie = (value: string, maxAge: number, secure: boolean) =>
  `${COOKIE}=${encodeURIComponent(value)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;

/** Trả về handler; handler trả về false nếu không phải request /api (để phục vụ client). */
export function createApi(db: Db, cfg: AdminConfig) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (!url.pathname.startsWith('/api/')) return false;
    const method = req.method ?? 'GET';
    const secure = req.headers['x-forwarded-proto'] === 'https';
    try {
      if (method === 'POST' && req.headers['x-umlab-admin'] !== '1')
        throw new AdminError(403, 'Thiếu header X-UMLab-Admin.');
      const who = verify(cfg, parseCookies(req.headers.cookie)[COOKIE]);
      const path = url.pathname;

      if (path === '/api/session' && method === 'GET') {
        send(res, 200, { user: who, configured: configured(cfg) });
        return true;
      }
      if (path === '/api/login' && method === 'POST') {
        const b = await readJson(req);
        let name: string;
        try {
          name = await login(db, cfg, b.email, b.password);
        } catch (e) {
          throw new AdminError(401, (e as Error).message);
        }
        send(res, 200, { user: name }, { 'Set-Cookie': cookie(issue(cfg, name), 8 * 3600, secure) });
        return true;
      }
      if (path === '/api/logout' && method === 'POST') {
        send(res, 200, { ok: true }, { 'Set-Cookie': cookie('', 0, secure) });
        return true;
      }
      if (!who) throw new AdminError(401, 'Cần đăng nhập quản trị.');

      if (path === '/api/overview' && method === 'GET') {
        send(res, 200, await overview(db));
        return true;
      }
      if (path === '/api/users' && method === 'GET') {
        send(res, 200, await listUsers(db, url.searchParams.get('q') ?? ''));
        return true;
      }
      if (path === '/api/users' && method === 'POST') {
        send(res, 201, await createUser(db, await readJson(req), who));
        return true;
      }
      const m = /^\/api\/users\/([\w-]+)(?:\/(reset-password|logout-all))?$/.exec(path);
      if (m && !m[2] && method === 'GET') {
        send(res, 200, await userDetail(db, m[1]));
        return true;
      }
      if (m && m[2] === 'reset-password' && method === 'POST') {
        send(res, 200, { tempPassword: await resetUserPassword(db, m[1], who) });
        return true;
      }
      if (m && m[2] === 'logout-all' && method === 'POST') {
        await logoutEverywhere(db, m[1], who);
        send(res, 200, { ok: true });
        return true;
      }
      throw new AdminError(404, 'Không có API này.');
    } catch (e) {
      if (e instanceof AdminError) send(res, e.status, { error: e.message });
      else {
        console.error('[admin]', e);
        send(res, 500, { error: 'Lỗi máy chủ: ' + (e as Error).message });
      }
      return true;
    }
  };
}
