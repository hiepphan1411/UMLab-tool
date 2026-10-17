import { MongoClient, type Collection, type Db, type Document } from 'mongodb';
import type { ConnStatus } from '@shared/api';
import { hostOf, loadSettings } from './config';

/** Kiểu tài liệu trong các collection — xem docs/ARCHITECTURE.md mục 3. */
export interface UserDoc {
  _id: string;
  email: string;
  /** Tên đăng nhập (chữ thường). Tài khoản cũ chưa có → dùng email. Đăng nhập nhận cả hai. */
  username?: string;
  name: string;
  passwordHash: string;
  tokenVersion: number;
  color: string;
  createdAt: Date;
  /** Xoá mềm từ trang quản trị: không đăng nhập được, không mời vào project được; dữ liệu giữ nguyên. */
  isDeleted?: boolean;
  deletedAt?: Date;
}

export interface LoginAttemptDoc {
  _id: string;
  count: number;
  firstAt: Date;
}

export interface ProjectDoc {
  _id: string;
  ownerId: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  members: { userId: string; role: 'owner' | 'editor' | 'viewer' }[];
  memberIds: string[];
  stats: { diagramCount: number; diagramCountByType: Record<string, number> };
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateDoc {
  _id?: import('mongodb').ObjectId;
  projectId: string;
  kind: 'u' | 's';
  data: import('mongodb').Binary;
  clientId: string;
  userId: string;
  createdAt: Date;
}

export interface PresenceDoc {
  _id: string;
  projectId: string;
  clientId: string;
  userId: string;
  name: string;
  color: string;
  diagramId: string | null;
  cursor: { x: number; y: number } | null;
  selection: string[];
  dragging: { ids: string[]; dx: number; dy: number } | null;
  updatedAt: Date;
}

export interface VersionDoc {
  _id: string;
  projectId: string;
  diagramId: string;
  label: string;
  content: string;
  size: number;
  userId: string;
  userName: string;
  createdAt: Date;
}

/** Sự kiện trong lịch sử tài khoản (collection audit_log). */
export type AuditKind =
  | 'register'
  | 'login'
  | 'logout'
  | 'logoutAll'
  | 'passwordChanged'
  | 'passwordReset'
  | 'adminCreated'
  | 'projectCreated'
  | 'projectDeleted';

export interface AuditDoc {
  _id: string;
  userId: string;
  kind: AuditKind;
  meta: Record<string, string>;
  at: Date;
}

export interface AssetDoc {
  _id: string;
  projectId: string;
  name: string;
  mime: string;
  size: number;
  data: import('mongodb').Binary;
  createdAt: Date;
}

type Listener = (s: ConnStatus) => void;

/**
 * Quản lý một MongoClient dùng chung cho cả app: tự kết nối lại, phát trạng thái online/offline,
 * dò xem change stream có dùng được không (Atlas/replica set) để các service chọn realtime hay hỏi vòng.
 */
class Database {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private status: ConnStatus = { state: 'connecting', realtime: false, dbName: '', host: '', pending: 0 };
  private listeners = new Set<Listener>();
  private connecting: Promise<void> | null = null;
  private retryTimer: NodeJS.Timeout | null = null;
  private generation = 0;

  get current(): ConnStatus {
    return this.status;
  }

