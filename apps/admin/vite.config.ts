import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Client React của trang quản trị; server (src/server) phục vụ API + client ở cùng cổng 5176.
export default defineConfig({
  root: resolve(__dirname, 'src/client'),
  plugins: [react()],
  build: { outDir: resolve(__dirname, 'dist/client'), emptyOutDir: true },
  test: {
    root: __dirname,
    include: ['test/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
