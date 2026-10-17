import { expect, test, type ElectronApplication, type Page } from '@playwright/test';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
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

async function openPlayground(page: Page) {
  await page
    .getByRole('button', { name: /Tạo project/ })
    .first()
    .click();
  await page.locator('#project-name').fill('Engine');
  await page.locator('.modal').getByRole('button', { name: 'Tạo project', exact: true }).click();
  await page.locator('[data-new-diagram="playground"]').click();
  await page.getByRole('button', { name: 'Tạo & mở' }).click();
  await expect(page.getByTestId('canvas')).toBeVisible();
}

async function canvasBox(page: Page) {
  return (await page.getByTestId('canvas').boundingBox())!;
}

async function placeBox(page: Page, x: number, y: number, text: string) {
  const c = await canvasBox(page);
  await page.locator('[data-tool="pg.box"]').click();
  await page.mouse.click(c.x + x, c.y + y);
  const ta = page.locator('textarea[aria-label="Sửa chữ"]');
  await expect(ta).toBeVisible();
  await ta.fill(text);
  await ta.press('Enter');
}

const tmp = () => mkdtempSync(join(tmpdir(), 'umlab-p04-'));

test('P04: vẽ 2 hình, nối, undo, redo, xuất JSON → xoá hết → nhập lại giống hệt', async () => {
  const { app, page } = await launch();
  await register(page, 'Engine', uniqueEmail('p04'));
  await openPlayground(page);

  await placeBox(page, 300, 250, 'A');
  await placeBox(page, 650, 250, 'B');
  await expect(page.locator('[data-view]')).toHaveCount(2);

  // nối A → B bằng công cụ Mũi tên
  const c = await canvasBox(page);
  await page.locator('[data-tool="pg.arrow"]').click();
  await page.mouse.move(c.x + 300, c.y + 250);
  await page.mouse.down();
  await page.mouse.move(c.x + 450, c.y + 260, { steps: 5 });
  await page.mouse.move(c.x + 650, c.y + 250, { steps: 5 });
  await page.mouse.up();
  await expect(page.locator('[data-conn]')).toHaveCount(1);

  // undo / redo
  await page.getByTestId('canvas').click({ position: { x: 20, y: 20 } });
  await page.keyboard.press('Control+z');
  await expect(page.locator('[data-conn]')).toHaveCount(0);
  await page.keyboard.press('Control+Shift+z');
  await expect(page.locator('[data-conn]')).toHaveCount(1);

  // kéo hình B → undo đưa về chỗ cũ
  const bBox = await page.locator('[data-view]').nth(1).boundingBox();
  await page.mouse.move(bBox!.x + 20, bBox!.y + 20);
  await page.mouse.down();
  await page.mouse.move(bBox!.x + 120, bBox!.y + 140, { steps: 10 });
  await page.mouse.up();
  const moved = await page.locator('[data-view]').nth(1).boundingBox();
  expect(moved!.y).toBeGreaterThan(bBox!.y + 100);
  await page.keyboard.press('Control+z');
  await expect.poll(async () => (await page.locator('[data-view]').nth(1).boundingBox())!.y).toBeCloseTo(bBox!.y, 0);

  // xuất JSON
  const dir = tmp();
  const out = join(dir, 'pg.umlab.json');
  await stubDialogs(app, null, out);
  await page.getByRole('button', { name: 'Xuất JSON' }).click();
  await expect(page.getByText(/Đã lưu pg\.umlab\.json/)).toBeVisible();
  const file = JSON.parse(readFileSync(out, 'utf8'));
  expect(file.kind).toBe('diagram');
  expect(file.diagram.views).toHaveLength(2);
  expect(file.diagram.connectors).toHaveLength(1);

  // xoá hết rồi nhập lại (Thay thế)
  await page.getByTestId('canvas').click({ position: { x: 20, y: 20 } });
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Delete');
  await expect(page.locator('[data-view]')).toHaveCount(0);
  await stubDialogs(app, out, null);
  await page.getByRole('button', { name: 'Nhập JSON' }).click();
  await page.getByRole('button', { name: 'Thay thế' }).click();
  await expect(page.locator('[data-view]')).toHaveCount(2);
  await expect(page.locator('[data-conn]')).toHaveCount(1);
  const out2 = join(dir, 'pg2.umlab.json');
  await stubDialogs(app, null, out2);
  await page.getByRole('button', { name: 'Xuất JSON' }).click();
  await expect(page.getByText(/Đã lưu pg2\.umlab\.json/)).toBeVisible();
  const again = JSON.parse(readFileSync(out2, 'utf8'));
  const strip = (f: typeof file) =>
    JSON.stringify({
      v: f.diagram.views.map((v: Record<string, unknown>) => ({ ...v, id: 0, z: 0 })),
      c: f.diagram.connectors.map((x: Record<string, unknown>) => ({
        ...x,
        id: 0,
        source: { ...(x.source as object), viewId: 0 },
        target: { ...(x.target as object), viewId: 0 },
        z: 0,
      })),
    });
  expect(strip(again)).toBe(strip(file));
  await page.screenshot({ path: 'test-results/p04-editor.png' });
  await app.close();
});

