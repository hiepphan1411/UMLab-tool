// Đăng nhập trang quản trị: tài khoản UMLab có email trong UMLAB_ADMIN_EMAILS (mật khẩu của chính tài khoản), hoặc
// tên `admin` + UMLAB_ADMIN_PASSWORD. Phiên = cookie HttpOnly, SameSite=Strict, ký HMAC, hết hạn sau 8 giờ.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { argon2Verify } from 'hash-wasm';
import type { Db } from 'mongodb';
import type { AdminConfig } from './config';
import type { UserDoc } from './types';

export const COOKIE = 'umlab_admin';
const TTL_MS = 8 * 3600_000;
const MAX_TRIES = 5;
const WINDOW_MS = 60_000;

const sign = (secret: string, v: string) => createHmac('sha256', secret).update(v).digest('base64url');

export function issue(cfg: AdminConfig, who: string, now = Date.now()): string {
  const v = Buffer.from(JSON.stringify({ who, exp: now + TTL_MS })).toString('base64url');
  return `${v}.${sign(cfg.secret, v)}`;
}

/** Người đăng nhập (hoặc null) từ giá trị cookie. */
export function verify(cfg: AdminConfig, token: string | undefined, now = Date.now()): string | null {
  if (!token) return null;
  const [v, sig] = token.split('.');
  if (!v || !sig) return null;
  const want = Buffer.from(sign(cfg.secret, v));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try {
    const p = JSON.parse(Buffer.from(v, 'base64url').toString('utf8')) as { who?: unknown; exp?: unknown };
    return typeof p.who === 'string' && typeof p.exp === 'number' && p.exp > now ? p.who : null;
  } catch {
    return null;
  }
}

export const configured = (cfg: AdminConfig) => cfg.adminEmails.length > 0 || !!cfg.adminPassword;

const tries = new Map<string, { n: number; first: number }>();

/** Kiểm tra đăng nhập; trả về tên hiển thị người quản trị. Ném Error với thông điệp tiếng Việt khi sai. */
export async function login(db: Db, cfg: AdminConfig, emailRaw: unknown, password: unknown): Promise<string> {
  const email = String(emailRaw ?? '')
    .trim()
    .toLowerCase();
  const pw = typeof password === 'string' ? password : '';
  const t = tries.get(email);
  if (t && t.n >= MAX_TRIES && Date.now() - t.first < WINDOW_MS) throw new Error('Thử quá nhiều lần, chờ 1 phút.');
  const fail = () => {
    const cur = tries.get(email);
    if (!cur || Date.now() - cur.first >= WINDOW_MS) tries.set(email, { n: 1, first: Date.now() });
    else cur.n++;
    return new Error('Sai tài khoản hoặc mật khẩu, hoặc tài khoản không có quyền quản trị.');
  };
  if (!configured(cfg))
    throw new Error('Chưa cấu hình quản trị: đặt UMLAB_ADMIN_EMAILS hoặc UMLAB_ADMIN_PASSWORD trong tệp .env.');
  if (email === 'admin' && cfg.adminPassword) {
    const a = Buffer.from(pw);
    const b = Buffer.from(cfg.adminPassword);
    if (a.length === b.length && timingSafeEqual(a, b)) {
      tries.delete(email);
      return 'admin';
    }
    throw fail();
  }
  if (!cfg.adminEmails.includes(email)) throw fail();
  const u = await db.collection<UserDoc>('users').findOne({ email, isDeleted: { $ne: true } });
  const ok = !!u && (await argon2Verify({ password: pw, hash: u.passwordHash }).catch(() => false));
  if (!ok) throw fail();
  tries.delete(email);
  return email;
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
