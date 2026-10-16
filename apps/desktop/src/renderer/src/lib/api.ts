import type { ErrorCode, Result, UmlabApi } from '@shared/api';

/** Cầu nối tới main process (preload). Trong test/không có Electron thì là undefined. */
export const umlab: UmlabApi = (globalThis as unknown as { umlab: UmlabApi }).umlab;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code?: ErrorCode,
  ) {
    super(message);
  }
}

/** Mở gói Result: lỗi → ném ApiError mang thông điệp tiếng Việt từ main process. */
export async function call<T>(p: Promise<Result<T>>): Promise<T> {
  const r = await p;
  if (!r.ok) throw new ApiError(r.error, r.code);
  return r.data;
}

export const errorText = (e: unknown): string =>
  e instanceof Error ? e.message : typeof e === 'string' ? e : 'Đã có lỗi xảy ra';
