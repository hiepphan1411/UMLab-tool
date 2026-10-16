import { _electron as electron, expect, type ElectronApplication, type Page } from '@playwright/test';
import { join } from 'node:path';

export interface Launched {
  app: ElectronApplication;
  page: Page;
}

let seq = 0;

/** Mở một bản UMLab với userData riêng (mô phỏng một máy) nối vào DB thử nghiệm. */
export async function launch(profile = `e2e-${Date.now()}-${++seq}`, dbName = 'umlab_e2e'): Promise<Launched> {
  const uri = process.env.UMLAB_E2E_MONGO_URI;
  if (!uri) throw new Error('Thiếu UMLAB_E2E_MONGO_URI');
  const app = await electron.launch({
    args: [join(__dirname, '..', 'out', 'main', 'index.js')],
    env: {
      ...process.env,
      UMLAB_PROFILE: profile,
      UMLAB_MONGO_URI_OVERRIDE: uri,
      UMLAB_DB_OVERRIDE: dbName,
      UMLAB_NO_SEED: '1',
      NODE_ENV: 'production',
    },
  });
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  // Chờ React dựng xong (trang đầu tiên luôn có thanh trên) trước khi điều hướng.
  await page.locator('header.topbar').first().waitFor({ timeout: 30_000 });
  return { app, page };
}

/** Đổi route trong HashRouter. */
export async function goto(page: Page, path: string) {
  await page.evaluate((p) => (location.hash = '#' + p), path);
}

export const uniqueEmail = (tag: string) => `${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@e2e.local`;

export async function register(page: Page, name: string, email: string, password = 'Matkhau123') {
  await goto(page, '/register');
  await page.locator('#reg-name').fill(name);
  await page.locator('#reg-email').fill(email);
  await page.locator('#reg-password').fill(password);
  await page.locator('#reg-again').fill(password);
  await page.locator('#reg-submit').click();
  await expect(page).toHaveURL(/#\/projects/);
}

export async function login(page: Page, email: string, password = 'Matkhau123') {
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.locator('#login-submit').click();
}
