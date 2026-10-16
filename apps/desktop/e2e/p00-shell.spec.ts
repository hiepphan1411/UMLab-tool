import { expect, test } from '@playwright/test';
import { launch } from './app';

test('P00: mở app thấy logo UMLab, kết nối DB, đổi theme được và giữ sau khi tải lại', async () => {
  const { app, page } = await launch();
  await expect(page.locator('img[alt="UMLab"]').first()).toBeVisible();
  await expect(page.getByText('Realtime')).toBeVisible({ timeout: 30_000 });
  const themeBtn = page.getByRole('button', { name: /Giao diện:/ });
  await themeBtn.click(); // auto → light
  await themeBtn.click(); // light → dark
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({ path: 'test-results/p00-login-dark.png' });
  await app.close();
});
