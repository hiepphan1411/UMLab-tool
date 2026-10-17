// Kiểu tài liệu MongoDB mà trang quản trị đọc (trùng với apps/desktop/src/main/db.ts).
import type { Binary, ObjectId } from 'mongodb';

export interface UserDoc {
  _id: string;
  email: string;
  /** Tài khoản cũ chưa có → dùng email. */
  username?: string;
  name: string;
  passwordHash: string;
  tokenVersion: number;
  color: string;
  createdAt: Date;
}

export interface ProjectDoc {
  _id: string;
  ownerId: string;
  name: string;
  members: { userId: string; role: 'owner' | 'editor' | 'viewer' }[];
  memberIds: string[];
  stats: { diagramCount: number; diagramCountByType: Record<string, number> };
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateDoc {
  _id?: ObjectId;
  projectId: string;
  kind: 'u' | 's';
  data: Binary;
  userId: string;
  createdAt: Date;
}

export interface PresenceDoc {
  _id: string;
  projectId: string;
  userId: string;
  updatedAt: Date;
}

export interface VersionDoc {
  _id: string;
  projectId: string;
  diagramId: string;
  label: string;
  userId: string;
  createdAt: Date;
}

export interface AuditDoc {
  _id: string;
  userId: string;
  kind: string;
  meta: Record<string, string>;
  at: Date;
}

// ---------- dữ liệu trả về cho client ----------

export interface Overview {
  users: number;
  projects: number;
  diagrams: number;
  diagramsByType: Record<string, number>;
  /** Tài khoản có chỉnh sửa trong 7 ngày. */
  activeUsers7d: number;
  /** Đang mở app (presence < 60 giây). */
  online: number;
  newUsers30d: number;
  /** Số thay đổi theo ngày (14 ngày gần nhất, cũ → mới). */
  activity: { day: string; edits: number; users: number }[];
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  username: string;
  color: string;
  createdAt: string;
  projects: number;
  lastActive: string | null;
}

export interface HistoryItem {
  at: string;
  kind: string;
  text: string;
}

export interface UserDetail {
  user: UserRow;
  projects: { id: string; name: string; role: string; diagrams: number; updatedAt: string }[];
  history: HistoryItem[];
}
