import { ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';

export interface TreeNode {
  id: string;
  label: string;
  icon?: ReactNode;
  isFolder?: boolean;
  children?: TreeNode[];
  /** Chữ mờ bên phải (đường dẫn, số lượng…). */
  hint?: string;
  bold?: boolean;
  draggable?: boolean;
}

export type DropPosition = 'before' | 'after' | 'inside';

export interface TreeProps {
  nodes: TreeNode[];
  expanded: Set<string>;
  onToggle: (id: string, open: boolean) => void;
  selected: Set<string>;
  onSelect: (ids: Set<string>, focus: string) => void;
  onOpen?: (id: string) => void;
  onContextMenu?: (e: MouseEvent, id: string | null) => void;
  onMove?: (ids: string[], targetId: string | null, pos: DropPosition) => void;
  canDrop?: (ids: string[], targetId: string, pos: DropPosition) => boolean;
  renamingId?: string | null;
  onRename?: (id: string, name: string) => void;
  onRenameEnd?: () => void;
  onRequestRename?: (id: string) => void;
  onDelete?: (ids: string[]) => void;
  indent?: number;
  ariaLabel?: string;
  emptyText?: ReactNode;
}

interface Row {
  node: TreeNode;
  depth: number;
  parentId: string | null;
}

function flatten(
  nodes: TreeNode[],
  expanded: Set<string>,
  depth = 0,
  parentId: string | null = null,
  out: Row[] = [],
): Row[] {
  for (const n of nodes) {
    out.push({ node: n, depth, parentId });
    if (n.children && n.children.length && expanded.has(n.id)) flatten(n.children, expanded, depth + 1, n.id, out);
  }
  return out;
}

const ROW_H = 28;
/** Từ số hàng này trở lên chỉ render các hàng trong khung nhìn (cây thư mục lớn). */
export const VIRTUAL_MIN_ROWS = 300;

const scrollParentOf = (el: HTMLElement | null): HTMLElement | null => {
  for (let e = el?.parentElement; e; e = e.parentElement) {
    const o = getComputedStyle(e).overflowY;
    if (o === 'auto' || o === 'scroll') return e;
  }
  return null;
};

/** Cây có chọn nhiều, bàn phím (↑↓←→ Enter F2 Delete), kéo thả trước/sau/vào trong, đổi tên tại chỗ. */
export function Tree(p: TreeProps) {
  const { nodes, expanded, selected, indent = 14 } = p;
  const rows = useMemo(() => flatten(nodes, expanded), [nodes, expanded]);
  const [focus, setFocus] = useState<string | null>(null);
  const anchor = useRef<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  // ---------- cuộn ảo ----------
  const virtual = rows.length >= VIRTUAL_MIN_ROWS;
  const [win, setWin] = useState({ start: 0, end: 80 });
  const geom = () => {
    const sp = scrollParentOf(box.current);
    if (!sp || !box.current) return null;
    const off = box.current.getBoundingClientRect().top - sp.getBoundingClientRect().top + sp.scrollTop;
    return { sp, off };
  };
  useEffect(() => {
    if (!virtual) return;
    const g = geom();
    if (!g) return;
    const update = () => {
      const start = Math.max(0, Math.floor((g.sp.scrollTop - g.off) / ROW_H) - 15);
      const end = start + Math.ceil(g.sp.clientHeight / ROW_H) + 30;
      setWin((w) => (w.start === start && w.end === end ? w : { start, end }));
    };
    update();
    g.sp.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      g.sp.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [virtual, rows.length]);
  const shown = virtual ? rows.slice(win.start, win.end) : rows;
  const scrollToRow = (j: number, id: string) => {
    const g = virtual ? geom() : null;
    if (!g) {
      box.current?.querySelector(`[data-tid="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'nearest' });
      return;
    }
    const top = g.off + j * ROW_H;
    if (top < g.sp.scrollTop) g.sp.scrollTop = top;
    else if (top + ROW_H > g.sp.scrollTop + g.sp.clientHeight) g.sp.scrollTop = top + ROW_H - g.sp.clientHeight;
  };
  const [drag, setDrag] = useState<{
    ids: string[];
    label: string;
    x: number;
    y: number;
    target: string | null;
    pos: DropPosition | null;
  } | null>(null);
  const dragStart = useRef<{ id: string; x: number; y: number; pointerId: number } | null>(null);

  useEffect(() => {
    if (focus && !rows.some((r) => r.node.id === focus)) setFocus(null);
  }, [rows, focus]);

  const index = (id: string | null) => rows.findIndex((r) => r.node.id === id);

  const click = (e: MouseEvent, id: string) => {
    let next: Set<string>;
    if (e.shiftKey && anchor.current) {
      const a = index(anchor.current);
      const b = index(id);
      next = new Set(rows.slice(Math.min(a, b), Math.max(a, b) + 1).map((r) => r.node.id));
    } else if (e.ctrlKey || e.metaKey) {
      next = new Set(selected);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      anchor.current = id;
    } else {
      next = new Set([id]);
      anchor.current = id;
    }
    setFocus(id);
    p.onSelect(next, id);
  };

  const onKey = (e: KeyboardEvent) => {
    if (p.renamingId) return;
    const i = index(focus);
    const cur = rows[i];
    const go = (j: number) => {
      const k = Math.max(0, Math.min(rows.length - 1, j));
      const r = rows[k];
      if (!r) return;
      setFocus(r.node.id);
      anchor.current = r.node.id;
      p.onSelect(new Set([r.node.id]), r.node.id);
      scrollToRow(k, r.node.id);
    };
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      go(i < 0 ? 0 : i + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      go(i < 0 ? 0 : i - 1);
    } else if (e.key === 'ArrowRight' && cur) {
      e.preventDefault();
      if (cur.node.isFolder && !expanded.has(cur.node.id)) p.onToggle(cur.node.id, true);
      else if (cur.node.isFolder) go(i + 1);
    } else if (e.key === 'ArrowLeft' && cur) {
      e.preventDefault();
      if (cur.node.isFolder && expanded.has(cur.node.id)) p.onToggle(cur.node.id, false);
      else if (cur.parentId) go(index(cur.parentId));
    } else if (e.key === 'Enter' && cur) {
      e.preventDefault();
      if (cur.node.isFolder) p.onToggle(cur.node.id, !expanded.has(cur.node.id));
      else p.onOpen?.(cur.node.id);
    } else if (e.key === 'F2' && cur) {
      e.preventDefault();
      p.onRequestRename?.(cur.node.id);
    } else if (e.key === 'Delete' && selected.size) {
      e.preventDefault();
      p.onDelete?.([...selected]);
    }
  };

  // ---------- kéo thả ----------
  const hitTest = (x: number, y: number, ids: string[]): { target: string | null; pos: DropPosition | null } => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-tid]');
    if (!el) {
      const inBox = box.current && box.current.contains(document.elementFromPoint(x, y));
      return inBox ? { target: null, pos: 'inside' } : { target: null, pos: null };
    }
    const id = el.dataset.tid!;
    const row = rows.find((r) => r.node.id === id);
    if (!row) return { target: null, pos: null };
    const r = el.getBoundingClientRect();
    const k = (y - r.top) / r.height;
    let pos: DropPosition = row.node.isFolder
      ? k < 0.28
        ? 'before'
        : k > 0.72
          ? 'after'
          : 'inside'
      : k < 0.5
        ? 'before'
        : 'after';
    if (ids.includes(id)) return { target: null, pos: null };
    if (p.canDrop && !p.canDrop(ids, id, pos)) {
      if (pos === 'inside') pos = k < 0.5 ? 'before' : 'after';
      if (!p.canDrop(ids, id, pos)) return { target: null, pos: null };
    }
    return { target: id, pos };
  };

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const h = hitTest(e.clientX, e.clientY, drag.ids);
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY, ...h } : d));
    };
    const up = () => {
      setDrag((d) => {
        if (d && d.pos) p.onMove?.(d.ids, d.target, d.pos);
        return null;
      });
    };
    const esc = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setDrag(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, { once: true });
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('keydown', esc);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.ids]);

  return (
    <div
      ref={box}
      role="tree"
      aria-label={p.ariaLabel}
      aria-multiselectable
      tabIndex={0}
      className="min-h-full pb-6 outline-none"
      onKeyDown={onKey}
      onContextMenu={(e) => {
        if (!(e.target as Element).closest('[data-tid]')) p.onContextMenu?.(e, null);
      }}
    >
      {!rows.length && p.emptyText}
      {virtual && <div style={{ height: win.start * ROW_H }} aria-hidden />}
      {shown.map(({ node, depth }) => {
        const open = expanded.has(node.id);
        const isDropIn = drag?.target === node.id && drag.pos === 'inside';
        return (
          <div key={node.id} className="relative">
            {drag?.target === node.id && drag.pos !== 'inside' && (
              <div
                className="pointer-events-none absolute right-1 z-10 h-0.5 rounded bg-accent"
                style={{
                  left: 6 + depth * indent,
                  top: drag.pos === 'before' ? -1 : undefined,
                  bottom: drag.pos === 'after' ? -1 : undefined,
                }}
              />
            )}
            <div
              data-tid={node.id}
              role="treeitem"
              aria-expanded={node.isFolder ? open : undefined}
              aria-selected={selected.has(node.id)}
              className={cn(
                'tree-row',
                selected.has(node.id) && 'on',
                focus === node.id && 'focus',
                isDropIn && 'drop-in',
              )}
              style={{ paddingLeft: 4 + depth * indent }}
              onPointerDown={(e) => {
                if (e.button !== 0 || node.draggable === false || p.renamingId === node.id) return;
                dragStart.current = { id: node.id, x: e.clientX, y: e.clientY, pointerId: e.pointerId };
              }}
              onPointerMove={(e) => {
                const s = dragStart.current;
                if (!s || drag || !p.onMove) return;
                if (Math.hypot(e.clientX - s.x, e.clientY - s.y) < 5) return;
                const ids = selected.has(s.id) ? [...selected] : [s.id];
                if (!selected.has(s.id)) p.onSelect(new Set([s.id]), s.id);
                dragStart.current = null;
                setDrag({
                  ids,
                  label: ids.length > 1 ? `${ids.length} mục` : node.label,
                  x: e.clientX,
                  y: e.clientY,
                  target: null,
                  pos: null,
                });
              }}
              onPointerUp={() => (dragStart.current = null)}
              onClick={(e) => click(e, node.id)}
              onDoubleClick={() => (node.isFolder ? p.onToggle(node.id, !open) : p.onOpen?.(node.id))}
              onContextMenu={(e) => {
                if (!selected.has(node.id)) {
                  p.onSelect(new Set([node.id]), node.id);
                  anchor.current = node.id;
                }
                setFocus(node.id);
                p.onContextMenu?.(e, node.id);
              }}
            >
              <span
                className="tree-twist"
                onClick={(e) => {
                  if (!node.isFolder) return;
                  e.stopPropagation();
                  p.onToggle(node.id, !open);
                }}
              >
                {node.isFolder && (
                  <ChevronRight
                    size={14}
                    style={{ transform: open ? 'rotate(90deg)' : undefined, transition: 'transform .12s' }}
                  />
                )}
              </span>
              {node.icon && <span className="grid flex-none place-items-center text-muted">{node.icon}</span>}
              {p.renamingId === node.id ? (
                <RenameInput
                  initial={node.label}
                  onDone={(v) => {
                    if (v != null && v.trim() && v !== node.label) p.onRename?.(node.id, v.trim());
                    p.onRenameEnd?.();
                  }}
                />
              ) : (
                <span className={cn('nm', node.bold && 'font-semibold')}>{node.label}</span>
              )}
              {node.hint && <span className="ml-1 max-w-[45%] truncate text-[11px] text-muted">{node.hint}</span>}
            </div>
          </div>
        );
      })}
      {virtual && <div style={{ height: Math.max(0, rows.length - win.end) * ROW_H }} aria-hidden />}
      {drag &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[99] rounded-md border border-line bg-panel px-2 py-1 font-medium shadow-lg"
            style={{ left: drag.x + 12, top: drag.y + 8 }}
          >
            {drag.label}
          </div>,
          document.body,
        )}
    </div>
  );
}

function RenameInput({ initial, onDone }: { initial: string; onDone: (v: string | null) => void }) {
  const [v, setV] = useState(initial);
  const done = useRef(false);
  const finish = (val: string | null) => {
    if (done.current) return;
    done.current = true;
    onDone(val);
  };
  return (
    <input
      className="field"
      style={{ height: 22, padding: '0 4px' }}
      autoFocus
      value={v}
      onFocus={(e) => e.currentTarget.select()}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => finish(v)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') finish(v);
        if (e.key === 'Escape') finish(null);
      }}
    />
  );
}
