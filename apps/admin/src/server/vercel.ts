// Entry của trang quản trị khi chạy trên Vercel (serverless function, bundle bởi scripts/build-vercel.mjs).
// Dùng lại nguyên createApi của server Node; giao diện là tệp tĩnh do Vercel phục vụ.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { MongoClient, type Db } from 'mongodb';
import { createApi } from './app';
import { loadConfig } from './config';

const cfg = loadConfig();
let api: Promise<ReturnType<typeof createApi>> | null = null;

// Một kết nối cho mỗi instance: Vercel giữ instance "ấm" giữa các request, mở lại mỗi lần sẽ chậm và cạn pool của Atlas.
function getApi(): Promise<ReturnType<typeof createApi>> {
  api ??= (async () => {
    const client = new MongoClient(cfg.mongoUri, { serverSelectionTimeoutMS: 10_000, maxPoolSize: 5 });
    await client.connect();
    const db: Db = client.db(cfg.dbName);
    return createApi(db, cfg);
  })().catch((e: unknown) => {
    api = null;
    throw e;
  });
  return api;
}

function fail(res: ServerResponse, message: string): void {
  res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify({ error: message }));
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // Route /api/(.*) → /api?__p=$1 (xem build-vercel.mjs): dựng lại đường dẫn gốc cho createApi
  const url = new URL(req.url ?? '/', 'http://localhost');
  const p = url.searchParams.get('__p');
  if (p !== null) {
    url.searchParams.delete('__p');
    req.url = `/api/${p}${url.search}`;
  }
  if (!cfg.mongoUri) return fail(res, 'Thiếu biến môi trường UMLAB_MONGO_URI trên Vercel.');
  // Không có khoá cố định thì mỗi instance tự sinh khoá riêng → cookie phiên lúc được lúc không
  if (!process.env.UMLAB_ADMIN_SECRET) return fail(res, 'Thiếu biến môi trường UMLAB_ADMIN_SECRET trên Vercel.');
  try {
    if (!(await (await getApi())(req, res))) fail(res, 'Không có API này.');
  } catch (e) {
    console.error('[admin]', e);
    fail(res, 'Không kết nối được MongoDB: ' + (e as Error).message);
  }
}
