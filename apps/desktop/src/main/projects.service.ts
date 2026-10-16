import { Binary } from 'mongodb';
import { z } from 'zod';
import {
  IPC,
  type ProjectInput,
  type ProjectMember,
  type ProjectStats,
  type ProjectSummary,
  type Role,
} from '@shared/api';
import { auth } from './auth.service';
import { database, type ProjectDoc, type UserDoc } from './db';
import { broadcast } from './events';
import { ChangeFeed } from './feed';
import { AppError, fail, newId } from './util';

const RANK: Record<Role, number> = { viewer: 0, editor: 1, owner: 2 };

const inputSchema = z.object({
  name: z.string().trim().min(1, 'Hãy nhập tên project').max(120, 'Tên project quá dài'),
  description: z.string().max(2000, 'Mô tả quá dài').optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Màu không hợp lệ')
    .optional(),
  icon: z.string().max(60).optional(),
});

function parseInput(v: unknown): ProjectInput {
  const r = inputSchema.safeParse(v);
  if (!r.success) throw new AppError('VALIDATION', r.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ');
  return r.data;
}

const MAX_INITIAL_BYTES = 12 * 1024 * 1024;

class ProjectsService {
  private feed: ChangeFeed<ProjectDoc> | null = null;
  private changedTimer: NodeJS.Timeout | null = null;
  private lastPollSig = '';

  private notify(): void {
    if (this.changedTimer) clearTimeout(this.changedTimer);
    this.changedTimer = setTimeout(() => broadcast(IPC.projChangedEvt), 250);
  }

  /** Theo dõi collection projects để trang chủ tự làm mới khi người khác chia sẻ/sửa/xoá project. */
  ensureFeed(): void {
    if (this.feed) return;
    this.feed = new ChangeFeed<ProjectDoc>({
      name: 'projects',
      collection: () => database.projects(),
      pipeline: [{ $match: { operationType: { $in: ['insert', 'update', 'replace', 'delete'] } } }],
      onChange: () => this.notify(),
      poll: async () => {
        const uid = auth.userId;
        if (!uid) return;
        const docs = await database
          .projects()
          .find({ memberIds: uid }, { projection: { _id: 1, updatedAt: 1, members: 1, name: 1 } })
          .toArray();
        const sig = JSON.stringify(docs);
        if (sig !== this.lastPollSig) {
          this.lastPollSig = sig;
          this.notify();
        }
      },
      pollMs: 4000,
      onReconnect: () => this.notify(),
    });
    this.feed.start();
  }

  stopFeed(): void {
    this.feed?.stop();
    this.feed = null;
  }

  /** Kiểm quyền: trả về project + vai trò của người dùng hiện tại; ném FORBIDDEN/NOT_FOUND. */
  async access(projectId: string, min: Role = 'viewer'): Promise<{ project: ProjectDoc; user: UserDoc; role: Role }> {
    const user = await auth.require();
    const project = await database.projects().findOne({ _id: projectId });
    if (!project) fail('NOT_FOUND', 'Project không tồn tại hoặc đã bị xoá.');
    const m = project!.members.find((x) => x.userId === user._id);
    if (!m) fail('FORBIDDEN', 'Bạn không có quyền truy cập project này.');
    if (RANK[m!.role] < RANK[min])
      fail(
        'FORBIDDEN',
        min === 'owner' ? 'Chỉ chủ project mới làm được thao tác này.' : 'Bạn chỉ có quyền xem project này.',
      );
    return { project: project!, user, role: m!.role };
  }

  private async summaries(docs: ProjectDoc[], me: string): Promise<ProjectSummary[]> {
    const ids = [...new Set(docs.flatMap((d) => d.memberIds))];
    const users = ids.length
      ? await database
          .users()
          .find({ _id: { $in: ids } }, { projection: { name: 1, email: 1, color: 1 } })
          .toArray()
      : [];
    const byId = new Map(users.map((u) => [u._id, u]));
    return docs.map((d) => {
      const members: ProjectMember[] = d.members.map((m) => {
        const u = byId.get(m.userId);
        return {
          userId: m.userId,
          role: m.role,
          name: u?.name ?? '(đã xoá)',
          email: u?.email ?? '',
          color: u?.color ?? '#8A93A5',
        };
      });
      return {
        id: d._id,
        name: d.name,
        description: d.description,
        color: d.color,
        icon: d.icon,
        ownerId: d.ownerId,
        role: d.members.find((m) => m.userId === me)?.role ?? 'viewer',
        members,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
        stats: d.stats ?? { diagramCount: 0, diagramCountByType: {} },
      };
    });
  }

  async list(): Promise<ProjectSummary[]> {
    const user = await auth.require();
    this.ensureFeed();
    const docs = await database.projects().find({ memberIds: user._id }).sort({ updatedAt: -1 }).toArray();
    return this.summaries(docs, user._id);
  }

  async get(id: string): Promise<ProjectSummary> {
    const { project, user } = await this.access(id);
    return (await this.summaries([project], user._id))[0];
  }

  async create(input: ProjectInput & { initialUpdate?: Uint8Array }): Promise<ProjectSummary> {
    const user = await auth.require();
    const data = parseInput(input);
    const now = new Date();
    const doc: ProjectDoc = {
      _id: newId('p'),
      ownerId: user._id,
      name: data.name,
      description: data.description ?? '',
      color: data.color ?? '#2E62E6',
      icon: data.icon ?? 'folder-kanban',
      members: [{ userId: user._id, role: 'owner' }],
      memberIds: [user._id],
      stats: { diagramCount: 0, diagramCountByType: {} },
      createdAt: now,
      updatedAt: now,
    };
    await database.projects().insertOne(doc);
    if (input.initialUpdate && input.initialUpdate.byteLength) {
      if (input.initialUpdate.byteLength > MAX_INITIAL_BYTES)
        fail('VALIDATION', 'Dữ liệu project quá lớn (tối đa 12 MB).');
      await database.updates().insertOne({
        projectId: doc._id,
        kind: 's',
        data: new Binary(Buffer.from(input.initialUpdate)),
        clientId: 'create',
        userId: user._id,
        createdAt: now,
      });
    }
    return (await this.summaries([doc], user._id))[0];
  }

  async update(id: string, patch: ProjectInput): Promise<ProjectSummary> {
    const { user } = await this.access(id, 'editor');
    const data = inputSchema.partial().safeParse(patch);
    if (!data.success) fail('VALIDATION', data.error!.issues[0]?.message ?? 'Dữ liệu không hợp lệ');
    const set: Partial<ProjectDoc> = { updatedAt: new Date() };
    const d = data.data!;
    if (d.name !== undefined) set.name = d.name;
    if (d.description !== undefined) set.description = d.description;
    if (d.color !== undefined) set.color = d.color;
    if (d.icon !== undefined) set.icon = d.icon;
    await database.projects().updateOne({ _id: id }, { $set: set });
    const fresh = await database.projects().findOne({ _id: id });
    return (await this.summaries([fresh!], user._id))[0];
  }

  async remove(id: string): Promise<void> {
    await this.access(id, 'owner');
    await Promise.all([
      database.updates().deleteMany({ projectId: id }),
      database.presence().deleteMany({ projectId: id }),
      database.versions().deleteMany({ projectId: id }),
      database.assets().deleteMany({ projectId: id }),
    ]);
    await database.projects().deleteOne({ _id: id });
  }

  async setStats(id: string, stats: ProjectStats): Promise<void> {
    const { project } = await this.access(id, 'editor');
    const clean: ProjectStats = {
      diagramCount: Math.max(0, Math.round(Number(stats.diagramCount) || 0)),
      diagramCountByType: Object.fromEntries(
        Object.entries(stats.diagramCountByType ?? {})
          .filter(([k]) => /^[a-z-]{2,20}$/.test(k))
          .map(([k, v]) => [k, Math.max(0, Math.round(Number(v) || 0))]),
      ),
    };
    if (JSON.stringify(clean) === JSON.stringify(project.stats)) {
      await database.projects().updateOne({ _id: id }, { $set: { updatedAt: new Date() } });
      return;
    }
    await database.projects().updateOne({ _id: id }, { $set: { stats: clean, updatedAt: new Date() } });
  }

  async addMember(id: string, email: string, role: Role): Promise<ProjectSummary> {
    const { project, user } = await this.access(id, 'owner');
    if (role === 'owner') fail('VALIDATION', 'Chỉ có một chủ project.');
    const target = await database.users().findOne({ email: String(email).trim().toLowerCase() });
    if (!target) fail('NOT_FOUND', 'Chưa có tài khoản UMLab nào dùng email này. Người đó cần đăng ký trước.');
    if (project.memberIds.includes(target!._id)) fail('CONFLICT', `${target!.name} đã là thành viên.`);
    await database
      .projects()
      .updateOne(
        { _id: id },
        {
          $push: { members: { userId: target!._id, role } },
          $addToSet: { memberIds: target!._id },
          $set: { updatedAt: new Date() },
        },
      );
    const fresh = await database.projects().findOne({ _id: id });
    return (await this.summaries([fresh!], user._id))[0];
  }

  async setMemberRole(id: string, userId: string, role: Role): Promise<ProjectSummary> {
    const { project, user } = await this.access(id, 'owner');
    if (role === 'owner') fail('VALIDATION', 'Chỉ có một chủ project.');
    if (userId === project.ownerId) fail('VALIDATION', 'Không đổi được vai trò của chủ project.');
    await database
      .projects()
      .updateOne({ _id: id, 'members.userId': userId }, { $set: { 'members.$.role': role, updatedAt: new Date() } });
    const fresh = await database.projects().findOne({ _id: id });
    return (await this.summaries([fresh!], user._id))[0];
  }

  /** Chủ project xoá thành viên, hoặc thành viên tự rời project. */
  async removeMember(id: string, userId: string): Promise<ProjectSummary> {
    const me = await auth.require();
    const { project } = await this.access(id, me._id === userId ? 'viewer' : 'owner');
    if (userId === project.ownerId)
      fail('VALIDATION', 'Chủ project không rời được project. Hãy xoá project nếu không dùng nữa.');
    await database
      .projects()
      .updateOne({ _id: id }, { $pull: { members: { userId }, memberIds: userId }, $set: { updatedAt: new Date() } });
    await database.presence().deleteMany({ projectId: id, userId });
    const fresh = await database.projects().findOne({ _id: id });
    return (await this.summaries([fresh!], me._id))[0];
  }
}

export const projects = new ProjectsService();
