// Tab kiểu Chrome cho mục Ôn VSTEP: mỗi tab nhớ đường dẫn riêng và được giữ sống (ẩn chứ không huỷ) nên chuyển tab tức
// thì, không mất vị trí cuộn / bài đang làm / audio đang phát. Kéo để đổi chỗ, chuột phải để có menu, chuột giữa để đóng.
import {
  BookOpen,
  CalendarDays,
  Ear,
  FileText,
  GitFork,
  Home,
  Languages,
  Library,
  Mic,
  PenLine,
  Pin,
  Plus,
  SpellCheck,
  SquarePen,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { umlab } from '@/lib/api';
import { create } from 'zustand';
import { cn } from '@/lib/cn';
import { openContextMenu, useMenu } from '@/ui';
import { AREA_LABEL, type Area } from './common';

export interface VTab {
  id: string;
  path: string;
  pinned?: boolean;
}

interface TabsState {
  tabs: VTab[];
  active: string;
  /** Ảnh thu nhỏ (data URL) của từng tab - chụp khi tab đang hiện, không lưu xuống đĩa. */
  thumbs: Record<string, string>;
  captureActive(): Promise<void>;
  /** Mở `path`: tìm tab cùng mục thì chuyển sang, không có thì tạo mới (newTab = luôn tạo mới). */
  open(path: string, o?: { newTab?: boolean; match?: string }): VTab;
  activate(id: string): VTab | undefined;
  close(id: string): VTab | undefined;
  closeOthers(id: string): void;
  closeRight(id: string): void;
  duplicate(id: string): VTab | undefined;
  togglePin(id: string): void;
  move(from: string, to: string): void;
  setPath(id: string, path: string): void;
}

const KEY = 'umlab.vstep.tabs';
const MAX = 14;
const newId = () => 't' + Math.random().toString(36).slice(2, 9);

function load(): { tabs: VTab[]; active: string } {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null') as { tabs: VTab[]; active: string } | null;
    if (v?.tabs?.length && v.tabs.every((t) => typeof t.path === 'string' && t.path.startsWith('/vstep')))
      return { tabs: v.tabs, active: v.tabs.some((t) => t.id === v.active) ? v.active : v.tabs[0].id };
  } catch {}
  const t = { id: newId(), path: '/vstep' };
  return { tabs: [t], active: t.id };
}

const pathnameOf = (p: string) => p.split('?')[0];

export const useTabs = create<TabsState>((set, get) => {
  const save = () => {
    const { tabs, active } = get();
    try {
      localStorage.setItem(KEY, JSON.stringify({ tabs, active }));
    } catch {}
  };
  const commit = (patch: Partial<TabsState>) => (set(patch), save());
  return {
    ...load(),
    thumbs: {},
    async captureActive() {
      const el = document.querySelector('.vs-main');
      const id = get().active;
      if (!el || !umlab?.app.capture) return;
      const r = el.getBoundingClientRect();
      // capturePage nhận toạ độ theo DIP = pixel CSS (không nhân devicePixelRatio)
      const img = await umlab.app.capture({ x: r.left, y: r.top, width: r.width, height: r.height }, 360);
      if (img) set({ thumbs: { ...get().thumbs, [id]: img } });
    },
    open(path, o = {}) {
      const { tabs } = get();
      const match = o.match ?? pathnameOf(path);
      if (!o.newTab) {
        const hit = tabs.find((t) => pathnameOf(t.path) === match);
        if (hit) {
          commit({ active: hit.id });
          return hit;
        }
      }
      const t: VTab = { id: newId(), path };
      let next = [...tabs, t];
      // quá nhiều tab → đóng tab cũ nhất không ghim, không phải tab đang mở
      while (next.length > MAX) {
        const i = next.findIndex((x) => !x.pinned && x.id !== get().active && x.id !== t.id);
        if (i < 0) break;
        next = next.filter((_, j) => j !== i);
      }
      commit({ tabs: next, active: t.id });
      return t;
    },
    activate(id) {
      const t = get().tabs.find((x) => x.id === id);
      if (t) commit({ active: id });
      return t;
    },
    close(id) {
      const { tabs, active } = get();
      const i = tabs.findIndex((t) => t.id === id);
      if (i < 0) return undefined;
      let rest = tabs.filter((t) => t.id !== id);
      if (!rest.length) rest = [{ id: newId(), path: '/vstep' }];
      const nextActive =
        id === active ? (rest[Math.min(i, rest.length - 1)] ?? rest[0]) : rest.find((t) => t.id === active)!;
      commit({ tabs: rest, active: nextActive.id });
      return nextActive;
    },
    closeOthers(id) {
      commit({ tabs: get().tabs.filter((t) => t.id === id || t.pinned), active: id });
    },
    closeRight(id) {
      const { tabs, active } = get();
      const i = tabs.findIndex((t) => t.id === id);
      const rest = tabs.filter((t, j) => j <= i || t.pinned);
      commit({ tabs: rest, active: rest.some((t) => t.id === active) ? active : id });
    },
    duplicate(id) {
      const { tabs } = get();
      const i = tabs.findIndex((t) => t.id === id);
      if (i < 0) return undefined;
      const t = { id: newId(), path: tabs[i].path };
      commit({ tabs: [...tabs.slice(0, i + 1), t, ...tabs.slice(i + 1)], active: t.id });
      return t;
    },
    togglePin(id) {
      const tabs = get().tabs.map((t) => (t.id === id ? { ...t, pinned: !t.pinned } : t));
      // tab ghim dồn về đầu
      commit({ tabs: [...tabs.filter((t) => t.pinned), ...tabs.filter((t) => !t.pinned)] });
    },
    move(from, to) {
      const tabs = [...get().tabs];
      const a = tabs.findIndex((t) => t.id === from);
      const b = tabs.findIndex((t) => t.id === to);
      if (a < 0 || b < 0 || a === b) return;
      const [x] = tabs.splice(a, 1);
      tabs.splice(b, 0, x);
      commit({ tabs });
    },
    setPath(id, path) {
      const tabs = get().tabs;
      if (tabs.find((t) => t.id === id)?.path === path) return;
      commit({ tabs: tabs.map((t) => (t.id === id ? { ...t, path } : t)) });
    },
  };
});

