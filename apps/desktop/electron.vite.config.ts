import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Phụ thuộc tuỳ chọn của driver mongodb (Kerberos, nén, mã hoá field…) — UMLab không dùng, để ngoài bundle.
const MONGO_OPTIONAL = [
  'kerberos',
  '@mongodb-js/zstd',
  'snappy',
  'socks',
  'aws4',
  'mongodb-client-encryption',
  'gcp-metadata',
  '@aws-sdk/credential-providers',
];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(__dirname, '../..'), 'UMLAB_');
  const shared = { '@shared': resolve(__dirname, 'src/shared') };
  return {
    main: {
      resolve: { alias: shared },
      define: {
        __UMLAB_MONGO_URI__: JSON.stringify(env.UMLAB_MONGO_URI ?? ''),
        __UMLAB_DB__: JSON.stringify(env.UMLAB_DB || 'umlab'),
      },
      build: {
        externalizeDeps: false,
        rollupOptions: { external: MONGO_OPTIONAL },
      },
    },
    preload: {
      resolve: { alias: shared },
      build: { externalizeDeps: false },
    },
    renderer: {
      root: resolve(__dirname, 'src/renderer'),
      resolve: {
        alias: {
          ...shared,
          '@': resolve(__dirname, 'src/renderer/src'),
          '@fixtures': resolve(__dirname, '../../docs/reference'),
        },
      },
      plugins: [react(), tailwindcss()],
      // UMLAB_REACT_DEV=1: bản build dùng React development (StrictMode chạy effect 2 lần như `npm run dev`) — chạy E2E
      // trên bản này để bắt lỗi chỉ xuất hiện ở chế độ dev (npm run e2e:dev)
      ...(process.env.UMLAB_REACT_DEV
        ? { define: { 'process.env.NODE_ENV': JSON.stringify('development') }, mode: 'development' }
        : {}),
      build: { chunkSizeWarningLimit: 4000, ...(process.env.UMLAB_REACT_DEV ? { minify: false } : {}) },
    },
  };
});
