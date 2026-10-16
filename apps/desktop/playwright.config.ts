import { defineConfig } from '@playwright/test';

// E2E điều khiển app Electron đã build (npm run build trước). DB: mongodb-memory-server (replica set, có change stream)
// hoặc UMLAB_E2E_MONGO_URI nếu muốn chạy với cluster thật.
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: [['list']],
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  outputDir: './test-results',
});
