import { expect, test, type ElectronApplication } from '@playwright/test';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { launch, register, uniqueEmail } from './app';

const FIXTURE = join(__dirname, '../../../docs/reference/unipark-plus.json');
const OLD_TOOL = join(__dirname, '../../../docs/reference/diagram-studio/index.html');

async function stubDialogs(app: ElectronApplication, open: string | null, save: string | null) {
  await app.evaluate(
    ({ dialog }, [o, s]) => {
      dialog.showOpenDialog = (async () => ({ canceled: !o, filePaths: o ? [o] : [] })) as typeof dialog.showOpenDialog;
      dialog.showSaveDialog = (async () => ({ canceled: !s, filePath: s ?? '' })) as typeof dialog.showSaveDialog;
    },
    [open, save] as const,
  );
}

test('P05: nhập unipark-plus.json cũ → sơ đồ kiến trúc giống bản cũ; tab Icon; mẫu Kiến trúc UniPark+', async () => {
  const { app, page } = await launch();
  await register(page, 'Kiến Trúc', uniqueEmail('p05a'));
  await stubDialogs(app, FIXTURE, null);
  await page.getByRole('button', { name: 'Nhập project' }).click();
  await expect(page).toHaveURL(/#\/p\/p_/);
  await page.locator('[data-diagram="UniPark+ Kiến trúc hệ thống"]').dblclick();
  await expect(page.getByTestId('canvas')).toBeVisible();
  await expect(page.locator('[data-shape="arch.card"]')).not.toHaveCount(0);
  const cards = await page.locator('[data-shape="arch.card"]').count();
  const groups = await page.locator('[data-shape="arch.group"]').count();
  expect(cards + groups).toBeGreaterThan(15);
  await expect(page.locator('[data-conn]')).toHaveCount(11);
  await page.getByTestId('canvas').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Shift+!');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/p05-arch.png' });

  // xuất PNG 2x để so với bản cũ
  const dir = mkdtempSync(join(tmpdir(), 'umlab-p05a-'));
  const png = join(dir, 'arch.png');
  await stubDialogs(app, null, png);
  await page.getByRole('button', { name: 'Xuất ảnh' }).click();
  await page.locator('.modal').getByRole('radio', { name: 'PNG' }).click();
  await page.locator('.modal').getByRole('button', { name: /Tải/ }).click();
  await expect
    .poll(() => (existsSync(png) ? readFileSync(png).length : 0), { timeout: 20_000 })
    .toBeGreaterThan(50_000);
  writeFileSync('test-results/p05-arch-export.png', readFileSync(png));
  await page.keyboard.press('Escape');

  // tab Icon: tìm bằng tiếng Việt, kéo icon thả lên thẻ → thay icon
  await page.getByRole('button', { name: 'Icon', exact: true }).first().click();
  await page.getByLabel('Tìm icon').fill('thanh toán');
  const cell = page.locator('[data-icon="lucide:credit-card"]');
  await expect(cell).toBeVisible();
  const card = page.locator('[data-shape="arch.card"]').first();
  const cardBox = (await card.boundingBox())!;
  await cell.dragTo(page.getByTestId('canvas'), {
    targetPosition: {
      x: cardBox.x - (await page.getByTestId('canvas').boundingBox())!.x + cardBox.width / 2,
      y: cardBox.y - (await page.getByTestId('canvas').boundingBox())!.y + cardBox.height / 2,
    },
  });
  await expect(page.getByText(/Đã đặt icon credit card/)).toBeVisible();
  // thả icon ra chỗ trống → thẻ mới
  const before = await page.locator('[data-shape="arch.card"]').count();
  await page.getByLabel('Tìm icon').fill('postgres');
  await page
    .locator('[data-icon="brand:postgresql"]')
    .dragTo(page.getByTestId('canvas'), { targetPosition: { x: 30, y: 30 } });
  await expect(page.locator('[data-shape="arch.card"]')).toHaveCount(before + 1);

  // tạo sơ đồ mới từ mẫu Kiến trúc UniPark+
  await page.getByRole('button', { name: /^Về / }).first().click();
  await page.locator('[data-new-diagram="architecture"]').click();
  await page.locator('[data-template="unipark"]').click();
  await page.getByRole('button', { name: 'Tạo & mở' }).click();
  await expect(page.locator('[data-shape="arch.card"]')).not.toHaveCount(0);

  // ảnh tool cũ (cùng dữ liệu mẫu) để so bằng mắt
  const old = await app.evaluate(async ({ BrowserWindow }, file) => {
    const w = new BrowserWindow({ width: 1440, height: 900, show: false });
    await w.loadFile(file);
    await new Promise((r) => setTimeout(r, 1200));
    await w.webContents.executeJavaScript('document.getElementById("zoomFit")?.click()');
    await new Promise((r) => setTimeout(r, 300));
    const img = await w.webContents.capturePage();
    w.destroy();
    return img.toPNG().toString('base64');
  }, OLD_TOOL);
  writeFileSync('test-results/p05-arch-old.png', Buffer.from(old, 'base64'));
  await app.close();
});
