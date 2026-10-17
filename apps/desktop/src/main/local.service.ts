// Lưu local-first: mỗi project gắn một tệp `<thư mục>/<tên>.umlab` trên máy (toàn bộ Y.Doc). Mọi thay đổi ghi
// vào đây trước; sync.service đẩy lên MongoDB khi có mạng. Danh mục các project local ở userData/local-projects.json
// (kèm bản tóm tắt project + vai trò để mở được khi mất mạng).
import { app } from 'electron';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import * as Y from 'yjs';
import type { ProjectSummary } from '@shared/api';
import { paths } from './config';

export const LOCAL_FORMAT = 'umlab-local';
const SAVE_MS = 400;

export interface LocalEntry {
  projectId: string;
  file: string;
  /** Tóm tắt project lần cuối thấy trên DB (để liệt kê / mở khi mất mạng). */
  project: ProjectSummary;
  /** Project tạo khi mất mạng, chưa ghi lên MongoDB. */
  pendingCreate?: boolean;
  /** Người dùng sở hữu bản local này (máy dùng chung nhiều tài khoản). */
  userId: string;
}

interface LocalFile {
  format: typeof LOCAL_FORMAT;
  version: 1;
  projectId: string;
  name: string;
  savedAt: string;
  /** Y.encodeStateAsUpdate, base64. */
  state: string;
}

/** Tên tệp an toàn trên Windows. */
export const safeFileName = (s: string) =>
  [...s]
    .map((ch) => (ch.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(ch) ? '_' : ch))
    .join('')
    .replace(/[. ]+$/, '')
    .trim()
    .slice(0, 80) || 'project';

class LocalStore {
  private index: Record<string, LocalEntry> | null = null;
  private docs = new Map<string, Y.Doc>();
  private timers = new Map<string, NodeJS.Timeout>();

  private get indexFile() {
    return join(paths.root, 'local-projects.json');
  }

  private load(): Record<string, LocalEntry> {
    if (this.index) return this.index;
    try {
      this.index = existsSync(this.indexFile)
        ? (JSON.parse(readFileSync(this.indexFile, 'utf8')) as Record<string, LocalEntry>)
        : {};
    } catch {
      this.index = {};
    }
    return this.index;
  }

  private persistIndex(): void {
    writeFileSync(this.indexFile, JSON.stringify(this.load(), null, 1));
  }

  defaultDir(): string {
    const override = process.env.UMLAB_LOCAL_DIR;
    return override || join(app.getPath('documents'), 'UMLab');
  }

  entries(userId: string): LocalEntry[] {
    return Object.values(this.load()).filter((e) => e.userId === userId);
  }

  get(projectId: string): LocalEntry | undefined {
    return this.load()[projectId];
  }

  info(projectId: string): ProjectSummary['local'] {
    const e = this.get(projectId);
    return e ? { file: e.file, ...(e.pendingCreate ? { pendingCreate: true } : {}) } : null;
  }

  /** Tệp mới trong `dir` cho project (không đè tệp của project khác). */
  private fileFor(dir: string, name: string, projectId: string): string {
    mkdirSync(dir, { recursive: true });
    const base = safeFileName(name);
    let file = join(dir, `${base}.umlab`);
    for (let i = 2; existsSync(file) && this.readFile(file)?.projectId !== projectId; i++)
      file = join(dir, `${base} (${i}).umlab`);
    return file;
  }

  /** Gắn project với thư mục local (tạo tệp nếu chưa có). */
  register(project: ProjectSummary, userId: string, dir?: string, o: { pendingCreate?: boolean } = {}): LocalEntry {
    const idx = this.load();
    const cur = idx[project.id];
    const entry: LocalEntry = cur
      ? { ...cur, project, ...(o.pendingCreate !== undefined ? { pendingCreate: o.pendingCreate } : {}) }
      : {
          projectId: project.id,
          file: this.fileFor(dir || this.defaultDir(), project.name, project.id),
          project,
          userId,
          ...o,
        };
    if (!entry.pendingCreate) delete entry.pendingCreate;
    idx[project.id] = entry;
    this.persistIndex();
    if (!existsSync(entry.file)) this.saveNow(project.id);
    return entry;
  }