  onStatus(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Cập nhật độ trễ (chỉ phát khi đổi đáng kể để không dội sự kiện). */
  private setLatency(ms: number): void {
    const v = Math.round(ms);
    const cur = this.status.latencyMs ?? 0;
    if (Math.abs(v - cur) >= 50 || v >= 600 !== cur >= 600) this.emit({ latencyMs: v });
  }

  setPending(n: number): void {
    if (n !== this.status.pending) this.emit({ pending: n });
  }

  /** Số lần đã kết nối (lại) — service dùng để biết phải dựng lại change stream. */
  get gen(): number {
    return this.generation;
  }

  private emit(patch: Partial<ConnStatus>): void {
    this.status = { ...this.status, ...patch };
    for (const l of this.listeners) l(this.status);
  }

  async start(): Promise<void> {
    if (this.connecting) return this.connecting;
    this.connecting = this.connect().finally(() => {
      this.connecting = null;
    });
    return this.connecting;
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  async stop(): Promise<void> {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    const c = this.client;
    this.client = null;
    this.db = null;
    if (c) await c.close(true).catch(() => {});
    if (this.status.state === 'online') this.emit({ state: 'offline', error: 'Đã ngắt kết nối' });
  }

  private async connect(): Promise<void> {
    const { mongoUri, dbName } = loadSettings();
    if (!mongoUri) {
      this.emit({ state: 'unconfigured', dbName, host: '', error: 'Chưa cấu hình chuỗi kết nối MongoDB.' });
      return;
    }
    this.emit({ state: 'connecting', dbName, host: hostOf(mongoUri), error: undefined });
    const client = new MongoClient(mongoUri, {
      appName: 'UMLab',
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
      maxPoolSize: 20,
      heartbeatFrequencyMS: 5000,
      retryWrites: true,
    });
    client.on('serverHeartbeatFailed', () => {
      if (this.client === client && this.status.state === 'online')
        this.emit({ state: 'offline', error: 'Mất kết nối tới MongoDB' });
    });
    client.on('serverHeartbeatSucceeded', (ev) => {
      if (this.client !== client) return;
      if (this.status.state === 'offline') {
        this.generation++;
        this.emit({ state: 'online', error: undefined, latencyMs: Math.round(ev.duration) });
      } else this.setLatency(ev.duration);
    });
    try {
      await client.connect();
      const db = client.db(dbName);
      const t0 = Date.now();
      await db.command({ ping: 1 });
      const latencyMs = Date.now() - t0;
      this.client = client;
      this.db = db;
      await this.ensureIndexes(db);
      const realtime = await this.probeChangeStreams(db);
      this.generation++;
      this.emit({ state: 'online', realtime, error: undefined, latencyMs });
    } catch (err) {
      await client.close(true).catch(() => {});
      const msg = err instanceof Error ? err.message : String(err);
      this.emit({ state: 'offline', error: friendlyError(msg) });
      this.retryTimer = setTimeout(() => void this.start(), 5000);
    }
  }

  private async probeChangeStreams(db: Db): Promise<boolean> {
    try {
      const hello = (await db.command({ hello: 1 })) as Document;
      if (!hello.setName && hello.msg !== 'isdbgrid') return false;
      const cs = db.collection('presence').watch([], { maxAwaitTimeMS: 50 });
      await cs.tryNext();
      await cs.close();
      return true;
    } catch {
      return false;
    }
  }

  private async ensureIndexes(db: Db): Promise<void> {
    await Promise.all([
      db.collection('users').createIndex({ email: 1 }, { unique: true }),
      db
        .collection('users')
        .createIndex({ username: 1 }, { unique: true, partialFilterExpression: { username: { $type: 'string' } } }),
      db.collection('login_attempts').createIndex({ firstAt: 1 }, { expireAfterSeconds: 60 }),
      db.collection('projects').createIndex({ memberIds: 1, updatedAt: -1 }),
      db.collection('project_updates').createIndex({ projectId: 1, _id: 1 }),
      db.collection('presence').createIndex({ projectId: 1 }),
      db.collection('presence').createIndex({ updatedAt: 1 }, { expireAfterSeconds: 60 }),
      db.collection('diagram_versions').createIndex({ projectId: 1, diagramId: 1, createdAt: -1 }),
      db.collection('assets').createIndex({ projectId: 1 }),
      db.collection('audit_log').createIndex({ userId: 1, at: -1 }),
    ]).catch((e) => console.warn('[umlab] createIndex', e));
  }

  /** Lấy Db; ném lỗi OFFLINE nếu chưa kết nối. */
  get(): Db {
    if (!this.db || this.status.state !== 'online') {
      const e = new Error('not connected');
      throw e;
    }
    return this.db;
  }

  /** operationTime hiện tại của cụm (replica set) — mốc bắt đầu cho change stream. */
  async clusterTime(): Promise<import('mongodb').Timestamp | undefined> {
    try {
      const r = (await this.get().command({ ping: 1 })) as Document;
      return (r.operationTime as import('mongodb').Timestamp | undefined) ?? undefined;
    } catch {
      return undefined;
    }
  }

  get ready(): boolean {
    return !!this.db && this.status.state === 'online';
  }

  col<T extends Document>(name: string): Collection<T> {
    return this.get().collection<T>(name);
  }

  users = () => this.col<UserDoc>('users');
  attempts = () => this.col<LoginAttemptDoc>('login_attempts');
  projects = () => this.col<ProjectDoc>('projects');
  updates = () => this.col<UpdateDoc>('project_updates');
  presence = () => this.col<PresenceDoc>('presence');
  versions = () => this.col<VersionDoc>('diagram_versions');
  assets = () => this.col<AssetDoc>('assets');
  audit = () => this.col<AuditDoc>('audit_log');
}

export function friendlyError(msg: string): string {
  if (/bad auth|Authentication failed/i.test(msg)) return 'Sai tài khoản/mật khẩu MongoDB trong chuỗi kết nối.';
  if (/ENOTFOUND|querySrv/i.test(msg)) return 'Không tìm thấy máy chủ MongoDB (kiểm tra mạng hoặc tên cluster).';
  if (/timed out|ETIMEDOUT|Server selection/i.test(msg))
    return 'Hết thời gian chờ MongoDB. Kiểm tra mạng và danh sách IP được phép (Network Access) trên Atlas.';
  if (/Invalid scheme|Invalid connection string|URI/i.test(msg)) return 'Chuỗi kết nối không hợp lệ.';
  return msg;
}

export const database = new Database();
