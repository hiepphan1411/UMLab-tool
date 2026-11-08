// Ôn thi VSTEP: chỉ tài khoản được quản trị cấp tính năng "vstep" mới dùng được.
// - Tiến độ: lưu trên máy (userData/vstep/<userId>.json) để dùng khi mất mạng + bản trên MongoDB (vstep_progress)
//   để học tiếp ở máy khác; khi mở lấy bản có updatedAt mới hơn.
// - Tài liệu: thư mục trên máy chứa MP3 + ảnh trang sách (_umlab/book, _umlab/keys), phục vụ cho renderer qua
//   giao thức umlab-vstep://media/<đường dẫn tương đối> (chặn thoát ra ngoài thư mục, hỗ trợ Range để tua audio).
import { BrowserWindow, dialog, protocol } from 'electron';
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { FEATURE_VSTEP, type VstepMediaInfo, type VstepSaveResult } from '@shared/api';
import { auth } from './auth.service';
import { paths } from './config';
import { database } from './db';
import { fail } from './util';

export const VSTEP_SCHEME = 'umlab-vstep';
const MAX_STATE = 8 * 1024 * 1024;
const AUDIO = new Set(['.mp3', '.m4a', '.wav', '.ogg', '.aac']);
const MIME: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};
/** Thư mục mặc định nếu có sẵn trên máy (bộ "Ôn tổng hợp VSTEP bậc 3 (B1)"). */
const DEFAULT_DIRS = ['F:/VSTEP/Doc1/Ôn tổng hợp VSTEP bậc 3 (B1)'];

/** Gọi trước app.whenReady(). */
export function registerVstepScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: VSTEP_SCHEME, privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true } },
  ]);
}

const updatedAtOf = (s: unknown): number => {
  const v = s && typeof s === 'object' ? (s as { updatedAt?: unknown }).updatedAt : 0;
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
};

class VstepService {
  private dirCache: string | null | undefined;

  private async user(): Promise<string> {
    const u = await auth.require();
    if (!(u.features ?? []).includes(FEATURE_VSTEP)) fail('FORBIDDEN', 'Tài khoản chưa được cấp quyền Ôn thi VSTEP.');
    return u._id;
  }

  private localFile(userId: string): string {
    const dir = join(paths.root, 'vstep');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return join(dir, userId.replace(/[^\w-]/g, '_') + '.json');
  }

  private readLocal(userId: string): unknown {
    try {
      return JSON.parse(readFileSync(this.localFile(userId), 'utf8')) as unknown;
    } catch {
      return null;
    }
  }

  async load(): Promise<unknown> {
    const uid = await this.user();
    const local = this.readLocal(uid);
    if (!database.ready) return local ?? {};
    try {
      const remote = await database.vstep().findOne({ _id: uid });
      const lt = updatedAtOf(local);
      const rt = remote?.updatedAt ?? 0;
      if (remote && rt > lt) {
        writeFileSync(this.localFile(uid), JSON.stringify(remote.state));
        return remote.state;
      }
      if (local && lt > rt) await this.push(uid, local);
      return local ?? remote?.state ?? {};
    } catch {
      return local ?? {};
    }
  }

  private async push(uid: string, state: unknown): Promise<boolean> {
    if (!database.ready) return false;
    try {
      const at = updatedAtOf(state);
      // không đè bản mới hơn do máy khác vừa ghi
      await database
        .vstep()
        .updateOne(
          { _id: uid, $or: [{ updatedAt: { $lt: at } }, { updatedAt: { $exists: false } }] },
          { $set: { state, updatedAt: at } },
          { upsert: true },
        )
        .catch((e: { code?: number }) => {
          if (e.code !== 11000) throw e; // trùng _id = bản trên DB mới hơn → bỏ qua
        });
      return true;
    } catch {
      return false;
    }
  }

  async save(state: unknown): Promise<VstepSaveResult> {
    const uid = await this.user();
    if (!state || typeof state !== 'object') fail('VALIDATION', 'Dữ liệu tiến độ không hợp lệ.');
    const json = JSON.stringify(state);
    if (json.length > MAX_STATE)
      fail('VALIDATION', 'Dữ liệu tiến độ quá lớn (tối đa 8 MB). Hãy xoá bớt bộ đề đã nhập.');
    writeFileSync(this.localFile(uid), json);
    const synced = await this.push(uid, state);
    return { savedAt: Date.now(), synced };
  }

