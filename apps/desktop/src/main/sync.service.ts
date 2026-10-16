import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Binary, type ObjectId } from 'mongodb';
import * as Y from 'yjs';
import { IPC, type OpenedProject } from '@shared/api';
import { auth } from './auth.service';
import { paths, removeFile } from './config';
import { database, type UpdateDoc } from './db';
import { broadcast } from './events';
import { ChangeFeed } from './feed';
import { presence } from './presence.service';
import { projects } from './projects.service';
import { CLIENT_ID } from './client-id';
import { fail } from './util';

/** Gộp các bản cập nhật thành snapshot khi vượt ngưỡng này. */
const COMPACT_AT = 200;
const MAX_UPDATE_BYTES = 8 * 1024 * 1024;

interface OpenState {
  feed: ChangeFeed<UpdateDoc>;
  seen: Set<string>;
  refs: number;
  sinceCompact: number;
}

const toU8 = (b: Binary): Uint8Array => new Uint8Array(b.buffer.buffer, b.buffer.byteOffset, b.buffer.byteLength);

class SyncService {
  /** Mỗi lần chạy app là một client — dùng để bỏ qua bản cập nhật của chính mình trong change stream. */
  readonly clientId = CLIENT_ID;
  private open = new Map<string, OpenState>();
  private queue = new Map<string, Uint8Array[]>();
  private flushing = false;
  private flushTimer: NodeJS.Timeout | null = null;

  init(): void {
    this.loadQueue();
    database.onStatus((s) => {
      if (s.state === 'online') void this.flush();
    });
    this.flushTimer = setInterval(() => void this.flush(), 5000);
  }

  dispose(): void {
    if (this.flushTimer) clearInterval(this.flushTimer);
    for (const id of [...this.open.keys()]) this.closeNow(id);
  }

  // ---------- hàng đợi offline (ghi ra đĩa để không mất khi tắt app lúc mất mạng) ----------
  private queueFile(projectId: string): string {
    return join(paths.pending, `${projectId.replace(/[^\w-]/g, '_')}.json`);
  }

  private loadQueue(): void {
    try {
      for (const f of readdirSync(paths.pending)) {
        if (!f.endsWith('.json')) continue;
        const raw = JSON.parse(readFileSync(join(paths.pending, f), 'utf8')) as {
          projectId: string;
          updates: string[];
        };
        if (raw?.projectId && Array.isArray(raw.updates))
          this.queue.set(
            raw.projectId,
            raw.updates.map((b) => new Uint8Array(Buffer.from(b, 'base64'))),
          );
      }
    } catch (e) {
      console.warn('[sync] loadQueue', e);
    }
    this.reportPending();
  }

  private persistQueue(projectId: string): void {
    const q = this.queue.get(projectId);
    const file = this.queueFile(projectId);
    if (!q || !q.length) {
      if (existsSync(file)) removeFile(file);
      return;
    }
    writeFileSync(file, JSON.stringify({ projectId, updates: q.map((u) => Buffer.from(u).toString('base64')) }));
  }

  private reportPending(): void {
    let n = 0;
    for (const q of this.queue.values()) n += q.length;
    database.setPending(n);
  }

  private enqueue(projectId: string, update: Uint8Array): void {
    const q = this.queue.get(projectId) ?? [];
    // Gộp luôn để hàng đợi không phình khi offline lâu.
    q.push(update);
    const merged = q.length > 20 ? [Y.mergeUpdates(q)] : q;
    this.queue.set(projectId, merged);
    this.persistQueue(projectId);
    this.reportPending();
  }

  private async flush(): Promise<void> {
    if (this.flushing || !database.ready || !auth.userId) return;
    this.flushing = true;
    try {
      for (const [projectId, q] of [...this.queue]) {
        if (!q.length) continue;
        const merged = q.length === 1 ? q[0] : Y.mergeUpdates(q);
        try {
          await this.insert(projectId, merged);
          this.queue.delete(projectId);
          this.persistQueue(projectId);
        } catch (e) {
          const code = (e as { code?: string }).code;
          if (code === 'FORBIDDEN' || code === 'NOT_FOUND') {
            // Project đã bị xoá hoặc mình bị gỡ quyền — bỏ hàng đợi.
            this.queue.delete(projectId);
            this.persistQueue(projectId);
          } else throw e;
        }
      }
    } catch (e) {
      console.warn('[sync] flush', e);
    } finally {
      this.flushing = false;
      this.reportPending();
    }
  }

  private async insert(projectId: string, update: Uint8Array): Promise<void> {
    const { user } = await projects.access(projectId, 'editor');
    const res = await database.updates().insertOne({
      projectId,
      kind: 'u',
      data: new Binary(Buffer.from(update)),
      clientId: this.clientId,
      userId: user._id,
      createdAt: new Date(),
    });
    const st = this.open.get(projectId);
    if (st) {
      st.seen.add(String(res.insertedId));
      if (++st.sinceCompact >= COMPACT_AT) {
        st.sinceCompact = 0;
        void this.compact(projectId).catch((e) => console.warn('[sync] compact', e));
      }
    }
  }

