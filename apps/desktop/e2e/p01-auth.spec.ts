import { expect, test } from '@playwright/test';
import { launch, login, register, uniqueEmail } from './app';

test('P01: chưa đăng nhập bị chuyển /login; đăng ký → đăng xuất → đăng nhập; ghi nhớ phiên khi mở lại app', async () => {
  const profile = `p01-${Date.now()}`;
  const email = uniqueEmail('p01');
  let { app, page } = await launch(profile);
  await expect(page.locator('#login-email')).toBeVisible();
  await page.evaluate(() => (location.hash = '#/projects'));
  await expect(page).toHaveURL(/#\/login\?next=/);

  await register(page, 'Người Thử', email);
  await expect(page.getByRole('button', { name: /Tài khoản: Người Thử/ })).toBeVisible();

  // Đăng xuất qua menu tài khoản
  await page.getByRole('button', { name: /Tài khoản:/ }).click();
  await page.getByRole('menuitem', { name: 'Đăng xuất', exact: true }).click();
  await expect(page).toHaveURL(/#\/login/);

  // Sai mật khẩu
  await login(page, email, 'saimatkhau1');
  await expect(page.getByRole('alert')).toHaveText('Email hoặc mật khẩu không đúng');

  // Đúng mật khẩu, có ghi nhớ
  await page.locator('#login-password').fill('Matkhau123');
  await page.locator('#login-submit').click();
  await expect(page).toHaveURL(/#\/projects/);

  // Tắt app, mở lại cùng "máy" → vẫn đăng nhập
  await app.close();
  ({ app, page } = await launch(profile));
  await page.evaluate(() => (location.hash = '#/projects'));
  await expect(page.getByRole('button', { name: /Tài khoản: Người Thử/ })).toBeVisible();
  await page.screenshot({ path: 'test-results/p01-projects.png' });
  await app.close();
});

test('P01: sai mật khẩu 6 lần → bị chặn 1 phút', async () => {
  const { app, page } = await launch();
  const email = uniqueEmail('p01rl');
  await register(page, 'Rate Limit', email);
  await page.getByRole('button', { name: /Tài khoản:/ }).click();
  await page.getByRole('menuitem', { name: 'Đăng xuất', exact: true }).click();
  for (let i = 0; i < 5; i++) {
    await login(page, email, 'saimatkhau' + i);
    await expect(page.getByRole('alert')).toHaveText('Email hoặc mật khẩu không đúng');
  }
  await login(page, email, 'Matkhau123');
  await expect(page.getByRole('alert')).toHaveText('Bạn thử quá nhiều lần, chờ 1 phút');
  await app.close();
});
