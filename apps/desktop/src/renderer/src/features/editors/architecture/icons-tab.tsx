// Tab "Icon" bên trái của sơ đồ kiến trúc (port renderIconsTab của tool cũ): tìm kiếm có từ khoá tiếng Việt,
// lọc Thương hiệu / Chung, kéo icon thả lên thẻ để thay (Shift để thêm), bấm để thêm vào thẻ đang chọn hoặc tạo thẻ mới.
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useStore } from 'zustand';
import { Segmented, toast } from '@/ui';
import type { Engine } from '../engine/engine';
import { createView } from '../engine/ops';
import type { Tx } from '../engine/registry';
import { ALL_ICON_KEYS, IconPreview, cap, iconKeyInfo, iconMatches } from './icons';
import { useArchUi } from './inspector';
import type { CardIcon } from './presets';

export const ICON_MIME = 'text/x-umlab-icon';

/** Đặt icon cho thẻ (thay icon đầu, hoặc thêm khi append) hoặc cho hình Icon đơn. */
export function applyIcon(tx: Tx, viewId: string, key: string, append: boolean): void {
  const v = tx.view(viewId);
  const info = iconKeyInfo(key);
  if (!v || !info) return;
  if (v.shape === 'arch.icon') {
    tx.setViewProps(viewId, { icon: key });
    return;
  }
  const icons = [...(((v.props.icons as CardIcon[]) ?? []).filter(Boolean) as CardIcon[])];
  const item: CardIcon = { k: key, c: info.brand ? undefined : icons[0]?.c || '#3B5F94' };
  if (append || !icons.length) icons.push(item);
  else icons[0] = item;
  tx.setViewProps(viewId, { icons, ...(v.props.layout === 'none' ? { layout: 'left' } : {}) });
}

/** Thẻ mới mang icon (như addFromPayload({icon}) của tool cũ). */
export function createIconCard(e: Engine, key: string, at: [number, number]): string | null {
  const info = iconKeyInfo(key);
  if (!info) return null;
  const w = 190;
  const h = 64;
  return createView(e, 'arch.card', Math.round(at[0] - w / 2), Math.round(at[1] - h / 2), {
    size: { w, h },
    props: {
      title: info.brand ? info.label : cap(info.label),
      subtitle: '',
      icons: [{ k: key, c: info.brand ? undefined : '#3B5F94' }],
      layout: 'left',
    },
  });
}

export function IconsTab({ engine, api }: { engine: Engine; api: { center: () => [number, number] } }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'brand' | 'lucide'>('all');
  const [limit, setLimit] = useState(240);
  const pickFor = useArchUi((s) => s.pickFor);
  const sel = useStore(engine.store, (s) => s.sel);
  const query = q.trim().toLowerCase();
  const list = useMemo(
    () =>
      ALL_ICON_KEYS.filter(
        (k) =>
          (filter === 'all' || k.startsWith(filter) || (filter === 'lucide' && k.startsWith('custom'))) &&
          iconMatches(k, query),
      ),
    [filter, query],
  );
  const onPick = (key: string, shift: boolean) => {
    if (engine.readOnly) return;
    const target = pickFor ?? (sel.size === 1 ? [...sel][0] : null);
    const v = target ? engine.lookup.view(target) : undefined;
    if (v && (v.shape === 'arch.card' || v.shape === 'arch.icon')) {
      engine.apply((tx) => applyIcon(tx, v.id, key, !!pickFor || shift));
      useArchUi.setState({ pickFor: null });
      toast('Đã đặt icon ' + (iconKeyInfo(key)?.label ?? key));
      return;
    }
    createIconCard(engine, key, api.center());
  };
  return (
    <div className="scroll" aria-label="Icon">
      <div
        className="sec"
        style={{ position: 'sticky', top: 0, background: 'var(--panel)', zIndex: 1, paddingBottom: 8 }}
      >
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-muted" />
          <input
            className="field"
            style={{ paddingLeft: 26 }}
            placeholder="Tìm icon: database, camera, thanh toán…"
            value={q}
            aria-label="Tìm icon"
            onChange={(e) => {
              setQ(e.target.value);
              setLimit(240);
            }}
          />
        </div>
        <Segmented
          className="mt-2"
          value={filter}
          onChange={(f) => {
            setFilter(f);
            setLimit(240);
          }}
          options={[
            { value: 'all', label: 'Tất cả' },
            { value: 'brand', label: 'Thương hiệu' },
            { value: 'lucide', label: 'Chung' },
          ]}
        />
        {pickFor && (
          <p className="mt-2 text-[11.5px] text-accent">
            Bấm một icon để thêm vào thẻ đang chọn.{' '}
            <button className="underline" onClick={() => useArchUi.setState({ pickFor: null })}>
              Huỷ
            </button>
          </p>
        )}
      </div>
      <div className="sec" style={{ paddingTop: 0 }}>
        <div className="grid grid-cols-6 gap-1">
          {list.slice(0, limit).map((k) => (
            <div
              key={k}
              className="icell"
              draggable={!engine.readOnly}
              data-icon={k}
              title={iconKeyInfo(k)?.label}
              onDragStart={(e) => {
                e.dataTransfer.setData(ICON_MIME, k);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={(e) => onPick(k, e.shiftKey)}
            >
              <IconPreview k={k} size={20} />
            </div>
          ))}
          {!list.length && <p className="col-span-6 py-4 text-muted">Không có icon khớp “{q}”.</p>}
        </div>
        {list.length > limit && (
          <div className="py-3 text-center">
            <button className="btn outline" onClick={() => setLimit(limit + 480)}>
              Hiện thêm ({list.length - limit} icon)
            </button>
          </div>
        )}
        <p className="pb-3 text-[11px] text-muted" style={{ lineHeight: 1.5 }}>
          Icon chung: Lucide (ISC). Logo thương hiệu: Simple Icons (CC0). Kéo icon lên một thẻ để thay icon, giữ Shift
          khi thả để thêm icon thứ hai.
        </p>
      </div>
    </div>
  );
}
