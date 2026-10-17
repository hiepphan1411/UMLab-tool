import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { Binary } from 'mongodb';
import { sent } from './test-setup';
import { IPC } from '@shared/api';

let rs: MongoMemoryReplSet;
let db: typeof import('./db');
let authMod: typeof import('./auth.service');
let projMod: typeof import('./projects.service');
let syncMod: typeof import('./sync.service');
let presenceMod: typeof import('./presence.service');

const waitFor = async (fn: () => boolean, ms = 8000) => {
  const t = Date.now();
  while (!fn()) {
    if (Date.now() - t > ms) throw new Error('timeout');
    await new Promise((r) => setTimeout(r, 50));
  }
};

const err = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return e as { code?: string; message: string };
  }
  throw new Error('expected error');
};

beforeAll(async () => {
  rs = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  process.env.UMLAB_MONGO_URI_OVERRIDE = rs.getUri();
  process.env.UMLAB_DB_OVERRIDE = 'umlab_test';
  db = await import('./db');
  authMod = await import('./auth.service');
  projMod = await import('./projects.service');
  syncMod = await import('./sync.service');
  presenceMod = await import('./presence.service');
  syncMod.sync.init();
  presenceMod.presence.init();
  await db.database.start();
  expect(db.database.current.state).toBe('online');
  expect(db.database.current.realtime).toBe(true);
});

afterAll(async () => {
  syncMod?.sync.dispose();
  await db?.database.stop();
  await rs?.stop();
});

describe('auth.service (P01)', () => {
  it('đăng ký, chặn email trùng, kiểm luật mật khẩu', async () => {
    const { auth } = authMod;
    const u = await auth.register({ name: 'An', email: 'An@Example.com', password: 'Matkhau123' });
    expect(u.email).toBe('an@example.com');
    expect((await err(auth.register({ name: 'An2', email: 'an@example.com', password: 'Matkhau123' }))).code).toBe(
      'CONFLICT',
    );
    expect((await err(auth.register({ name: 'B', email: 'b@example.com', password: 'abcdefgh' }))).message).toMatch(
      /chữ và số/,
    );
    expect((await err(auth.register({ name: 'B', email: 'b@example.com', password: 'ab1' }))).message).toMatch(
      /8 ký tự/,
    );
    const stored = await db.database.users().findOne({ email: 'an@example.com' });
    expect(stored?.passwordHash.startsWith('$argon2id$')).toBe(true);
  });

  it('sai mật khẩu 5 lần → lần 6 bị chặn 1 phút', async () => {
    const { auth } = authMod;
    auth.logout();
    for (let i = 0; i < 5; i++)
      expect((await err(auth.login({ email: 'an@example.com', password: 'sai', remember: false }))).message).toBe(
        'Email hoặc mật khẩu không đúng',
      );
    expect((await err(auth.login({ email: 'an@example.com', password: 'Matkhau123', remember: false }))).code).toBe(
      'RATE_LIMITED',
    );
    await db.database.attempts().deleteMany({});
    const u = await auth.login({ email: 'an@example.com', password: 'Matkhau123', remember: true });
    expect(u.name).toBe('An');
  });

  it('đổi tokenVersion ở "máy khác" → máy này bị đăng xuất qua change stream', async () => {
    const { auth } = authMod;
    sent.length = 0;
    const me = await auth.require();
    await auth.watching;
    await db.database.users().updateOne({ _id: me._id }, { $inc: { tokenVersion: 1 } });
    await waitFor(() => sent.some((s) => s.channel === IPC.authEndedEvt));
    expect(auth.userId).toBeNull();
    expect((await err(auth.require())).code).toBe('UNAUTHORIZED');
  });

  it('đổi mật khẩu giữ phiên máy này, mật khẩu cũ không dùng được nữa', async () => {
    const { auth } = authMod;
    await auth.login({ email: 'an@example.com', password: 'Matkhau123', remember: false });
    await auth.changePassword({ currentPassword: 'Matkhau123', newPassword: 'Moi12345' });
    expect((await auth.require()).email).toBe('an@example.com');
    auth.logout();
    expect((await err(auth.login({ email: 'an@example.com', password: 'Matkhau123', remember: false }))).code).toBe(
      'UNAUTHORIZED',
    );
    await auth.login({ email: 'an@example.com', password: 'Moi12345', remember: false });
  });
});

