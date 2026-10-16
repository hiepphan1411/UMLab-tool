import { expect, test, type Page } from '@playwright/test';
import { goto, launch, login, register, uniqueEmail } from './app';

async function newProject(page: Page, name: string) {
  await page
    .getByRole('button', { name: /Tạo project/ })
    .first()
    .click();
  await page.locator('#project-name').fill(name);
  await page.locator('.modal').getByRole('button', { name: 'Tạo project', exact: true }).click();
  await expect(page).toHaveURL(/#\/p\/p_/);
  return page.url().match(/#\/p\/(p_[a-z0-9]+)/)![1];
}

const tree = (page: Page) => page.getByRole('tree');
const row = (page: Page, name: string) => tree(page).locator('.tree-row', { hasText: name }).first();

async function newFolderIn(page: Page, parent: string | null, name: string) {
  if (parent) await row(page, parent).click({ button: 'right' });
  else await page.getByRole('button', { name: 'Thư mục mới' }).first().click();
  if (parent) await page.getByRole('menuitem', { name: 'Thư mục mới' }).click();
  const input = tree(page).locator('input.field');
  await input.fill(name);
  await input.press('Enter');
  await expect(row(page, name)).toBeVisible();
}

async function drag(page: Page, from: string, to: string) {
  const a = await row(page, from).boundingBox();
  const b = await row(page, to).boundingBox();
  await page.mouse.move(a!.x + 30, a!.y + a!.height / 2);
  await page.mouse.down();
  await page.mouse.move(a!.x + 40, a!.y + a!.height / 2 + 10, { steps: 4 });
  await page.mouse.move(b!.x + 40, b!.y + b!.height / 2, { steps: 8 });
  await page.mouse.up();
}

test('P03: thư mục lồng 3 cấp → tạo Use Case → đổi tên → kéo sang thư mục khác; F5 giữ nguyên', async () => {
  const { app, page } = await launch();
  await register(page, 'Người Vẽ', uniqueEmail('p03'));
  await newProject(page, 'Workspace thử');

  await newFolderIn(page, null, 'Phân tích');
  await newFolderIn(page, 'Phân tích', 'Đặc tả');
  await newFolderIn(page, 'Đặc tả', 'Đăng nhập');
  await newFolderIn(page, null, 'Thiết kế');

  // tạo sơ đồ Use Case trong thư mục "Đăng nhập"
  await row(page, 'Đăng nhập').click();
  await page.locator('[data-new-diagram="usecase"]').click();
  await page.locator('#diagram-name').fill('UC tổng quát');
  await page.getByRole('button', { name: 'Tạo & mở' }).click();
  await expect(page).toHaveURL(/\/d\/dg_/);
  await expect(page.locator('[data-save-state="saved"]')).toBeVisible();

  // đổi tên trong editor
  await page.locator('#diagram-title').fill('UC hệ thống');
  await page.locator('#diagram-title').press('Enter');
  await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
  await page.getByRole('button', { name: /^Về / }).click();

  // kéo sang "Thiết kế"
  await expect(row(page, 'UC hệ thống')).toBeVisible();
  await drag(page, 'UC hệ thống', 'Thiết kế');
  await row(page, 'Thiết kế').click();
  await expect(page.locator('main [data-diagram="UC hệ thống"]')).toBeVisible();

  // Theo loại
  await page.getByRole('radio', { name: 'Theo loại' }).click();
  await expect(page.locator('[data-type-group="usecase"] .pill')).toHaveText('1');
  await page.getByRole('radio', { name: 'Cây thư mục' }).click();

  // F5 → giữ nguyên
  await page.waitForTimeout(800);
  await page.reload();
  await expect(row(page, 'Thiết kế')).toBeVisible();
  await row(page, 'Thiết kế').click();
  await expect(page.locator('main [data-diagram="UC hệ thống"]')).toBeVisible();
  await expect(row(page, 'Đăng nhập')).toBeVisible();

  // xoá thư mục có sơ đồ → hỏi xoá cả nội dung / chuyển lên cha
  await row(page, 'Thiết kế').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Xoá' }).click();
  await expect(page.getByText('Bạn muốn xoá cả nội dung hay chuyển nội dung lên thư mục cha?')).toBeVisible();
  await page.getByRole('button', { name: 'Chuyển lên thư mục cha' }).click();
  await expect(row(page, 'Thiết kế')).toHaveCount(0);
  await expect(row(page, 'UC hệ thống')).toBeVisible();
  await page.screenshot({ path: 'test-results/p03-workspace.png' });
  await app.close();
});

test('P03: hai máy cùng mở project — tạo/đổi tên sơ đồ thấy ngay ở máy kia, thấy avatar người đang online', async () => {
  const emailA = uniqueEmail('p03a');
  const emailB = uniqueEmail('p03b');
  const A = await launch();
  const B = await launch();
  await register(B.page, 'Bình', emailB);
  await register(A.page, 'An', emailA);
  const pid = await newProject(A.page, 'Cộng tác');

  // mời B
  await A.page.getByRole('button', { name: 'Chia sẻ' }).click();
  await A.page.locator('.modal input[type=email]').fill(emailB);
  await A.page.locator('.modal').getByRole('button', { name: 'Mời' }).click();
  await expect(A.page.locator('.modal').getByText('Bình')).toBeVisible();
  await A.page.keyboard.press('Escape');

  // B thấy project mới trên trang chủ (realtime) rồi mở
  await expect(B.page.locator('[data-project="Cộng tác"]')).toBeVisible({ timeout: 15_000 });
  await goto(B.page, `/p/${pid}`);
  await expect(B.page.getByRole('tree')).toBeVisible();

  // A thấy avatar B
  await expect(A.page.locator('[aria-label="1 người đang online"]')).toBeVisible({ timeout: 15_000 });

  // A tạo sơ đồ → B thấy
  await A.page.locator('[data-new-diagram="class"]').click();
  await A.page.locator('#diagram-name').fill('Class chung');
  await A.page.getByRole('button', { name: 'Tạo & mở' }).click();
  await expect(row(B.page, 'Class chung')).toBeVisible({ timeout: 10_000 });

  // B đổi tên → A (đang trong editor) thấy tên mới
  await row(B.page, 'Class chung').click({ button: 'right' });
  await B.page.getByRole('menuitem', { name: 'Đổi tên' }).click();
  const input = tree(B.page).locator('input.field');
  await input.fill('Class đã đổi');
  await input.press('Enter');
  await expect(A.page.locator('#diagram-title')).toHaveValue('Class đã đổi', { timeout: 10_000 });

  // B thấy A đang xem sơ đồ đó (gợi ý trong cây)
  await expect(row(B.page, 'Class đã đổi')).toContainText('An', { timeout: 10_000 });
  await A.app.close();
  await B.app.close();
});

test('P03: thành viên chỉ xem không sửa được', async () => {
  const emailA = uniqueEmail('p03v1');
  const emailB = uniqueEmail('p03v2');
  const A = await launch();
  await register(A.page, 'Chủ', emailA);
  await A.page.getByRole('button', { name: 'Tài khoản: Chủ' }).click();
  await A.page.getByRole('menuitem', { name: 'Đăng xuất', exact: true }).click();
  await register(A.page, 'Khách', emailB);
  await A.page.getByRole('button', { name: 'Tài khoản: Khách' }).click();
  await A.page.getByRole('menuitem', { name: 'Đăng xuất', exact: true }).click();
  await login(A.page, emailA);
  await expect(A.page).toHaveURL(/#\/projects/);
  const pid = await newProject(A.page, 'Chỉ xem thử');
  await A.page.getByRole('button', { name: 'Chia sẻ' }).click();
  await A.page.locator('.modal input[type=email]').fill(emailB);
  await A.page.locator('.modal select').first().selectOption('viewer');
  await A.page.locator('.modal').getByRole('button', { name: 'Mời' }).click();
  await expect(A.page.locator('.modal select').nth(1)).toHaveValue('viewer');
  await A.page.keyboard.press('Escape');
  await A.page.getByRole('button', { name: 'Tài khoản: Chủ' }).click();
  await A.page.getByRole('menuitem', { name: 'Đăng xuất', exact: true }).click();
  await login(A.page, emailB);
  await goto(A.page, `/p/${pid}`);
  await expect(A.page.getByText('Chỉ xem', { exact: true })).toBeVisible();
  await expect(A.page.locator('[data-new-diagram]')).toHaveCount(0);
  await expect(A.page.getByRole('button', { name: 'Thư mục mới' })).toBeDisabled();
  await A.app.close();
});
