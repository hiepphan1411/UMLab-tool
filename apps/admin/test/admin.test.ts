import { createServer, type Server } from 'node:http';
import { argon2Verify } from 'hash-wasm';
import { Binary, MongoClient, type Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hashPassword } from '../../../scripts/reset-password.mjs';
import { createApi } from '../src/server/app';
import { loadConfig } from '../src/server/config';
import type { Overview, UserDetail, UserRow } from '../src/server/types';

let mongo: MongoMemoryServer;
let client: MongoClient;
let db: Db;
let server: Server;
let base = '';
let cookie = '';

const cfg = loadConfig({
  UMLAB_ADMIN_PASSWORD: 'QuanTri123',
  UMLAB_ADMIN_EMAILS: 'boss@umlab.vn',
  UMLAB_ADMIN_SECRET: 'test-secret',
} as NodeJS.ProcessEnv);

async function call<T>(method: string, path: string, body?: unknown, o: { csrf?: boolean; auth?: boolean } = {}) {
  const r = await fetch(base + path, {
    method,
    headers: {
      ...(method === 'POST' && o.csrf !== false ? { 'X-UMLab-Admin': '1', 'Content-Type': 'application/json' } : {}),
      ...(o.auth !== false && cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const set = r.headers.get('set-cookie');
  return { status: r.status, data: (await r.json()) as T & { error?: string }, set };
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  client = new MongoClient(mongo.getUri());
  await client.connect();
  db = client.db('umlab_admin_test');
  const now = Date.now();
  const day = 86_400_000;
  await db.collection('users').insertMany([
    {
      _id: 'u_an' as never,
      email: 'an@umlab.vn',
      name: 'Nguyễn An',
      passwordHash: await hashPassword('Matkhau123'),
      tokenVersion: 0,
      color: '#2E62E6',
      createdAt: new Date(now - 40 * day),
    },
    {
      _id: 'u_boss' as never,
      email: 'boss@umlab.vn',
      name: 'Sếp',
      passwordHash: await hashPassword('SepSep123'),
      tokenVersion: 0,
      color: '#1F9D66',
      createdAt: new Date(now - 2 * day),
    },
  ]);
  await db.collection('projects').insertMany([
    {
      _id: 'p_1' as never,
      ownerId: 'u_an',
      name: 'UniPark+',
      members: [
        { userId: 'u_an', role: 'owner' },
        { userId: 'u_boss', role: 'viewer' },
      ],
      memberIds: ['u_an', 'u_boss'],
      stats: { diagramCount: 5, diagramCountByType: { usecase: 2, class: 2, erd: 1 } },
      createdAt: new Date(now - 30 * day),
      updatedAt: new Date(now - day),
    },
    {
      _id: 'p_2' as never,
      ownerId: 'u_an',
      name: 'Thư viện',
      members: [{ userId: 'u_an', role: 'owner' }],
      memberIds: ['u_an'],
      stats: { diagramCount: 2, diagramCountByType: { usecase: 1, sequence: 1 } },
      createdAt: new Date(now - 10 * day),
      updatedAt: new Date(now - 3 * day),
    },
  ]);
  const upd = (projectId: string, userId: string, ago: number) => ({
    projectId,
    kind: 'u',
    data: new Binary(Buffer.from([0, 0])),
    clientId: 'c',
    userId,
    createdAt: new Date(now - ago),
  });
  await db
    .collection('project_updates')
    .insertMany([
      upd('p_1', 'u_an', 60_000),
      upd('p_1', 'u_an', 120_000),
      upd('p_2', 'u_an', 2 * day),
      upd('p_1', 'u_boss', 20 * day),
    ]);
  await db
    .collection('presence')
    .insertOne({ _id: 'pr1' as never, projectId: 'p_1', userId: 'u_an', updatedAt: new Date() });
  await db
    .collection('audit_log')
    .insertOne({ _id: 'al_1' as never, userId: 'u_an', kind: 'login', meta: {}, at: new Date(now - 3600_000) });
  const api = createApi(db, cfg);
  server = createServer((req, res) => {
    void api(req, res).then((handled) => {
      if (!handled) res.writeHead(404).end();
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const a = server.address();
  base = `http://127.0.0.1:${typeof a === 'object' && a ? a.port : 0}`;
});

afterAll(async () => {
  server?.close();
  await client?.close();
  await mongo?.stop();
});

describe('trang quản trị — đăng nhập', () => {
  it('chưa đăng nhập bị chặn; POST thiếu header bị chặn (CSRF); sai mật khẩu 401; đúng → cookie HttpOnly', async () => {
    expect((await call('GET', '/api/session')).data).toEqual({ user: null, configured: true });
    expect((await call('GET', '/api/overview')).status).toBe(401);
    expect((await call('POST', '/api/login', { email: 'admin', password: 'QuanTri123' }, { csrf: false })).status).toBe(
      403,
    );
    expect((await call('POST', '/api/login', { email: 'admin', password: 'sai' })).status).toBe(401);
    // tài khoản UMLab không nằm trong UMLAB_ADMIN_EMAILS không vào được dù đúng mật khẩu
    expect((await call('POST', '/api/login', { email: 'an@umlab.vn', password: 'Matkhau123' })).status).toBe(401);
    const ok = await call<{ user: string }>('POST', '/api/login', { email: 'boss@umlab.vn', password: 'SepSep123' });
    expect(ok.status).toBe(200);
    expect(ok.data.user).toBe('boss@umlab.vn');
    expect(ok.set).toMatch(/HttpOnly/);
    expect(ok.set).toMatch(/SameSite=Strict/);
    cookie = ok.set!.split(';')[0];
    expect((await call<{ user: string }>('GET', '/api/session')).data.user).toBe('boss@umlab.vn');
    // không gửi cookie → không vào được
    expect((await call('GET', '/api/overview', undefined, { auth: false })).status).toBe(401);
  });
});

describe('trang quản trị — số liệu & tài khoản', () => {
  it('tổng quan: số tài khoản, project, sơ đồ theo loại, hoạt động 14 ngày, online', async () => {
    const r = await call<Overview>('GET', '/api/overview');
    expect(r.status).toBe(200);
    expect(r.data).toMatchObject({
      users: 2,
      projects: 2,
      diagrams: 7,
      diagramsByType: { usecase: 3, class: 2, erd: 1, sequence: 1 },
      activeUsers7d: 1,
      online: 1,
      newUsers30d: 1,
    });
    expect(r.data.activity).toHaveLength(14);
    expect(r.data.activity[13].edits).toBe(2);
    expect(r.data.activity.reduce((s, d) => s + d.edits, 0)).toBe(3);
  });

  it('danh sách + tìm; tạo tài khoản (mật khẩu tạm, chặn trùng); xem lịch sử; đặt lại mật khẩu; đăng xuất mọi nơi', async () => {
    const list = await call<UserRow[]>('GET', '/api/users');
    expect(list.data.map((u) => u.email)).toEqual(['boss@umlab.vn', 'an@umlab.vn']);
    expect(list.data.find((u) => u.email === 'an@umlab.vn')).toMatchObject({ projects: 2 });
    expect((await call<UserRow[]>('GET', '/api/users?q=nguy')).data.map((u) => u.id)).toEqual(['u_an']);

    expect((await call('POST', '/api/users', { name: 'X', email: 'x@y.vn' })).status).toBe(400);
    expect((await call('POST', '/api/users', { name: 'Bình', email: 'binh@umlab', password: '' })).status).toBe(400);
    expect((await call('POST', '/api/users', { name: 'Bình', email: 'b@u.vn', password: 'ngan' })).status).toBe(400);
    const created = await call<{ user: UserRow; tempPassword?: string }>('POST', '/api/users', {
      name: 'Trần Bình',
      email: 'Binh@UMLab.vn',
    });
    expect(created.status).toBe(201);
    expect(created.data.user.email).toBe('binh@umlab.vn');
    const tmp = created.data.tempPassword!;
    const doc = await db.collection('users').findOne({ email: 'binh@umlab.vn' });
    expect(await argon2Verify({ password: tmp, hash: doc!.passwordHash as string })).toBe(true);
    expect((await call('POST', '/api/users', { name: 'Trần Bình', email: 'binh@umlab.vn' })).status).toBe(409);

    const an = await call<UserDetail>('GET', '/api/users/u_an');
    expect(an.data.projects.map((p) => [p.name, p.role])).toEqual([
      ['UniPark+', 'owner'],
      ['Thư viện', 'owner'],
    ]);
    const texts = an.data.history.map((h) => h.text);
    expect(texts[0]).toMatch(/^Chỉnh sửa “UniPark\+” — 2 thay đổi/);
    expect(texts).toContain('Đăng nhập');
    expect(texts.at(-1)).toBe('Tài khoản được tạo');

    const reset = await call<{ tempPassword: string }>('POST', `/api/users/${created.data.user.id}/reset-password`);
    const after = await db.collection('users').findOne({ email: 'binh@umlab.vn' });
    expect(after!.tokenVersion).toBe(1);
    expect(await argon2Verify({ password: reset.data.tempPassword, hash: after!.passwordHash as string })).toBe(true);
    await call('POST', `/api/users/${created.data.user.id}/logout-all`);
    expect((await db.collection('users').findOne({ email: 'binh@umlab.vn' }))!.tokenVersion).toBe(2);
    const binh = await call<UserDetail>('GET', `/api/users/${created.data.user.id}`);
    expect(binh.data.history.map((h) => h.text)).toEqual(
      expect.arrayContaining([
        'Được tạo bởi quản trị (boss@umlab.vn)',
        'Mật khẩu được đặt lại (bởi boss@umlab.vn)',
        'Đăng xuất mọi thiết bị (bởi boss@umlab.vn)',
      ]),
    );
    expect((await call('GET', '/api/users/u_khongco')).status).toBe(404);
  });
});
