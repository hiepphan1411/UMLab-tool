import { randomBytes } from 'node:crypto';
import type { ErrorCode, Result } from '@shared/api';

/** Lỗi nghiệp vụ có thông điệp tiếng Việt hiển thị thẳng cho người dùng. */
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export const fail = (code: ErrorCode, message: string): never => {
  throw new AppError(code, message);
};

/** Bọc một hàm service: lỗi nghiệp vụ → { ok:false }, lỗi lạ → thông điệp chung (ghi log). */
export async function wrap<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (err instanceof AppError) return { ok: false, error: err.message, code: err.code };
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[umlab]', err);
    if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|Server selection timed out|topology was destroyed|not connected/i.test(msg)) {
      return { ok: false, error: 'Không kết nối được cơ sở dữ liệu. Kiểm tra mạng rồi thử lại.', code: 'OFFLINE' };
    }
    return { ok: false, error: 'Đã có lỗi xảy ra: ' + msg, code: 'INTERNAL' };
  }
}

const ALPHA = '0123456789abcdefghijklmnopqrstuvwxyz';
/** Id ngắn, ngẫu nhiên (base36) có tiền tố — dùng cho _id dạng chuỗi. */
export function newId(prefix: string, len = 14): string {
  const bytes = randomBytes(len);
  let s = '';
  for (let i = 0; i < len; i++) s += ALPHA[bytes[i] % 36];
  return `${prefix}_${s}`;
}

export const USER_COLORS = ['#2E62E6', '#D9463E', '#1F9D66', '#7C5CC4', '#D98A1C', '#0E8A9B', '#C2417E', '#4A6FA5'];

export function pickColor(seed: string): string {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return USER_COLORS[h % USER_COLORS.length];
}

export const isoNow = () => new Date().toISOString();
