import { expect, test, type ElectronApplication } from '@playwright/test';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { goto, launch, register, uniqueEmail } from './app';

const FIXTURE = join(__dirname, '../../../docs/reference/unipark-plus.json');

/** Thay hộp thoại mở/lưu tệp của main process bằng đường dẫn cho trước. */
async function stubDialogs(app: ElectronApplication, open: string | null, save: string | null) {
  await app.evaluate(
    ({ dialog }, [o, s]) => {
      dialog.showOpenDialog = (async () => ({ canceled: !o, filePaths: o ? [o] : [] })) as typeof dialog.showOpenDialog;
      dialog.showSaveDialog = (async () => ({ canceled: !s, filePath: s ?? '' })) as typeof dialog.showSaveDialog;
    },
    [open, save] as const,
  );
}

test('P02: trạng thái trống → tạo → đổi tên → nhân bản → xoá', async () => {
  const { app, page } = await launch();
  await register(page, 'Chủ Project', uniqueEmail('p02'));
  await expect(page.getByText('Chưa có project nào')).toBeVisible();

  await page.getByRole('button', { name: 'Tạo project đầu tiên' }).click();
  await page.locator('#project-name').fill('Hệ thống thư viện');
  await page.locator('.modal').getByRole('button', { name: 'Tạo project', exact: true }).click();
  await expect(page).toHaveURL(/#\/p\/p_/);

  await goto(page, '/projects');
  const card = page.locator('[data-project="Hệ thống thư viện"]');
  await expect(card).toBeVisible();

  // Đổi tên
  await card.click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Đổi tên' }).click();
  await page.locator('.modal input').fill('Thư viện số');
  await page.getByRole('button', { name: 'Lưu' }).click();
  await expect(page.locator('[data-project="Thư viện số"]')).toBeVisible();

  // Nhân bản
  await page.locator('[data-project="Thư viện số"]').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Nhân bản' }).click();
  await expect(page.locator('[data-project="Thư viện số (bản sao)"]')).toBeVisible();

  // Xoá (gõ lại tên)
  await page.locator('[data-project="Thư viện số (bản sao)"]').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Xoá' }).click();
  await page.locator('.modal input').fill('Thư viện số (bản sao)');
  await page.getByRole('button', { name: 'Xoá vĩnh viễn' }).click();
  await expect(page.locator('[data-project="Thư viện số (bản sao)"]')).toHaveCount(0);
  await expect(page.locator('[data-project="Thư viện số"]')).toBeVisible();
  await app.close();
});

test('P02: nhập unipark-plus.json cũ → 1 kiến trúc + 2 Gantt; xuất rồi nhập lại giống hệt', async () => {
  const { app, page } = await launch();
  await register(page, 'Nhập Tệp', uniqueEmail('p02i'));
  await stubDialogs(app, FIXTURE, null);
  await page.getByRole('button', { name: 'Nhập project' }).click();
  await expect(page).toHaveURL(/#\/p\/p_/);
  await goto(page, '/projects');
  const card = page.locator('[data-project="UniPark+"]');
  await expect(card).toBeVisible();
  await expect(card.locator('.pill')).toHaveText(['1', '2']);

  const out = join(mkdtempSync(join(tmpdir(), 'umlab-e2e-')), 'unipark.umlab-project.json');
  await stubDialogs(app, null, out);
  await card.click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Xuất JSON' }).click();
  await expect(page.getByText(/Đã lưu unipark\.umlab-project\.json/)).toBeVisible();
  const exported = JSON.parse(readFileSync(out, 'utf8'));
  expect(exported.format).toBe('umlab');
  expect(exported.kind).toBe('project');
  expect(exported.diagrams.map((d: { type: string }) => d.type).sort()).toEqual(['architecture', 'gantt', 'gantt']);

  await stubDialogs(app, out, null);
  await page.getByRole('button', { name: 'Nhập project' }).click();
  await expect(page).toHaveURL(/#\/p\/p_/);
  await goto(page, '/projects');
  await expect(page.locator('[data-project="UniPark+"]')).toHaveCount(2);
  await page.screenshot({ path: 'test-results/p02-projects.png' });
  await app.close();
});
