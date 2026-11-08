// Ôn thi VSTEP: chỉ tài khoản được quản trị cấp tính năng "vstep" mới dùng được.
// - Tiến độ + nét vẽ/ghi chú: lưu trên máy (userData/vstep/<userId>[.annots].json) để dùng khi mất mạng + bản trên
//   MongoDB (vstep_progress, vstep_annots) để học tiếp ở máy khác; khi mở lấy bản có updatedAt mới hơn.
// - Tài liệu sách: thư mục trên máy chứa MP3 + ảnh trang sách (_umlab/book, _umlab/keys), phục vụ cho renderer qua
//   umlab-vstep://media/<đường dẫn tương đối> (chặn thoát ra ngoài thư mục, hỗ trợ Range để tua audio).
// - Tài liệu PDF của tôi: đường dẫn lưu trên máy, phục vụ qua umlab-vstep://doc/<id>.
import { BrowserWindow, app, dialog, net, protocol } from 'electron';
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join, relative, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { FEATURE_VSTEP, type VstepDoc, type VstepMediaInfo, type VstepSaveResult } from '@shared/api';
import { auth } from './auth.service';
import { paths } from './config';
import { database } from './db';
import { ocrImage } from './ocr';
import { fail, newId } from './util';

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
  '.pdf': 'application/pdf',
};

/**
 * Thư mục mặc định nếu có sẵn: assets/vstep ở gốc repo (bản dev), resources/vstep (bản cài nếu đóng gói kèm),
 * rồi thư mục gốc của bộ "Ôn tổng hợp VSTEP bậc 3 (B1)".
 */
const defaultDirs = () => [
  join(app.getAppPath(), '..', '..', 'assets', 'vstep'),
  join(process.resourcesPath ?? '', 'vstep'),
  'F:/VSTEP/Doc1/Ôn tổng hợp VSTEP bậc 3 (B1)',
];

type BlobKind = 'state' | 'annots';

/** Gọi trước app.whenReady(). */
export function registerVstepScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: VSTEP_SCHEME,
      privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true, corsEnabled: true },
    },
  ]);
}

const updatedAtOf = (s: unknown): number => {
  const v = s && typeof s === 'object' ? (s as { updatedAt?: unknown }).updatedAt : 0;
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
};

const safeId = (uid: string) => uid.replace(/[^\w-]/g, '_');

class VstepService {
  private dirCache: string | null | undefined;
  private tcache = new Map<string, string>();

  private async user(): Promise<string> {
    const u = await auth.require();
    if (!(u.features ?? []).includes(FEATURE_VSTEP)) fail('FORBIDDEN', 'Tài khoản chưa được cấp quyền Ôn thi VSTEP.');
    return u._id;
  }

  private get folder(): string {
    const dir = join(paths.root, 'vstep');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return dir;
  }

  private localFile(uid: string, kind: BlobKind): string {
    return join(this.folder, safeId(uid) + (kind === 'state' ? '.json' : '.annots.json'));
  }

  private readLocal(uid: string, kind: BlobKind): unknown {
    try {
      return JSON.parse(readFileSync(this.localFile(uid, kind), 'utf8')) as unknown;
    } catch {
      return null;
    }
  }

  private col(kind: BlobKind) {
    return kind === 'state' ? database.vstep() : database.vstepAnnots();
  }

  async load(kind: BlobKind = 'state'): Promise<unknown> {
    const uid = await this.user();
    const local = this.readLocal(uid, kind);
    if (!database.ready) return local ?? {};
    try {
      const remote = await this.col(kind).findOne({ _id: uid });
      const lt = updatedAtOf(local);
      const rt = remote?.updatedAt ?? 0;
      if (remote && rt > lt) {
        writeFileSync(this.localFile(uid, kind), JSON.stringify(remote.state));
        return remote.state;
      }
      if (local && lt > rt) await this.push(uid, local, kind);
      return local ?? remote?.state ?? {};
    } catch {
      return local ?? {};
    }
  }

