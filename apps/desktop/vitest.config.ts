import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer/src'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@fixtures': resolve(__dirname, '../../docs/reference'),
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['e2e/**', 'node_modules/**', 'out/**'],
    passWithNoTests: true,
    setupFiles: ['src/main/test-setup.ts'],
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