test('P04: container lồng 3 cấp, xuất PNG 2x và SVG', async () => {
  const { app, page } = await launch();
  await register(page, 'Engine2', uniqueEmail('p04b'));
  await openPlayground(page);
  const c = await canvasBox(page);
  for (const [x, y] of [
    [300, 250],
    [310, 260],
    [320, 270],
  ]) {
    await page.locator('[data-tool="pg.container"]').click();
    await page.mouse.click(c.x + x, c.y + y);
  }
  await placeBox(page, 330, 280, 'Con');
  const dir = tmp();
  const out = join(dir, 'nest.json');
  await stubDialogs(app, null, out);
  await page.getByRole('button', { name: 'Xuất JSON' }).click();
  await expect(page.getByText(/Đã lưu nest\.json/)).toBeVisible();
  const f = JSON.parse(readFileSync(out, 'utf8'));
  const byId = Object.fromEntries(f.diagram.views.map((v: { id: string }) => [v.id, v]));
  const box = f.diagram.views.find((v: { shape: string }) => v.shape === 'pg.box');
  let depth = 0;
  let cur = box;
  while (cur.parentId) {
    depth++;
    cur = byId[cur.parentId];
  }
  expect(depth).toBe(3);

  // xuất SVG
  await page.getByRole('button', { name: 'Xuất ảnh' }).click();
  await page.locator('.modal').getByRole('radio', { name: 'SVG' }).click();
  const svgPath = join(dir, 'pg.svg');
  await stubDialogs(app, null, svgPath);
  await page.getByRole('button', { name: /Tải ảnh/ }).click();
  await expect(page.getByText(/Đã lưu pg\.svg/)).toBeVisible();
  const svg = readFileSync(svgPath, 'utf8');
  expect(svg.startsWith('<svg')).toBe(true);
  expect(svg).toContain("font-family:'Roboto'");
  expect(svg).toContain('Con');

  // xuất PNG 2x
  await page.locator('.modal').getByRole('radio', { name: 'PNG' }).click();
  await page.locator('.modal').getByRole('radio', { name: '2x' }).click();
  const pngPath = join(dir, 'pg.png');
  await stubDialogs(app, null, pngPath);
  await page.getByRole('button', { name: /Tải ảnh/ }).click();
  await expect(page.getByText(/Đã lưu pg\.png/)).toBeVisible();
  const png = readFileSync(pngPath);
  expect(png.subarray(1, 4).toString()).toBe('PNG');
  const w = png.readUInt32BE(16);
  const svgW = Number(/width="(\d+)"/.exec(svg)![1]);
  expect(w).toBe(svgW * 2);
  await app.close();
});

test('P04: 300 hình + 400 nối vẫn kéo mượt', async () => {
  const { app, page } = await launch();
  await register(page, 'Engine3', uniqueEmail('p04c'));
  await openPlayground(page);
  const views = Array.from({ length: 300 }, (_, i) => ({
    id: 'v' + i,
    shape: 'pg.box',
    modelId: null,
    x: (i % 20) * 180,
    y: Math.floor(i / 20) * 120,
    w: 140,
    h: 70,
    z: i,
    parentId: null,
    props: { text: 'H' + i, fontSize: 13 },
    style: {},
  }));
  const connectors = Array.from({ length: 400 }, (_, i) => ({
    id: 'c' + i,
    kind: 'pg.arrow',
    modelId: null,
    source: { viewId: 'v' + (i % 300), side: 'right', t: 0.5 },
    target: { viewId: 'v' + ((i * 7 + 1) % 300), side: 'left', t: 0.5 },
    routing: 'orthogonal',
    waypoints: [],
    labels: [],
    props: {},
    style: {},
  }));
  const dir = tmp();
  const file = join(dir, 'big.json');
  writeFileSync(
    file,
    JSON.stringify({
      format: 'umlab',
      schemaVersion: 1,
      kind: 'diagram',
      exportedAt: '',
      diagram: { id: 'd', type: 'playground', name: 'big', views, connectors, data: null },
      model: [],
    }),
  );
  // loại playground không có trong schema chuẩn → nhập qua ops để kiểm hiệu năng
  await stubDialogs(app, file, null);
  await page.getByRole('button', { name: 'Nhập JSON' }).click();
  const replace = page.getByRole('button', { name: 'Thay thế' });
  if (await replace.isVisible({ timeout: 3000 }).catch(() => false)) await replace.click();
  await expect(page.locator('[data-conn]')).toHaveCount(400, { timeout: 20000 });
  await page.keyboard.press('Shift+!');
  const first = page.locator('[data-view]').first();
  const b = (await first.boundingBox())!;
  const t0 = Date.now();
  await page.mouse.move(b.x + 5, b.y + 5);
  await page.mouse.down();
  await page.mouse.move(b.x + 205, b.y + 105, { steps: 40 });
  await page.mouse.up();
  const ms = Date.now() - t0;
  // 40 bước kéo trên máy CI: trung bình < 60ms/bước (bao gồm độ trễ điều khiển Playwright)
  expect(ms / 40).toBeLessThan(60);
  await page.screenshot({ path: 'test-results/p04-big.png' });
  await app.close();
});
