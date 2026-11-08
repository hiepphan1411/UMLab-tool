// "Tài liệu của tôi": tạo tài liệu học từ tệp PDF (đặt tên + chọn tệp), mở xem từng trang bằng pdf.js, vẽ / ghi chú
// trực tiếp lên trang (lưu theo trang, đồng bộ cùng tài khoản). Đường dẫn tệp chỉ lưu trên máy này.
import {
  ArrowLeft,
  FilePlus2,
  FileText,
  FolderOpen,
  List,
  Minus,
  Pencil,
  Plus,
  StickyNote,
  Trash2,
} from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { create } from 'zustand';
import type { VstepDoc } from '@shared/api';
import { call, errorText, umlab } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Button, Dialog, EmptyState, Field, IconButton, Input, confirmDialog, openDialog, promptDialog } from '@/ui';
import { AnnotLayer, AnnotToolbar } from './annot-layer';
import { notesUnder, useAnnots } from './annots';
import { Panel } from './common';
import { ocrRegion, type Region } from './extract';
import { Drawer, useTabActive } from './layout';
import { useVstep } from './store';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

interface DocsState {
  docs: VstepDoc[];
  refresh(): Promise<void>;
}

export const useDocs = create<DocsState>((set) => ({
  docs: [],
  async refresh() {
    try {
      set({ docs: await call(umlab.vstep.docs()) });
    } catch {
      /* chưa có quyền / offline: để trống */
    }
  },
}));

const BOOKS = ['Ôn tổng hợp VSTEP bậc 3 (B1).pdf', 'Scripts và Keys.pdf'];

