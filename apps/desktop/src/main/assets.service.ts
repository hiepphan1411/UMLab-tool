import { Binary } from 'mongodb';
import type { AssetInfo } from '@shared/api';
import { database, type AssetDoc } from './db';
import { projects } from './projects.service';
import { fail, newId } from './util';

const MAX_BYTES = 5 * 1024 * 1024;
const MIME = /^image\/(png|jpeg|gif|webp|svg\+xml)$/;

const info = (d: AssetDoc): AssetInfo => ({
  id: d._id,
  projectId: d.projectId,
  mime: d.mime,
  size: d.size,
  name: d.name,
  createdAt: d.createdAt.toISOString(),
});

/** Ảnh tải lên cho Image/Screen Capture (P13) — lưu Binary trong collection assets, tối đa 5 MB/ảnh. */
class AssetsService {
  async upload(projectId: string, file: { name: string; mime: string; bytes: Uint8Array }): Promise<AssetInfo> {
    await projects.access(projectId, 'editor');
    if (!MIME.test(file.mime)) fail('VALIDATION', 'Chỉ nhận ảnh PNG, JPG, GIF, WebP hoặc SVG.');
    if (!(file.bytes instanceof Uint8Array) || file.bytes.byteLength > MAX_BYTES)
      fail('VALIDATION', 'Ảnh vượt quá 5 MB.');
    const doc: AssetDoc = {
      _id: newId('a'),
      projectId,
      name: String(file.name || 'anh').slice(0, 200),
      mime: file.mime,
      size: file.bytes.byteLength,
      data: new Binary(Buffer.from(file.bytes)),
      createdAt: new Date(),
    };
    await database.assets().insertOne(doc);
    return info(doc);
  }

  async get(assetId: string): Promise<{ mime: string; bytes: Uint8Array }> {
    const doc = await database.assets().findOne({ _id: assetId });
    if (!doc) fail('NOT_FOUND', 'Ảnh không tồn tại.');
    await projects.access(doc!.projectId, 'viewer');
    const b = doc!.data.buffer;
    return { mime: doc!.mime, bytes: new Uint8Array(b.buffer, b.byteOffset, b.byteLength) };
  }

  async list(projectId: string): Promise<AssetInfo[]> {
    await projects.access(projectId, 'viewer');
    const docs = await database
      .assets()
      .find({ projectId }, { projection: { data: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
    return docs.map(info);
  }
}

export const assets = new AssetsService();
