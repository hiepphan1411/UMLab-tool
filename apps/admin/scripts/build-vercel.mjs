#!/usr/bin/env node
// Build trang quản trị cho Vercel theo Build Output API v3 → <gốc repo>/.vercel/output:
//   static/              giao diện (vite build)
//   functions/api.func/  API (src/server/vercel.ts, bundle một tệp bằng esbuild — không phụ thuộc node_modules lúc chạy)
// Hướng dẫn triển khai: docs/DEPLOY-ADMIN-VERCEL.md
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as esbuild } from 'esbuild';
import { build as viteBuild } from 'vite';

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(appDir, '../../.vercel/output');
const fn = join(out, 'functions/api.func');

rmSync(out, { recursive: true, force: true });

await viteBuild({ configFile: join(appDir, 'vite.config.ts'), logLevel: 'warn' });
cpSync(join(appDir, 'dist/client'), join(out, 'static'), { recursive: true });

mkdirSync(fn, { recursive: true });
await esbuild({
  entryPoints: [join(appDir, 'src/server/vercel.ts')],
  outfile: join(fn, 'index.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  // driver mongodb require() các gói tuỳ chọn trong try/catch — không cài thì bỏ qua, không bundle
  external: [
    'kerberos',
    'snappy',
    '@mongodb-js/zstd',
    'mongodb-client-encryption',
    '@aws-sdk/credential-providers',
    'gcp-metadata',
    'socks',
    'aws4',
  ],
  // mongodb là CommonJS: cho bundle ESM có require()
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  logLevel: 'warning',
});
writeFileSync(
  join(fn, '.vc-config.json'),
  JSON.stringify({ runtime: 'nodejs22.x', handler: 'index.mjs', launcherType: 'Nodejs', maxDuration: 30 }, null, 2),
);

const security = { 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin' };
writeFileSync(
  join(out, 'config.json'),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: '/(.*)', headers: security, continue: true },
        { src: '/assets/(.*)', headers: { 'Cache-Control': 'public, max-age=31536000, immutable' }, continue: true },
        { src: '/api/(.*)', dest: '/api?__p=$1' },
        { handle: 'filesystem' },
        // SPA: mọi đường dẫn còn lại (/users, /users/:id…) trả index.html
        { src: '/(.*)', dest: '/index.html' },
      ],
    },
    null,
    2,
  ),
);
console.log('Vercel build xong →', out);
