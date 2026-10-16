import { MongoMemoryReplSet } from 'mongodb-memory-server';

declare global {
  var __UMLAB_RS__: MongoMemoryReplSet | undefined;
}

export default async function globalSetup() {
  if (process.env.UMLAB_E2E_MONGO_URI) return;
  const rs = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  globalThis.__UMLAB_RS__ = rs;
  process.env.UMLAB_E2E_MONGO_URI = rs.getUri();
}
