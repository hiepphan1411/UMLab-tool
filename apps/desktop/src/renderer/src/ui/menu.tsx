import { ChevronRight } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { create } from 'zustand';

export type MenuEntry =
  | {
      type?: 'item';
      label: string;
      icon?: ReactNode;
      shortcut?: string;
      onSelect?: () => void;
      danger?: boolean;
      disabled?: boolean;
      checked?: boolean;
      children?: MenuEntry[];
    }
  | { type: 'sep' }
  | { type: 'label'; label: string };

type Anchor = { x: number; y: number } | { rect: DOMRect; align?: 'start' | 'end' };

interface MenuState {
  entries: MenuEntry[] | null;
  anchor: Anchor | null;
  open(entries: MenuEntry[], anchor: Anchor): void;
  close(): void;
}

export const useMenu = create<MenuState>((set) => ({
  entries: null,
  anchor: null,
  open: (entries, anchor) => set({ entries, anchor }),
  close: () => set({ entries: null, anchor: null }),
}));

/** Mở menu ngữ cảnh tại toạ độ con trỏ. */
export function openContextMenu(
  e: { clientX: number; clientY: number; preventDefault(): void; stopPropagation?(): void },
  entries: MenuEntry[],
) {
  e.preventDefault();
  e.stopPropagation?.();
  useMenu.getState().open(entries, { x: e.clientX, y: e.clientY });
}

export function openMenuAt(el: Element, entries: MenuEntry[], align: 'start' | 'end' = 'start') {
  useMenu.getState().open(entries, { rect: el.getBoundingClientRect(), align });
}

/** Nút mở menu thả xuống. */
export function DropdownMenu({
  items,
  children,
  align = 'start',
}: {
  items: MenuEntry[] | (() => MenuEntry[]);
  align?: 'start' | 'end';
  children: (p: { onClick: (e: React.MouseEvent) => void; 'aria-haspopup': 'menu' }) => ReactNode;
}) {
  return (
    <>
      {children({
        'aria-haspopup': 'menu',
        onClick: (e) => {
          e.stopPropagation();
          openMenuAt(e.currentTarget, typeof items === 'function' ? items() : items, align);
        },
      })}
    </>
  );
}

const isItem = (e: MenuEntry): e is Extract<MenuEntry, { type?: 'item' }> => !e.type || e.type === 'item';

function MenuList({
  entries,
  anchor,
  depth,
  onDone,
}: {
  entries: MenuEntry[];
  anchor: Anchor;
  depth: number;
  onDone: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [active, setActive] = useState(-1);
  const [sub, setSub] = useState<{ index: number; rect: DOMRect } | null>(null);
  const subTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let left: number;
    let top: number;
    if ('rect' in anchor) {
      if (depth > 0) {
        left = anchor.rect.right + 2;
        top = anchor.rect.top - 4;
        if (left + w > innerWidth - 6) left = anchor.rect.left - w - 2;
      } else {
        left = anchor.align === 'end' ? anchor.rect.right - w : anchor.rect.left;
        top = anchor.rect.bottom + 4;
        if (top + h > innerHeight - 6) top = anchor.rect.top - h - 4;
      }
    } else {
      left = anchor.x;
      top = anchor.y;
      if (left + w > innerWidth - 6) left = anchor.x - w;
      if (top + h > innerHeight - 6) top = Math.max(6, innerHeight - h - 6);
    }
    setPos({ left: Math.max(6, left), top: Math.max(6, top) });
    if (depth === 0) el.focus();
  }, [anchor, depth]);

  const items = entries.map((e, i) => ({ e, i })).filter(({ e }) => isItem(e) && !e.disabled);

  const choose = (idx: number, el?: HTMLElement | null) => {
    const e = entries[idx];
    if (!e || !isItem(e) || e.disabled) return;
    if (e.children) {
      const rect = (el ?? ref.current?.querySelector(`[data-idx="${idx}"]`))?.getBoundingClientRect();
      if (rect) setSub({ index: idx, rect });
      return;
    }
    onDone();
    e.onSelect?.();
  };

  return (
    <>
      <div
        ref={ref}
        className="menu"
        role="menu"
        tabIndex={-1}
        style={pos ?? { left: -9999, top: -9999 }}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          const pos = items.findIndex((x) => x.i === active);
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive(items[(pos + 1) % items.length]?.i ?? -1);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive(items[(pos - 1 + items.length) % items.length]?.i ?? -1);
          } else if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
            e.preventDefault();
            if (active >= 0) choose(active);
          } else if (e.key === 'ArrowLeft' && depth > 0) {
            e.preventDefault();
            onDone();
          }
        }}
      >
        {entries.map((e, i) => {
          if (e.type === 'sep') return <div key={i} className="menu-sep" />;
          if (e.type === 'label')
            return (
              <div key={i} className="menu-label">
                {e.label}
              </div>
            );
          return (
            <button
              key={i}
              data-idx={i}
              role="menuitem"
              disabled={e.disabled}
              className={
                'menu-item' + (e.danger ? ' danger' : '') + (active === i || sub?.index === i ? ' active' : '')
              }
              onMouseEnter={(ev) => {
                setActive(i);
                if (subTimer.current) clearTimeout(subTimer.current);
                const el = ev.currentTarget;
                subTimer.current = setTimeout(
                  () => setSub(e.children ? { index: i, rect: el.getBoundingClientRect() } : null),
                  120,
                );
              }}
              onClick={(ev) => choose(i, ev.currentTarget)}
            >
              <span className="grid w-4 place-items-center" aria-hidden>
                {e.checked ? '✓' : e.icon}
              </span>
              <span className="min-w-0 truncate">{e.label}</span>
              {e.shortcut && <span className="menu-kbd">{e.shortcut}</span>}
              {e.children && <ChevronRight className="ml-auto text-muted" />}
            </button>
          );
        })}
      </div>
      {sub && isItem(entries[sub.index]) && (entries[sub.index] as { children?: MenuEntry[] }).children && (
        <MenuList
          entries={(entries[sub.index] as { children: MenuEntry[] }).children}
          anchor={{ rect: sub.rect }}
          depth={depth + 1}
          onDone={onDone}
        />
      )}
    </>
  );
}

export function MenuHost() {
  const { entries, anchor, close } = useMenu();
  useEffect(() => {
    if (!entries) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as Element).closest?.('.menu')) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    };
    const t = setTimeout(() => {
      window.addEventListener('mousedown', onDown, true);
      window.addEventListener('contextmenu', onDown, true);
    }, 0);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('blur', close);
    window.addEventListener('resize', close);
    return () => {
      clearTimeout(t);
      window.removeEventListener('mousedown', onDown, true);
      window.removeEventListener('contextmenu', onDown, true);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('blur', close);
      window.removeEventListener('resize', close);
    };
  }, [entries, close]);
  if (!entries || !anchor) return null;
  return createPortal(<MenuList entries={entries} anchor={anchor} depth={0} onDone={close} />, document.body);
}
