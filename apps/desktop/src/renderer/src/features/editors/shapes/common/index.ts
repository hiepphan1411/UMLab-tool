// Nhóm công cụ dùng chung (docs/spec/notation-common.md) — mọi sơ đồ UML ghép COMMON_PALETTE_GROUPS vào cuối palette.
import { toast } from '@/ui';
import { createView, groupSelection } from '../../engine/ops';
import {
  getShape,
  registerDropHandler,
  registerPasteHandler,
  type CanvasInputCtx,
  type PaletteGroup,
} from '../../engine/registry';
import './annotations';
import './organize';
import './drawing';
import { blobToDataUrl, fitSize, normalizeImage } from './helpers';

export { ANNOTATION_SHAPES } from './annotations';
export { genericConnProps, genericLook, polygonPts, calloutPath, diagramInfoRows } from './organize';
export * from './helpers';

/** Palette nhóm chung theo đúng thứ tự spec (A Chú thích · B Yêu cầu · C Tổ chức & tài liệu · D Vẽ tay). */
export const COMMON_PALETTE_GROUPS: PaletteGroup[] = [
  {
    id: 'common-a',
    label: 'Chú thích',
    items: [
      {
        id: 'common.group',
        label: 'Element Group',
        icon: 'element-group',
        action: (e) => {
          if (e.state.sel.size < 2) {
            toast('Chọn từ 2 phần tử trở lên rồi bấm Element Group (Ctrl+G)');
            return;
          }
          groupSelection(e, true);
          toast(`Đã nhóm ${e.state.sel.size} phần tử`);
        },
      },
      { id: 'common.note' },
      { id: 'common.anchor' },
      { id: 'common.constraint' },
      { id: 'common.containment' },
    ],
  },
  {
    id: 'common-b',
    label: 'Yêu cầu',
    items: [{ id: 'common.allocate' }, { id: 'common.rationale' }, { id: 'common.problem' }],
  },
  {
    id: 'common-c',
    label: 'Tổ chức & tài liệu',
    items: [
      {
        id: 'common.package',
        variants: [
          { id: 'common.package', label: 'Package', icon: 'package' },
          {
            id: 'common.package#model',
            label: 'Model',
            icon: 'model',
            preset: { props: { kind: 'model' }, model: { name: 'Model' } },
          },
          {
            id: 'common.package#subsystem',
            label: 'Subsystem',
            icon: 'subsystem',
            preset: { props: { kind: 'subsystem' }, model: { name: 'Subsystem', stereotype: 'subsystem' } },
          },
        ],
      },
      { id: 'common.diagramOverview' },
      { id: 'common.connector' },
      { id: 'common.userStory' },
      { id: 'common.image' },
      { id: 'common.screenCapture' },
      { id: 'common.callout' },
      { id: 'common.rectangle' },
      { id: 'common.oval' },
      { id: 'common.polygon' },
      { id: 'common.line' },
      { id: 'common.textbox' },
      { id: 'common.diagramInfo' },
    ],
  },
  {
    id: 'common-d',
    label: 'Vẽ tay',
    items: [
      { id: 'common.pencil' },
      { id: 'common.pen' },
      { id: 'common.calligraphy' },
      { id: 'common.freeConnector' },
    ],
  },
];

/** Tạo hình ảnh (Image / Screen Capture) từ data URL, đặt tâm tại ctx.at. */
async function placeImage(ctx: CanvasInputCtx, src: string, shape: string, props: Record<string, unknown> = {}) {
  if (!getShape(shape)) return false;
  try {
    const img = await normalizeImage(src);
    const s = fitSize(img.w, img.h, 360);
    const extra = shape === 'common.screenCapture' ? 22 : 0;
    createView(ctx.engine, shape, Math.round(ctx.at[0] - s.w / 2), Math.round(ctx.at[1] - s.h / 2), {
      size: { w: s.w, h: s.h + extra },
      props: { src: img.src, natW: img.w, natH: img.h, ...props },
      parentId: null,
    });
    return true;
  } catch (e) {
    toast(e instanceof Error ? e.message : String(e), { error: true });
    return true;
  }
}

// Kéo tệp ảnh từ Explorer thả vào khung vẽ → Image
registerDropHandler({
  types: ['Files'],
  drop: async (dt, ctx) => {
    const files = [...dt.files].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return false;
    for (const [i, f] of files.entries())
      await placeImage(
        { ...ctx, at: [ctx.at[0] + i * 24, ctx.at[1] + i * 24] },
        await blobToDataUrl(f),
        'common.image',
        { alt: f.name },
      );
    return true;
  },
});

// Ctrl+V khi clipboard hệ thống có ảnh (Win+Shift+S…) → Screen Capture
registerPasteHandler({
  paste: async (items, ctx) => {
    for (const it of items) {
      const t = it.types.find((x) => x.startsWith('image/'));
      if (!t) continue;
      return placeImage(ctx, await blobToDataUrl(await it.getType(t)), 'common.screenCapture', {
        caption: `Dán từ clipboard · ${new Date().toLocaleString('vi-VN')}`,
      });
    }
    return false;
  },
});
