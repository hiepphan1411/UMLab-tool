import type { DiagramVersionInfo } from '@shared/api';
import { database, type VersionDoc } from './db';
import { projects } from './projects.service';
import { fail, newId } from './util';

const KEEP = 50;
const MAX_BYTES = 10 * 1024 * 1024;

const info = (d: VersionDoc): DiagramVersionInfo => ({
  id: d._id,
  diagramId: d.diagramId,
  createdAt: d.createdAt.toISOString(),
  userId: d.userId,
  userName: d.userName,
  label: d.label,
  size: d.size,
});

/** Lịch sử phiên bản sơ đồ (P13): snapshot JSON, giữ 50 bản gần nhất mỗi sơ đồ. */
class VersionsService {
  async list(projectId: string, diagramId: string): Promise<DiagramVersionInfo[]> {
    await projects.access(projectId, 'viewer');
    const docs = await database
      .versions()
      .find({ projectId, diagramId }, { projection: { content: 0 } })
      .sort({ createdAt: -1 })
      .limit(KEEP)
      .toArray();
    return docs.map(info);
  }

  async save(projectId: string, diagramId: string, label: string, content: string): Promise<DiagramVersionInfo> {
    const { user } = await projects.access(projectId, 'editor');
    if (typeof content !== 'string' || !content) fail('VALIDATION', 'Nội dung phiên bản rỗng.');
    if (content.length > MAX_BYTES) fail('VALIDATION', 'Sơ đồ quá lớn để lưu phiên bản.');
    const doc: VersionDoc = {
      _id: newId('v'),
      projectId,
      diagramId,
      label: String(label || '').slice(0, 120),
      content,
      size: content.length,
      userId: user._id,
      userName: user.name,
      createdAt: new Date(),
    };
    await database.versions().insertOne(doc);
    const old = await database
      .versions()
      .find({ projectId, diagramId }, { projection: { _id: 1 } })
      .sort({ createdAt: -1 })
      .skip(KEEP)
      .toArray();
    if (old.length) await database.versions().deleteMany({ _id: { $in: old.map((o) => o._id) } });
    return info(doc);
  }

  async get(versionId: string): Promise<string> {
    const doc = await database.versions().findOne({ _id: versionId });
    if (!doc) fail('NOT_FOUND', 'Phiên bản không tồn tại.');
    await projects.access(doc!.projectId, 'viewer');
    return doc!.content;
  }
}

export const versions = new VersionsService();