function CreateDialog({ done }: { done: (d: VstepDoc | null) => void }) {
  const media = useVstep((s) => s.media);
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const sepr = media?.dir?.includes('\\') ? '\\' : '/';
  const pick = async () => {
    const p = await call(umlab.vstep.pickPdf());
    if (p) {
      setPath(p);
      if (!name)
        setName(
          p
            .split(/[\\/]/)
            .pop()!
            .replace(/\.pdf$/i, ''),
        );
    }
  };
  const create = async () => {
    setBusy(true);
    setErr(null);
    try {
      const d = await call(umlab.vstep.addDoc({ name, path }));
      done(d);
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open
      onClose={() => done(null)}
      title="Tạo tài liệu học"
      width={520}
      footer={
        <>
          <Button variant="outline" onClick={() => done(null)}>
            Huỷ
          </Button>
          <Button variant="primary" loading={busy} disabled={!path} onClick={() => void create()}>
            Tạo và mở
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="Tên tài liệu">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ví dụ: Sách ôn VSTEP B1 – phần Nghe"
            autoFocus
          />
        </Field>
        <Field label="Tệp PDF">
          <div className="flex gap-2">
            <Input value={path} readOnly placeholder="Chưa chọn tệp" />
            <Button icon={<FolderOpen />} onClick={() => void pick()}>
              Chọn…
            </Button>
          </div>
        </Field>
        {media?.dir && (
          <div className="grid gap-1.5">
            <span className="text-muted">Hoặc chọn nhanh sách trong thư mục tài liệu:</span>
            <div className="flex flex-wrap gap-1.5">
              {BOOKS.map((b) => (
                <button
                  key={b}
                  className="vs-chip"
                  onClick={() => {
                    setPath(media.dir + sepr + b);
                    setName(b.replace(/\.pdf$/i, ''));
                  }}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        )}
        {err && <p className="text-danger">{err}</p>}
      </div>
    </Dialog>
  );
}

export async function createDocFlow(nav: (p: string) => void) {
  const d = await openDialog<VstepDoc>((done) => <CreateDialog done={done} />);
  if (!d) return;
  await useDocs.getState().refresh();
  nav(`/vstep/docs/${encodeURIComponent(d.id)}`);
}

export function DocsHome() {
  const nav = useNavigate();
  const docs = useDocs((s) => s.docs);
  const annots = useAnnots((s) => s.data);
  useEffect(() => void useDocs.getState().refresh(), []);
  return (
    <div className="vs-page">
      <div className="vs-page-head">
        <h1>Tài liệu của tôi</h1>
        <span className="text-muted">Mở PDF, vẽ và ghi chú thẳng lên trang sách</span>
        <span className="flex-1" />
        <Button variant="primary" icon={<FilePlus2 />} onClick={() => void createDocFlow(nav)}>
          Tạo tài liệu học
        </Button>
      </div>
      {!docs.length ? (
        <Panel>
          <EmptyState
            icon={<FileText size={40} />}
            title="Chưa có tài liệu nào"
            text="Bấm “Tạo tài liệu học”, đặt tên và chọn tệp PDF (ví dụ sách Ôn tổng hợp VSTEP bậc 3)."
          >
            <Button variant="primary" icon={<FilePlus2 />} onClick={() => void createDocFlow(nav)}>
              Tạo tài liệu học
            </Button>
          </EmptyState>
        </Panel>
      ) : (
        <div className="vs-cards">
          {docs.map((d) => {
            const notes = notesUnder(annots, `pdf:${d.id}:`).length;
            return (
              <div
                key={d.id}
                className={cn('vs-card vs-doc-card', d.missing && 'missing')}
                role="button"
                tabIndex={0}
                onClick={() => !d.missing && nav(`/vstep/docs/${encodeURIComponent(d.id)}`)}
              >
                <div className="vs-doc-card-ic">
                  <FileText size={22} />
                </div>
                <div className="vs-card-title">{d.name}</div>
                <div className="vs-card-sub">
                  {d.missing
                    ? 'Không tìm thấy tệp trên máy này'
                    : `${(d.size / 1048576).toFixed(1)} MB${d.lastPage ? `, đang ở trang ${d.lastPage}` : ''}${notes ? `, ${notes} ghi chú` : ''}`}
                </div>
                <div className="vs-doc-card-actions" onClick={(e) => e.stopPropagation()}>
                  <IconButton
                    label="Đổi tên"
                    size="sm"
                    onClick={async () => {
                      const n = await promptDialog({ title: 'Đổi tên tài liệu', label: 'Tên', initial: d.name });
                      if (n) {
                        await call(umlab.vstep.updateDoc(d.id, { name: n }));
                        void useDocs.getState().refresh();
                      }
                    }}
                  >
                    <Pencil size={14} />
                  </IconButton>
                  <IconButton
                    label="Gỡ khỏi danh sách"
                    size="sm"
                    onClick={async () => {
                      if (
                        await confirmDialog({
                          title: 'Gỡ tài liệu?',
                          text: `Gỡ “${d.name}” khỏi danh sách (không xoá tệp PDF, ghi chú vẫn giữ).`,
                          confirmLabel: 'Gỡ',
                          danger: true,
                        })
                      ) {
                        await call(umlab.vstep.removeDoc(d.id));
                        void useDocs.getState().refresh();
                      }
                    }}
                  >
                    <Trash2 size={14} />
                  </IconButton>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------- trình xem PDF ----------------

type PdfDoc = Awaited<ReturnType<typeof pdfjs.getDocument>['promise']>;

const PdfPage = memo(function PdfPage({
  pdf,
  n,
  scale,
  aspect,
  visible,
  docId,
}: {
  pdf: PdfDoc;
  n: number;
  scale: number;
  aspect: number;
  visible: boolean;
  docId: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ratio, setRatio] = useState(aspect);
  const width = Math.round(800 * scale);
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    let task: { cancel(): void; promise: Promise<unknown> } | null = null;
    void pdf.getPage(n).then((page) => {
      if (cancelled || !canvas.current) return;
      const v1 = page.getViewport({ scale: 1 });
      setRatio(v1.height / v1.width);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const vp = page.getViewport({ scale: (width / v1.width) * dpr });
      const c = canvas.current;
      c.width = Math.floor(vp.width);
      c.height = Math.floor(vp.height);
      const ctx = c.getContext('2d');
      if (!ctx) return;
      task = page.render({ canvasContext: ctx, viewport: vp });
      task.promise.catch(() => {});
    });
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [pdf, n, width, visible]);

  // Lấy chữ trong vùng: PDF có lớp chữ → đọc trực tiếp; PDF scan → vẽ lại trang ~2400 px rồi OCR
  const extract = useCallback(
    async (r: Region) => {
      const page = await pdf.getPage(n);
      const vp = page.getViewport({ scale: 1 });
      const tc = await page.getTextContent();
      const lines: string[] = [];
      let line = '';
      let lastY: number | null = null;
      for (const it of tc.items) {
        if (!('str' in it) || !it.str) continue;
        const [vx, vy] = vp.convertToViewportPoint(it.transform[4], it.transform[5]);
        const nx = vx / vp.width;
        const ny = vy / vp.height;
        if (nx < r.x - 0.02 || nx > r.x + r.w || ny < r.y || ny > r.y + r.h + 0.015) continue;
        if (lastY != null && Math.abs(vy - lastY) > 4) {
          lines.push(line.trim());
          line = '';
        }
        line += (line && !line.endsWith(' ') && !it.str.startsWith(' ') ? ' ' : '') + it.str;
        lastY = vy;
      }
      if (line.trim()) lines.push(line.trim());
      const text = lines.join('\n').trim();
      if (text.replace(/\s/g, '').length >= 3) return text;
      const hi = document.createElement('canvas');
      const v2 = page.getViewport({ scale: 2400 / vp.width });
      hi.width = Math.floor(v2.width);
      hi.height = Math.floor(v2.height);
      await page.render({ canvasContext: hi.getContext('2d')!, viewport: v2 }).promise;
      return ocrRegion(hi, r);
    },
    [pdf, n],
  );
  return (
    <div className="pdf-page" data-page={n} style={{ width, height: Math.round(width * ratio) }}>
      {visible ? <canvas ref={canvas} /> : <div className="pdf-ph">Trang {n}</div>}
      <AnnotLayer pageKey={`pdf:${docId}:${n}`} aspect={ratio} extract={extract} />
      <span className="pdf-num">{n}</span>
    </div>
  );
});

export function PdfDocView() {
  const { docId = '' } = useParams();
  const id = decodeURIComponent(docId);
  const nav = useNavigate();
  const doc = useDocs((s) => s.docs.find((d) => d.id === id));
  const annots = useAnnots((s) => s.data);
  const active = useTabActive();
  const [pdf, setPdf] = useState<PdfDoc | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [scale, setScale] = useState(1.1);
  const [aspect, setAspect] = useState(1.414);
  const [cur, setCur] = useState(doc?.lastPage ?? 1);
  const [near, setNear] = useState<Set<number>>(new Set([1]));
  const [notesOpen, setNotesOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const jumped = useRef(false);

  useEffect(() => {
    let alive = true;
    let task: ReturnType<typeof pdfjs.getDocument> | null = null;
    setErr(null);
    // Tự đọc tệp qua giao thức của app (fetch) rồi đưa bytes cho pdf.js: pdf.js chỉ stream tốt với http(s),
    // với giao thức riêng nó dùng XHR và báo "Unexpected server response (0)".
    fetch(`umlab-vstep://doc/${encodeURIComponent(id)}`)
      .then((r) => {
        if (!r.ok)
          throw new Error(r.status === 404 ? 'Không tìm thấy tệp PDF trên máy này.' : `Lỗi đọc tệp (${r.status}).`);
        return r.arrayBuffer();
      })
      .then(async (buf) => {
        if (!alive) return;
        task = pdfjs.getDocument({ data: new Uint8Array(buf) });
        const p = await task.promise;
        if (!alive) return;
        const first = await p.getPage(1);
        const v = first.getViewport({ scale: 1 });
        setAspect(v.height / v.width);
        setPdf(p);
      })
      .catch((e: unknown) => alive && setErr(errorText(e)));
    return () => {
      alive = false;
      void task?.destroy();
    };
  }, [id]);

  // trang đang xem + trang gần (để vẽ) theo vị trí cuộn
  useEffect(() => {
    const el = box.current;
    if (!el || !pdf) return;
    const onScroll = () => {
      const pages = el.querySelectorAll<HTMLElement>('.pdf-page');
      const mid = el.scrollTop + el.clientHeight / 3;
      let best = 1;
      for (const p of pages) if (p.offsetTop <= mid) best = Number(p.dataset.page);
      setCur(best);
      const s = new Set<number>();
      for (let i = best - 2; i <= best + 3; i++) if (i >= 1 && i <= pdf.numPages) s.add(i);
      setNear((old) => (old.size === s.size && [...s].every((x) => old.has(x)) ? old : s));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [pdf, scale]);

  // mở lại đúng trang lần trước
  useEffect(() => {
    if (!pdf || jumped.current || !doc?.lastPage || doc.lastPage < 2) return;
    jumped.current = true;
    setTimeout(() => goto(doc.lastPage!), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdf]);

  // nhớ trang đang đọc
  useEffect(() => {
    if (!pdf) return;
    const t = setTimeout(() => void umlab.vstep.updateDoc(id, { lastPage: cur }), 800);
    return () => clearTimeout(t);
  }, [cur, id, pdf]);

  const goto = (n: number) => {
    const el = box.current?.querySelector<HTMLElement>(`.pdf-page[data-page="${n}"]`);
    if (el && box.current) box.current.scrollTo({ top: el.offsetTop - 12 });
  };

  const notes = useMemo(() => notesUnder(annots, `pdf:${id}:`), [annots, id]);

  useEffect(() => {
    if (!active) return;
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea')) return;
      if (e.key === 'PageDown' || (e.key === 'ArrowRight' && e.altKey)) {
        e.preventDefault();
        goto(Math.min(pdf?.numPages ?? 1, cur + 1));
      }
      if (e.key === 'PageUp' || (e.key === 'ArrowLeft' && e.altKey)) {
        e.preventDefault();
        goto(Math.max(1, cur - 1));
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  if (!doc) return <EmptyState title="Không tìm thấy tài liệu" text="Tài liệu có thể đã bị gỡ khỏi danh sách." />;

  return (
    <div className="pdf-view">
      <div className="pdf-bar">
        <IconButton label="Danh sách tài liệu" onClick={() => nav('/vstep/docs')}>
          <ArrowLeft size={16} />
        </IconButton>
        <b className="truncate">{doc.name}</b>
        <span className="pdf-pg">
          <input
            className="field"
            type="number"
            min={1}
            max={pdf?.numPages ?? 1}
            value={cur}
            onChange={(e) => goto(Math.max(1, Math.min(pdf?.numPages ?? 1, +e.target.value || 1)))}
            aria-label="Trang"
          />
          / {pdf?.numPages ?? '…'}
        </span>
        <IconButton label="Thu nhỏ" size="sm" onClick={() => setScale((s) => Math.max(0.5, +(s - 0.15).toFixed(2)))}>
          <Minus size={14} />
        </IconButton>
        <span className="vs-time">{Math.round(scale * 100)}%</span>
        <IconButton label="Phóng to" size="sm" onClick={() => setScale((s) => Math.min(2.6, +(s + 0.15).toFixed(2)))}>
          <Plus size={14} />
        </IconButton>
        <span className="flex-1" />
        <AnnotToolbar pageKey={`pdf:${id}:${cur}`} />
        <Button
          size="sm"
          variant={notesOpen ? 'primary' : 'outline'}
          icon={<List />}
          onClick={() => setNotesOpen((o) => !o)}
        >
          Ghi chú ({notes.length})
        </Button>
      </div>
      <div className="pdf-body">
        <div className="pdf-scroll" ref={box}>
          {err ? (
            <EmptyState title="Không mở được PDF" text={err} />
          ) : !pdf ? (
            <div className="pdf-loading">Đang mở tài liệu…</div>
          ) : (
            Array.from({ length: pdf.numPages }, (_, i) => i + 1).map((n) => (
              <PdfPage key={n} pdf={pdf} n={n} scale={scale} aspect={aspect} visible={near.has(n)} docId={id} />
            ))
          )}
        </div>
        <Drawer
          id="pdf-notes"
          title="Ghi chú trong tài liệu"
          open={notesOpen}
          onClose={() => setNotesOpen(false)}
          defaultWidth={340}
        >
          {notes.length ? (
            <div className="vs-list">
              {notes.map(({ key, note }) => {
                const page = Number(key.split(':').pop());
                return (
                  <button key={note.id} className="pdf-note-row" onClick={() => goto(page)}>
                    <StickyNote size={14} style={{ color: note.c }} />
                    <span>
                      <b>Trang {page}</b>
                      <span className="pdf-note-t">{note.t || '(trống)'}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-muted">Chọn công cụ Ghi chú trên thanh công cụ rồi bấm vào trang để thêm.</p>
          )}
        </Drawer>
      </div>
    </div>
  );
}