describe('projects.service + sync.service (P02/P03)', () => {
  let pid = '';
  let bId = '';

  it('A tạo project kèm dữ liệu ban đầu; B không truy cập được (FORBIDDEN)', async () => {
    const { auth } = authMod;
    const { projects } = projMod;
    await auth.login({ email: 'an@example.com', password: 'Moi12345', remember: false });
    const d = new Y.Doc();
    d.getMap('folders').set('f1', { id: 'f1', parentId: null, name: 'Phân tích', order: 0 });
    const p = await projects.create({ name: 'UniPark+', initialUpdate: Y.encodeStateAsUpdate(d) });
    pid = p.id;
    expect(p.role).toBe('owner');
    expect((await projects.list()).map((x) => x.id)).toContain(pid);

    auth.logout();
    const b = await auth.register({ name: 'Bình', email: 'binh@example.com', password: 'Matkhau123' });
    bId = b.id;
    expect((await err(projects.get(pid))).code).toBe('FORBIDDEN');
    expect((await err(syncMod.sync.openProject(pid))).code).toBe('FORBIDDEN');
    expect(await projects.list()).toHaveLength(0);
  });

  it('A mời B quyền xem: B mở được nhưng không ghi được; nâng quyền rồi ghi được', async () => {
    const { auth } = authMod;
    const { projects } = projMod;
    auth.logout();
    await auth.login({ email: 'an@example.com', password: 'Moi12345', remember: false });
    expect((await err(projects.addMember(pid, 'khongco@example.com', 'editor'))).code).toBe('NOT_FOUND');
    const p = await projects.addMember(pid, 'BINH@example.com', 'viewer');
    expect(p.members.map((m) => m.name)).toEqual(['An', 'Bình']);

    auth.logout();
    await auth.login({ email: 'binh@example.com', password: 'Matkhau123', remember: false });
    const opened = await syncMod.sync.openProject(pid);
    const doc = new Y.Doc();
    opened.updates.forEach((u) => Y.applyUpdate(doc, u));
    expect((doc.getMap('folders').get('f1') as { name: string }).name).toBe('Phân tích');
    const d2 = new Y.Doc();
    d2.getMap('folders').set('f2', { id: 'f2', name: 'x' });
    expect((await err(syncMod.sync.push(pid, Y.encodeStateAsUpdate(d2)))).code).toBe('FORBIDDEN');
    expect((await err(projects.update(pid, { name: 'Đổi' }))).code).toBe('FORBIDDEN');
    syncMod.sync.close(pid);

    auth.logout();
    await auth.login({ email: 'an@example.com', password: 'Moi12345', remember: false });
    await projects.setMemberRole(pid, bId, 'editor');
    auth.logout();
    await auth.login({ email: 'binh@example.com', password: 'Matkhau123', remember: false });
    await syncMod.sync.push(pid, Y.encodeStateAsUpdate(d2));
    expect(await db.database.updates().countDocuments({ projectId: pid })).toBe(2);
  });

  it('bản cập nhật từ máy khác tới qua change stream; tự gộp snapshot khi > 200 bản', async () => {
    sent.length = 0;
    await syncMod.sync.openProject(pid);
    const other = new Y.Doc();
    other.getMap('diagrams').set('d1', { id: 'd1', type: 'usecase', name: 'UC' });
    await db.database.updates().insertOne({
      projectId: pid,
      kind: 'u',
      data: new Binary(Buffer.from(Y.encodeStateAsUpdate(other))),
      clientId: 'c_other',
      userId: 'u_other',
      createdAt: new Date(),
    });
    await waitFor(() => sent.some((s) => s.channel === IPC.syncUpdateEvt && s.args[0] === pid));
    syncMod.sync.close(pid);

    const many: { projectId: string; kind: 'u'; data: Binary; clientId: string; userId: string; createdAt: Date }[] =
      [];
    const src = new Y.Doc();
    let prev = Y.encodeStateVector(src);
    for (let i = 0; i < 210; i++) {
      src.getMap('model').set('m' + i, { id: 'm' + i, name: 'E' + i });
      const u = Y.encodeStateAsUpdate(src, prev);
      prev = Y.encodeStateVector(src);
      many.push({
        projectId: pid,
        kind: 'u',
        data: new Binary(Buffer.from(u)),
        clientId: 'c_bulk',
        userId: 'x',
        createdAt: new Date(),
      });
    }
    await db.database.updates().insertMany(many);
    const opened = await syncMod.sync.openProject(pid);
    await waitFor(() => false, 1500).catch(() => {});
    const count = await db.database.updates().countDocuments({ projectId: pid });
    expect(count).toBeLessThan(10);
    const after = await syncMod.sync.loadAll(pid);
    const doc = new Y.Doc();
    after.forEach((u) => Y.applyUpdate(doc, u));
    expect(doc.getMap('model').size).toBe(210);
    expect(doc.getMap('diagrams').has('d1')).toBe(true);
    // local-first: trả về một trạng thái đã gộp (tệp local + mọi bản trên DB)
    const merged = new Y.Doc();
    opened.updates.forEach((u) => Y.applyUpdate(merged, u));
    expect(merged.getMap('model').size).toBe(210);
    syncMod.sync.close(pid);
  });

  it('presence: thấy người khác qua change stream, bỏ chính mình', async () => {
    sent.length = 0;
    await syncMod.sync.openProject(pid);
    await db.database.presence().replaceOne(
      { _id: `${pid}:c_peer` },
      {
        projectId: pid,
        clientId: 'c_peer',
        userId: 'u_x',
        name: 'Chi',
        color: '#D9463E',
        diagramId: 'd1',
        cursor: { x: 1, y: 2 },
        selection: [],
        dragging: null,
        updatedAt: new Date(),
      },
      { upsert: true },
    );
    await waitFor(() =>
      sent.some(
        (s) => s.channel === IPC.presencePeersEvt && (s.args[1] as { name: string }[]).some((p) => p.name === 'Chi'),
      ),
    );
    const last = [...sent].reverse().find((s) => s.channel === IPC.presencePeersEvt)!;
    expect((last.args[1] as { clientId: string }[]).every((p) => p.clientId !== syncMod.sync.clientId)).toBe(true);
    syncMod.sync.close(pid);
  });

  it('chỉ chủ project xoá được; xoá dọn sạch cập nhật', async () => {
    const { auth } = authMod;
    const { projects } = projMod;
    expect((await err(projects.remove(pid))).code).toBe('FORBIDDEN');
    auth.logout();
    await auth.login({ email: 'an@example.com', password: 'Moi12345', remember: false });
    await projects.remove(pid);
    expect(await db.database.updates().countDocuments({ projectId: pid })).toBe(0);
    expect((await err(projects.get(pid))).code).toBe('NOT_FOUND');
  });
});

