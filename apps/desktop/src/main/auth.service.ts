import { randomBytes } from 'node:crypto';
import { argon2Verify, argon2id } from 'hash-wasm';
import { z } from 'zod';
import type { PublicUser } from '@shared/api';
import { paths, readSecure, removeFile, writeSecure } from './config';
import { audit } from './audit';
import { database, type UserDoc } from './db';
import { broadcast } from './events';
import { ChangeFeed } from './feed';
import { IPC } from '@shared/api';
import { AppError, fail, newId, pickColor } from './util';

interface Session {
  userId: string;
  tv: number;
  remember: boolean;
  /** Hồ sơ công khai lần cuối — để dùng app khi mất mạng (local-first). */
  profile?: PublicUser;
}

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000;
const TV_CACHE_MS = 60_000;

export const passwordSchema = z
  .string()
  .min(8, 'Mật khẩu cần ít nhất 8 ký tự')
  .max(128, 'Mật khẩu quá dài')
  .refine((s) => /[A-Za-zÀ-ỹ]/.test(s) && /\d/.test(s), 'Mật khẩu cần có cả chữ và số');

const emailSchema = z.string().trim().toLowerCase().email('Email không hợp lệ').max(200);

const nameSchema = z.string().trim().min(1, 'Hãy nhập họ tên').max(80, 'Tên quá dài');

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const r = schema.safeParse(value);
  if (!r.success) throw new AppError('VALIDATION', r.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ');
  return r.data;
}

