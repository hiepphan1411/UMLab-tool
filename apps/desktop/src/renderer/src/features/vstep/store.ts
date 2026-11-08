// Trạng thái Ôn VSTEP của tài khoản: nạp một lần khi vào mục, mọi thay đổi ghi qua update() và tự lưu (gộp 800 ms)
// xuống main process (tệp trên máy + MongoDB).
import { create } from 'zustand';
import { normVstepState, type VstepState } from '@umlab/core';
import type { VstepMediaInfo } from '@shared/api';
import { call, errorText, umlab } from '@/lib/api';

type SaveState = 'idle' | 'saving' | 'saved' | 'local' | 'error';

interface VstepStore {
  state: VstepState | null;
  error: string | null;
  media: VstepMediaInfo | null;
  save: SaveState;
  load(): Promise<void>;
  update(fn: (s: VstepState) => void): void;
  refreshMedia(): Promise<void>;
  pickMedia(): Promise<void>;
  flush(): Promise<void>;
}

let timer: ReturnType<typeof setTimeout> | null = null;

export const useVstep = create<VstepStore>((set, get) => ({
  state: null,
  error: null,
  media: null,
  save: 'idle',
  async load() {
    try {
      const raw = await call(umlab.vstep.load());
      set({ state: normVstepState(raw), error: null });
    } catch (e) {
      set({ error: errorText(e) });
    }
    void get().refreshMedia();
  },
  update(fn) {
    const cur = get().state;
    if (!cur) return;
    const next = structuredClone(cur);
    fn(next);
    next.updatedAt = Date.now();
    set({ state: next, save: 'saving' });
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void get().flush(), 800);
  },
  async flush() {
    if (timer) clearTimeout(timer);
    timer = null;
    const s = get().state;
    if (!s) return;
    try {
      const r = await call(umlab.vstep.save(s));
      set({ save: r.synced ? 'saved' : 'local' });
    } catch {
      set({ save: 'error' });
    }
  },
  async refreshMedia() {
    try {
      set({ media: await call(umlab.vstep.media()) });
    } catch {
      set({ media: null });
    }
  },
  async pickMedia() {
    const m = await call(umlab.vstep.pickMediaDir());
    if (m) set({ media: m });
  },
}));

window.addEventListener('beforeunload', () => {
  if (timer) void useVstep.getState().flush();
});

/** URL phát tệp trong thư mục tài liệu (đường dẫn tương đối, dấu /). */
export const mediaUrl = (rel: string) =>
  /^https?:\/\//.test(rel) ? rel : 'umlab-vstep://media/' + rel.split('/').map(encodeURIComponent).join('/');

/** Tìm tệp âm thanh theo tên (không phân biệt hoa thường, bỏ qua thư mục con). */
export function findAudio(media: VstepMediaInfo | null, name: string): string | null {
  if (/^https?:\/\//.test(name)) return name;
  if (!media) return null;
  const k = name.toLowerCase();
  return media.audio.find((a) => a.toLowerCase() === k || a.toLowerCase().endsWith('/' + k)) ?? null;
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
