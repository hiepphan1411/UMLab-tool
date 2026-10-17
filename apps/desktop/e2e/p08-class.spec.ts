import { expect, test, type ElectronApplication, type Page } from '@playwright/test';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
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

const editor = (page: Page) => page.locator('textarea[aria-label="Sửa chữ"]');
const centerOf = async (page: Page, sel: string, nth = 0) => {
  const b = (await page.locator(sel).nth(nth).boundingBox())!;
  return [b.x + b.width / 2, b.y + b.height / 2] as const;
};
async function drag(page: Page, a: readonly [number, number], b: readonly [number, number]) {
  await page.mouse.move(a[0], a[1]);
  await page.mouse.down();
  await page.mouse.move((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, { steps: 5 });
  await page.mouse.move(b[0], b[1], { steps: 5 });
  await page.mouse.up();
}

test('P08: Class — mẫu UniPark+, thuộc tính đủ trường, gợi ý kiểu, composition, realization, xuất SVG', async () => {
  const { app, page } = await launch();
  await register(page, 'Class', uniqueEmail('p08'));
  await page
    .getByRole('button', { name: /Tạo project/ })
    .first()
    .click();
  await page.locator('#project-name').fill('Class');
  await page.locator('.modal').getByRole('button', { name: 'Tạo project', exact: true }).click();

  await page.locator('[data-new-diagram="class"]').click();
  await page.locator('[data-template="unipark"]').click();
  await page.getByRole('button', { name: 'Tạo & mở' }).click();
  await expect(page.locator('[data-shape="cls.class"]')).toHaveCount(9);
  await expect(page.locator('[data-shape="cls.enum"]')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Parse ORM → ERD' })).toBeEnabled();
  await page.getByTestId('canvas').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Shift+!');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/p08-template.png' });

  // vẽ mới
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Delete');
  const c = (await page.getByTestId('canvas').boundingBox())!;
  const place = async (tool: string, x: number, y: number, name: string) => {
    await page.locator(`[data-tool="${tool}"]`).click();
    await page.mouse.click(c.x + x, c.y + y);
    await expect(editor(page)).toBeVisible();
    await editor(page).fill(name);
    await editor(page).press('Enter');
  };
  await place('cls.class', 260, 200, 'PhienGuiXe2');
  await expect(page.locator('[data-shape="cls.class"]')).toContainText('PhienGuiXe2');

  // Alt+Shift+A → thuộc tính đủ trường
  await page.keyboard.press('Alt+Shift+A');
  await expect(editor(page)).toBeFocused();
  await page.keyboard.type('- bienSo : String [1] {unique}');
  await page.keyboard.press('Control+Enter');
  await expect(page.locator('[data-shape="cls.class"]')).toContainText('- bienSo : String [1] {unique}');
  // gợi ý kiểu khi gõ ":" (class trong project + kiểu cơ bản)
  await page.keyboard.press('Alt+Shift+A');
  await expect(editor(page)).toBeFocused();
  await page.keyboard.type('- xe : Phi');
  await expect(page.getByRole('listbox', { name: 'Gợi ý' })).toBeVisible();
  await expect(page.getByRole('option', { name: 'PhienGuiXe2' })).toBeVisible();
  await page.keyboard.press('Escape'); // đóng gợi ý
  await page.keyboard.press('Control+a');
  await page.keyboard.type('- bienSo : String [1] {unique}\n+ $MAX : int = 10');
  await page.keyboard.press('Control+Enter');
  // phương thức abstract
  await page.keyboard.press('Alt+Shift+O');
  await expect(editor(page)).toBeFocused();
  await page.keyboard.type('+ tinhPhi() : Decimal {abstract}');
  await page.keyboard.press('Control+Enter');
  await expect(page.locator('[data-shape="cls.class"]')).toContainText('+ tinhPhi() : Decimal');

  await place('cls.class', 640, 200, 'Xe2');
  // Composition PhienGuiXe2 ◆— Xe2
  await page
    .locator('[data-tool="cls.association"]')
    .click({ position: { x: 200, y: 20 } })
    .catch(() => {});
  await page.locator('[data-tool="cls.association"] .pal-flyout').click();
  await page.getByRole('menuitem', { name: 'Composition' }).click();
  await drag(
    page,
    await centerOf(page, '[data-shape="cls.class"]', 0),
    await centerOf(page, '[data-shape="cls.class"]', 1),
  );
  await expect(page.locator('[data-conn]')).toHaveCount(1);
  // đổi multiplicity đầu đích trong Inspector → nhãn hiện ngay
  const right = page.locator('.editor-right');
  await right.getByLabel(/Đầu đích .* multiplicity/).fill('0..*');
  await right.getByLabel(/Đầu đích .* multiplicity/).press('Enter');
  await expect(page.locator('[data-conn]')).toContainText('0..*');
  // thoi đặc: marker được tô màu nét ở đầu nguồn
  const diamond = page.locator('[data-conn] path[fill="#1F2937"]');
  await expect(diamond).toHaveCount(1);

  // Interface + Realization
  await page.locator('[data-tool="cls.class"] .pal-flyout').click();
  await page.getByRole('menuitem', { name: 'Interface' }).click();
  await page.mouse.click(c.x + 640, c.y + 470);
  await editor(page).fill('ITinhPhi');
  await editor(page).press('Enter');
  await expect(page.locator('[data-shape="cls.interface"]')).toContainText('«interface»');
  await page.locator('[data-tool="cls.generalization"] .pal-flyout').click();
  await page.getByRole('menuitem', { name: 'Realization' }).click();
  await drag(
    page,
    await centerOf(page, '[data-shape="cls.class"]', 0),
    await centerOf(page, '[data-shape="cls.interface"]'),
  );
  await expect(page.locator('[data-conn]')).toHaveCount(2);
  await expect(page.locator('[data-conn]').nth(1).locator('path[stroke-dasharray]')).not.toHaveCount(0);

  // class abstract → tên nghiêng
  await page
    .locator('[data-shape="cls.class"]')
    .first()
    .click({ position: { x: 20, y: 12 } });
  await right.getByRole('tab', { name: 'Mô hình' }).click();
  await right.getByLabel('Abstract').check();

  await page.getByTestId('canvas').click({ position: { x: 5, y: 5 } });
  await page.screenshot({ path: 'test-results/p08-drawn.png' });

  // xuất SVG: chữ nghiêng (abstract) và gạch chân (static)
  const dir = mkdtempSync(join(tmpdir(), 'umlab-p08-'));
  const svg = join(dir, 'class.svg');
  await stubDialogs(app, null, svg);
  await page.getByRole('button', { name: 'Xuất ảnh' }).click();
  await page.locator('.modal').getByRole('radio', { name: 'SVG' }).click();
  await page.locator('.modal').getByRole('button', { name: /Tải/ }).click();
  await expect.poll(() => (existsSync(svg) ? readFileSync(svg).length : 0), { timeout: 20_000 }).toBeGreaterThan(2000);
  const out = readFileSync(svg, 'utf8');
  expect(out).toContain('font-style="italic"');
  expect(out).toContain('text-decoration="underline"');
  expect(out).toContain('«interface»');
  expect(out).toContain('- bienSo : String [1] {unique}');
  await app.close();
});
