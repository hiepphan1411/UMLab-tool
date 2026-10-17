import { expect, test, type ElectronApplication, type Page } from '@playwright/test';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import JSZip from 'jszip';
import { launch, register, uniqueEmail } from './app';

const FIXTURE = join(__dirname, '../../../docs/reference/uc03-spec.umlab.json');

async function stubDialogs(app: ElectronApplication, open: string | null, save: string | null) {
  await app.evaluate(
    ({ dialog }, [o, s]) => {
      dialog.showOpenDialog = (async () => ({ canceled: !o, filePaths: o ? [o] : [] })) as typeof dialog.showOpenDialog;
      dialog.showSaveDialog = (async () => ({ canceled: !s, filePath: s ?? '' })) as typeof dialog.showSaveDialog;
    },
    [open, save] as const,
  );
}

const mainRows = (page: Page) =>
  page.getByRole('table', { name: 'Luồng sự kiện chính' }).locator('tbody tr[data-step]');
const waitFile = (p: string) =>
  expect.poll(() => (existsSync(p) ? readFileSync(p).length : 0), { timeout: 20_000 }).toBeGreaterThan(1000);

test('P07: đặc tả UC03 — nhập fixture, chèn bước cập nhật tham chiếu, xuất DOCX / Markdown', async () => {
  const { app, page } = await launch();
  await register(page, 'Đặc tả', uniqueEmail('p07'));
  await page
    .getByRole('button', { name: /Tạo project/ })
    .first()
    .click();
  await page.locator('#project-name').fill('Đặc tả');
  await page.locator('.modal').getByRole('button', { name: 'Tạo project', exact: true }).click();

  // tạo đặc tả trống → nhập fixture UC03
  await page.locator('[data-new-diagram="usecase-spec"]').click();
  await page.getByRole('button', { name: 'Tạo & mở' }).click();
  await expect(page.getByText('Đặc tả chưa gắn với use case.')).toBeVisible();
  await stubDialogs(app, FIXTURE, null);
  await page.getByRole('button', { name: 'Nhập JSON' }).click();
  await expect(page.locator('.spec-title h1')).toHaveText('Check-in xe vào bãi');
  await expect(page.locator('.spec-title-code')).toHaveText('UC03');
  await expect(mainRows(page)).toHaveCount(7);
  await expect(page.locator('[data-flow]')).toHaveCount(3);
  for (const code of ['A1', 'E1', 'E2']) await expect(page.locator('.spec-code', { hasText: code })).toBeVisible();
  await expect(page.getByLabel('A1 rẽ từ bước')).toHaveValue('4');
  await expect(page.getByLabel('Kết thúc A1')).toHaveValue('r5');
  await expect(page.getByLabel('Tên sơ đồ')).toHaveValue('Đặc tả UC03 Check-in xe vào bãi');
  await expect(page.getByRole('button', { name: 'Sinh Activity' })).toBeDisabled();
  await page.screenshot({ path: 'test-results/p07-spec.png' });

  // chèn bước giữa 3 và 4 → A1 "tại bước 5", "quay lại bước 6"
  await page.getByRole('button', { name: 'Thao tác bước 3' }).click();
  await page.getByRole('menuitem', { name: 'Chèn bước phía dưới' }).click();
  await expect(mainRows(page)).toHaveCount(8);
  const ta = mainRows(page).nth(3).getByLabel('Hành động');
  await expect(ta).toBeFocused();
  await ta.fill('Hiển thị biển số nhận dạng được.');
  await ta.press('Tab');
  await expect(page.getByLabel('A1 rẽ từ bước')).toHaveValue('5');
  await expect(page.getByLabel('Kết thúc A1')).toHaveValue('r6');
  await expect(page.getByLabel('E2 rẽ từ bước')).toHaveValue('6');
  await expect(page.getByLabel('E1 rẽ từ bước')).toHaveValue('2');

  // Enter cuối dòng 8 → bước 9, người thực hiện xen kẽ (sau Sinh viên là Hệ thống)
  const last = mainRows(page).nth(7).getByLabel('Hành động');
  await last.click();
  await last.press('End');
  await last.press('Enter');
  await expect(mainRows(page)).toHaveCount(9);
  await expect(mainRows(page).nth(8).getByLabel('Thực hiện bởi')).toHaveValue('system');
  await mainRows(page).nth(8).getByLabel('Hành động').fill('Ghi nhận giờ vào.');
  await mainRows(page).nth(8).getByLabel('Hành động').press('Tab');

  // kéo bước 2 xuống dưới bước 4 → E1 bám theo (tại bước 3)
  await mainRows(page).nth(1).locator('.spec-grip').dragTo(mainRows(page).nth(3));
  await expect(page.getByLabel('E1 rẽ từ bước')).toHaveValue('3');

  await page.locator('#sec-mainFlow').evaluate((el) => el.scrollIntoView());
  await page.screenshot({ path: 'test-results/p07-flows.png' });

  // xuất DOCX
  const dir = mkdtempSync(join(tmpdir(), 'umlab-p07-'));
  const docx = join(dir, 'uc03.docx');
  await stubDialogs(app, null, docx);
  await page.getByRole('button', { name: 'Xuất DOCX' }).click();
  await waitFile(docx);
  const xml = await (await JSZip.loadAsync(readFileSync(docx))).file('word/document.xml')!.async('string');
  expect(xml).toContain('Check-in xe vào bãi');
  expect(xml).toContain('Hiển thị biển số nhận dạng được.');
  expect(xml).toContain('Biển số không khớp (tại bước 5)');
  // xuất Markdown
  const md = join(dir, 'uc03.md');
  await stubDialogs(app, null, md);
  await page.getByRole('button', { name: 'Xuất Markdown' }).click();
  await waitFile(md);
  expect(readFileSync(md, 'utf8')).toContain('| 9 | Hệ thống | Ghi nhận giờ vào. |');

  // dashboard: chọn đặc tả → Xuất DOCX nhiều đặc tả
  await page.getByRole('button', { name: /^Về / }).first().click();
  await page.locator('[data-diagram="Đặc tả UC03 Check-in xe vào bãi"]').click();
  const many = join(dir, 'many.docx');
  await stubDialogs(app, null, many);
  await page
    .getByRole('toolbar', { name: 'Thao tác với sơ đồ đã chọn' })
    .getByRole('button', { name: 'Xuất DOCX' })
    .click();
  await waitFile(many);
  await app.close();
});
