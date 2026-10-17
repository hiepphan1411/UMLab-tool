import { expect, test, type ElectronApplication, type Page } from '@playwright/test';
import { join } from 'node:path';
import { launch, register, uniqueEmail } from './app';

const FIXTURE = join(__dirname, '../../../docs/reference/uc03-spec.umlab.json');
const editor = (page: Page) => page.locator('textarea[aria-label="Sửa chữ"]');

async function stubOpen(app: ElectronApplication, file: string) {
  await app.evaluate(({ dialog }, f) => {
    dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [f] })) as typeof dialog.showOpenDialog;
  }, file);
}
async function drag(page: Page, a: readonly [number, number], b: readonly [number, number]) {
  await page.mouse.move(a[0], a[1]);
  await page.mouse.down();
  await page.mouse.move((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, { steps: 4 });
  await page.mouse.move(b[0], b[1], { steps: 4 });
  await page.mouse.up();
}
/** Chọn công cụ qua ô tìm của palette (ổn định với biến thể trong flyout). */
async function tool(page: Page, id: string) {
  const q = page.getByPlaceholder('Tìm công cụ…');
  await q.fill(id);
  await page.locator(`[data-tool="${id}"]`).click({ position: { x: 20, y: 12 } });
  await q.fill('');
}
const labels = (page: Page) => page.locator('[data-conn] text').allTextContents();

test('P11: vẽ tay chuỗi đăng nhập (5 lifeline, 12 message, alt) — đánh số, activation, kéo đổi thứ tự; Create/Destroy; sinh từ UC03', async () => {
  const { app, page } = await launch();
  await register(page, 'Sequence', uniqueEmail('p11'));
  await page
    .getByRole('button', { name: /Tạo project/ })
    .first()
    .click();
  await page.locator('#project-name').fill('Sequence');
  await page.locator('.modal').getByRole('button', { name: 'Tạo project', exact: true }).click();
  await page.locator('[data-new-diagram="sequence"]').click();
  await page.getByRole('button', { name: 'Tạo & mở' }).click();
  const c = (await page.getByTestId('canvas').boundingBox())!;

  // 5 lifeline
  const LL = [
    ['seq.actor', 'Người dùng'],
    ['seq.boundary', 'Màn hình'],
    ['seq.control', 'DangNhapController'],
    ['seq.entity', 'TaiKhoan'],
    ['seq.lifeline', 'PhienDangNhap'],
  ] as const;
  for (const [i, [id, name]] of LL.entries()) {
    await tool(page, id);
    await page.mouse.click(c.x + 110 + i * 175, c.y + 90);
    await expect(editor(page)).toBeVisible();
    await editor(page).fill(name);
    await editor(page).press('Enter');
  }
  await page.getByTestId('canvas').click({ position: { x: 5, y: c.height - 5 } });
  const cx: number[] = [];
  for (const [id] of LL) {
    const b = (await page.locator(`[data-shape="${id}"]`).boundingBox())!;
    cx.push(b.x + b.width / 2);
  }
  // các hộp đầu thẳng hàng
  const tops = await Promise.all(LL.map(async ([id]) => (await page.locator(`[data-shape="${id}"]`).boundingBox())!.y));
  expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(30);

  const [U, UI, C, TK, S] = [0, 1, 2, 3, 4];
  const Y0 = c.y + 190;
  const T = Y0 + 4 * 34 + 30; // đỉnh alt
  const ys = [Y0, Y0 + 34, Y0 + 68, Y0 + 102, Y0 + 136, T + 22, T + 46, T + 68, T + 100, T + 124, T + 190, T + 224];
  const message = async (kind: string, a: number, b: number, y: number, y2 = y) => {
    await tool(page, kind);
    await drag(page, [cx[a], y], [cx[b], y2]);
  };
  await message('seq.sync', U, UI, ys[0]);
  await message('seq.sync', UI, C, ys[1]);
  await message('seq.sync', C, TK, ys[2]);
  await message('seq.reply', TK, C, ys[3]);
  await message('seq.self', C, C, ys[4], ys[4] + 18);
  await expect(page.locator('[data-conn]')).toHaveCount(5);
  // alt 2 operand (vạch ngăn mặc định cách đỉnh 80px)
  await tool(page, 'seq.fragment');
  await drag(page, [cx[UI] + 20, T], [cx[S] + 30, T + 150]);
  await expect(editor(page)).toBeVisible();
  await editor(page).fill('mật khẩu đúng');
  await editor(page).press('Enter');
  await message('seq.create', C, S, ys[5]);
  await message('seq.reply', S, C, ys[6]);
  await message('seq.reply', C, UI, ys[7]);
  await message('seq.reply', C, UI, ys[8]);
  await message('seq.reply', UI, U, ys[9]);
  await message('seq.sync', U, UI, ys[10]);
  await message('seq.sync', UI, C, ys[11]);
  await expect(page.locator('[data-conn]')).toHaveCount(12);
  const frag = page.locator('[data-shape="seq.fragment"]');
  await expect(frag).toContainText('alt');
  await expect(frag).toContainText('[mật khẩu đúng]');
  await expect(frag).toContainText('[else]');

  // số thứ tự lồng nhau
  expect((await labels(page)).filter((t) => /^\d/.test(t)).sort()).toEqual(
    ['1:', '1.1:', '1.1.1:', '1.1.2:', '1.1.3: tao()', '2:', '2.1:'].sort(),
  );
  await expect(page.locator('[data-conn]').filter({ hasText: '«create»' })).toHaveCount(1);
  // activation Controller: từ message 2 tới reply ở nhánh else (qua cả hai operand), và lượt mới (2.1)
  const acts = page.locator('[data-shape="seq.control"] rect[width="12"]');
  await expect(acts).toHaveCount(2);
  const a0 = (await acts.first().boundingBox())!;
  expect(Math.abs(a0.y - ys[1])).toBeLessThan(4);
  expect(Math.abs(a0.y + a0.height - ys[8])).toBeLessThan(4);
  // Create hạ hộp đầu lifeline đích đúng độ cao message
  const head = (await page.locator('[data-shape="seq.lifeline"] rect[rx="2"]').boundingBox())!;
  expect(Math.abs(head.y + head.height / 2 - ys[5])).toBeLessThan(3);
  await page.getByTestId('canvas').click({ position: { x: 5, y: c.height - 5 } });
  await page.screenshot({ path: 'test-results/p11-login.png' });

  // đặt tên message 3 và message 5 (self) trong Inspector
  const nameMsg = async (y: number, x: number, name: string) => {
    await page.mouse.click(x, y);
    await page.locator('#seq-msg-name').fill(name);
    await page.locator('#seq-msg-name').press('Enter');
  };
  await nameMsg(ys[2], (cx[C] + cx[TK]) / 2, 'timTheoEmail(email)');
  await nameMsg(ys[4], cx[C] + 30, 'kiemTraMatKhau()');
  expect(await labels(page)).toEqual(expect.arrayContaining(['1.1.1: timTheoEmail(email)', '1.1.2: kiemTraMatKhau()']));
  // kéo message thứ 3 xuống dưới message thứ 5 → đánh số lại
  await drag(page, [(cx[C] + cx[TK]) / 2, ys[2]], [(cx[C] + cx[TK]) / 2, ys[4] + 26]);
  await expect
    .poll(() => labels(page))
    .toEqual(expect.arrayContaining(['1.1.1: kiemTraMatKhau()', '1.1.2: timTheoEmail(email)']));
  // Undo → thứ tự cũ
  await page.keyboard.press('Control+z');
  await expect.poll(() => labels(page)).toEqual(expect.arrayContaining(['1.1.1: timTheoEmail(email)']));

  // Destroy cắt lifeline TaiKhoan và vẽ ✕
  const yd = T + 260;
  await message('seq.destroy', C, TK, yd);
  const tk = (await page.locator('[data-shape="seq.entity"]').boundingBox())!;
  expect(Math.abs(tk.y + tk.height - (yd + 12 + 9))).toBeLessThan(4);
  const ui = (await page.locator('[data-shape="seq.boundary"]').boundingBox())!;
  expect(ui.y + ui.height).toBeGreaterThan(yd + 30);
  await page.screenshot({ path: 'test-results/p11-destroy.png' });

  // Sinh từ đặc tả UC03
  await page.getByRole('button', { name: /^Về / }).click();
  await page.locator('[data-new-diagram="usecase-spec"]').click();
  await page.getByRole('button', { name: 'Tạo & mở' }).click();
  await stubOpen(app, FIXTURE);
  await page.getByRole('button', { name: 'Nhập JSON' }).click();
  await expect(page.locator('.spec-title-code')).toHaveText('UC03');
  await page.getByRole('button', { name: 'Sinh Sequence' }).click();
  await expect(page.getByTestId('gen-banner')).toContainText('Sinh từ');
  await expect(page.locator('[data-shape="seq.control"]')).toContainText('CheckInXeController');
  for (const n of ['TheRFID', 'Xe', 'GoiThang', 'ViDienTu', 'PhienGuiXe'])
    await expect(page.locator('[data-shape="seq.entity"]').filter({ hasText: new RegExp(`^${n}$`) })).toHaveCount(1);
  const frags = page.locator('[data-shape="seq.fragment"]');
  await expect(frags.filter({ hasText: '[thẻ không hợp lệ]' })).toHaveCount(1);
  await expect(frags.filter({ hasText: '[biển số không khớp]' })).toHaveCount(1);
  await expect(frags.first()).toContainText('alt');
  await page.getByTestId('canvas').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Shift+!');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/p11-uc03.png' });
  // message sinh từ bước → Xem bước trong đặc tả
  await page.locator('[data-conn]').filter({ hasText: 'quetThe(maThe)' }).click();
  await page.getByRole('button', { name: 'Xem bước trong đặc tả' }).click();
  await expect(page.locator('.spec-title-code')).toHaveText('UC03');
  await expect(page.getByRole('button', { name: 'Mở Sequence' })).toBeVisible();
  await app.close();
});