const AREA_ICON: Record<string, ReactNode> = {
  listening: <Ear />,
  reading: <BookOpen />,
  writing: <PenLine />,
  speaking: <Mic />,
  grammar: <SpellCheck />,
  vocab: <Languages />,
  plan: <CalendarDays />,
  mindmap: <GitFork />,
  library: <Library />,
  docs: <SquarePen />,
  quiz: <FileText />,
};

const TAB_LABEL: Record<string, string> = {
  doc: 'Tài liệu',
  book: 'Sách',
  tracks: 'Sách',
  practice: 'Luyện tập',
  progress: 'Tiến độ',
  cards: 'Thẻ từ',
};

export interface TabInfo {
  title: string;
  icon: ReactNode;
}

/** Tiêu đề + icon của tab theo đường dẫn. `names` tra tên bộ đề / tài liệu PDF. */
export function tabInfo(path: string, names: (kind: 'set' | 'doc', id: string) => string | undefined): TabInfo {
  const [pathname, search = ''] = path.split('?');
  const sp = new URLSearchParams(search);
  const seg = pathname
    .replace(/^\/vstep\/?/, '')
    .split('/')
    .filter(Boolean);
  if (!seg.length) return { title: 'Tổng quan', icon: <Home /> };
  const [a, b] = seg;
  switch (a) {
    case 'plan':
      return { title: 'Lịch học', icon: AREA_ICON.plan };
    case 'mindmap':
      return { title: 'Sơ đồ tư duy', icon: AREA_ICON.mindmap };
    case 'library':
      return { title: 'Kho đề', icon: AREA_ICON.library };
    case 'docs':
      return {
        title: b ? (names('doc', decodeURIComponent(b)) ?? 'Tài liệu PDF') : 'Tài liệu của tôi',
        icon: AREA_ICON.docs,
      };
    case 'quiz':
      return { title: names('set', decodeURIComponent(b ?? '')) ?? 'Làm đề', icon: AREA_ICON.quiz };
    default: {
      if (!(a in AREA_LABEL)) return { title: 'Ôn VSTEP', icon: <Home /> };
      const tab = sp.get('tab') ?? 'doc';
      const n = sp.get('n');
      const extra = tab === 'tracks' && n ? `Track ${n}` : (TAB_LABEL[tab] ?? '');
      return { title: `${AREA_LABEL[a as Area]}${extra ? ' - ' + extra : ''}`, icon: AREA_ICON[a] };
    }
  }
}