describe('local-first (lưu trên máy trước, đồng bộ MongoDB sau)', () => {
  const stateOf = (file: string) => {
    const raw = JSON.parse(readFileSync(file, 'utf8')) as { format: string; projectId: string; state: string };
    const d = new Y.Doc();
    Y.applyUpdate(d, new Uint8Array(Buffer.from(raw.state, 'base64')));
    return { raw, doc: d };
  };
  const edit = (key: string, value: string) => {
    const d = new Y.Doc();
    d.getMap('meta').set(key, value);
    return Y.encodeStateAsUpdate(d);
  };

  it('tạo project với thư mục đã chọn → tệp .umlab; mọi thay đổi ghi vào tệp trước', async () => {
    const { projects } = projMod;
    const { sync } = syncMod;
    const { local } = await import('./local.service');
    const dir = mkdtempSync(join(tmpdir(), 'umlab-local-'));
    const p = await projects.create({ name: 'Bãi xe: Cơ sở 1', localDir: dir });
    expect(p.local?.file).toBe(join(dir, 'Bãi xe_ Cơ sở 1.umlab'));
    await sync.openProject(p.id);
    await sync.push(p.id, edit('a', '1'));
    local.flush(p.id);
    const { raw, doc } = stateOf(p.local!.file);
    expect(raw).toMatchObject({ format: 'umlab-local', projectId: p.id });
    expect(doc.getMap('meta').get('a')).toBe('1');
    expect(await db.database.updates().countDocuments({ projectId: p.id })).toBeGreaterThan(0);
    sync.close(p.id);
  });

  it('mất mạng: vẫn liệt kê / mở / sửa / tạo project; có mạng lại → tự đồng bộ lên MongoDB', async () => {
    const { projects } = projMod;
    const { sync } = syncMod;
    const { local } = await import('./local.service');
    const dir = mkdtempSync(join(tmpdir(), 'umlab-off-'));
    const p = await projects.create({ name: 'Offline', localDir: dir });
    await sync.openProject(p.id);
    sync.close(p.id);

    await db.database.stop();
    expect(db.database.ready).toBe(false);
    expect((await projects.list()).map((x) => x.id)).toContain(p.id);
    const opened = await sync.openProject(p.id);
    expect(opened.project.id).toBe(p.id);
    await sync.push(p.id, edit('offline', 'yes'));
    const fresh = await projects.create({ name: 'Tạo lúc mất mạng', localDir: dir, initialUpdate: edit('seed', 'x') });
    expect(fresh.local?.pendingCreate).toBe(true);
    await sync.openProject(fresh.id);
    await sync.push(fresh.id, edit('more', 'y'));
    local.flushAll();
    expect(stateOf(fresh.local!.file).doc.getMap('meta').toJSON()).toEqual({ seed: 'x', more: 'y' });
    sync.close(p.id);
    sync.close(fresh.id);

    await db.database.start();
    await waitFor(() => db.database.ready);
    await projects.list(); // đẩy project tạo lúc offline lên
    await waitFor(() => db.database.current.pending === 0, 15_000);
    const remote = new Y.Doc();
    for (const u of await sync.loadAll(p.id)) Y.applyUpdate(remote, u);
    expect(remote.getMap('meta').get('offline')).toBe('yes');
    expect(await db.database.projects().countDocuments({ _id: fresh.id })).toBe(1);
    const r2 = new Y.Doc();
    for (const u of await sync.loadAll(fresh.id)) Y.applyUpdate(r2, u);
    expect(r2.getMap('meta').toJSON()).toEqual({ seed: 'x', more: 'y' });
    expect(local.get(fresh.id)?.pendingCreate).toBeUndefined();
  }, 40_000);

  it('mở project đã sửa trên máy khi offline (chưa vào hàng đợi) → phần thiếu được đẩy lên', async () => {
    const { projects } = projMod;
    const { sync } = syncMod;
    const { local } = await import('./local.service');
    const p = await projects.create({ name: 'Lệch', localDir: mkdtempSync(join(tmpdir(), 'umlab-diff-')) });
    // sửa thẳng bản local (như sửa ở máy này lúc tắt app khi đang offline)
    local.apply(p.id, edit('onlyLocal', '1'));
    const opened = await sync.openProject(p.id);
    const d = new Y.Doc();
    for (const u of opened.updates) Y.applyUpdate(d, u);
    expect(d.getMap('meta').get('onlyLocal')).toBe('1');
    await waitFor(() => db.database.current.pending === 0);
    const remote = new Y.Doc();
    for (const u of await sync.loadAll(p.id)) Y.applyUpdate(remote, u);
    expect(remote.getMap('meta').get('onlyLocal')).toBe('1');
    sync.close(p.id);
  });
});
