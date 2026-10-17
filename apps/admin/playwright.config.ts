import { defineConfig } from '@playwright/test';

// E2E trang quản trị: build giao diện trước (npm run build -w @umlab/admin); test tự chạy server + MongoDB trong bộ nhớ.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1,
  reporter: [['list']],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: { width: 1360, height: 860 },
    // máy không tải được trình duyệt của Playwright: PLAYWRIGHT_CHROMIUM=/đường/dẫn/chromium
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {},
  },
  outputDir: './test-results',
});
