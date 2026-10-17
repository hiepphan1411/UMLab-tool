// Sơ đồ kiến trúc (`architecture`) — port đầy đủ UniPark+ Diagram Studio (docs/phases/P05 mục 5.2).
import { Smile } from 'lucide-react';
import { legacyArchitecture } from '@umlab/core';
import legacyFixture from '@fixtures/unipark-plus.json';
import { toast } from '@/ui';
import { registerDiagramTemplates, registerEditor } from '../editor-registry';
import { CanvasEditor } from '../engine/canvas-editor';
import { registerDropHandler, registerPalette, type PaletteItem } from '../engine/registry';
import { COMMON_PALETTE_GROUPS } from '../shapes/common';
import { ICON_MIME, IconsTab, applyIcon, createIconCard } from './icons-tab';
import { iconKeyInfo } from './icons';
import { CARD_DEFAULTS } from './shapes';
import { GROUP_PRESETS, NODE_PRESETS } from './presets';

// Nhóm / Khung: 6 màu, mặc định Xám như tool cũ
const groupVariants: PaletteItem[] = [1, 0, 2, 3, 4, 5].map((i) => ({
  id: i === 1 ? 'arch.group' : `arch.group#${i}`,
  label: `Nhóm ${GROUP_PRESETS[i].n.toLowerCase()}`,
  icon: 'arch-group',
  preset: { style: { fill: GROUP_PRESETS[i].fill, stroke: GROUP_PRESETS[i].stroke } },
}));

// Thẻ icon trái + 6 kiểu thẻ nhanh
const cardVariants: PaletteItem[] = [
  { id: 'arch.card', label: 'Thẻ icon trái', icon: 'arch-card-left' },
  ...NODE_PRESETS.map((n, i) => ({
    id: `arch.card#np${i}`,
    label: n.n,
    icon: 'arch-card-left',
    preset: {
      style: { fill: n.fill, stroke: n.stroke },
      props: { icons: [{ k: 'lucide:server', c: n.ic }] },
    },
  })),
];

registerPalette('architecture', [
  { id: 'arch-group', label: 'Nhóm / Khung', items: [{ id: 'arch.group', variants: groupVariants }] },
  {
    id: 'arch-parts',
    label: 'Thành phần',
    items: [
      { id: 'arch.card', variants: cardVariants },
      {
        id: 'arch.card#top',
        label: 'Thẻ icon trên',
        icon: 'arch-card-top',
        preset: {
          size: { w: 150, h: 120 },
          props: {
            title: '**TênModule**',
            subtitle: '(mô tả)',
            icons: [{ k: 'lucide:box', c: '#B8652F' }],
            layout: 'top',
            titleSize: 13.5,
          },
          style: { fill: '#FCE4D0', stroke: '#E1A06F' },
        },
      },
      {
        id: 'arch.card#db',
        label: 'Cơ sở dữ liệu',
        icon: 'arch-database',
        preset: {
          size: { w: 240, h: 100 },
          props: { title: '**DATABASE**', subtitle: 'Mô tả', icons: [{ k: 'brand:postgresql' }], iconSize: 44 },
          style: { stroke: '#3D6DB5' },
        },
      },
      {
        id: 'common.rectangle#arch',
        label: 'Chữ nhật',
        icon: 'rectangle',
        preset: { size: { w: 160, h: 80 }, props: { text: 'Khối' } },
      },
      {
        id: 'common.oval#arch',
        label: 'Elip',
        icon: 'oval',
        preset: { size: { w: 150, h: 90 }, props: { text: 'Elip' } },
      },
      {
        id: 'common.polygon#diamond',
        label: 'Hình thoi',
        icon: 'diamond',
        preset: { size: { w: 150, h: 110 }, props: { sides: 4, rotation: 0, text: 'Điều kiện?' } },
      },
      { id: 'common.textbox', label: 'Văn bản', icon: 'text-box' },
    ],
  },
  { id: 'arch-icon', label: 'Icon', items: [{ id: 'arch.icon' }] },
  { id: 'arch-link', label: 'Liên kết', items: [{ id: 'arch.link' }] },
  ...COMMON_PALETTE_GROUPS,
]);

// Kéo icon từ tab Icon: thả lên thẻ → thay icon (Shift: thêm); thả chỗ trống → thẻ mới
registerDropHandler({
  types: [ICON_MIME],
  diagramTypes: ['architecture'],
  drop: (dt, ctx) => {
    const key = dt.getData(ICON_MIME);
    if (!key || !iconKeyInfo(key)) return false;
    const t = ctx.target;
    if (t && (t.shape === 'arch.card' || t.shape === 'arch.icon')) {
      ctx.engine.apply((tx) => applyIcon(tx, t.id, key, ctx.shift));
      ctx.engine.select([t.id]);
      toast('Đã đặt icon ' + iconKeyInfo(key)!.label);
    } else createIconCard(ctx.engine, key, ctx.at);
    return true;
  },
});

registerDiagramTemplates('architecture', [
  { id: 'blank', label: 'Trống', description: 'Bắt đầu với khung vẽ trống', build: () => ({}) },
  {
    id: 'unipark',
    label: 'Kiến trúc UniPark+',
    description: 'Mẫu sơ đồ kiến trúc hệ thống bãi giữ xe UniPark+ (từ Diagram Studio cũ)',
    build: () => {
      const a = legacyArchitecture(legacyFixture as Record<string, unknown>);
      return { views: a.views, connectors: a.connectors, canvas: a.canvas };
    },
  },
]);

registerEditor('architecture', (p) => (
  <CanvasEditor
    {...p}
    options={{
      leftTabs: [
        {
          id: 'icons',
          label: 'Icon',
          icon: <Smile />,
          render: (engine, api) => <IconsTab engine={engine} api={api} />,
        },
      ],
    }}
  />
));

export { CARD_DEFAULTS };
