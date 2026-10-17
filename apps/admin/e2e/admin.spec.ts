import { expect, test } from '@playwright/test';
import { Binary, MongoClient } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { hashPassword } from '../../../scripts/reset-password.mjs';
import { loadConfig } from '../src/server/config';
import { start, type Started } from '../src/server/server';

let mongo: MongoMemoryServer;
let client: MongoClient;
let app: Started;

test.beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  client = new MongoClient(mongo.getUri());
  await client.connect();
  const db = client.db('umlab_admin_e2e');
  const now = Date.now();
  await db.collection('users').insertOne({
    _id: 'u_an' as never,
    email: 'an@umlab.vn',
    name: 'Nguyễn An',
    passwordHash: await hashPassword('Matkhau123'),
    tokenVersion: 0,
    color: '#2E62E6',
    createdAt: new Date(now - 5 * 86_400_000),
  });
  await db.collection('projects').insertOne({
    _id: 'p_1' as never,
    ownerId: 'u_an',
    name: 'UniPark+',
    members: [{ userId: 'u_an', role: 'owner' }],
    memberIds: ['u_an'],
    stats: {
      diagramCount: 6,
      diagramCountByType: { usecase: 1, 'usecase-spec': 1, activity: 1, sequence: 1, class: 1, erd: 1 },
    },
    createdAt: new Date(now - 4 * 86_400_000),
    updatedAt: new Date(now - 3600_000),
  });
  await db.collection('project_updates').insertMany(
    [0, 1, 2, 30].map((h) => ({
      projectId: 'p_1',
      kind: 'u',
      data: new Binary(Buffer.from([0, 0])),
      clientId: 'c',
      userId: 'u_an',
      createdAt: new Date(now - h * 3600_000),
    })),
  );
  const cfg = loadConfig({ UMLAB_ADMIN_PASSWORD: 'QuanTri123', UMLAB_ADMIN_PORT: '0' } as NodeJS.ProcessEnv);
  app = await start({ ...cfg, port: 0 }, { prod: true, db });
});

test.afterAll(async () => {
  await app?.close();
  await client?.close();
  await mongo?.stop();
});

test('Quản trị: đăng nhập → tổng quan (tài khoản, sơ đồ) → tạo tài khoản → xem lịch sử tài khoản', async ({ page }) => {
  await page.goto(app.url);
  await page.getByLabel('Email quản trị (hoặc “admin”)').fill('admin');
  await page.getByLabel('Mật khẩu').fill('sai-mat-khau');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page.getByText(/Sai tài khoản hoặc mật khẩu/)).toBeVisible();
  await page.getByLabel('Mật khẩu').fill('QuanTri123');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();

  // tổng quan
  await expect(page.getByRole('heading', { name: 'Tổng quan' })).toBeVisible();
  await expect(page.locator('[data-stat="Tài khoản"] .stat-value')).toHaveText('1');
  await expect(page.locator('[data-stat="Project"] .stat-value')).toHaveText('1');
  await expect(page.locator('[data-stat="Sơ đồ"] .stat-value')).toHaveText('6');
  await expect(page.getByRole('img', { name: 'Sơ đồ theo loại' })).toBeVisible();
  await page.locator('[data-bar="activity"]').hover();
  await expect(page.locator('.chart-tip')).toContainText('Activity');
  await page.screenshot({ path: 'test-results/admin-overview.png' });

  // tạo tài khoản
  await page.getByRole('link', { name: 'Tài khoản' }).click();
  await expect(page.getByRole('table', { name: 'Danh sách tài khoản' })).toContainText('an@umlab.vn');
  await page.getByRole('button', { name: 'Tạo tài khoản' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByLabel('Họ tên').fill('Trần Bình');
  await dlg.getByLabel('Email', { exact: true }).fill('binh@umlab.vn');
  await dlg.getByRole('button', { name: 'Tạo tài khoản' }).click();
  await expect(dlg.getByTestId('temp-password')).toHaveText(/^[A-Za-z0-9]{12}$/);
  await dlg.getByRole('button', { name: 'Xong' }).click();
  await expect(page.locator('tr[data-user="binh@umlab.vn"]')).toBeVisible();
  await page.getByLabel('Tìm tài khoản').fill('nguyen');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByLabel('Tìm tài khoản').fill('');
  await page.screenshot({ path: 'test-results/admin-users.png' });

  // lịch sử tài khoản
  await page.locator('tr[data-user="an@umlab.vn"]').click();
  await expect(page.getByRole('heading', { name: /Nguyễn An/ })).toBeVisible();
  const history = page.getByRole('list', { name: 'Lịch sử tài khoản' });
  await expect(history).toContainText('Chỉnh sửa “UniPark+” — 3 thay đổi');
  await expect(history).toContainText('Tài khoản được tạo');
  page.once('dialog', (d) => void d.accept());
  await page.getByRole('button', { name: 'Đặt lại mật khẩu' }).click();
  await expect(page.getByTestId('temp-password')).toBeVisible();
  await expect(history).toContainText('Mật khẩu được đặt lại (bởi admin)');
  await page.screenshot({ path: 'test-results/admin-user.png' });

  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Đăng nhập' })).toBeVisible();
});
