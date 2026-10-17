// Truy vấn MongoDB cho trang quản trị: tổng quan, tài khoản, lịch sử tài khoản, tạo tài khoản, đặt lại mật khẩu.
import { randomBytes } from 'node:crypto';
import type { Db } from 'mongodb';
import { hashPassword, passwordProblem, resetPassword, tempPassword } from '../../../../scripts/reset-password.mjs';
import type {
  AuditDoc,
  HistoryItem,
  Overview,
  PresenceDoc,
  ProjectDoc,
  UpdateDoc,
  UserDetail,
  UserDoc,
  UserRow,
  VersionDoc,
} from './types';

export class AdminError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const DAY = 86_400_000;
const ALIVE = { isDeleted: { $ne: true } };
const COLORS = ['#2E62E6', '#D9463E', '#1F9D66', '#7C5CC4', '#D98A1C', '#0E8A9B', '#C2417E', '#4A6FA5'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME = /^\S{3,200}$/;

const col = (db: Db) => ({
  users: db.collection<UserDoc>('users'),
  projects: db.collection<ProjectDoc>('projects'),
  updates: db.collection<UpdateDoc>('project_updates'),
  presence: db.collection<PresenceDoc>('presence'),
  versions: db.collection<VersionDoc>('diagram_versions'),
  audit: db.collection<AuditDoc>('audit_log'),
});

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/** Ngày gần nhất mỗi tài khoản có chỉnh sửa (project_updates) hoặc sự kiện (audit_log). */
async function lastActive(db: Db, userIds?: string[]): Promise<Map<string, Date>> {
  const c = col(db);
  const match = userIds ? { userId: { $in: userIds } } : {};
  const [u, a] = await Promise.all([
    c.updates
      .aggregate<{ _id: string; at: Date }>([
        { $match: { ...match, kind: 'u' } },
        { $group: { _id: '$userId', at: { $max: '$createdAt' } } },
      ])
      .toArray(),
    c.audit
      .aggregate<{ _id: string; at: Date }>([{ $match: match }, { $group: { _id: '$userId', at: { $max: '$at' } } }])
      .toArray(),
  ]);
  const out = new Map<string, Date>();
  for (const x of [...u, ...a]) if (!out.has(x._id) || out.get(x._id)! < x.at) out.set(x._id, x.at);
  return out;
}

export async function overview(db: Db, now = new Date()): Promise<Overview> {
  const c = col(db);
  const since14 = new Date(now.getTime() - 13 * DAY);
  since14.setUTCHours(0, 0, 0, 0);
  const [users, projects, active, online, newUsers, perDay] = await Promise.all([
    c.users.countDocuments(ALIVE),
    c.projects.find({}, { projection: { stats: 1 } }).toArray(),
    c.updates.distinct('userId', { kind: 'u', createdAt: { $gte: new Date(now.getTime() - 7 * DAY) } }),
    c.presence.distinct('userId', { updatedAt: { $gte: new Date(now.getTime() - 60_000) } }),
    c.users.countDocuments({ ...ALIVE, createdAt: { $gte: new Date(now.getTime() - 30 * DAY) } }),
    c.updates
      .aggregate<{ _id: string; edits: number; users: string[] }>([
        { $match: { kind: 'u', createdAt: { $gte: since14 } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            edits: { $sum: 1 },
            users: { $addToSet: '$userId' },
          },
        },
      ])
      .toArray(),
  ]);
  const byType: Record<string, number> = {};
  let diagrams = 0;
  for (const p of projects) {
    diagrams += p.stats?.diagramCount ?? 0;
    for (const [t, n] of Object.entries(p.stats?.diagramCountByType ?? {})) byType[t] = (byType[t] ?? 0) + n;
  }
  const map = new Map(perDay.map((d) => [d._id, d]));
  const activity = Array.from({ length: 14 }, (_, i) => {
    const day = dayKey(new Date(since14.getTime() + i * DAY));
    const d = map.get(day);
    return { day, edits: d?.edits ?? 0, users: d?.users.length ?? 0 };
  });
  return {
    users,
    projects: projects.length,
    diagrams,
    diagramsByType: byType,
    activeUsers7d: active.length,
    online: online.length,
    newUsers30d: newUsers,
    activity,
  };
}

async function projectCounts(db: Db, userIds?: string[]): Promise<Map<string, number>> {
  const rows = await col(db)
    .projects.aggregate<{ _id: string; n: number }>([
      ...(userIds ? [{ $match: { memberIds: { $in: userIds } } }] : []),
      { $unwind: '$memberIds' },
      { $group: { _id: '$memberIds', n: { $sum: 1 } } },
    ])
    .toArray();
  return new Map(rows.map((r) => [r._id, r.n]));
}

const row = (u: UserDoc, projects: Map<string, number>, last: Map<string, Date>): UserRow => ({
  id: u._id,
  name: u.name,
  email: u.email,
  username: u.username ?? u.email,
  color: u.color,
  createdAt: u.createdAt.toISOString(),
  projects: projects.get(u._id) ?? 0,
  lastActive: last.get(u._id)?.toISOString() ?? null,
  deleted: !!u.isDeleted,
  deletedAt: u.deletedAt?.toISOString() ?? null,
  deletedBy: u.deletedBy ?? null,
});

/** `deleted`: true → chỉ tài khoản đã xoá (mềm), false → chỉ tài khoản còn dùng. */
export async function listUsers(db: Db, q = '', deleted = false): Promise<UserRow[]> {
  const k = q.trim();
  const esc = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const filter = {
    isDeleted: deleted ? true : { $ne: true },
    ...(k && {
      $or: [
        { email: { $regex: esc, $options: 'i' } },
        { username: { $regex: esc, $options: 'i' } },
        { name: { $regex: esc, $options: 'i' } },
      ],
    }),
  };
  const users = await col(db).users.find(filter).sort({ createdAt: -1 }).limit(500).toArray();
  const ids = users.map((u) => u._id);
  const [projects, last] = await Promise.all([projectCounts(db, ids), lastActive(db, ids)]);
  return users.map((u) => row(u, projects, last));
}

const AUDIT_TEXT: Record<string, (m: Record<string, string>) => string> = {
  register: () => 'Đăng ký tài khoản',
  adminCreated: (m) => `Được tạo bởi quản trị${m.by ? ` (${m.by})` : ''}`,
  adminUpdated: (m) => `Sửa thông tin${m.changes ? `: ${m.changes}` : ''}${m.by ? ` (bởi ${m.by})` : ''}`,
  adminDeleted: (m) => `Tài khoản bị xoá${m.by ? ` (bởi ${m.by})` : ''}`,
  adminRestored: (m) => `Tài khoản được khôi phục${m.by ? ` (bởi ${m.by})` : ''}`,
  login: () => 'Đăng nhập',
  logout: () => 'Đăng xuất',
  logoutAll: (m) => `Đăng xuất mọi thiết bị${m.by ? ` (bởi ${m.by})` : ''}`,
  passwordChanged: () => 'Đổi mật khẩu',
  passwordReset: (m) => `Mật khẩu được đặt lại${m.by ? ` (bởi ${m.by})` : ''}`,
  projectCreated: (m) => `Tạo project “${m.name ?? ''}”`,
  projectDeleted: (m) => `Xoá project “${m.name ?? ''}”`,
};

/** Chi tiết tài khoản + lịch sử: sự kiện tài khoản, chỉnh sửa (gộp theo project × ngày), phiên bản đã lưu. */
export async function userDetail(db: Db, id: string, limit = 200): Promise<UserDetail> {
  const c = col(db);
  const u = await c.users.findOne({ _id: id });
  if (!u) throw new AdminError(404, 'Tài khoản không tồn tại.');
  const [projects, last, audit, edits, versions] = await Promise.all([
    c.projects.find({ memberIds: id }).sort({ updatedAt: -1 }).toArray(),
    lastActive(db, [id]),
    c.audit.find({ userId: id }).sort({ at: -1 }).limit(limit).toArray(),
    c.updates
      .aggregate<{ _id: { p: string; d: string }; n: number; first: Date; last: Date }>([
        { $match: { userId: id, kind: 'u' } },
        {
          $group: {
            _id: { p: '$projectId', d: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } },
            n: { $sum: 1 },
            first: { $min: '$createdAt' },
            last: { $max: '$createdAt' },
          },
        },
        { $sort: { last: -1 } },
        { $limit: limit },
      ])
      .toArray(),
    c.versions
      .find({ userId: id }, { projection: { content: 0 } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray(),
  ]);
  const names = new Map(projects.map((p) => [p._id, p.name]));
  const missing = [...new Set([...edits.map((e) => e._id.p), ...versions.map((v) => v.projectId)])].filter(
    (p) => !names.has(p),
  );
  if (missing.length)
    for (const p of await c.projects.find({ _id: { $in: missing } }, { projection: { name: 1 } }).toArray())
      names.set(p._id, p.name);
  const pname = (pid: string) => names.get(pid) ?? '(project đã xoá)';
  const history: HistoryItem[] = [
    { at: u.createdAt.toISOString(), kind: 'created', text: 'Tài khoản được tạo' },
    ...audit.map((a) => ({
      at: a.at.toISOString(),
      kind: a.kind,
      text: (AUDIT_TEXT[a.kind] ?? (() => a.kind))(a.meta ?? {}),
    })),
    ...edits.map((e) => ({
      at: e.last.toISOString(),
      kind: 'edit',
      text: `Chỉnh sửa “${pname(e._id.p)}” — ${e.n} thay đổi`,
    })),
    ...versions.map((v) => ({
      at: v.createdAt.toISOString(),
      kind: 'version',
      text: `Lưu phiên bản “${v.label}” trong “${pname(v.projectId)}”`,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
  return {
    user: row(u, new Map([[id, projects.length]]), last),
    projects: projects.map((p) => ({
      id: p._id,
      name: p.name,
      role: p.members.find((m) => m.userId === id)?.role ?? 'viewer',
      diagrams: p.stats?.diagramCount ?? 0,
      updatedAt: p.updatedAt.toISOString(),
    })),
    history,
  };
}

interface Identity {
  name: string;
  email: string;
  username: string;
}

/** Họ tên / email / tên đăng nhập (trống = email) đã chuẩn hoá; ném 400 nếu sai, 409 nếu trùng tài khoản khác. */
async function checkIdentity(
  db: Db,
  input: { name?: unknown; email?: unknown; username?: unknown },
  selfId?: string,
): Promise<Identity> {
  const name = String(input.name ?? '').trim();
  const email = String(input.email ?? '')
    .trim()
    .toLowerCase();
  if (name.length < 2 || name.length > 60) throw new AdminError(400, 'Họ tên cần 2–60 ký tự.');
  if (!EMAIL.test(email)) throw new AdminError(400, 'Email không hợp lệ.');
  const username =
    String(input.username ?? '')
      .trim()
      .toLowerCase() || email;
  if (!USERNAME.test(username)) throw new AdminError(400, 'Tên đăng nhập cần ít nhất 3 ký tự, không có khoảng trắng.');
  // App đăng nhập bằng email hoặc tên đăng nhập → hai giá trị không được trùng giá trị nào của tài khoản khác,
  // kể cả tài khoản đã xoá mềm (khôi phục lại sẽ đụng nhau)
  const taken = await col(db).users.findOne(
    {
      ...(selfId && { _id: { $ne: selfId } }),
      $or: [{ email }, { username: email }, { email: username }, { username }],
    },
    { projection: { email: 1, username: 1, isDeleted: 1 } },
  );
  if (taken) {
    const what = taken.email === email || taken.username === email ? 'Email' : 'Tên đăng nhập';
    throw new AdminError(
      409,
      taken.isDeleted
        ? `${what} này thuộc một tài khoản đã xoá — khôi phục tài khoản đó trong mục “Đã xoá”.`
        : `${what} này đã được dùng.`,
    );
  }
  return { name, email, username };
}

/**
 * Tạo tài khoản (cùng luật & cách băm mật khẩu với app). Không nhập mật khẩu → sinh mật khẩu tạm; không nhập tên đăng
 * nhập → dùng email.
 */
export async function createUser(
  db: Db,
  input: { name?: unknown; email?: unknown; username?: unknown; password?: unknown },
  by: string,
): Promise<{ user: UserRow; tempPassword?: string }> {
  const given = typeof input.password === 'string' && input.password ? input.password : '';
  const password = given || tempPassword();
  const problem = passwordProblem(password);
  if (problem) throw new AdminError(400, problem);
  const { name, email, username } = await checkIdentity(db, input);
  const c = col(db);
  let h = 0;
  for (const ch of email) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const doc: UserDoc = {
    _id: `u_${randomBytes(6).toString('hex')}`,
    email,
    username,
    name,
    passwordHash: await hashPassword(password),
    tokenVersion: 0,
    color: COLORS[h % COLORS.length],
    createdAt: new Date(),
  };
  try {
    await c.users.insertOne(doc);
  } catch (e) {
    if ((e as { code?: number }).code === 11000)
      throw new AdminError(409, 'Email hoặc tên đăng nhập này đã có tài khoản.');
    throw e;
  }
  await c.audit.insertOne({
    _id: `al_${randomBytes(8).toString('hex')}`,
    userId: doc._id,
    kind: 'adminCreated',
    meta: { by },
    at: new Date(),
  });
  return { user: row(doc, new Map(), new Map()), ...(given ? {} : { tempPassword: password }) };
}

const auditOf = (userId: string, kind: string, meta: Record<string, string>): AuditDoc => ({
  _id: `al_${randomBytes(8).toString('hex')}`,
  userId,
  kind,
  meta,
  at: new Date(),
});

/** Sửa họ tên / email / tên đăng nhập. Không đổi mật khẩu, không đăng xuất (app nhận hồ sơ mới qua change stream). */
export async function updateUser(
  db: Db,
  id: string,
  input: { name?: unknown; email?: unknown; username?: unknown },
  by: string,
): Promise<UserRow> {
  const c = col(db);
  const u = await c.users.findOne({ _id: id });
  if (!u) throw new AdminError(404, 'Tài khoản không tồn tại.');
  const next = await checkIdentity(db, input, id);
  const before: Identity = { name: u.name, email: u.email, username: u.username ?? u.email };
  const LABEL: Record<keyof Identity, string> = { name: 'họ tên', email: 'email', username: 'tên đăng nhập' };
  const changed = (Object.keys(LABEL) as (keyof Identity)[]).filter((k) => before[k] !== next[k]);
  if (changed.length) {
    try {
      await c.users.updateOne({ _id: id }, { $set: next });
    } catch (e) {
      if ((e as { code?: number }).code === 11000)
        throw new AdminError(409, 'Email hoặc tên đăng nhập này đã có tài khoản.');
      throw e;
    }
    await c.audit.insertOne(auditOf(id, 'adminUpdated', { by, changes: changed.map((k) => LABEL[k]).join(', ') }));
  }
  const [projects, last] = await Promise.all([projectCounts(db, [id]), lastActive(db, [id])]);
  return row({ ...u, ...next }, projects, last);
}

/**
 * Xoá mềm: đánh dấu isDeleted + tăng tokenVersion (máy đang mở app bị đăng xuất ngay). Không đụng project / dữ liệu,
 * khôi phục là dùng lại như cũ. Không cho xoá tài khoản đang dùng để đăng nhập trang quản trị.
 */
export async function deleteUser(db: Db, id: string, by: string): Promise<void> {
  const c = col(db);
  const u = await c.users.findOne({ _id: id }, { projection: { email: 1, isDeleted: 1 } });
  if (!u) throw new AdminError(404, 'Tài khoản không tồn tại.');
  if (u.email === by) throw new AdminError(400, 'Không xoá được tài khoản bạn đang dùng để quản trị.');
  if (u.isDeleted) return;
  await c.users.updateOne(
    { _id: id },
    { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: by }, $inc: { tokenVersion: 1 } },
  );
  await c.presence.deleteMany({ userId: id });
  await c.audit.insertOne(auditOf(id, 'adminDeleted', { by }));
}

export async function restoreUser(db: Db, id: string, by: string): Promise<void> {
  const c = col(db);
  const r = await c.users.updateOne(
    { _id: id, isDeleted: true },
    { $unset: { isDeleted: '', deletedAt: '', deletedBy: '' } },
  );
  if (r.matchedCount) await c.audit.insertOne(auditOf(id, 'adminRestored', { by }));
  else if (!(await c.users.findOne({ _id: id }, { projection: { _id: 1 } })))
    throw new AdminError(404, 'Tài khoản không tồn tại.');
}

/** Đặt lại mật khẩu → mật khẩu tạm; thu hồi mọi phiên của tài khoản. */
export async function resetUserPassword(db: Db, id: string, by: string): Promise<string> {
  const u = await col(db).users.findOne({ _id: id }, { projection: { email: 1 } });
  if (!u) throw new AdminError(404, 'Tài khoản không tồn tại.');
  const pw = tempPassword();
  await resetPassword(db, u.email, pw, by);
  return pw;
}

/** Đăng xuất tài khoản ở mọi máy (tăng tokenVersion — app nhận qua change stream). */
export async function logoutEverywhere(db: Db, id: string, by: string): Promise<void> {
  const c = col(db);
  const r = await c.users.updateOne({ _id: id }, { $inc: { tokenVersion: 1 } });
  if (!r.matchedCount) throw new AdminError(404, 'Tài khoản không tồn tại.');
  await c.audit.insertOne({
    _id: `al_${randomBytes(8).toString('hex')}`,
    userId: id,
    kind: 'logoutAll',
    meta: { by },
    at: new Date(),
  });
}
