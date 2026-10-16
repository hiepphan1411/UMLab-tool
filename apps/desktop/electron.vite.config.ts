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
      resolve: { alias: { ...shared, '@': resolve(__dirname, 'src/renderer/src') } },
      plugins: [react(), tailwindcss()],
      build: { chunkSizeWarningLimit: 4000 },
    },
  };
});
