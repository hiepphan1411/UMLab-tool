import { useEffect, useLayoutEffect, useRef, useState, type FocusEvent, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { create } from 'zustand';

interface TipState {
  text: string | null;
  rect: DOMRect | null;
  tone: 'default' | 'error';
  at: { x: number; y: number } | null;
  show(text: string, rect: DOMRect, tone?: 'default' | 'error'): void;
  showAt(text: string, x: number, y: number, tone?: 'default' | 'error'): void;
  hide(): void;
}

export const useTipStore = create<TipState>((set) => ({
  text: null,
  rect: null,
  tone: 'default',
  at: null,
  show: (text, rect, tone = 'default') => set({ text, rect, tone, at: null }),
  showAt: (text, x, y, tone = 'default') => set({ text, at: { x, y }, rect: null, tone }),
  hide: () => set({ text: null, rect: null, at: null }),
}));

let timer: ReturnType<typeof setTimeout> | null = null;

/** Gắn tooltip vào phần tử: trả về các handler hover/focus. */
export function useTooltip(text: string | null | undefined, delay = 450) {
  if (!text) return {};
  const open = (el: Element) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => useTipStore.getState().show(text, el.getBoundingClientRect()), delay);
  };
  const close = () => {
    if (timer) clearTimeout(timer);
    useTipStore.getState().hide();
  };
  return {
    onMouseEnter: (e: MouseEvent) => open(e.currentTarget),
    onMouseLeave: close,
    onMouseDown: close,
    onFocus: (e: FocusEvent) => {
      if ((e.currentTarget as HTMLElement).matches(':focus-visible')) open(e.currentTarget);
    },
    onBlur: close,
  };
}

export function Tooltip({ text, children }: { text: string; children: React.ReactElement }) {
  const h = useTooltip(text);
  return (
    <span {...h} style={{ display: 'contents' }}>
      {children}
    </span>
  );
}

export function TooltipHost() {
  const { text, rect, at, tone } = useTipStore();
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !text) return setPos(null);
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let left: number;
    let top: number;
    if (at) {
      left = at.x + 14;
      top = at.y + 16;
    } else if (rect) {
      left = rect.left + rect.width / 2 - w / 2;
      top = rect.bottom + 6;
      if (top + h > innerHeight - 6) top = rect.top - h - 6;
    } else return;
    left = Math.max(6, Math.min(innerWidth - w - 6, left));
    top = Math.max(6, Math.min(innerHeight - h - 6, top));
    setPos({ left, top });
  }, [text, rect, at]);
  useEffect(() => {
    const hide = () => useTipStore.getState().hide();
    window.addEventListener('blur', hide);
    window.addEventListener('wheel', hide, { passive: true });
    return () => {
      window.removeEventListener('blur', hide);
      window.removeEventListener('wheel', hide);
    };
  }, []);
  if (!text) return null;
  return createPortal(
    <div
      ref={ref}
      role="tooltip"
      className={'tip' + (tone === 'error' ? ' error' : '')}
      style={pos ?? { left: -9999, top: -9999 }}
    >
      {text}
    </div>,
    document.body,
  );
}
