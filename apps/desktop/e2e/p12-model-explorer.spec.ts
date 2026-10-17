import { expect, test, type ElectronApplication, type Page } from '@playwright/test';
import { join } from 'node:path';
import { launch, register, uniqueEmail } from './app';

const FIXTURE = join(__dirname, '../../../docs/reference/uc03-spec.umlab.json');

async function stubOpen(app: ElectronApplication, file: string) {
  await app.evaluate(({ dialog }, f) => {
    dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [f] })) as typeof dialog.showOpenDialog;
  }, file);
}
const home = (page: Page) => page.getByRole('button', { name: /^Về / }).click();
async function newDiagram(page: Page, type: string, template?: string) {
  await page.locator(`[data-new-diagram="${type}"]`).click();
  if (template) await page.locator(`[data-template="${template}"]`).click();
  await page.getByRole('button', { name: 'Tạo & mở' }).click();
  await expect(page.getByTestId('canvas').or(page.locator('.spec-title-code'))).toBeVisible();
}
const explorer = (page: Page) => page.getByRole('region', { name: 'Model Explorer' });
async function openExplorer(page: Page) {
  await page.getByRole('button', { name: 'Model Explorer' }).click();
  await expect(explorer(page)).toBeVisible();
}
const item = (page: Page, name: string) =>
  explorer(page)
    .locator('[data-model]')
    .filter({ hasText: new RegExp(`^${name}`) });

