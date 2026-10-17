import { expect, test, type ElectronApplication, type Page } from '@playwright/test';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { launch, register, uniqueEmail } from './app';

async function stubDialogs(app: ElectronApplication, open: string | null, save: string | null) {
  await app.evaluate(
    ({ dialog }, [o, s]) => {
      dialog.showOpenDialog = (async () => ({ canceled: !o, filePaths: o ? [o] : [] })) as typeof dialog.showOpenDialog;
      dialog.showSaveDialog = (async () => ({ canceled: !s, filePath: s ?? '' })) as typeof dialog.showSaveDialog;
    },
    [open, save] as const,
  );
}

async function newProject(page: Page, name: string) {
  await page
    .getByRole('button', { name: /Tạo project/ })
    .first()
    .click();
  await page.locator('#project-name').fill(name);
  await page.locator('.modal').getByRole('button', { name: 'Tạo project', exact: true }).click();
}

const centerOf = async (page: Page, sel: string, nth = 0) => {
  const b = (await page.locator(sel).nth(nth).boundingBox())!;
  return [b.x + b.width / 2, b.y + b.height / 2] as const;
};
async function drag(page: Page, a: readonly [number, number], b: readonly [number, number]) {
  await page.mouse.move(a[0], a[1]);
  await page.mouse.down();
  await page.mouse.move((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, { steps: 5 });
  await page.mouse.move(b[0], b[1], { steps: 5 });
}

test('P06: Use Case — mẫu UniPark+, luật Include, extension point của Extend, đặc tả, xuất/nhập JSON', async () => {
  const { app, page } = await launch();
  await register(page, 'Use Case', uniqueEmail('p06'));
  await newProject(page, 'UC');

  // mẫu Use case UniPark+
  await page.locator('[data-new-diagram="usecase"]').click();
  await page.locator('[data-template="unipark"]').click();
  await page.getByRole('button', { name: 'Tạo & mở' }).click();
  await expect(page.locator('[data-shape="uc.usecase"]')).toHaveCount(10);
  await expect(page.locator('[data-shape="uc.actor"]')).toHaveCount(4);
  await expect(page.locator('[data-shape="uc.system"]')).toHaveCount(1);
  await page.getByTestId('canvas').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Shift+!');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/p06-template.png' });

  // vẽ mới bằng palette: Actor + 2 Use Case
  const c = (await page.getByTestId('canvas').boundingBox())!;
  await page.getByTestId('canvas').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Delete');
  await expect(page.locator('[data-view]')).toHaveCount(0);
  const place = async (tool: string, x: number, y: number, text: string) => {
    await page.locator(`[data-tool="${tool}"]`).click();
    await page.mouse.click(c.x + x, c.y + y);
    const ta = page.locator('textarea[aria-label="Sửa chữ"]');
    await expect(ta).toBeVisible();
    await ta.fill(text);
    await ta.press('Enter');
  };
  await place('uc.actor', 120, 300, 'Sinh viên');
  await place('uc.usecase', 420, 200, 'Check-out xe');
  await place('uc.usecase', 420, 420, 'Thanh toán');
  await expect(page.locator('[data-shape="uc.usecase"] text').first()).toContainText('UC11');

  // Include từ Actor sang Use Case → bị chặn, tooltip đúng lý do
  await page.locator('[data-tool="uc.include"]').click();
  await drag(
    page,
    await centerOf(page, '[data-shape="uc.actor"]'),
    await centerOf(page, '[data-shape="uc.usecase"]', 0),
  );
  await expect(page.getByRole('tooltip')).toHaveText('Include chỉ nối giữa hai use case');
  await page.mouse.up();
  await expect(page.locator('[data-conn]')).toHaveCount(0);

  // Association Actor → UC; Extend Thanh toán ← Check-out (mở rộng → gốc)
  await page.locator('[data-tool="uc.association"]').click();
  await drag(
    page,
    await centerOf(page, '[data-shape="uc.actor"]'),
    await centerOf(page, '[data-shape="uc.usecase"]', 0),
  );
  await page.mouse.up();
  await expect(page.locator('[data-conn]')).toHaveCount(1);
  await page.locator('[data-tool="uc.extend"]').click();
  await drag(
    page,
    await centerOf(page, '[data-shape="uc.usecase"]', 0),
    await centerOf(page, '[data-shape="uc.usecase"]', 1),
  );
  await page.mouse.up();
  await expect(page.locator('[data-conn]')).toHaveCount(2);

  // Inspector Extend: điều kiện + tạo extension point mới trên use case gốc
  const right = page.locator('.editor-right');
  await right.getByLabel('Điều kiện', { exact: true }).fill('khách muốn trả sau');
  await right.getByLabel('Điều kiện', { exact: true }).press('Enter');
  await right.getByRole('button', { name: 'Tạo mới' }).click();
  await page.locator('.modal input').fill('Thanh toán lỗi');
  await page.locator('.modal').getByRole('button', { name: 'Lưu' }).click();
  await expect(page.locator('[data-conn]').nth(1)).toContainText('extension point: Thanh toán lỗi');
  // đổi tên extension point ở use case gốc → nhãn cập nhật
  await page
    .locator('[data-shape="uc.usecase"]')
    .nth(1)
    .click({ position: { x: 20, y: 30 } });
  const ep = right.getByLabel('Tên extension point');
  await ep.fill('Thẻ bị từ chối');
  await ep.press('Enter');
  await expect(page.locator('[data-conn]').nth(1)).toContainText('extension point: Thẻ bị từ chối');

  // xuất JSON → xoá → nhập lại giống hệt
  const dir = mkdtempSync(join(tmpdir(), 'umlab-p06-'));
  const out = join(dir, 'uc.json');
  await stubDialogs(app, null, out);
  await page.getByRole('button', { name: 'Xuất JSON' }).click();
  await expect(page.getByText(/Đã lưu uc\.json/)).toBeVisible();
  const f1 = JSON.parse(readFileSync(out, 'utf8'));
  expect(f1.diagram.views).toHaveLength(3);
  expect(f1.model.map((m: { kind: string }) => m.kind).sort()).toEqual(['uml.actor', 'uml.usecase', 'uml.usecase']);
  await page.getByTestId('canvas').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Delete');
  await stubDialogs(app, out, null);
  await page.getByRole('button', { name: 'Nhập JSON' }).click();
  await page.getByRole('button', { name: 'Thay thế' }).click();
  await expect(page.locator('[data-shape="uc.usecase"]')).toHaveCount(2);
  await expect(page.locator('[data-conn]').nth(1)).toContainText('Thẻ bị từ chối');

  // chuột phải use case → Tạo đặc tả → mở sơ đồ đặc tả; quay lại thấy icon tài liệu
  await page
    .locator('[data-shape="uc.usecase"]')
    .first()
    .click({ button: 'right', position: { x: 30, y: 30 } });
  await page.getByRole('menuitem', { name: 'Tạo đặc tả' }).click();
  await expect(page.getByLabel('Tên sơ đồ')).toHaveValue(/Đặc tả UC/);
  await page.goBack();
  await expect(page.locator('[data-shape="uc.usecase"] title')).toHaveText('Đã có đặc tả');
  await page.screenshot({ path: 'test-results/p06-drawn.png' });
  await app.close();
});
