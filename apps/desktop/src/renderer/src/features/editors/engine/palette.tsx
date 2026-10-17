import { ChevronsLeft, ChevronsRight, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from 'zustand';
import { umlIcon } from '@umlab/uml-icons';
import { cn } from '@/lib/cn';
import { useTooltip } from '@/ui';
import type { Engine } from './engine';
import { getConnector, getPalette, getShape, type PaletteItem } from './registry';

export const CURSOR_ITEM: PaletteItem = {
  id: 'tool:select',
  label: 'Chọn',
  icon: 'cursor',
  variants: [
    { id: 'tool:select', label: 'Chọn (V)', icon: 'cursor' },
    { id: 'tool:hand', label: 'Kéo khung nhìn (H)', icon: 'hand' },
    { id: 'tool:lasso', label: 'Chọn vùng tự do', icon: 'lasso' },
  ],
};

export function itemLabel(it: PaletteItem): string {
  if (it.label) return it.label;
  return getShape(it.id)?.label ?? getConnector(it.id)?.label ?? it.id;
}
export function itemIcon(it: PaletteItem): string {
  return it.icon ?? getShape(it.id)?.icon ?? getConnector(it.id)?.icon ?? 'missing';
}

export function UmlIcon({ name, size = 16 }: { name: string; size?: number }) {
  const svg = umlIcon(name).replace('<svg ', `<svg width="${size}" height="${size}" `);
  return (
    <span
      className="grid flex-none place-items-center"
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
      aria-hidden
    />
  );
}

const VAR_KEY = 'umlab.palette.variants';
const COLLAPSE_KEY = 'umlab.palette.collapsed';
function readJSON<T>(k: string, d: T): T {
  try {
    return JSON.parse(localStorage.getItem(k) || 'null') ?? d;
  } catch {
    return d;
  }
}

function ToolButton({
  item,
  active,
  sticky,
  collapsed,
  onPick,
  onSticky,
  onFlyout,
  readOnly,
}: {
  item: PaletteItem;
  active: boolean;
  sticky: boolean;
  collapsed: boolean;
  onPick: () => void;
  onSticky: () => void;
  onFlyout: (el: HTMLElement) => void;
  readOnly: boolean;
}) {
  const label = itemLabel(item);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ref = useRef<HTMLButtonElement>(null);
  const tip = useTooltip(collapsed ? label : null);
  const isShape = !!getShape(item.id);
  const disabled = readOnly && !item.id.startsWith('tool:');
  return (
    <button
      ref={ref}
      type="button"
      className={cn('pal-item', active && 'on', sticky && active && 'sticky')}
      data-tool={item.id}
      aria-pressed={active}
      aria-label={label}
      disabled={disabled}
      draggable={isShape && !readOnly}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/x-umlab-tool', item.id);
        e.dataTransfer.effectAllowed = 'copy';
      }}
      onPointerDown={() => {
        if (!item.variants) return;
        hold.current = setTimeout(() => ref.current && onFlyout(ref.current), 400);
      }}
      onPointerUp={() => hold.current && clearTimeout(hold.current)}
      onPointerLeave={() => hold.current && clearTimeout(hold.current)}
      onClick={onPick}
      onDoubleClick={onSticky}
      {...tip}
    >
      <UmlIcon name={itemIcon(item)} />
      {!collapsed && <span className="min-w-0 flex-1 truncate text-left">{label}</span>}
      {item.variants && (
        <span
          className="pal-flyout"
          role="button"
          aria-label={`Biến thể của ${label}`}
          onClick={(e) => {
            e.stopPropagation();
            onFlyout(ref.current!);
          }}
        />
      )}
    </button>
  );
}

