// Thành phần bố cục dùng chung: ngăn kéo bên phải đổi được độ rộng, cột danh sách thu/mở, chế độ tập trung (toàn
// màn hình), và ngữ cảnh "tab đang hiện" (tab ẩn không bắt phím tắt).
import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { create } from 'zustand';
import { cn } from '@/lib/cn';

const read = <T,>(k: string, d: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v == null ? d : (JSON.parse(v) as T);
  } catch {
    return d;
  }
};
const write = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};

// ---------------- chế độ tập trung ----------------

interface FocusState {
  focus: boolean;
  toggle(on?: boolean): void;
}

export const useFocusMode = create<FocusState>((set, get) => ({
  focus: false,
  toggle(on) {
    const next = on ?? !get().focus;
    set({ focus: next });
    try {
      if (next && !document.fullscreenElement) void document.documentElement.requestFullscreen();
      if (!next && document.fullscreenElement) void document.exitFullscreen();
    } catch {}
  },
}));

if (typeof document !== 'undefined')
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && useFocusMode.getState().focus) useFocusMode.setState({ focus: false });
  });

// ---------------- tab đang hiện ----------------

export const TabActiveContext = createContext(true);
export const useTabActive = () => useContext(TabActiveContext);

/** Nghe phím trên window chỉ khi tab đang hiện. */
export function useActiveKeys(handler: (e: KeyboardEvent) => void): void {
  const active = useTabActive();
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!active) return;
    const fn = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest?.('input, textarea, [contenteditable="true"]')) return;
      ref.current(e);
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [active]);
}

// ---------------- cột danh sách thu/mở ----------------

export function SidePane({
  id,
  title,
  children,
  width = 280,
  className,
}: {
  id: string;
  title?: ReactNode;
  children: ReactNode;
  width?: number;
  className?: string;
}) {
  const key = 'umlab.vstep.pane.' + id;
  const [open, setOpen] = useState(() => read(key, true));
  useEffect(() => write(key, open), [key, open]);
  if (!open)
    return (
      <div className="vs-pane-rail">
        <button className="ibtn" title="Mở danh sách" aria-label="Mở danh sách" onClick={() => setOpen(true)}>
          <PanelLeftOpen size={16} />
        </button>
      </div>
    );
  return (
    <aside className={cn('vs-pane', className)} style={{ width }}>
      <div className="vs-pane-head">
        <div className="vs-pane-title">{title}</div>
        <button
          className="ibtn"
          title="Thu gọn danh sách"
          aria-label="Thu gọn danh sách"
          onClick={() => setOpen(false)}
        >
          <PanelLeftClose size={15} />
        </button>
      </div>
      <div className="vs-pane-body">{children}</div>
    </aside>
  );
}

// ---------------- ngăn kéo bên phải ----------------

export function Drawer({
  id,
  title,
  open,
  onClose,
  children,
  actions,
  defaultWidth = 460,
}: {
  id: string;
  title: ReactNode;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
  defaultWidth?: number;
}) {
  const key = 'umlab.vstep.drawer.' + id;
  const [w, setW] = useState(() => read(key, defaultWidth));
  const drag = useRef<{ x: number; w: number } | null>(null);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <aside className="vs-drawer" style={{ width: w }}>
      <div
        className="vs-drawer-grip"
        title="Kéo để đổi độ rộng"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, w };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const max = Math.max(360, window.innerWidth - 320);
          setW(Math.min(max, Math.max(300, drag.current.w + (drag.current.x - e.clientX))));
        }}
        onPointerUp={() => {
          drag.current = null;
          write(key, w);
        }}
      />
      <header className="vs-drawer-head">
        <div className="vs-drawer-title">{title}</div>
        {actions}
        <button className="ibtn" aria-label="Đóng" title="Đóng (Esc)" onClick={onClose}>
          <X size={16} />
        </button>
      </header>
      <div className="vs-drawer-body">{children}</div>
    </aside>
  );
}