export function TabBar({
  names,
  onActivate,
  onNew,
}: {
  names: (k: 'set' | 'doc', id: string) => string | undefined;
  onActivate: (t: VTab) => void;
  onNew: () => void;
}) {
  const { tabs, active } = useTabs();
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);
  const thumbs = useTabs((s) => s.thumbs);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bar = useRef<HTMLDivElement>(null);
  const S = useTabs.getState;
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  const menuOpen = useMenu((m) => !!m.entries);
  const enterTab = (id: string, el: HTMLElement) => {
    if (timer.current) clearTimeout(timer.current);
    // đang mở menu chuột phải → không hiện popup xem trước (tránh chồng lên menu)
    if (useMenu.getState().entries) return;
    const r = el.getBoundingClientRect();
    const show = () =>
      !useMenu.getState().entries &&
      setHover({ id, x: Math.min(window.innerWidth - 300, Math.max(8, r.left)), y: r.bottom + 6 });
    // đã mở popup cho tab khác → chuyển ngay như Chrome, chưa mở → chờ một nhịp
    if (hover) show();
    else timer.current = setTimeout(show, 450);
  };
  const leaveTab = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setHover(null), 120);
  };

  const close = (id: string) => {
    const t = S().close(id);
    if (t && id === active) onActivate(t);
  };

  return (
    <div
      className="vt-tabs no-drag"
      ref={bar}
      role="tablist"
      onWheel={(e) => {
        if (bar.current) bar.current.scrollLeft += e.deltaY;
      }}
      onMouseEnter={() => void S().captureActive()}
    >
      {tabs.map((t) => {
        const info = tabInfo(t.path, names);
        return (
          <div
            key={t.id}
            role="tab"
            aria-selected={t.id === active}
            tabIndex={0}
            title={info.title}
            draggable
            className={cn(
              'vt-tab',
              t.id === active && 'on',
              t.pinned && 'pinned',
              over === t.id && dragId !== t.id && 'over',
              dragId === t.id && 'dragging',
            )}
            onClick={() => {
              setHover(null);
              if (t.id !== active) void S().captureActive();
              const x = S().activate(t.id);
              if (x) onActivate(x);
            }}
            onMouseEnter={(e) => enterTab(t.id, e.currentTarget)}
            onMouseLeave={leaveTab}
            onAuxClick={(e) => {
              if (e.button === 1 && !t.pinned) close(t.id);
            }}
            onMouseDown={(e) => e.button === 1 && e.preventDefault()}
            onDragStart={(e) => {
              setHover(null);
              setDragId(t.id);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(t.id);
            }}
            onDragLeave={() => setOver((o) => (o === t.id ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId) S().move(dragId, t.id);
              setDragId(null);
              setOver(null);
            }}
            onDragEnd={() => (setDragId(null), setOver(null))}
            onContextMenu={(e) => {
              if (timer.current) clearTimeout(timer.current);
              setHover(null);
              const idx = tabs.findIndex((x) => x.id === t.id);
              openContextMenu(e, [
                { label: 'Tab mới', icon: <Plus />, onSelect: onNew },
                {
                  label: 'Nhân bản tab',
                  onSelect: () => {
                    const d = S().duplicate(t.id);
                    if (d) onActivate(d);
                  },
                },
                { label: t.pinned ? 'Bỏ ghim tab' : 'Ghim tab', icon: <Pin />, onSelect: () => S().togglePin(t.id) },
                { type: 'sep' },
                { label: 'Đóng tab', icon: <X />, disabled: !!t.pinned, onSelect: () => close(t.id) },
                {
                  label: 'Đóng các tab khác',
                  disabled: tabs.length < 2,
                  onSelect: () => {
                    S().closeOthers(t.id);
                    onActivate(t);
                  },
                },
                {
                  label: 'Đóng các tab bên phải',
                  disabled: idx >= tabs.length - 1,
                  onSelect: () => {
                    const was = S().active;
                    S().closeRight(t.id);
                    if (S().active !== was) onActivate(t);
                  },
                },
              ]);
            }}
          >
            <span className="vt-tab-ic">{info.icon}</span>
            {!t.pinned && <span className="vt-tab-t">{info.title}</span>}
            {!t.pinned && (
              <button
                className="vt-tab-x"
                aria-label="Đóng tab"
                onClick={(e) => {
                  e.stopPropagation();
                  close(t.id);
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>
        );
      })}
      <button className="vt-tab-new" aria-label="Tab mới" title="Tab mới (Ctrl+T)" onClick={onNew}>
        <Plus size={15} />
      </button>
      {hover &&
        !dragId &&
        !menuOpen &&
        (() => {
          const t = tabs.find((x) => x.id === hover.id);
          if (!t) return null;
          const info = tabInfo(t.path, names);
          return createPortal(
            <div
              className="vt-peek"
              style={{ left: hover.x, top: hover.y }}
              onMouseEnter={() => timer.current && clearTimeout(timer.current)}
              onMouseLeave={leaveTab}
            >
              <div className="vt-peek-head">
                <span className="vt-tab-ic">{info.icon}</span>
                <b>{info.title}</b>
              </div>
              <div className="vt-peek-sub">
                {t.id === active ? 'Tab đang mở' : t.pinned ? 'Tab đã ghim' : 'Bấm để chuyển sang tab này'}
              </div>
              {thumbs[t.id] ? (
                <img className="vt-peek-img" src={thumbs[t.id]} alt="" draggable={false} />
              ) : (
                <div className="vt-peek-empty">Mở tab này một lần để có ảnh xem trước</div>
              )}
            </div>,
            document.body,
          );
        })()}
    </div>
  );
}