test('P12: Model Explorer — kéo "Sinh viên" vào 3 sơ đồ, đổi tên một lần; ma trận truy vết; Ctrl+K; dọn mồ côi', async () => {
  const { app, page } = await launch();
  await register(page, 'Model', uniqueEmail('p12'));
  await page
    .getByRole('button', { name: /Tạo project/ })
    .first()
    .click();
  await page.locator('#project-name').fill('UniPark+');
  await page.locator('.modal').getByRole('button', { name: 'Tạo project', exact: true }).click();

  // 1) Use Case UniPark+ (có actor Sinh viên)
  await newDiagram(page, 'usecase', 'unipark');
  await expect(page.locator('[data-shape="uc.actor"]').filter({ hasText: 'Sinh viên' })).toHaveCount(1);
  await openExplorer(page);
  await explorer(page).getByLabel('Tìm phần tử mô hình').fill('sinh vien');
  await expect(item(page, 'Sinh viên')).toHaveCount(1);
  // phần tử có trên sơ đồ đang mở → in đậm
  await expect(item(page, 'Sinh viên').locator('.nm')).toHaveClass(/font-semibold/);

  // 2) Use Case trống: kéo Sinh viên từ Model Explorer vào canvas
  await home(page);
  await newDiagram(page, 'usecase');
  await openExplorer(page);
  await explorer(page).getByLabel('Tìm phần tử mô hình').fill('Sinh viên');
  await item(page, 'Sinh viên').dragTo(page.getByTestId('canvas'), { targetPosition: { x: 300, y: 220 } });
  await expect(page.locator('[data-shape="uc.actor"]').filter({ hasText: 'Sinh viên' })).toHaveCount(1);

  // 3) Sequence trống: kéo Sinh viên → Actor lifeline
  await home(page);
  await newDiagram(page, 'sequence');
  await openExplorer(page);
  await explorer(page).getByLabel('Tìm phần tử mô hình').fill('Sinh viên');
  await item(page, 'Sinh viên').dragTo(page.getByTestId('canvas'), { targetPosition: { x: 260, y: 160 } });
  await expect(page.locator('[data-shape="seq.actor"]')).toContainText('Sinh viên');

  // đổi tên một lần trong Model Explorer → cả 3 sơ đồ đổi
  await explorer(page).getByRole('button', { name: 'Thao tác Sinh viên' }).click();
  await expect(page.getByText('Actor · xuất hiện ở 3 sơ đồ')).toBeVisible();
  await page.getByRole('menuitem', { name: 'Đổi tên' }).click();
  await page.locator('.modal input').fill('Sinh viên ĐH');
  await page.locator('.modal input').press('Enter');
  await expect(page.locator('[data-shape="seq.actor"]')).toContainText('Sinh viên ĐH');
  // Xuất hiện ở các sơ đồ → mở Use Case (mẫu UniPark+) và chọn sẵn hình
  await explorer(page).getByLabel('Tìm phần tử mô hình').fill('Sinh viên ĐH');
  await explorer(page).getByRole('button', { name: 'Thao tác Sinh viên ĐH' }).click();
  await page.getByRole('menuitem', { name: 'Xuất hiện ở các sơ đồ' }).hover();
  const usages = page.getByRole('menuitem', { name: /\(1\)$/ });
  await expect(usages).toHaveCount(3);
  await page.getByRole('menuitem', { name: 'Use Case Diagram (1)', exact: true }).click();
  await expect(page.locator('#diagram-title')).toHaveValue('Use Case Diagram');
  await expect(page.locator('[data-shape="uc.actor"]').filter({ hasText: 'Sinh viên ĐH' })).toHaveCount(1);
  await expect(page.locator('.editor-right')).toContainText('Actor');
  await page.screenshot({ path: 'test-results/p12-explorer.png' });

  // 4) Class UniPark+, đặc tả UC03 → Sinh Activity; Ctrl+K "check" → đặc tả → Sinh Sequence
  await home(page);
  await newDiagram(page, 'class', 'unipark');
  await home(page);
  await newDiagram(page, 'usecase-spec');
  await stubOpen(app, FIXTURE);
  await page.getByRole('button', { name: 'Nhập JSON' }).click();
  await expect(page.locator('.spec-title-code')).toHaveText('UC03');
  await page.getByRole('button', { name: 'Sinh Activity' }).click();
  await expect(page.getByTestId('gen-banner')).toBeVisible();
  await page.keyboard.press('Control+k');
  const search = page.getByRole('textbox', { name: 'Tìm trong project' });
  await search.fill('check');
  const results = page.getByRole('listbox', { name: 'Kết quả tìm kiếm' });
  await expect(results.getByRole('option', { name: /Check-in xe vào bãi.*Use Case/ }).first()).toBeVisible();
  await expect(results.getByRole('option', { name: /^Đặc tả UC03 Check-in xe vào bãi/ })).toBeVisible();
  await expect(results.getByRole('option', { name: /^Activity - UC03 Check-in xe vào bãi/ })).toBeVisible();
  await page.screenshot({ path: 'test-results/p12-search.png' });
  await results.getByRole('option', { name: /^Đặc tả UC03 Check-in xe vào bãi/ }).click();
  await expect(page.locator('.spec-title-code')).toHaveText('UC03');
  await page.getByRole('button', { name: 'Sinh Sequence' }).click();
  await expect(page.locator('[data-shape="seq.control"]')).toBeVisible();
  // Ctrl+K tìm theo bước đặc tả (không dấu) → mở đặc tả
  await page.keyboard.press('Control+k');
  await search.fill('chup anh bien so');
  await expect(results.getByRole('option', { name: /UC03 · bước 3/ })).toBeVisible();
  await page.keyboard.press('Escape');

  // 5) ma trận truy vết
  await home(page);
  await page.getByRole('button', { name: 'Truy vết' }).click();
  const matrix = page.getByLabel('Ma trận truy vết');
  const uc03 = matrix.locator('tr[data-usecase="m_uc03"]');
  await expect(uc03).toContainText('UC03');
  await expect(uc03.getByRole('button', { name: /^Đặc tả: Đặc tả UC03/ })).toBeVisible();
  await expect(uc03.getByRole('button', { name: /^Activity: Activity - UC03/ })).toBeVisible();
  await expect(uc03.getByRole('button', { name: /^Sequence: Sequence - UC03/ })).toBeVisible();
  for (const c of ['GoiThang', 'PhienGuiXe', 'TheRFID', 'ViDienTu', 'Xe'])
    await expect(uc03.getByRole('button', { name: c, exact: true })).toBeVisible();
  // use case của mẫu chưa có đặc tả → các ô trống
  const login = matrix.locator('tr').filter({ hasText: 'Đăng nhập' });
  await expect(login.getByLabel('Đặc tả: chưa có')).toBeVisible();
  await page.screenshot({ path: 'test-results/p12-trace.png' });
  await uc03.getByRole('button', { name: /^Activity: / }).click();
  await expect(page.locator('#diagram-title')).toHaveValue(/^Activity - UC03/);

  // 6) phần tử mồ côi: Xe chỉ xoá hình (Delete) ở Class UniPark+ nhưng vẫn được đặc tả tham chiếu theo tên → tạo actor
  //    tạm, xoá hình → mồ côi → dọn
  await home(page);
  await newDiagram(page, 'usecase');
  await page.locator('[data-tool="uc.actor"]').click({ position: { x: 20, y: 12 } });
  const c = (await page.getByTestId('canvas').boundingBox())!;
  await page.mouse.click(c.x + 300, c.y + 200);
  await page.locator('textarea[aria-label="Sửa chữ"]').fill('Tạm');
  await page.locator('textarea[aria-label="Sửa chữ"]').press('Enter');
  await page.locator('[data-shape="uc.actor"]').click();
  await page.keyboard.press('Delete');
  await expect(page.locator('[data-shape="uc.actor"]')).toHaveCount(0);
  await openExplorer(page);
  await explorer(page).getByRole('button', { name: 'Mồ côi…' }).click();
  const orphans = page.getByRole('list', { name: 'Phần tử mồ côi' });
  await expect(orphans).toContainText('Tạm');
  await expect(orphans).not.toContainText('Sinh viên');
  await page.getByRole('button', { name: /^Xoá \d+ phần tử$/ }).click();
  await explorer(page).getByLabel('Tìm phần tử mô hình').fill('Tạm');
  await expect(explorer(page).locator('[data-model]')).toHaveCount(0);
  await app.close();
});
