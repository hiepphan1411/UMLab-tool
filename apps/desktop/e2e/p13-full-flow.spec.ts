import { expect, test, type ElectronApplication, type Page } from '@playwright/test';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { goto, launch, register, uniqueEmail } from './app';

const UC03 = join(__dirname, '../../../docs/reference/uc03-spec.umlab.json');

async function stubDialogs(app: ElectronApplication, open: string | null, save: string | null) {
  await app.evaluate(
    ({ dialog }, [o, s]) => {
      dialog.showOpenDialog = (async () => ({ canceled: !o, filePaths: o ? [o] : [] })) as typeof dialog.showOpenDialog;
      dialog.showSaveDialog = (async () => ({ canceled: !s, filePath: s ?? '' })) as typeof dialog.showSaveDialog;
    },
    [open, save] as const,
  );
}
const home = (page: Page) => page.getByRole('button', { name: /^Về / }).click();
async function newDiagram(page: Page, type: string, template?: string) {
  await page.locator(`[data-new-diagram="${type}"]`).click();
  if (template) await page.locator(`[data-template="${template}"]`).click();
  await page.getByRole('button', { name: 'Tạo & mở' }).click();
}

test('P13: luồng UniPark+ đầy đủ — use case → đặc tả UC03 → Activity & Sequence → Class → ERD → DDL → xuất / nhập lại project', async () => {
  test.setTimeout(180_000);
  const { app, page } = await launch();
  await register(page, 'Toàn luồng', uniqueEmail('p13'));
  await page
    .getByRole('button', { name: /Tạo project/ })
    .first()
    .click();
  await page.locator('#project-name').fill('UniPark+ toàn luồng');
  await page.locator('.modal').getByRole('button', { name: 'Tạo project', exact: true }).click();

  // 1) Use Case (mẫu UniPark+)
  await newDiagram(page, 'usecase', 'unipark');
  await expect(page.locator('[data-shape="uc.usecase"]')).toHaveCount(10);

  // 2) Đặc tả UC03 → Sinh Activity → quay lại đặc tả → Sinh Sequence
  await home(page);
  await newDiagram(page, 'usecase-spec');
  await stubDialogs(app, UC03, null);
  await page.getByRole('button', { name: 'Nhập JSON' }).click();
  await expect(page.locator('.spec-title-code')).toHaveText('UC03');
  await page.getByRole('button', { name: 'Sinh Activity' }).click();
  await expect(page.locator('[data-shape="act.decision"]')).toHaveCount(3);
  await page
    .getByTestId('gen-banner')
    .getByRole('button', { name: /Đặc tả UC03/ })
    .click();
  await page.getByRole('button', { name: 'Sinh Sequence' }).click();
  await expect(page.locator('[data-shape="seq.control"]')).toContainText('CheckInXeController');
  await expect(page.locator('[data-shape="seq.fragment"]').filter({ hasText: '[thẻ không hợp lệ]' })).toHaveCount(1);

  // 3) Class (mẫu UniPark+) → Parse ORM → ERD → DDL
  await home(page);
  await newDiagram(page, 'class', 'unipark');
  await expect(page.locator('[data-shape="cls.class"]')).toHaveCount(9);
  // lịch sử phiên bản: lưu tay, xoá một class, khôi phục
  await page.getByRole('button', { name: 'Lịch sử phiên bản' }).click();
  await page.locator('.modal').getByRole('button', { name: 'Lưu phiên bản' }).click();
  await page.locator('.modal input').last().fill('Ban đầu');
  await page.locator('.modal input').last().press('Enter');
  const versions = page.getByRole('listbox', { name: 'Các phiên bản' });
  await expect(versions.getByRole('option')).toHaveCount(1);
  await expect(versions).toContainText('Ban đầu');
  await page.keyboard.press('Escape');
  await expect(page.locator('.modal')).toHaveCount(0);
  await page
    .locator('[data-shape="cls.class"]', { hasText: 'bienSo' })
    .first()
    .click({ position: { x: 30, y: 12 } });
  await page.keyboard.press('Delete');
  await expect(page.locator('[data-shape="cls.class"]')).toHaveCount(8);
  await page.getByRole('button', { name: 'Lịch sử phiên bản' }).click();
  await versions.getByRole('option', { name: /Ban đầu/ }).click();
  await page.locator('.modal').getByRole('button', { name: 'Khôi phục' }).click();
  await page.locator('.modal').getByRole('button', { name: 'Khôi phục' }).last().click();
  await expect(page.locator('[data-shape="cls.class"]')).toHaveCount(9);
  // Parse ORM → ERD
  await page.getByRole('button', { name: 'Parse ORM → ERD' }).click();
  const dlg = page.locator('.modal');
  await dlg.getByRole('button', { name: 'Tiếp tục' }).click();
  await dlg.getByRole('button', { name: 'Tiếp tục' }).click();
  await dlg.getByRole('button', { name: 'Áp dụng' }).click();
  await expect(page.locator('[data-shape="erd.entity"]')).toHaveCount(9);
  await page.getByRole('button', { name: 'Xuất SQL' }).click();
  await expect(page.getByTestId('ddl-preview')).toContainText('CREATE TABLE "user"');
  await page.locator('.modal').getByRole('button', { name: 'Đóng' }).last().click();

  // 4) xuất JSON project → nhập lại → đủ sơ đồ
  await home(page);
  const types = ['activity', 'class', 'erd', 'sequence', 'usecase', 'usecase-spec'];
  await goto(page, '/projects');
  const card = page.locator('[data-project="UniPark+ toàn luồng"]');
  await expect(card).toBeVisible();
  const out = join(mkdtempSync(join(tmpdir(), 'umlab-e2e-')), 'toan-luong.umlab-project.json');
  await stubDialogs(app, null, out);
  await card.click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Xuất JSON' }).click();
  await expect(page.getByText(/Đã lưu toan-luong\.umlab-project\.json/)).toBeVisible();
  const exported = JSON.parse(readFileSync(out, 'utf8'));
  expect(exported.kind).toBe('project');
  expect(exported.diagrams.map((d: { type: string }) => d.type).sort()).toEqual(types);
  const gen = exported.diagrams.filter((d: { generatedFrom?: unknown }) => d.generatedFrom);
  expect(gen).toHaveLength(3); // Activity + Sequence từ đặc tả, ERD từ Parse ORM
  await stubDialogs(app, out, null);
  await page.getByRole('button', { name: 'Nhập project' }).click();
  await expect(page).toHaveURL(/#\/p\/p_/);
  await expect(page.getByRole('tree').getByRole('treeitem')).toHaveCount(6);
  await page.getByRole('button', { name: 'Truy vết' }).click();
  // nhập project sinh lại mọi id → tìm dòng theo nội dung
  const row = page.getByLabel('Ma trận truy vết').locator('tbody tr').filter({ hasText: 'UC03 Check-in xe vào bãi' });
  await expect(row.getByRole('button', { name: /^Activity: / })).toBeVisible();
  await expect(row.getByRole('button', { name: /^Sequence: / })).toBeVisible();
  await expect(row.getByRole('button', { name: 'TheRFID', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/p13-reimported.png' });
  await app.close();
});

test('P13: trang Trợ giúp (F1) có phím tắt + ký hiệu sinh từ registry; bố cục hẹp: Inspector là ngăn trượt', async () => {
  const { app, page } = await launch();
  await register(page, 'Trợ giúp', uniqueEmail('p13h'));
  await page.keyboard.press('F1');
  await expect(page.getByRole('main', { name: 'Trợ giúp' })).toContainText('Ctrl + K');
  await page.getByRole('radio', { name: 'Ký hiệu' }).click();
  await page.getByRole('tab', { name: 'Sequence Diagram' }).click();
  await expect(page.locator('.help-notation')).toContainText('Combined Fragment');
  await expect(page.locator('.help-notation')).toContainText('Recursive Message');
  await page.getByRole('radio', { name: 'Định dạng JSON' }).click();
  await expect(page.locator('.help-md')).toContainText('schemaVersion');
  await page.screenshot({ path: 'test-results/p13-help.png' });
  await page.getByRole('button', { name: 'Quay lại' }).click();

  // cửa sổ hẹp (tablet): Inspector ẩn, bật bằng nút “Thuộc tính”
  await page
    .getByRole('button', { name: /Tạo project/ })
    .first()
    .click();
  await page.locator('#project-name').fill('Hẹp');
  await page.locator('.modal').getByRole('button', { name: 'Tạo project', exact: true }).click();
  await newDiagram(page, 'usecase', 'unipark');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(820, 760));
  await expect(page.locator('.editor-right')).toBeHidden();
  await page.getByRole('button', { name: 'Thuộc tính' }).click();
  await expect(page.locator('.editor-right')).toBeVisible();
  await page.screenshot({ path: 'test-results/p13-narrow.png' });
  await app.close();
});

test('P13: sơ đồ 1.000 hình + 1.200 đường nối — mở được, kéo vẫn mượt', async () => {
  test.setTimeout(120_000);
  const { app, page } = await launch();
  await register(page, 'Hiệu năng', uniqueEmail('p13p'));
  await page
    .getByRole('button', { name: /Tạo project/ })
    .first()
    .click();
  await page.locator('#project-name').fill('Lớn');
  await page.locator('.modal').getByRole('button', { name: 'Tạo project', exact: true }).click();
  await newDiagram(page, 'playground');
  await expect(page.getByTestId('canvas')).toBeVisible();
  const N = 1000;
  const views = Array.from({ length: N }, (_, i) => ({
    id: 'v' + i,
    shape: 'pg.box',
    modelId: null,
    x: (i % 40) * 180,
    y: Math.floor(i / 40) * 120,
    w: 140,
    h: 70,
    z: i,
    parentId: null,
    props: { text: 'H' + i, fontSize: 13 },
    style: {},
  }));
  const connectors = Array.from({ length: 1200 }, (_, i) => ({
    id: 'c' + i,
    kind: 'pg.arrow',
    modelId: null,
    source: { viewId: 'v' + (i % N), side: 'right', t: 0.5 },
    target: { viewId: 'v' + ((i * 7 + 1) % N), side: 'left', t: 0.5 },
    routing: 'orthogonal',
    waypoints: [],
    labels: [],
    props: {},
    style: {},
  }));
  const file = join(mkdtempSync(join(tmpdir(), 'umlab-p13-')), 'big.json');
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
  await stubDialogs(app, file, null);
  const t0 = Date.now();
  await page.getByRole('button', { name: 'Nhập JSON' }).click();
  const replace = page.getByRole('button', { name: 'Thay thế' });
  if (await replace.isVisible({ timeout: 3000 }).catch(() => false)) await replace.click();
  await expect(page.locator('[data-conn]').first()).toBeVisible({ timeout: 30_000 });
  const openMs = Date.now() - t0;
  // vừa màn hình rồi phóng to vào góc: culling chỉ vẽ phần nhìn thấy
  await page.keyboard.press('Shift+!');
  const first = page.locator('[data-shape="pg.box"]').first();
  const b = (await first.boundingBox())!;
  const t1 = Date.now();
  await page.mouse.move(b.x + 2, b.y + 2);
  await page.mouse.down();
  await page.mouse.move(b.x + 150, b.y + 80, { steps: 30 });
  await page.mouse.up();
  const perStep = (Date.now() - t1) / 30;
  console.log(`1.000 hình: mở ${openMs} ms, kéo ${perStep.toFixed(1)} ms/bước`);
  expect(openMs).toBeLessThan(15_000);
  expect(perStep).toBeLessThan(80);
  await app.close();
});
