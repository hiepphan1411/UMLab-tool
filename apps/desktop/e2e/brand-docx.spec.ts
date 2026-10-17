import { _electron as electron, expect, test, type ElectronApplication } from '@playwright/test';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import JSZip from 'jszip';
import { goto, launch, register, uniqueEmail } from './app';

const FIXTURE = join(__dirname, '../../../docs/reference/uc03-spec.umlab.json');

async function stubDialogs(app: ElectronApplication, open: string | null, save: string | null) {
  await app.evaluate(
    ({ dialog }, [o, s]) => {
      dialog.showOpenDialog = (async () => ({ canceled: !o, filePaths: o ? [o] : [] })) as typeof dialog.showOpenDialog;
      dialog.showSaveDialog = (async () => ({ canceled: !s, filePath: s ?? '' })) as typeof dialog.showSaveDialog;
    },
    [open, save] as const,
  );
}

test('Màn hình chờ: hiện logo + thanh tải, rồi đóng khi cửa sổ chính sẵn sàng', async () => {
  const profile = `e2e-splash-${Date.now()}`;
  const app = await electron.launch({
    args: [join(__dirname, '..', 'out', 'main', 'index.js')],
    env: {
      ...process.env,
      UMLAB_SPLASH: '1',
      UMLAB_PROFILE: profile,
      UMLAB_MONGO_URI_OVERRIDE: process.env.UMLAB_E2E_MONGO_URI!,
      UMLAB_DB_OVERRIDE: 'umlab_e2e',
      UMLAB_NO_SEED: '1',
      UMLAB_LOCAL_DIR: join(tmpdir(), 'umlab-e2e-local', profile),
      NODE_ENV: 'production',
    },
  });
  // màn hình chờ và cửa sổ chính (đang ẩn) cùng được tạo — lấy đúng trang splash.html
  await app.firstWindow();
  await expect.poll(() => app.windows().some((w) => /splash\.html$/.test(w.url())), { timeout: 10_000 }).toBe(true);
  const splash = app.windows().find((w) => /splash\.html$/.test(w.url()))!;
  expect(
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows().map((w) => [w.webContents.getURL().split('/').pop(), w.isVisible()]),
    ),
  ).toContainEqual(['index.html', false]);
  await expect(splash.locator('svg.logo').first()).toBeVisible();
  await expect(splash.locator('.bar')).toBeVisible();
  await expect(splash.getByText('Đang khởi động…')).toBeVisible();
  await splash.screenshot({ path: 'test-results/splash.png' });
  // cửa sổ chính hiện, màn hình chờ tự đóng
  await expect.poll(() => app.windows().length, { timeout: 20_000 }).toBe(1);
  const main = app.windows()[0];
  expect(main.url()).not.toMatch(/splash/);
  await main.locator('header.topbar').first().waitFor({ timeout: 30_000 });
  expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isVisible())).toBe(true);
  await app.close();
});

test('Xuất mẫu Doc: xem trước theo mẫu, sao chép HTML vào clipboard, tải .docx; thẻ project có thống kê theo loại', async () => {
  const { app, page } = await launch();
  await register(page, 'Mẫu Doc', uniqueEmail('doc'));
  // logo mới ở trang chủ
  await expect(page.locator('img[alt="UMLab"]').first()).toHaveAttribute('src', /umlab-logo(-dark)?\.svg/);
  await page
    .getByRole('button', { name: /Tạo project/ })
    .first()
    .click();
  await page.locator('#project-name').fill('Báo cáo');
  await page.locator('.modal').getByRole('button', { name: 'Tạo project', exact: true }).click();
  await page.locator('[data-new-diagram="usecase-spec"]').click();
  await page.getByRole('button', { name: 'Tạo & mở' }).click();
  await stubDialogs(app, FIXTURE, null);
  await page.getByRole('button', { name: 'Nhập JSON' }).click();
  await expect(page.locator('.spec-title h1')).toHaveText('Check-in xe vào bãi');

  await page.getByRole('button', { name: 'Xuất mẫu Doc' }).click();
  const paper = page.getByTestId('spec-report');
  await expect(paper.locator('tr').first()).toHaveText(/Mục\s*Mô tả/);
  await expect(paper.getByText('Basic flow:')).toBeVisible();
  await expect(paper.getByText('4a. Biển số khác xe đăng ký')).toBeVisible();
  await expect(paper.getByText('4a.3. Tiếp tục bước 5')).toBeVisible();
  await page.screenshot({ path: 'test-results/spec-report.png' });

  await page.locator('.modal').getByRole('button', { name: 'Sao chép' }).click();
  await expect(page.getByText(/Đã sao chép/)).toBeVisible();
  const clip = await app.evaluate(({ clipboard }) => ({ html: clipboard.readHTML(), text: clipboard.readText() }));
  expect(clip.html).toContain('<table');
  expect(clip.html).toContain('Times New Roman');
  expect(clip.html).toContain('Exception flow (Luồng sự kiện ngoại lệ):');
  expect(clip.text.split('\n')[0]).toBe('Mục\tMô tả');

  const out = join(mkdtempSync(join(tmpdir(), 'umlab-e2e-')), 'uc03.docx');
  await stubDialogs(app, null, out);
  await page.locator('.modal').getByRole('button', { name: 'Tải .docx' }).click();
  await expect.poll(() => (existsSync(out) ? readFileSync(out).length : 0), { timeout: 20_000 }).toBeGreaterThan(1000);
  const xml = await (await JSZip.loadAsync(readFileSync(out))).file('word/document.xml')!.async('string');
  expect(xml).toContain('<w:gridCol w:w="4380"/><w:gridCol w:w="4342"/>');
  expect(xml).toContain('4a.1. Thông báo bảo vệ kiểm tra.');
  await page.locator('.modal').getByRole('button', { name: 'Đóng', exact: true }).last().click();

  // rời project ngay → thống kê vẫn được gửi; thẻ project có ô "Đặc tả UC 1"
  await goto(page, '/projects');
  const card = page.locator('[data-project="Báo cáo"]');
  await expect(card.locator('.type-stat[data-type="usecase-spec"]')).toContainText('Đặc tả UC', { timeout: 15_000 });
  await expect(card.locator('.type-stat[data-type="usecase-spec"] .pill')).toHaveText('1');
  await expect(card).toContainText('1 sơ đồ');
  await page.screenshot({ path: 'test-results/projects-card.png' });
  await app.close();
});
