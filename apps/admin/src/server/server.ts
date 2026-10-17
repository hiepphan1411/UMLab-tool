// Máy chủ trang quản trị: API (/api) + client React ở cùng một cổng (mặc định 5176).
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { MongoClient, type Db } from 'mongodb';
import { createApi } from './app';
import { ROOT, type AdminConfig } from './config';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.json': 'application/json',
};

export interface Started {
  server: Server;
  url: string;
  close: () => Promise<void>;
}

/** Khởi động: `prod` phục vụ dist/client (npm run build), ngược lại dùng Vite middleware (HMR khi phát triển). */
export async function start(cfg: AdminConfig, o: { prod: boolean; db?: Db }): Promise<Started> {
  let client: MongoClient | null = null;
  let db = o.db;
  if (!db) {
    if (!cfg.mongoUri) throw new Error('Thiếu UMLAB_MONGO_URI (đặt trong tệp .env ở gốc repo).');
    client = new MongoClient(cfg.mongoUri, { serverSelectionTimeoutMS: 10_000 });
    await client.connect();
    db = client.db(cfg.dbName);
  }
  const api = createApi(db, cfg);
  const appDir = join(ROOT, 'apps/admin');
  const dist = join(appDir, 'dist/client');
  let vite: import('vite').ViteDevServer | null = null;
  if (!o.prod) {
    const { createServer: createVite } = await import('vite');
    vite = await createVite({
      configFile: join(appDir, 'vite.config.ts'),
      server: { middlewareMode: true },
      appType: 'spa',
    });
  } else if (!existsSync(join(dist, 'index.html')))
    throw new Error('Chưa build giao diện: chạy `npm run build -w @umlab/admin` trước.');

  const server = createServer((req, res) => {
    void (async () => {
      if (await api(req, res)) return;
      if (vite) {
        vite.middlewares(req, res);
        return;
      }
      // tĩnh + fallback SPA
      const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
      let file = normalize(join(dist, path));
      if (!file.startsWith(dist) || !existsSync(file) || statSync(file).isDirectory()) file = join(dist, 'index.html');
      res.writeHead(200, {
        'Content-Type': MIME[extname(file)] ?? 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        ...(file.includes('/assets/') ? { 'Cache-Control': 'public, max-age=31536000, immutable' } : {}),
      });
      createReadStream(file).pipe(res);
    })();
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(cfg.port, cfg.host, resolve);
  });
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : cfg.port;
  return {
    server,
    url: `http://${cfg.host === '0.0.0.0' ? 'localhost' : cfg.host}:${port}`,
    close: async () => {
      await new Promise<void>((r) => server.close(() => r()));
      await vite?.close();
      await client?.close();
    },
  };
}