  /** Cập nhật bản tóm tắt đã lưu (tên, thành viên, vai trò) sau khi đọc từ DB. */
  touch(project: ProjectSummary, userId: string | null): void {
    const e = this.get(project.id);
    if (!e || e.userId !== userId) return;
    e.project = project;
    this.persistIndex();
  }

  markCreated(projectId: string): void {
    const e = this.get(projectId);
    if (!e?.pendingCreate) return;
    delete e.pendingCreate;
    e.project = { ...e.project, local: { file: e.file } };
    this.persistIndex();
  }

  unregister(projectId: string): void {
    const idx = this.load();
    this.flush(projectId);
    this.docs.get(projectId)?.destroy();
    this.docs.delete(projectId);
    delete idx[projectId];
    this.persistIndex();
  }

  private readFile(file: string): LocalFile | null {
    try {
      const raw = JSON.parse(readFileSync(file, 'utf8')) as LocalFile;
      return raw?.format === LOCAL_FORMAT && typeof raw.state === 'string' ? raw : null;
    } catch {
      return null;
    }
  }

  /** Y.Doc của project (nạp từ tệp lần đầu). */
  doc(projectId: string): Y.Doc {
    let d = this.docs.get(projectId);
    if (d) return d;
    d = new Y.Doc();
    const e = this.get(projectId);
    const f = e ? this.readFile(e.file) : null;
    if (f) Y.applyUpdate(d, new Uint8Array(Buffer.from(f.state, 'base64')));
    this.docs.set(projectId, d);
    return d;
  }

  /** Toàn bộ trạng thái local (một bản cập nhật). */
  state(projectId: string): Uint8Array {
    return Y.encodeStateAsUpdate(this.doc(projectId));
  }

  /** Phần local có mà `remote` (danh sách cập nhật trên DB) chưa có — null nếu không có gì. */
  missingFrom(projectId: string, remote: Uint8Array[]): Uint8Array | null {
    const r = new Y.Doc();
    for (const u of remote) Y.applyUpdate(r, u);
    const diff = Y.encodeStateAsUpdate(this.doc(projectId), Y.encodeStateVector(r));
    r.destroy();
    // cập nhật rỗng của Yjs dài 2 byte (0 struct, 0 delete set)
    return diff.byteLength > 2 ? diff : null;
  }

  apply(projectId: string, update: Uint8Array): void {
    if (!this.get(projectId)) return;
    Y.applyUpdate(this.doc(projectId), update);
    this.schedule(projectId);
  }

  private schedule(projectId: string): void {
    if (this.timers.has(projectId)) return;
    this.timers.set(
      projectId,
      setTimeout(() => {
        this.timers.delete(projectId);
        this.saveNow(projectId);
      }, SAVE_MS),
    );
  }

  flush(projectId: string): void {
    const t = this.timers.get(projectId);
    if (!t) return;
    clearTimeout(t);
    this.timers.delete(projectId);
    this.saveNow(projectId);
  }

  flushAll(): void {
    for (const id of [...this.timers.keys()]) this.flush(id);
  }

  private saveNow(projectId: string): void {
    const e = this.get(projectId);
    if (!e) return;
    const body: LocalFile = {
      format: LOCAL_FORMAT,
      version: 1,
      projectId,
      name: e.project.name,
      savedAt: new Date().toISOString(),
      state: Buffer.from(this.state(projectId)).toString('base64'),
    };
    try {
      mkdirSync(dirname(e.file), { recursive: true });
      // ghi tệp tạm rồi đổi tên để không hỏng tệp khi tắt máy giữa chừng
      const tmp = e.file + '.tmp';
      writeFileSync(tmp, JSON.stringify(body));
      renameSync(tmp, e.file);
    } catch (err) {
      console.warn('[local] save', err);
    }
  }

  /** Chuyển tệp sang thư mục khác. */
  move(projectId: string, dir: string): LocalEntry {
    const e = this.get(projectId);
    if (!e) throw new Error('not local');
    this.flush(projectId);
    const target = this.fileFor(dir, basename(e.file, '.umlab'), projectId);
    if (target !== e.file) {
      this.saveNow(projectId);
      writeFileSync(target, readFileSync(e.file));
      try {
        renameSync(e.file, e.file + '.moved');
      } catch {}
      e.file = target;
      this.persistIndex();
    }
    return e;
  }
}

export const local = new LocalStore();
