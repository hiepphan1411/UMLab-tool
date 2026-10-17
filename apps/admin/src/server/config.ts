// Cấu hình trang quản trị: đọc biến môi trường (hoặc tệp .env ở gốc repo, dùng chung với app desktop).
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

export interface AdminConfig {
  mongoUri: string;
  dbName: string;
  port: number;
  host: string;
  /** Tài khoản UMLab được vào trang quản trị (đăng nhập bằng mật khẩu của chính tài khoản đó). */
  adminEmails: string[];
  /** Mật khẩu quản trị dự phòng — đăng nhập với tên `admin`. */
  adminPassword: string;
  /** Khoá ký cookie phiên. */
  secret: string;
}

export function loadDotEnv(file = join(ROOT, '.env')): void {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AdminConfig {
  return {
    mongoUri: env.UMLAB_MONGO_URI ?? '',
    dbName: env.UMLAB_DB || 'umlab',
    port: Number(env.UMLAB_ADMIN_PORT) || 5176,
    // mặc định chỉ nghe trên máy này; mở ra mạng LAN thì đặt UMLAB_ADMIN_HOST=0.0.0.0
    host: env.UMLAB_ADMIN_HOST || '127.0.0.1',
    adminEmails: (env.UMLAB_ADMIN_EMAILS ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
    adminPassword: env.UMLAB_ADMIN_PASSWORD ?? '',
    secret: env.UMLAB_ADMIN_SECRET || randomBytes(32).toString('hex'),
  };
}
