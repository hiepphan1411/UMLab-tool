import { expect, test, type ElectronApplication, type Page } from '@playwright/test';
import { join } from 'node:path';
import { launch, register, uniqueEmail } from './app';

const FIXTURE = join(__dirname, '../../../docs/reference/unipark-plus.json');

async function stubDialogs(app: ElectronApplication, open: string | null, save: string | null) {
  await app.evaluate(
    ({ dialog }, [o, s]) => {
      dialog.showOpenDialog = (async () => ({ canceled: !o, filePaths: o ? [o] : [] })) as typeof dialog.showOpenDialog;
      dialog.showSaveDialog = (async () => ({ canceled: !s, filePath: s ?? '' })) as typeof dialog.showSaveDialog;
    },
    [open, save] as const,
  );
}

const rows = (page: Page) => page.locator('.g-left [data-gr]');
const aside = (page: Page) => page.locator('.gantt-grid aside');

test('P05: Gantt — kéo thanh, cập nhật % qua popover, checklist, dán Excel, undo', async () => {
  const { app, page } = await launch();
  await register(page, 'Gantt', uniqueEmail('p05g'));
  await stubDialogs(app, FIXTURE, null);
  await page.getByRole('button', { name: 'Nhập project' }).click();
  await expect(page).toHaveURL(/#\/p\/p_/);
  await page.locator('[data-diagram="Tiến độ theo sprint"]').dblclick();
  await expect(page.getByTestId('gantt')).toBeVisible();
  const n = await rows(page).count();
  expect(n).toBeGreaterThan(5);
  await page.screenshot({ path: 'test-results/p05-gantt.png' });

  // bấm thanh → tooltip chi tiết, Inspector hiện giai đoạn
  const first = rows(page).first();
  await first.click({ position: { x: 150, y: 20 } });
  await expect(page.locator('[data-gtip]')).toBeVisible();
  const start0 = await aside(page).getByLabel('Bắt đầu', { exact: true }).inputValue();

  // kéo thân thanh sang phải ~ 2 tuần (ở thang Tuần 17px/ngày)
  const id = await first.getAttribute('data-gr');
  await page.getByTestId('gantt').evaluate((el) => (el.scrollLeft = 0));
  const bar = page.locator(`[data-gt="${id}"] [data-gh="move"]`);
  const b = (await bar.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + 60, b.y + b.height / 2, { steps: 4 });
  await page.mouse.move(b.x + b.width / 2 + 119, b.y + b.height / 2, { steps: 4 });
  await page.mouse.up();
  await expect.poll(() => aside(page).getByLabel('Bắt đầu', { exact: true }).inputValue()).not.toBe(start0);
  const d = (s: string) => Date.parse(s) / 86400000;
  expect(d(await aside(page).getByLabel('Bắt đầu', { exact: true }).inputValue()) - d(start0)).toBe(7);

  // undo trả lại ngày cũ
  await page.getByRole('button', { name: 'Hoàn tác' }).click();
  await expect.poll(() => aside(page).getByLabel('Bắt đầu', { exact: true }).inputValue()).toBe(start0);

  // popover tiến độ: bấm ô Tiến độ → 50%
  await page.locator(`[data-gprog="${id}"]`).click();
  const pop = page.locator('[data-gpop]');
  await expect(pop).toBeVisible();
  await pop.getByRole('button', { name: '50%' }).click();
  await expect(pop.locator('.gp-big')).toContainText('50');
  await page.keyboard.press('Escape');

  // checklist: thêm 2 hạng mục → tự tính %; tích 1 → 50%
  await first.click({ position: { x: 150, y: 20 } });
  const add = aside(page).getByLabel('Hạng mục mới');
  await add.fill('Đăng nhập');
  await add.press('Enter');
  await add.fill('Quên mật khẩu OTP');
  await add.press('Enter');
  await expect(aside(page).getByLabel('Tiến độ (%)')).toHaveValue('0');
  await aside(page).getByLabel('Đã xong').first().check();
  await expect(aside(page).getByLabel('Tiến độ (%)')).toHaveValue('50');
  await expect(first).toContainText('1/2 hạng');

  // dán bảng Excel → thêm vào cuối
  await page.getByRole('button', { name: 'Dán từ Excel' }).click();
  await page
    .getByLabel('Bảng dán từ Excel')
    .fill(
      'Sprint\tTên giai đoạn\tNgày bắt đầu\tNgày kết thúc\tTiến độ\nSprint X\tKiểm thử\t11/02/2026\t11/20/2026\t30%\nSprint Y\tTriển khai\t11/21/2026\t12/05/2026\t0%',
    );
  await expect(page.locator('[data-paste-preview]')).toContainText('Nhận được 2 dòng');
  await page.getByRole('radio', { name: 'Thêm vào cuối' }).click();
  await page.getByRole('button', { name: 'Nhập vào Gantt' }).click();
  await expect(rows(page)).toHaveCount(n + 2);
  await expect(rows(page).last()).toContainText('Triển khai');

  // thêm sprint mới, đổi thang Ngày / Tháng
  await page.getByRole('button', { name: 'Thêm sprint' }).click();
  await expect(rows(page)).toHaveCount(n + 3);
  await page.getByRole('radio', { name: 'Tháng' }).first().click();
  await page.getByRole('radio', { name: 'Ngày' }).first().click();
  await page.getByRole('radio', { name: 'Tuần' }).first().click();
  await page.screenshot({ path: 'test-results/p05-gantt-after.png' });

  await app.close();
});
