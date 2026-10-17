import { expect, test, type ElectronApplication, type Page } from '@playwright/test';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { goto, launch, register, uniqueEmail } from './app';

async function stubSave(app: ElectronApplication, save: string) {
  await app.evaluate(({ dialog }, s) => {
    dialog.showSaveDialog = (async () => ({ canceled: false, filePath: s })) as typeof dialog.showSaveDialog;
  }, save);
}

const editor = (page: Page) => page.locator('textarea[aria-label="Sửa chữ"]');
const table = (page: Page, name: string) => page.locator('[data-shape="erd.entity"]', { hasText: name }).first();
const centerOf = async (page: Page, name: string) => {
  const b = (await table(page, name).boundingBox())!;
  return [b.x + b.width / 2, b.y + b.height / 2] as const;
};
async function drag(page: Page, a: readonly [number, number], b: readonly [number, number]) {
  await page.mouse.move(a[0], a[1]);
  await page.mouse.down();
  await page.mouse.move((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, { steps: 5 });
  await page.mouse.move(b[0], b[1], { steps: 5 });
  await page.mouse.up();
}
const route = (page: Page) => new URL(page.url()).hash.slice(1);

test('P09: Parse ORM UniPark+ → ERD, parse lại chỉ thêm 1 cột, xuất DDL, vẽ One-to-Many sinh FK, N-N → bảng trung gian', async () => {
  const { app, page } = await launch();
  await register(page, 'ERD', uniqueEmail('p09'));
  await page
    .getByRole('button', { name: /Tạo project/ })
    .first()
    .click();
  await page.locator('#project-name').fill('ERD');
  await page.locator('.modal').getByRole('button', { name: 'Tạo project', exact: true }).click();

  // Class Diagram mẫu UniPark+ → Parse ORM → ERD mới
  await page.locator('[data-new-diagram="class"]').click();
  await page.locator('[data-template="unipark"]').click();
  await page.getByRole('button', { name: 'Tạo & mở' }).click();
  await expect(page.locator('[data-shape="cls.class"]')).toHaveCount(9);
  const classRoute = route(page);
  await page.getByRole('button', { name: 'Parse ORM → ERD' }).click();
  const dlg = page.locator('.modal');
  await expect(dlg.getByLabel('Danh sách class').locator('input:checked')).toHaveCount(9);
  await dlg.getByRole('button', { name: 'Tiếp tục' }).click();
  await expect(dlg.getByLabel('ERD đích')).toHaveValue('new');
  await dlg.getByRole('button', { name: 'Tiếp tục' }).click();
  await expect(dlg.locator('[data-diff="add"]', { hasText: 'Bảng' })).toHaveCount(9);
  await page.screenshot({ path: 'test-results/p09-diff.png' });
  await dlg.getByRole('button', { name: 'Áp dụng' }).click();
  await expect(page).toHaveURL(/\/d\/dg_/);
  await expect(page.locator('[data-shape="erd.entity"]')).toHaveCount(9);
  await expect(page.locator('[data-conn]')).toHaveCount(9);
  await expect(table(page, 'gio_vao')).toContainText('xe_id');
  await expect(table(page, 'bien_so')).toContainText('chu_xe_id');
  const erdRoute = route(page);
  await page.getByTestId('canvas').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Shift+!');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/p09-orm.png' });
  const before = (await table(page, 'gio_vao').boundingBox())!;

  // sửa class Xe: thêm 1 thuộc tính → parse lại (ERD đã liên kết) chỉ thêm 1 cột
  await goto(page, classRoute);
  const xeClass = page.locator('[data-shape="cls.class"]', { hasText: 'bienSo' }).first();
  await xeClass.click({ position: { x: 30, y: 12 } });
  await page.keyboard.press('Alt+Shift+A');
  await expect(editor(page)).toBeFocused();
  await page.keyboard.type('- soKhung : String [0..1]');
  await page.keyboard.press('Control+Enter');
  await expect(xeClass).toContainText('soKhung');
  await page.getByRole('button', { name: 'Parse ORM → ERD' }).click();
  await dlg.getByRole('button', { name: 'Tiếp tục' }).click();
  await expect(dlg.getByLabel('ERD đích')).not.toHaveValue('new');
  await dlg.getByRole('button', { name: 'Tiếp tục' }).click();
  await expect(dlg.locator('[data-diff]')).toHaveCount(1);
  await expect(dlg.locator('[data-diff="add"]')).toContainText('so_khung');
  await dlg.getByRole('button', { name: 'Áp dụng' }).click();
  await expect(page).toHaveURL(new RegExp(erdRoute.replace(/[/]/g, '\\/') + '$'));
  await expect(page.locator('[data-shape="erd.entity"]')).toHaveCount(9);
  await expect(table(page, 'bien_so')).toContainText('so_khung');
  const after = (await table(page, 'gio_vao').boundingBox())!;
  expect(Math.abs(after.x - before.x) + Math.abs(after.y - before.y)).toBeLessThan(2);

  // xuất SQL DDL: xem trước có highlight, đổi dialect, tải .sql
  await page.getByRole('button', { name: 'Xuất SQL' }).click();
  const pre = page.getByTestId('ddl-preview');
  await expect(pre).toContainText('CREATE TABLE "user"');
  await expect(pre).toContainText('ALTER TABLE phien_gui_xe ADD CONSTRAINT');
  await expect(pre.locator('.sql-kw').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/p09-ddl.png' });
  await page.locator('.modal').getByRole('radio', { name: 'MySQL' }).click();
  await expect(pre).toContainText('CREATE TABLE `user`');
  const dir = mkdtempSync(join(tmpdir(), 'umlab-p09-'));
  const sqlFile = join(dir, 'erd.sql');
  await stubSave(app, sqlFile);
  await page.locator('.modal').getByRole('button', { name: 'Tải .sql' }).click();
  await expect.poll(() => (existsSync(sqlFile) ? readFileSync(sqlFile, 'utf8').length : 0)).toBeGreaterThan(500);
  expect(readFileSync(sqlFile, 'utf8')).toContain('AUTO_INCREMENT');
  await page.locator('.modal').getByRole('button', { name: 'Đóng', exact: true }).last().click();

  // ERD trống: vẽ xe, phien_gui_xe; One-to-Many xe → phien_gui_xe sinh phien_gui_xe.xe_id có icon FK
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Delete');
  await expect(page.locator('[data-shape="erd.entity"]')).toHaveCount(0);
  const c = (await page.getByTestId('canvas').boundingBox())!;
  const place = async (x: number, y: number, name: string, cols: string) => {
    await page.locator('[data-tool="erd.entity"]').click();
    await page.mouse.click(c.x + x, c.y + y);
    await expect(editor(page)).toBeVisible();
    await editor(page).fill(name);
    await editor(page).press('Enter');
    await page.keyboard.press('Alt+Shift+C');
    await expect(editor(page)).toBeFocused();
    await page.keyboard.press('Control+a');
    await page.keyboard.type(cols);
    await page.keyboard.press('Control+Enter');
  };
  await place(200, 200, 'xe', 'id bigint pk ai\nbien_so varchar(20) unique not null');
  await expect(table(page, 'bien_so')).toContainText('VARCHAR(20)');
  await place(620, 200, 'phien_gui_xe', 'id bigint pk ai\ngio_vao timestamptz not null');
  await page.locator('[data-tool="erd.rel1n"]').click();
  await drag(page, await centerOf(page, 'bien_so'), await centerOf(page, 'gio_vao'));
  await expect(page.locator('[data-conn]')).toHaveCount(1);
  const child = table(page, 'gio_vao');
  await expect(child).toContainText('xe_id');
  await expect(child.locator('circle[stroke="#4F79A8"]')).toHaveCount(1); // icon khoá FK
  // Inspector quan hệ: 4 nút cardinality mỗi đầu, ON DELETE
  const right = page.locator('.editor-right');
  await expect(right.getByRole('radiogroup', { name: /Đầu con/ }).getByRole('radio')).toHaveCount(4);
  await right.getByLabel('ON DELETE').selectOption('CASCADE');

  // Many-to-Many → Tạo bảng trung gian
  await place(200, 520, 'goi_thang', 'id uuid pk');
  await page.locator('[data-tool="erd.relnn"]').click();
  await drag(page, await centerOf(page, 'UUID'), await centerOf(page, 'bien_so'));
  await page.locator('.modal').getByRole('button', { name: 'Tạo bảng trung gian' }).click();
  await expect(table(page, 'goi_thang_xe')).toContainText('goi_thang_id');
  await expect(table(page, 'goi_thang_xe')).toContainText('xe_id');
  await expect(page.locator('[data-conn]')).toHaveCount(3);
  await page.getByTestId('canvas').click({ position: { x: 5, y: 5 } });
  await page.screenshot({ path: 'test-results/p09-drawn.png' });
  await app.close();
});