/** Palette kiểu Visual Paradigm: Cursor trên cùng, nhóm ngăn bằng đường kẻ, flyout ◢, giữ công cụ (nhấp đúp), tìm kiếm, thu gọn. */
export function Palette({ engine }: { engine: Engine }) {
  const tool = useStore(engine.store, (s) => s.tool);
  const sticky = useStore(engine.store, (s) => s.sticky);
  const groups = useMemo(() => getPalette(engine.diagramType), [engine.diagramType]);
  const [q, setQ] = useState('');
  const [collapsed, setCollapsed] = useState(() => readJSON(COLLAPSE_KEY, false));
  const [chosen, setChosen] = useState<Record<string, string>>(() => readJSON(VAR_KEY, {}));
  const [fly, setFly] = useState<{ item: PaletteItem; rect: DOMRect } | null>(null);

  // preset + connector mặc định cho canvas
  useEffect(() => {
    const walk = (it: PaletteItem) => {
      if (it.preset) engine.presets.set(it.id, it.preset);
      it.variants?.forEach(walk);
    };
    groups.forEach((g) => g.items.forEach(walk));
    if (!engine.defaultConnector) {
      for (const g of groups)
        for (const it of g.items) {
          const id = it.variants ? (it.variants[0]?.id ?? it.id) : it.id;
          if (getConnector(id) && !engine.defaultConnector) engine.defaultConnector = id;
        }
    }
  }, [groups, engine]);

  const all = useMemo(() => [{ id: 'cursor', items: [CURSOR_ITEM] }, ...groups], [groups]);
  const current = (it: PaletteItem): PaletteItem => {
    if (!it.variants) return it;
    const id = chosen[it.id];
    return { ...(it.variants.find((v) => v.id === id) ?? it.variants[0]), variants: it.variants };
  };
  const pick = (id: string, isSticky = false) => {
    engine.set({ tool: id, sticky: isSticky });
  };
  const choose = (parent: PaletteItem, v: PaletteItem) => {
    const n = { ...chosen, [parent.id]: v.id };
    setChosen(n);
    try {
      localStorage.setItem(VAR_KEY, JSON.stringify(n));
    } catch {}
    pick(v.id);
    setFly(null);
  };

  const k = q.trim().toLowerCase();
  const filtered = k
    ? all
        .flatMap((g) => g.items.flatMap((it) => (it.variants ? it.variants : [it])))
        .filter((it) => itemLabel(it).toLowerCase().includes(k) || it.id.toLowerCase().includes(k))
    : null;

  return (
    <div className={cn('palette', collapsed && 'collapsed')} aria-label="Palette">
      <div className="flex items-center gap-1 p-2">
        {!collapsed && (
          <div className="relative flex-1">
            <Search size={13} className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-muted" />
            <input
              className="field"
              style={{ paddingLeft: 24, height: 26 }}
              placeholder="Tìm công cụ…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Tìm công cụ"
            />
          </div>
        )}
        <button
          className="ibtn sm"
          aria-label={collapsed ? 'Mở rộng palette' : 'Thu gọn palette'}
          onClick={() => {
            setCollapsed(!collapsed);
            try {
              localStorage.setItem(COLLAPSE_KEY, JSON.stringify(!collapsed));
            } catch {}
          }}
        >
          {collapsed ? <ChevronsRight /> : <ChevronsLeft />}
        </button>
      </div>
      <div className="scroll px-1.5 pb-3">
        {filtered
          ? filtered.map((it) => (
              <ToolButton
                key={it.id}
                item={it}
                active={tool === it.id}
                sticky={sticky}
                collapsed={collapsed}
                readOnly={engine.readOnly}
                onPick={() => pick(it.id)}
                onSticky={() => pick(it.id, true)}
                onFlyout={() => {}}
              />
            ))
          : all.map((g, gi) => (
              <div key={g.id + gi} className={gi > 0 ? 'mt-1 border-t border-line pt-1' : ''}>
                {g.label && !collapsed && (
                  <div className="px-2 pt-1 pb-0.5 text-[10.5px] font-semibold tracking-wider text-muted uppercase">
                    {g.label}
                  </div>
                )}
                {g.items.map((raw) => {
                  const it = current(raw);
                  const active = tool === it.id || (!!raw.variants && raw.variants.some((v) => v.id === tool));
                  return (
                    <ToolButton
                      key={raw.id}
                      item={it}
                      active={active}
                      sticky={sticky}
                      collapsed={collapsed}
                      readOnly={engine.readOnly}
                      onPick={() => pick(it.id)}
                      onSticky={() => pick(it.id, true)}
                      onFlyout={(el) => setFly({ item: raw, rect: el.getBoundingClientRect() })}
                    />
                  );
                })}
              </div>
            ))}
      </div>
      {fly &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[79]" onPointerDown={() => setFly(null)} />
            <div className="menu" style={{ left: fly.rect.right + 4, top: fly.rect.top - 4 }} role="menu">
              {fly.item.variants!.map((v) => (
                <button
                  key={v.id}
                  className={cn('menu-item', tool === v.id && 'active')}
                  role="menuitem"
                  onClick={() => choose(fly.item, v)}
                >
                  <UmlIcon name={itemIcon(v)} />
                  {itemLabel(v)}
                </button>
              ))}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
