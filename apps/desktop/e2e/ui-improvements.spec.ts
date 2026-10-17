import { expect, test, type Page } from '@playwright/test';
import { existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { launch, register, uniqueEmail } from './app';

const editor = (page: Page) => page.locator('textarea[aria-label="Sửa chữ"]');
async function drag(page: Page, a: readonly [number, number], b: readonly [number, number]) {
  await page.mouse.move(a[0], a[1]);
  await page.mouse.down();
  await page.mouse.move((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, { steps: 5 });
  await page.mouse.move(b[0], b[1], { steps: 5 });
  await page.mouse.up();
}

/** Giả lập Ctrl+V một ảnh PNG (clipboard có tệp ảnh) vào phần tử đang chọn. */
async function pasteImage(page: Page, selector: string) {
  await page
    .locator(selector)
    .first()
    .evaluate(async (el) => {
      const c = document.createElement('canvas');
      c.width = 120;
      c.height = 80;
      const g = c.getContext('2d')!;
      g.fillStyle = '#2E62E6';
      g.fillRect(0, 0, 120, 80);
      const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), 'image/png'));
      const dt = new DataTransfer();
      dt.items.add(new File([blob], 'image.png', { type: 'image/png' }));
      el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    });
}

test('Giao diện: kết nối chỉ trạng thái + wifi màu, project lưu local (.umlab), chọn thư mục dạng cây, dán ảnh, đường nối', async () => {
  const profile = `e2e-ui-${Date.now()}`;
  const { app, page } = await launch(profile);
  await register(page, 'Giao Diện', uniqueEmail('ui'));

  // kết nối: badge wifi xanh, hộp kết nối không còn ô nhập chuỗi kết nối
  await expect(page.locator('[data-conn-quality="good"]').first()).toBeVisible({ timeout: 30_000 });
  await page.locator('[data-conn-quality]').first().click();
  const conn = page.getByTestId('conn-status');
  await expect(conn).toContainText('Kết nối tốt');
  await expect(conn).toContainText('Độ trễ');
  await expect(page.locator('.modal input')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/ui-conn.png' });
  await page.locator('.modal').getByRole('button', { name: 'Đóng', exact: true }).last().click();

  // tạo project: ô "Lưu trên máy" điền sẵn thư mục mặc định → tệp .umlab
  await page
    .getByRole('button', { name: /Tạo project/ })
    .first()
    .click();
  await page.locator('#project-name').fill('Bãi xe UI');
  const dir = join(tmpdir(), 'umlab-e2e-local', profile);
  await expect(page.locator('#project-local-dir')).toHaveValue(dir);
  await page.screenshot({ path: 'test-results/ui-new-project.png' });
  await page.locator('.modal').getByRole('button', { name: 'Tạo project', exact: true }).click();
  await expect(page).toHaveURL(/#\/p\/p_/);
  await expect.poll(() => (existsSync(dir) ? readdirSync(dir) : [])).toContain('Bãi xe UI.umlab');

  // thẻ "Tạo sơ đồ mới" dùng icon riêng của từng loại sơ đồ
  await expect(page.locator('[data-new-diagram="class"] svg')).toHaveCount(1);
  await page.screenshot({ path: 'test-results/ui-dashboard.png' });

  // tạo sơ đồ: hộp chọn thư mục dạng cây + thư mục mới + ô tên
  await page.locator('[data-new-diagram="usecase-spec"]').click();
  const fb = page.getByTestId('folder-browser');
  await expect(fb).toBeVisible();
  await fb.getByRole('button', { name: 'Thư mục mới' }).click();
  await page.locator('.modal input').last().fill('Đặc tả');
  await page.locator('.modal').last().getByRole('button', { name: 'Tạo', exact: true }).click();
  await expect(fb.getByLabel('Đường dẫn thư mục')).toContainText('Đặc tả');
  await expect(fb.getByRole('tree')).toContainText('Đặc tả');
  await page.locator('#diagram-name').fill('Đặc tả có ảnh');
  await page.screenshot({ path: 'test-results/ui-folder-browser.png' });
  await page.getByRole('button', { name: 'Tạo & mở' }).click();
  await expect(page).toHaveURL(/\/d\/dg_/);

  // dán ảnh vào ô Ghi chú của đặc tả → ảnh đính kèm
  await page.locator('[data-section="data"]').scrollIntoViewIfNeeded();
  await pasteImage(page, '[data-section="data"] textarea[aria-label="Ghi chú"]');
  const att = page.locator('[data-section="data"] [data-testid="image-attachments"]');
  await expect(att.locator('.att-item img')).toHaveCount(1);
  await att.getByLabel('Chú thích ảnh').fill('Màn hình cổng');
  await att.getByLabel('Chú thích ảnh').press('Tab');
  await page.screenshot({ path: 'test-results/ui-paste-image.png' });

  // Class Diagram: nối 2 class, nhấp đúp giữa đường → bẻ vuông góc; kéo đầu mút trượt dọc cạnh
  await page.getByRole('button', { name: /^Về / }).click();
  await page.locator('[data-new-diagram="class"]').click();
  await page.getByRole('button', { name: 'Tạo & mở' }).click();
  const c = (await page.getByTestId('canvas').boundingBox())!;
  const place = async (x: number, y: number, name: string) => {
    await page.locator('[data-tool="cls.class"]').click();
    await page.mouse.click(c.x + x, c.y + y);
    await expect(editor(page)).toBeVisible();
    await editor(page).fill(name);
    await editor(page).press('Enter');
  };
  await place(200, 200, 'A');
  await place(600, 200, 'B');
  const ctr = async (i: number) => {
    const b = (await page.locator('[data-shape="cls.class"]').nth(i).boundingBox())!;
    return [b.x + b.width / 2, b.y + b.height / 2] as const;
  };
  await page.locator('[data-tool="cls.association"]').click({ position: { x: 20, y: 12 } });
  await drag(page, await ctr(0), await ctr(1));
  await expect(page.locator('[data-conn]')).toHaveCount(1);
  const line = page.locator('[data-conn] path').first();
  const lb = (await line.boundingBox())!;
  await page.mouse.dblclick(lb.x + lb.width / 2, lb.y + lb.height / 2);
  await expect(page.locator('.editor-right')).toContainText('Đang chỉnh tay');
  // đường sau khi bẻ: có thêm khúc vuông góc (≥ 4 điểm)
  const d = await page.locator('[data-conn] path').first().getAttribute('d');
  expect((d ?? '').match(/L/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  // kéo đầu mút nguồn trượt lên phía trên của class A → khoá cạnh, có nút "Đầu mút về giữa"
  const ep = page.locator('[data-ep="source"]').first();
  const eb = (await ep.boundingBox())!;
  const a = (await page.locator('[data-shape="cls.class"]').nth(0).boundingBox())!;
  await drag(page, [eb.x + eb.width / 2, eb.y + eb.height / 2], [a.x + a.width * 0.7, a.y + 2]);
  await expect(page.getByRole('button', { name: 'Đầu mút về giữa' })).toBeVisible();
  await page.screenshot({ path: 'test-results/ui-connector.png' });
  await page.getByRole('button', { name: 'Đầu mút về giữa' }).click();
  await expect(page.getByRole('button', { name: 'Đầu mút về giữa' })).toHaveCount(0);
  await app.close();
});