export async function hashPassword(password: string): Promise<string> {
  return argon2id({
    password,
    salt: randomBytes(16),
    parallelism: 1,
    iterations: 2,
    memorySize: 19456,
    hashLength: 32,
    outputType: 'encoded',
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await argon2Verify({ password, hash });
  } catch {
    return false;
  }
}

export function toPublic(u: UserDoc): PublicUser {
  return { id: u._id, name: u.name, email: u.email, color: u.color, createdAt: u.createdAt.toISOString() };
}

class AuthService {
  private session: Session | null = null;
  private user: UserDoc | null = null;
  private checkedAt = 0;
  private feed: ChangeFeed<UserDoc> | null = null;
  private timer: NodeJS.Timeout | null = null;
  /** Xong khi đã bắt đầu theo dõi tokenVersion của mình. */
  watching: Promise<void> = Promise.resolve();

  /** Khôi phục phiên đã lưu (nếu có "Ghi nhớ đăng nhập"). */
  restore(): void {
    const s = readSecure<Session>(paths.session);
    if (s && typeof s.userId === 'string' && typeof s.tv === 'number') this.session = { ...s, remember: true };
  }

  get userId(): string | null {
    return this.session?.userId ?? null;
  }

  private setSession(user: UserDoc, remember: boolean): void {
    this.session = { userId: user._id, tv: user.tokenVersion, remember, profile: toPublic(user) };
    this.user = user;
    this.checkedAt = Date.now();
    if (remember) writeSecure(paths.session, this.session);
    else removeFile(paths.session);
    this.watch();
  }

  private clear(reason?: string): void {
    const had = !!this.session;
    this.session = null;
    this.user = null;
    removeFile(paths.session);
    this.feed?.stop();
    this.feed = null;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (had && reason) broadcast(IPC.authEndedEvt, reason);
  }

  /** Theo dõi tokenVersion của chính mình: đổi mật khẩu/đăng xuất mọi nơi ở máy khác → đăng xuất máy này. */
  private watch(): void {
    this.feed?.stop();
    if (this.timer) clearInterval(this.timer);
    const uid = this.session?.userId;
    if (!uid) return;
    const check = async () => {
      if (!this.session || !database.ready) return;
      const u = await database.users().findOne({ _id: uid });
      this.applyUserDoc(u);
    };
    this.feed = new ChangeFeed<UserDoc>({
      name: 'me',
      collection: () => database.users(),
      pipeline: [{ $match: { 'documentKey._id': uid } }],
      fullDocument: true,
      onChange: (ev) => {
        if (ev.operationType === 'delete') this.applyUserDoc(null);
        else if ('fullDocument' in ev && ev.fullDocument) this.applyUserDoc(ev.fullDocument as UserDoc);
      },
      poll: check,
      pollMs: 60_000,
      onReconnect: check,
    });
    this.watching = this.feed.start();
    this.timer = setInterval(() => void check().catch(() => {}), TV_CACHE_MS);
  }

  private applyUserDoc(u: UserDoc | null): void {
    if (!this.session) return;
    if (!u) return this.clear('Tài khoản không còn tồn tại.');
    if (u.tokenVersion !== this.session.tv)
      return this.clear('Phiên đăng nhập đã hết hiệu lực (mật khẩu vừa đổi hoặc đã đăng xuất mọi thiết bị).');
    this.user = u;
    this.checkedAt = Date.now();
  }

  /** Người dùng hiện tại, đã kiểm tokenVersion (cache 60 giây). Ném UNAUTHORIZED nếu chưa đăng nhập. */
  async require(): Promise<UserDoc> {
    const s = this.session;
    if (!s) fail('UNAUTHORIZED', 'Bạn cần đăng nhập.');
    if (this.user && Date.now() - this.checkedAt < TV_CACHE_MS) return this.user;
    if (!database.ready) {
      if (this.user) return this.user;
      fail('OFFLINE', 'Chưa kết nối được cơ sở dữ liệu.');
    }
    const u = await database.users().findOne({ _id: s!.userId });
    if (!u || u.tokenVersion !== s!.tv) {
      this.clear('Phiên đăng nhập đã hết hiệu lực.');
      fail('UNAUTHORIZED', 'Phiên đăng nhập đã hết hiệu lực, hãy đăng nhập lại.');
    }
    this.user = u;
    this.checkedAt = Date.now();
    return u!;
  }

  /** Hồ sơ công khai đã biết (kể cả khi mất mạng). */
  cachedPublic(): PublicUser | null {
    return this.user ? toPublic(this.user) : (this.session?.profile ?? null);
  }

  async current(): Promise<PublicUser | null> {
    if (!this.session) return null;
    try {
      const u = await this.require();
      if (!this.feed) this.watch();
      return toPublic(u);
    } catch (e) {
      // mất mạng: vẫn vào app bằng hồ sơ đã lưu, làm việc trên bản local; có mạng lại sẽ kiểm phiên
      if (e instanceof AppError && e.code === 'OFFLINE') {
        if (!this.offlineHook)
          this.offlineHook = database.onStatus((st) => {
            if (st.state === 'online' && this.session && !this.feed) this.watch();
          });
        return this.session?.profile ?? null;
      }
      return null;
    }
  }
  private offlineHook: (() => void) | null = null;

  async register(input: { name: string; email: string; password: string }): Promise<PublicUser> {
    const name = parse(nameSchema, input.name);
    const email = parse(emailSchema, input.email);
    const password = parse(passwordSchema, input.password);
    const exists = await database.users().findOne({ email }, { projection: { _id: 1 } });
    if (exists) fail('CONFLICT', 'Email này đã có tài khoản. Hãy đăng nhập.');
    const doc: UserDoc = {
      _id: newId('u'),
      email,
      name,
      passwordHash: await hashPassword(password),
      tokenVersion: 0,
      color: pickColor(email),
      createdAt: new Date(),
    };
    try {
      await database.users().insertOne(doc);
    } catch (e) {
      if ((e as { code?: number }).code === 11000) fail('CONFLICT', 'Email này đã có tài khoản. Hãy đăng nhập.');
      throw e;
    }
    this.setSession(doc, true);
    audit(doc._id, 'register');
    return toPublic(doc);
  }

  private async checkRate(email: string): Promise<void> {
    const a = await database.attempts().findOne({ _id: email });
    if (a && a.count >= MAX_ATTEMPTS && Date.now() - a.firstAt.getTime() < WINDOW_MS)
      fail('RATE_LIMITED', 'Bạn thử quá nhiều lần, chờ 1 phút');
  }

  private async recordFailure(email: string): Promise<void> {
    const now = new Date();
    const a = await database.attempts().findOne({ _id: email });
    if (!a || now.getTime() - a.firstAt.getTime() >= WINDOW_MS) {
      await database.attempts().replaceOne({ _id: email }, { count: 1, firstAt: now }, { upsert: true });
    } else {
      await database.attempts().updateOne({ _id: email }, { $inc: { count: 1 } });
    }
  }

  async login(input: { email: string; password: string; remember: boolean }): Promise<PublicUser> {
    const email = parse(emailSchema, input.email);
    if (typeof input.password !== 'string' || !input.password) fail('VALIDATION', 'Hãy nhập mật khẩu');
    await this.checkRate(email);
    const u = await database.users().findOne({ email });
    const ok = !!u && (await verifyPassword(input.password, u.passwordHash));
    if (!ok || !u) {
      await this.recordFailure(email);
      fail('UNAUTHORIZED', 'Email hoặc mật khẩu không đúng');
    }
    await database.attempts().deleteOne({ _id: email });
    this.setSession(u!, !!input.remember);
    audit(u!._id, 'login');
    return toPublic(u!);
  }

  logout(): void {
    if (this.session) audit(this.session.userId, 'logout');
    this.clear();
  }

  async logoutAll(): Promise<void> {
    const u = await this.require();
    await database.users().updateOne({ _id: u._id }, { $inc: { tokenVersion: 1 } });
    audit(u._id, 'logoutAll');
    this.clear();
  }

  async updateProfile(input: { name: string; color?: string }): Promise<PublicUser> {
    const u = await this.require();
    const name = parse(nameSchema, input.name);
    const color = input.color && /^#[0-9a-f]{6}$/i.test(input.color) ? input.color : u.color;
    await database.users().updateOne({ _id: u._id }, { $set: { name, color } });
    this.user = { ...u, name, color };
    return toPublic(this.user);
  }

  async changePassword(input: { currentPassword: string; newPassword: string }): Promise<void> {
    const u = await this.require();
    if (!(await verifyPassword(input.currentPassword ?? '', u.passwordHash)))
      fail('VALIDATION', 'Mật khẩu hiện tại không đúng');
    const pw = parse(passwordSchema, input.newPassword);
    const passwordHash = await hashPassword(pw);
    const tv = u.tokenVersion + 1;
    await database.users().updateOne({ _id: u._id }, { $set: { passwordHash, tokenVersion: tv } });
    audit(u._id, 'passwordChanged');
    // Máy này giữ phiên với tokenVersion mới; mọi máy khác bị đăng xuất.
    this.setSession({ ...u, passwordHash, tokenVersion: tv }, this.session?.remember ?? true);
  }

  /** Tạo tài khoản demo khi chạy bản dev. */
  async seedDemo(): Promise<void> {
    const email = 'demo@umlab.local';
    if (await database.users().findOne({ email }, { projection: { _id: 1 } })) return;
    await database.users().insertOne({
      _id: newId('u'),
      email,
      name: 'Tài khoản demo',
      passwordHash: await hashPassword('Demo1234'),
      tokenVersion: 0,
      color: '#2E62E6',
      createdAt: new Date(),
    });
  }
}

export const auth = new AuthService();
