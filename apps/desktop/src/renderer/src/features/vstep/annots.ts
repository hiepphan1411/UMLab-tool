// Nét vẽ + ghi chú trên trang sách / PDF. Lưu tách khỏi tiến độ (tệp + MongoDB riêng) vì có thể lớn.
// Toạ độ chuẩn hoá theo trang: x, y ∈ [0, 1] (nhân 10000, làm tròn → số nguyên để gọn).
import { create } from 'zustand';
import { call, umlab } from '@/lib/api';

export interface Stroke {
  /** Màu hex. */
  c: string;
  /** Độ dày theo phần nghìn chiều rộng trang. */
  w: number;
  /** Bút dạ quang (vẽ mờ, đầu vuông). */
  h?: 1;
  /** x0,y0,x1,y1… (0–10000). */
  p: number[];
}

export interface PageNote {
  id: string;
  x: number;
  y: number;
  t: string;
  c: string;
  at: number;
}

export interface PageAnnot {
  s: Stroke[];
  n: PageNote[];
}

interface AnnotData {
  v: 1;
  pages: Record<string, PageAnnot>;
  updatedAt: number;
}

export type AnnotTool = 'none' | 'pen' | 'hl' | 'erase' | 'note' | 'ocr';

interface AnnotStore {
  data: AnnotData | null;
  tool: AnnotTool;
  color: string;
  size: number;
  load(): Promise<void>;
  page(key: string): PageAnnot;
  setPage(key: string, fn: (p: PageAnnot) => PageAnnot): void;
  setTool(t: Partial<Pick<AnnotStore, 'tool' | 'color' | 'size'>>): void;
}

const EMPTY: PageAnnot = { s: [], n: [] };
let timer: ReturnType<typeof setTimeout> | null = null;

function norm(raw: unknown): AnnotData {
  const r = raw && typeof raw === 'object' ? (raw as Partial<AnnotData>) : {};
  const pages: Record<string, PageAnnot> = {};
  for (const [k, v] of Object.entries(r.pages ?? {})) {
    if (!v || typeof v !== 'object') continue;
    const pv = v as Partial<PageAnnot>;
    pages[k] = {
      s: Array.isArray(pv.s) ? pv.s.filter((x) => x && Array.isArray(x.p)) : [],
      n: Array.isArray(pv.n) ? pv.n.filter((x) => x && typeof x.t === 'string') : [],
    };
  }
  return { v: 1, pages, updatedAt: typeof r.updatedAt === 'number' ? r.updatedAt : 0 };
}

export const useAnnots = create<AnnotStore>((set, get) => ({
  data: null,
  tool: 'none',
  color: '#E5484D',
  size: 3,
  async load() {
    if (get().data) return;
    try {
      set({ data: norm(await call(umlab.vstep.loadAnnots())) });
    } catch {
      set({ data: norm({}) });
    }
  },
  page(key) {
    return get().data?.pages[key] ?? EMPTY;
  },
  setPage(key, fn) {
    const d = get().data;
    if (!d) return;
    const next = fn(d.pages[key] ?? EMPTY);
    const pages = { ...d.pages };
    if (!next.s.length && !next.n.length) delete pages[key];
    else pages[key] = next;
    set({ data: { ...d, pages, updatedAt: Date.now() } });
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const cur = get().data;
      if (cur) void umlab.vstep.saveAnnots(cur);
    }, 1200);
  },
  setTool(t) {
    set(t);
  },
}));

export const ANNOT_COLORS = ['#E5484D', '#2E62E6', '#1F9D66', '#F5A524', '#111111'];

/** Mọi ghi chú (kèm khoá trang) có khoá bắt đầu bằng `prefix` - để liệt kê ghi chú của một cuốn sách/PDF. */
export function notesUnder(data: AnnotData | null, prefix: string): { key: string; note: PageNote }[] {
  if (!data) return [];
  return Object.entries(data.pages)
    .filter(([k]) => k.startsWith(prefix))
    .flatMap(([key, p]) => p.n.map((note) => ({ key, note })))
    .sort((a, b) => b.note.at - a.note.at);
}