  // ---------- mở / đóng project ----------
  async openProject(projectId: string): Promise<OpenedProject> {
    await projects.access(projectId, 'viewer');
    const project = await projects.get(projectId);
    let st = this.open.get(projectId);
    if (!st) {
      st = { feed: this.makeFeed(projectId), seen: new Set(), refs: 0, sinceCompact: 0 };
      this.open.set(projectId, st);
      // Mở stream trước rồi mới đọc: bản cập nhật chen giữa vẫn tới (trùng thì bỏ nhờ `seen`).
      await st.feed.start();
      presence.join(projectId);
    } else await st.feed.ready;
    st.refs++;
    const docs = await database.updates().find({ projectId }).toArray();
    for (const d of docs) st.seen.add(String(d._id));
    if (docs.length > COMPACT_AT) void this.compact(projectId, docs).catch((e) => console.warn('[sync] compact', e));
    const updates = docs.map((d) => toU8(d.data));
    const pending = this.queue.get(projectId);
    if (pending) updates.push(...pending);
    return { project, updates, clientId: this.clientId };
  }

  close(projectId: string): void {
    const st = this.open.get(projectId);
    if (!st) return;
    if (--st.refs <= 0) this.closeNow(projectId);
  }

  private closeNow(projectId: string): void {
    const st = this.open.get(projectId);
    if (!st) return;
    st.feed.stop();
    this.open.delete(projectId);
    presence.leave(projectId);
  }

  async push(projectId: string, update: Uint8Array): Promise<void> {
    if (!(update instanceof Uint8Array) || !update.byteLength) fail('VALIDATION', 'Bản cập nhật rỗng.');
    if (update.byteLength > MAX_UPDATE_BYTES) fail('VALIDATION', 'Thay đổi quá lớn (tối đa 8 MB một lần).');
    if (!database.ready || this.queue.get(projectId)?.length) {
      // Kiểm quyền bằng thông tin đã có; mất mạng thì vẫn nhận vào hàng đợi.
      if (database.ready) await projects.access(projectId, 'editor');
      this.enqueue(projectId, update);
      void this.flush();
      return;
    }
    try {
      await this.insert(projectId, update);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === 'FORBIDDEN' || code === 'NOT_FOUND' || code === 'UNAUTHORIZED' || code === 'VALIDATION') throw e;
      this.enqueue(projectId, update);
    }
  }

  async loadAll(projectId: string): Promise<Uint8Array[]> {
    await projects.access(projectId, 'viewer');
    const docs = await database.updates().find({ projectId }).toArray();
    return docs.map((d) => toU8(d.data));
  }

  private makeFeed(projectId: string): ChangeFeed<UpdateDoc> {
    const deliver = (d: UpdateDoc) => {
      const st = this.open.get(projectId);
      const key = String(d._id);
      if (!st || st.seen.has(key)) return;
      st.seen.add(key);
      if (d.clientId === this.clientId) return;
      broadcast(IPC.syncUpdateEvt, projectId, toU8(d.data));
    };
    return new ChangeFeed<UpdateDoc>({
      name: 'updates:' + projectId,
      collection: () => database.updates(),
      pipeline: [{ $match: { operationType: 'insert', 'fullDocument.projectId': projectId } }],
      fullDocument: false,
      onChange: (ev) => {
        if (ev.operationType === 'insert') deliver(ev.fullDocument as UpdateDoc);
      },
      poll: async () => {
        const st = this.open.get(projectId);
        if (!st) return;
        const ids = await database
          .updates()
          .find({ projectId }, { projection: { _id: 1 } })
          .toArray();
        const fresh = ids.map((d) => d._id as ObjectId).filter((id) => !st.seen.has(String(id)));
        if (!fresh.length) return;
        const docs = await database
          .updates()
          .find({ _id: { $in: fresh } })
          .toArray();
        docs.forEach(deliver);
      },
      pollMs: 1500,
      onReconnect: async () => {
        const st = this.open.get(projectId);
        if (!st) return;
        const docs = await database.updates().find({ projectId }).toArray();
        for (const d of docs) st.seen.add(String(d._id));
        broadcast(
          IPC.syncResyncEvt,
          projectId,
          docs.map((d) => toU8(d.data)),
        );
        await this.flush();
      },
    });
  }

  /** Gộp các bản cập nhật thành 1 snapshot rồi xoá các bản đã gộp. An toàn khi nhiều máy cùng gộp. */
  private async compact(projectId: string, docs?: UpdateDoc[]): Promise<void> {
    const list = docs ?? (await database.updates().find({ projectId }).toArray());
    if (list.length < 2) return;
    const merged = Y.mergeUpdates(list.map((d) => toU8(d.data)));
    const res = await database.updates().insertOne({
      projectId,
      kind: 's',
      data: new Binary(Buffer.from(merged)),
      clientId: this.clientId,
      userId: auth.userId ?? '',
      createdAt: new Date(),
    });
    this.open.get(projectId)?.seen.add(String(res.insertedId));
    await database.updates().deleteMany({ _id: { $in: list.map((d) => d._id as ObjectId) } });
  }
}

export const sync = new SyncService();
