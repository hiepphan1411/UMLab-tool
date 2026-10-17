import { expect, test, type ElectronApplication, type Page } from '@playwright/test';
import { join } from 'node:path';
import { launch, register, uniqueEmail } from './app';

const FIXTURE = join(__dirname, '../../../docs/reference/uc03-spec.umlab.json');
const editor = (page: Page) => page.locator('textarea[aria-label="Sửa chữ"]');
const shapes = (page: Page, s: string) => page.locator(`[data-shape="${s}"]`);

async function stubOpen(app: ElectronApplication, file: string) {
  await app.evaluate(({ dialog }, f) => {
    dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [f] })) as typeof dialog.showOpenDialog;
  }, file);
}
async function drag(page: Page, a: readonly [number, number], b: readonly [number, number]) {
  await page.mouse.move(a[0], a[1]);
  await page.mouse.down();
  await page.mouse.move((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, { steps: 5 });
  await page.mouse.move(b[0], b[1], { steps: 5 });
  await page.mouse.up();
}
const center = async (page: Page, sel: string, nth = 0) => {
  const b = (await page.locator(sel).nth(nth).boundingBox())!;
  return [b.x + b.width / 2, b.y + b.height / 2] as const;
};

test('P10: sinh Activity từ UC03, sinh lại khi đặc tả đổi + Undo, pin bám viền, chặn luồng ra khỏi Final', async () => {
  const { app, page } = await launch();
  await register(page, 'Activity', uniqueEmail('p10'));
  await page
    .getByRole('button', { name: /Tạo project/ })
    .first()
    .click();
  await page.locator('#project-name').fill('Activity');
  await page.locator('.modal').getByRole('button', { name: 'Tạo project', exact: true }).click();

  // đặc tả UC03 → Sinh Activity
  await page.locator('[data-new-diagram="usecase-spec"]').click();
  await page.getByRole('button', { name: 'Tạo & mở' }).click();
  await stubOpen(app, FIXTURE);
  await page.getByRole('button', { name: 'Nhập JSON' }).click();
  await expect(page.locator('.spec-title-code')).toHaveText('UC03');
  await page.getByRole('button', { name: 'Sinh Activity' }).click();
  await expect(shapes(page, 'act.swimlaneV')).toHaveCount(1);
  const lanes = shapes(page, 'act.swimlaneV');
  for (const n of ['Sinh viên', 'Bảo vệ', 'Hệ thống']) await expect(lanes).toContainText(n);
  await expect(shapes(page, 'act.decision')).toHaveCount(3);
  await expect(shapes(page, 'act.merge')).toHaveCount(1);
  await expect(shapes(page, 'act.flowFinal')).toHaveCount(2);
  await expect(shapes(page, 'act.final')).toHaveCount(1);
  await expect(shapes(page, 'act.initial')).toHaveCount(1);
  const actions = await shapes(page, 'act.action').count();
  await expect(page.getByTestId('gen-banner')).toContainText('phiên bản');
  await page.getByTestId('canvas').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Shift+!');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/p10-generated.png' });

  // chọn action → "Xem bước trong đặc tả" → sửa đặc tả (thêm bước) → quay lại: banner báo thay đổi
  await shapes(page, 'act.action').first().click();
  await page.getByRole('button', { name: 'Xem bước trong đặc tả' }).click();
  await expect(page.locator('.spec-title-code')).toHaveText('UC03');
  await page.getByRole('button', { name: 'Thao tác bước 7' }).click();
  await page.getByRole('menuitem', { name: 'Chèn bước phía dưới' }).click();
  const rows = page.getByRole('table', { name: 'Luồng sự kiện chính' }).locator('tbody tr[data-step]');
  await rows.nth(7).getByLabel('Hành động').fill('Lưu nhật ký vào bãi.');
  await rows.nth(7).getByLabel('Hành động').press('Tab');
  await page.getByRole('button', { name: 'Mở Activity' }).click();
  await page.getByRole('menuitem', { name: /^Mở “Activity/ }).click();
  await expect(page.getByTestId('gen-banner')).toContainText('Đặc tả đã thay đổi');
  await page.getByTestId('gen-banner').getByRole('button', { name: 'Sinh lại' }).click();
  await page.locator('.modal').getByRole('button', { name: 'Ghi đè' }).click();
  await expect(shapes(page, 'act.action')).toHaveCount(actions + 1);
  await expect(page.getByTestId('gen-banner')).not.toContainText('Đặc tả đã thay đổi');
  await page.getByTestId('canvas').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Control+z');
  await expect(shapes(page, 'act.action')).toHaveCount(actions);
  await page.keyboard.press('Control+y');
  await expect(shapes(page, 'act.action')).toHaveCount(actions + 1);

  // sơ đồ mới: Action + Output Pin, kéo pin vòng quanh luôn dính viền
  await page.getByRole('button', { name: /^Về / }).click();
  await page.locator('[data-new-diagram="activity"]').click();
  await page.getByRole('button', { name: 'Tạo & mở' }).click();
  const c = (await page.getByTestId('canvas').boundingBox())!;
  await page.locator('[data-tool="act.action"]').click({ position: { x: 20, y: 12 } });
  await page.mouse.click(c.x + 300, c.y + 220);
  await expect(editor(page)).toBeVisible();
  await editor(page).fill('Tính phí');
  await editor(page).press('Enter');
  await page.getByTestId('canvas').click({ position: { x: 5, y: 5 } }); // bỏ chọn → không trúng tay nắm resize
  const ab = (await shapes(page, 'act.action').first().boundingBox())!;
  await page.locator('[data-tool="act.inputPin"] .pal-flyout').click();
  await page.getByRole('menuitem', { name: 'Output Pin' }).click();
  await page.mouse.click(ab.x + ab.width - 3, ab.y + ab.height * 0.3);
  const pin = shapes(page, 'act.outputPin').first();
  await expect(pin).toHaveCount(1);
  await expect(editor(page)).toBeVisible(); // đặt pin → sửa tên ngay
  await editor(page).press('Enter');
  // so trong toạ độ sơ đồ (getBBox, không tính nét vẽ / zoom)
  const onBorder = () =>
    page.evaluate(() => {
      const p = (document.querySelector('[data-shape="act.outputPin"] rect') as SVGGraphicsElement).getBBox();
      const a = (document.querySelector('[data-shape="act.action"] path') as SVGGraphicsElement).getBBox();
      const cx = p.x + p.width / 2;
      const cy = p.y + p.height / 2;
      return (
        Math.min(Math.abs(cx - a.x), Math.abs(cx - a.x - a.width), Math.abs(cy - a.y), Math.abs(cy - a.y - a.height)) <
        0.5
      );
    });
  expect(await onBorder()).toBe(true);
  for (const [dx, dy] of [
    [-40, -60],
    [-200, 10],
    [-60, 70],
  ] as const) {
    const from = await center(page, '[data-shape="act.outputPin"] rect');
    await drag(page, from, [from[0] + dx, from[1] + dy]);
    expect(await onBorder()).toBe(true);
  }
  await page.screenshot({ path: 'test-results/p10-pin.png' });

  // Control Flow từ Activity Final ra ngoài bị chặn
  await page.locator('[data-tool="act.final"]').click({ position: { x: 20, y: 12 } });
  await page.mouse.click(c.x + 650, c.y + 220);
  await expect(shapes(page, 'act.final')).toHaveCount(1);
  await page.locator('[data-tool="act.controlFlow"]').click();
  await drag(page, await center(page, '[data-shape="act.final"]'), await center(page, '[data-shape="act.action"]'));
  await expect(page.locator('[data-conn]')).toHaveCount(0);
  await page.locator('[data-tool="act.controlFlow"]').click();
  await drag(page, await center(page, '[data-shape="act.action"]'), await center(page, '[data-shape="act.final"]'));
  await expect(page.locator('[data-conn]')).toHaveCount(1);
  await app.close();
});