  // ---------- thư mục tài liệu ----------

  private get settingsFile(): string {
    return join(paths.root, 'vstep-media.json');
  }

  dir(): string | null {
    if (this.dirCache !== undefined) return this.dirCache;
    let d: string | null = null;
    try {
      const v = JSON.parse(readFileSync(this.settingsFile, 'utf8')) as { dir?: unknown };
      if (typeof v.dir === 'string' && existsSync(v.dir)) d = v.dir;
    } catch {}
    if (!d) d = DEFAULT_DIRS.find((x) => existsSync(x)) ?? null;
    this.dirCache = d ? resolve(d) : null;
    return this.dirCache;
  }

  private scan(dir: string): string[] {
    const out: string[] = [];
    const walk = (d: string, depth: number) => {
      let names: string[] = [];
      try {
        names = readdirSync(d);
      } catch {
        return;
      }
      for (const n of names) {
        if (n.startsWith('.') || n === '_umlab') continue;
        const f = join(d, n);
        let st;
        try {
          st = statSync(f);
        } catch {
          continue;
        }
        if (st.isDirectory()) {
          if (depth < 3) walk(f, depth + 1);
        } else if (AUDIO.has(extname(n).toLowerCase())) out.push(relative(dir, f).split(sep).join('/'));
        if (out.length > 2000) return;
      }
    };
    walk(dir, 0);
    return out.sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
  }

  private count(dir: string): number {
    try {
      return readdirSync(dir).filter((n) => /\.(jpe?g|png|webp)$/i.test(n)).length;
    } catch {
      return 0;
    }
  }

  async media(): Promise<VstepMediaInfo> {
    await this.user();
    const dir = this.dir();
    if (!dir) return { dir: null, audio: [], bookPages: 0, keyPages: 0 };
    return {
      dir,
      audio: this.scan(dir),
      bookPages: this.count(join(dir, '_umlab', 'book')),
      keyPages: this.count(join(dir, '_umlab', 'keys')),
    };
  }

  async pickDir(): Promise<VstepMediaInfo | null> {
    await this.user();
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    const opts: Electron.OpenDialogOptions = {
      title: 'Chọn thư mục tài liệu VSTEP (chứa các tệp MP3)',
      defaultPath: this.dir() ?? undefined,
      properties: ['openDirectory'],
    };
    const r = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts);
    if (r.canceled || !r.filePaths[0]) return null;
    writeFileSync(this.settingsFile, JSON.stringify({ dir: r.filePaths[0] }));
    this.dirCache = resolve(r.filePaths[0]);
    return this.media();
  }

  /** Trình phục vụ giao thức umlab-vstep:// — gọi sau app.whenReady(). */
  handleProtocol(): void {
    protocol.handle(VSTEP_SCHEME, async (req) => {
      const allowed = auth.cachedPublic()?.features?.includes(FEATURE_VSTEP);
      const dir = this.dir();
      if (!allowed || !dir) return new Response('Forbidden', { status: 403 });
      const url = new URL(req.url);
      const rel = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
      const file = resolve(dir, rel);
      if (url.hostname !== 'media' || (file !== dir && !file.startsWith(dir + sep)))
        return new Response('Forbidden', { status: 403 });
      const type = MIME[extname(file).toLowerCase()];
      if (!type || !existsSync(file)) return new Response('Not found', { status: 404 });
      const size = statSync(file).size;
      const range = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') ?? '');
      const headers: Record<string, string> = {
        'Content-Type': type,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=3600',
      };
      if (range && (range[1] || range[2])) {
        const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
        const end = range[1] && range[2] ? Math.min(size - 1, Number(range[2])) : size - 1;
        if (start >= size || start > end)
          return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
        const body = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream<Uint8Array>;
        return new Response(body, {
          status: 206,
          headers: {
            ...headers,
            'Content-Range': `bytes ${start}-${end}/${size}`,
            'Content-Length': String(end - start + 1),
          },
        });
      }
      const body = Readable.toWeb(createReadStream(file)) as ReadableStream<Uint8Array>;
      return new Response(body, { status: 200, headers: { ...headers, 'Content-Length': String(size) } });
    });
  }
}

export const vstep = new VstepService();
