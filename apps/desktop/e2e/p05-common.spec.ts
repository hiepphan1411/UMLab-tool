import { expect, test, type ElectronApplication, type Page } from '@playwright/test';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { launch, register, uniqueEmail } from './app';

// PNG 2×1 (đỏ, xanh) để thử công cụ Image
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAAEElEQVR4nGP4z8DAwMDAAAAJ/gH/0a3QSwAAAABJRU5ErkJggg==';

async function stubDialogs(app: ElectronApplication, open: string | null, save: string | null) {
  await app.evaluate(
    ({ dialog }, [o, s]) => {
      dialog.showOpenDialog = (async () => ({ canceled: !o, filePaths: o ? [o] : [] })) as typeof dialog.showOpenDialog;
      dialog.showSaveDialog = (async () => ({ canceled: !s, filePath: s ?? '' })) as typeof dialog.showSaveDialog;
    },
    [open, save] as const,
  );
}

async function openPlayground(page: Page) {
  await page
    .getByRole('button', { name: /Tạo project/ })
    .first()
    .click();
  await page.locator('#project-name').fill('Nhóm chung');
  await page.locator('.modal').getByRole('button', { name: 'Tạo project', exact: true }).click();
  await page.locator('[data-new-diagram="playground"]').click();
  await page.getByRole('button', { name: 'Tạo & mở' }).click();
  await expect(page.getByTestId('canvas')).toBeVisible();
}

const box = async (page: Page) => (await page.getByTestId('canvas').boundingBox())!;

async function closeEditor(page: Page) {
  const ta = page.locator('textarea[aria-label="Sửa chữ"]');
  if (await ta.isVisible().catch(() => false)) await ta.press('Escape');
}

test('P05: mọi công cụ nhóm chung đặt được, sửa được trong Inspector, xuất ảnh đúng', async () => {
  const { app, page } = await launch();
  await register(page, 'Chung', uniqueEmail('p05c'));
  await openPlayground(page);
  const dir = mkdtempSync(join(tmpdir(), 'umlab-p05-'));
  const img = join(dir, 'a.png');
  writeFileSync(img, Buffer.from(PNG, 'base64'));
  await stubDialogs(app, img, null);

  const c = await box(page);
  // hình đặt bằng một cú bấm
  const click: string[] = [
    'common.note',
    'common.constraint',
    'common.rationale',
    'common.problem',
    'common.package',
    'common.diagramOverview',
    'common.userStory',
    'common.image',
    'common.callout',
    'common.rectangle',
    'common.oval',
    'common.polygon',
    'common.textbox',
    'common.diagramInfo',
  ];
  let i = 0;
  for (const id of click) {
    const col = i % 5;
    const row = Math.floor(i / 5);
    i++;
    await page.locator(`[data-tool="${id}"]`).click();
    await page.mouse.click(c.x + 110 + col * 150, c.y + 90 + row * 190);
    await closeEditor(page);
    await expect(page.locator(`[data-shape="${id}"]`)).toHaveCount(1);
  }
  // Image: chọn tệp ngay khi đặt
  await expect(page.locator('[data-shape="common.image"] image')).toHaveCount(1);

  // vẽ tay: Pencil & Calligraphy (kéo), Pen (bấm điểm + Enter)
  for (const [id, y] of [
    ['common.pencil', 650],
    ['common.calligraphy', 720],
  ] as const) {
    await page.locator(`[data-tool="${id}"]`).click();
    await page.mouse.move(c.x + 80, c.y + y);
    await page.mouse.down();
    for (let k = 1; k <= 12; k++) await page.mouse.move(c.x + 80 + k * 14, c.y + y + Math.sin(k / 2) * 20);
    await page.mouse.up();
    await expect(page.locator(`[data-shape="${id}"]`)).toHaveCount(1);
  }
  await page.locator('[data-tool="common.pen"]').click();
  await page.mouse.click(c.x + 320, c.y + 650);
  await page.mouse.move(c.x + 380, c.y + 610);
  await page.mouse.down();
  await page.mouse.move(c.x + 420, c.y + 600, { steps: 4 });
  await page.mouse.up();
  await page.mouse.click(c.x + 440, c.y + 700);
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-shape="common.pen"]')).toHaveCount(1);

  // đường nối: Anchor Note → Rectangle; Line tự do
  const center = async (id: string) => {
    const b = (await page.locator(`[data-shape="${id}"]`).boundingBox())!;
    return [b.x + b.width / 2, b.y + b.height / 2] as const;
  };
  const drag = async (a: readonly [number, number], b: readonly [number, number]) => {
    await page.mouse.move(a[0], a[1]);
    await page.mouse.down();
    await page.mouse.move((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, { steps: 4 });
    await page.mouse.move(b[0], b[1], { steps: 4 });
    await page.mouse.up();
  };
  await page.locator('[data-tool="common.anchor"]').click();
  await drag(await center('common.note'), await center('common.rectangle'));
  await expect(page.locator('[data-conn]')).toHaveCount(1);
  // Anchor giữa hai hình không phải chú thích bị chặn
  await page.locator('[data-tool="common.anchor"]').click();
  await drag(await center('common.rectangle'), await center('common.oval'));
  await expect(page.locator('[data-conn]')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await page.locator('[data-tool="common.line"]').click();
  await drag([c.x + 560, c.y + 640], [c.x + 700, c.y + 720]);
  await expect(page.locator('[data-conn]')).toHaveCount(2);

  // Inspector: sửa chữ của Rectangle
  await page.locator('[data-shape="common.rectangle"]').click();
  const ta = page.locator('.editor-right textarea').first();
  await ta.fill('Khối **đậm**');
  await ta.blur();
  await expect(page.locator('[data-shape="common.rectangle"] text')).toContainText('đậm');
  // Polygon: số cạnh 4 → hình thoi
  await page.locator('[data-shape="common.polygon"]').click({ position: { x: 40, y: 50 } });
  const sides = page.locator('.editor-right input[aria-label="Số cạnh (3–12)"]');
  await sides.fill('4');
  await sides.press('Enter');
  await expect
    .poll(
      async () =>
        (await page.locator('[data-shape="common.polygon"] polygon').getAttribute('points'))!.split(' ').length,
    )
    .toBe(4);

  // Element Group: chọn 2 hình → nhóm
  await page.locator('[data-shape="common.rectangle"]').click();
  await page.locator('[data-shape="common.oval"]').click({ modifiers: ['Shift'] });
  await page.locator('[data-tool="common.group"]').click();
  await expect(page.getByText(/Đã nhóm 2 phần tử/)).toBeVisible();

  await page.getByTestId('canvas').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Shift+!');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/p05-common.png' });

  // xuất SVG chứa đủ hình
  const svg = join(dir, 'chung.svg');
  await stubDialogs(app, null, svg);
  await page.getByRole('button', { name: 'Xuất ảnh' }).click();
  await page.locator('.modal').getByRole('radio', { name: 'SVG' }).click();
  await page.locator('.modal').getByRole('button', { name: /Tải/ }).click();
  await expect.poll(() => (existsSync(svg) ? readFileSync(svg, 'utf8').length : 0)).toBeGreaterThan(5000);
  const out = readFileSync(svg, 'utf8');
  expect(out).toContain('Khối');
  expect(out).toContain('«rationale»');
  expect(out).toContain('data:image/png');
  await app.close();
});
