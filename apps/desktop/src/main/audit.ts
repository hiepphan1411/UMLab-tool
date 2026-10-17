// Nhật ký hoạt động tài khoản (trang quản trị apps/admin đọc để hiện “lịch sử tài khoản”). Ghi kiểu best-effort:
// lỗi ghi nhật ký không bao giờ chặn thao tác chính.
import { database, type AuditDoc, type AuditKind } from './db';
import { newId } from './util';

export function audit(userId: string, kind: AuditKind, meta: Record<string, string> = {}): void {
  if (!database.ready) return;
  const doc: AuditDoc = { _id: newId('al'), userId, kind, meta, at: new Date() };
  void database
    .audit()
    .insertOne(doc)
    .catch(() => {});
}