  private async push(uid: string, state: unknown, kind: BlobKind): Promise<boolean> {
    if (!database.ready) return false;
    try {
      const at = updatedAtOf(state);
      // không đè bản mới hơn do máy khác vừa ghi
      await this.col(kind)
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

  async save(state: unknown, kind: BlobKind = 'state'): Promise<VstepSaveResult> {
    const uid = await this.user();
    if (!state || typeof state !== 'object') fail('VALIDATION', 'Dữ liệu không hợp lệ.');
    const json = JSON.stringify(state);
    if (json.length > MAX_STATE)
      fail(
        'VALIDATION',
        kind === 'state'
          ? 'Dữ liệu tiến độ quá lớn (tối đa 8 MB). Hãy xoá bớt bộ đề đã nhập.'
          : 'Nét vẽ/ghi chú quá nhiều (tối đa 8 MB). Hãy xoá bớt nét vẽ ở các trang cũ.',
      );
    writeFileSync(this.localFile(uid, kind), json);
    const synced = await this.push(uid, state, kind);
    return { savedAt: Date.now(), synced };
  }

  // ---------- tài liệu PDF của tôi (đường dẫn chỉ lưu trên máy này) ----------

  private docsFile(uid: string): string {
    return join(this.folder, safeId(uid) + '.docs.json');
  }

  private readDocs(uid: string): VstepDoc[] {
    try {
      const v = JSON.parse(readFileSync(this.docsFile(uid), 'utf8')) as unknown;
      return Array.isArray(v) ? (v as VstepDoc[]) : [];
    } catch {
      return [];
    }
  }

  private writeDocs(uid: string, docs: VstepDoc[]): void {
    writeFileSync(this.docsFile(uid), JSON.stringify(docs.map(({ missing: _m, ...d }) => d)));
  }

  async listDocs(): Promise<VstepDoc[]> {
    const uid = await this.user();
    return this.readDocs(uid).map((d) => ({ ...d, missing: !existsSync(d.path) }));
  }

  async pickPdf(): Promise<string | null> {
    await this.user();
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    const opts: Electron.OpenDialogOptions = {
      title: 'Chọn tệp PDF để học',
      defaultPath: this.dir() ?? undefined,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
      properties: ['openFile'],
    };
    const r = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts);
    return r.canceled || !r.filePaths[0] ? null : r.filePaths[0];
  }

  async addDoc(input: { name: string; path: string }): Promise<VstepDoc> {
    const uid = await this.user();
    const path = String(input?.path ?? '');
    if (extname(path).toLowerCase() !== '.pdf' || !existsSync(path))
      fail('VALIDATION', 'Hãy chọn một tệp PDF có trên máy.');
    const name =
      String(input?.name ?? '')
        .trim()
        .slice(0, 120) || basename(path, extname(path));
    const doc: VstepDoc = { id: newId('doc', 10), name, path, size: statSync(path).size, addedAt: Date.now() };
    this.writeDocs(uid, [doc, ...this.readDocs(uid)]);
    return doc;
  }

  async updateDoc(id: string, patch: { name?: string; lastPage?: number }): Promise<VstepDoc[]> {
    const uid = await this.user();
    const docs = this.readDocs(uid).map((d) => {
      if (d.id !== id) return d;
      const next = { ...d };
      if (typeof patch.name === 'string' && patch.name.trim()) next.name = patch.name.trim().slice(0, 120);
      if (typeof patch.lastPage === 'number' && Number.isFinite(patch.lastPage))
        next.lastPage = Math.max(1, Math.round(patch.lastPage));
      return next;
    });
    this.writeDocs(uid, docs);
    return docs;
  }

  async removeDoc(id: string): Promise<void> {
    const uid = await this.user();
    this.writeDocs(
      uid,
      this.readDocs(uid).filter((d) => d.id !== id),
    );
  }

  /** Chọn vùng trên trang scan → nhận dạng chữ (Windows OCR). */
  async ocr(png: Uint8Array): Promise<string> {
    await this.user();
    return ocrImage(png);
  }

  // ---------- tra nghĩa trực tuyến (chữ bôi đen không có trong từ điển của app) ----------

  async translate(text: string): Promise<string> {
    await this.user();
    const q = String(text ?? '')
      .trim()
      .slice(0, 300);
    if (!q) return '';
    const key = q.toLowerCase();
    const hit = this.tcache.get(key);
    if (hit) return hit;
    const get = async (url: string): Promise<unknown> => {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 7000);
      try {
        const r = await net.fetch(url, { signal: ctl.signal });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return (await r.json()) as unknown;
      } finally {
        clearTimeout(t);
      }
    };
    let out = '';
    try {
      const j = (await get(
        'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=' + encodeURIComponent(q),
      )) as [[string, string][]];
      out = j[0].map((x) => x[0]).join('');
    } catch {
      try {
        const j = (await get('https://api.mymemory.translated.net/get?langpair=en|vi&q=' + encodeURIComponent(q))) as {
          responseData?: { translatedText?: string };
        };
        out = j.responseData?.translatedText ?? '';
      } catch {
        fail('OFFLINE', 'Không tra được nghĩa (cần kết nối mạng).');
      }
    }
    if (out) this.tcache.set(key, out);
    return out;
  }

  // ---------- thư mục tài liệu sách ----------

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
    if (!d) d = defaultDirs().find((x) => existsSync(x)) ?? null;
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

  /** Trình phục vụ giao thức umlab-vstep:// - gọi sau app.whenReady(). */
  handleProtocol(): void {
    protocol.handle(VSTEP_SCHEME, async (req) => {
      const me = auth.cachedPublic();
      if (!me?.features?.includes(FEATURE_VSTEP)) return new Response('Forbidden', { status: 403 });
      const url = new URL(req.url);
      const rel = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
      let file: string;
      if (url.hostname === 'doc') {
        const doc = this.readDocs(me.id).find((d) => d.id === rel);
        if (!doc) return new Response('Not found', { status: 404 });
        file = doc.path;
      } else {
        const dir = this.dir();
        if (!dir || url.hostname !== 'media') return new Response('Forbidden', { status: 403 });
        file = resolve(dir, rel);
        if (file !== dir && !file.startsWith(dir + sep)) return new Response('Forbidden', { status: 403 });
      }
      const type = MIME[extname(file).toLowerCase()];
      if (!type || !existsSync(file)) return new Response('Not found', { status: 404 });
      const size = statSync(file).size;
      const range = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') ?? '');
      const headers: Record<string, string> = {
        'Content-Type': type,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=3600',
        // renderer chạy ở http://localhost (dev) / file:// (bản cài) → khác nguồn; fetch/XHR (pdf.js) cần CORS
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
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
