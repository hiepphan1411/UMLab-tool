import { app, safeStorage } from 'electron';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Thiết lập kết nối người dùng tự nhập (ghi đè chuỗi nhúng sẵn trong bản build). */
interface StoredSettings {
  mongoUri?: string;
  dbName?: string;
}

export const BUILT_IN_URI: string = typeof __UMLAB_MONGO_URI__ === 'string' ? __UMLAB_MONGO_URI__ : '';
export const BUILT_IN_DB: string = typeof __UMLAB_DB__ === 'string' && __UMLAB_DB__ ? __UMLAB_DB__ : 'umlab';

export const paths = {
  get root() {
    return app.getPath('userData');
  },
  get settings() {
    return join(this.root, 'settings.bin');
  },
  get session() {
    return join(this.root, 'session.bin');
  },
  get pending() {
    const p = join(this.root, 'pending');
    if (!existsSync(p)) mkdirSync(p, { recursive: true });
    return p;
  },
};

/** Ghi JSON đã mã hoá bằng safeStorage (DPAPI trên Windows); máy không hỗ trợ thì ghi base64. */
export function writeSecure(file: string, value: unknown): void {
  const json = JSON.stringify(value);
  const buf = safeStorage.isEncryptionAvailable()
    ? Buffer.concat([Buffer.from('E1'), safeStorage.encryptString(json)])
    : Buffer.concat([Buffer.from('P1'), Buffer.from(json, 'utf8')]);
  writeFileSync(file, buf);
}

export function readSecure<T>(file: string): T | null {
  try {
    if (!existsSync(file)) return null;
    const buf = readFileSync(file);
    const tag = buf.subarray(0, 2).toString();
    const body = buf.subarray(2);
    const json = tag === 'E1' ? safeStorage.decryptString(body) : body.toString('utf8');
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function removeFile(file: string): void {
  try {
    rmSync(file, { force: true });
  } catch {}
}

export function loadSettings(): { mongoUri: string; dbName: string; usingBuiltIn: boolean } {
  const s = readSecure<StoredSettings>(paths.settings) ?? {};
  const override = process.env.UMLAB_MONGO_URI_OVERRIDE;
  if (override)
    return { mongoUri: override, dbName: process.env.UMLAB_DB_OVERRIDE || BUILT_IN_DB, usingBuiltIn: false };
  if (s.mongoUri) return { mongoUri: s.mongoUri, dbName: s.dbName || BUILT_IN_DB, usingBuiltIn: false };
  return { mongoUri: BUILT_IN_URI, dbName: s.dbName || BUILT_IN_DB, usingBuiltIn: true };
}

export function saveSettings(input: { mongoUri: string; dbName: string } | null): void {
  if (!input) removeFile(paths.settings);
  else writeSecure(paths.settings, { mongoUri: input.mongoUri.trim(), dbName: input.dbName.trim() || BUILT_IN_DB });
}

/** Ẩn mật khẩu trong chuỗi kết nối khi hiển thị. */
export function hostOf(uri: string): string {
  try {
    const m = uri.match(/^mongodb(?:\+srv)?:\/\/(?:[^@/]*@)?([^/?]+)/);
    return m ? m[1] : '';
  } catch {
    return '';
  }
}
