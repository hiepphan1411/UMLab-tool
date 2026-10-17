// Điểm vào engine: đăng ký ảnh thu nhỏ cho mọi sơ đồ canvas.
import { DIAGRAM_TYPE_BY_ID, type DiagramType } from '@umlab/core';
import { registerThumbnail } from '../thumbnails';
import { diagramSVG } from './export';
import { staticLookup } from './static-lookup';

registerThumbnail('*', (doc, d) => {
  const info = DIAGRAM_TYPE_BY_ID[d.type as DiagramType];
  if (info && !info.canvas) return null;
  const lookup = staticLookup(doc, d.id);
  const views = lookup.views();
  if (!views.length) return null;
  return diagramSVG(views, lookup.conns(), lookup, {
    padding: 16,
    bg: d.canvas?.background ?? '#FFFFFF',
    maxW: 320,
    maxH: 200,
  }).svg;
});

export * from './registry';
export * from './engine';
export * from './ops';
export * from './canvas-editor';
export * from './render';
export * from './text';
export * from './geometry';
export { UmlIcon } from './palette';
export { staticLookup } from './static-lookup';
export { diagramSVG, ExportImageDialog, type ExportSource } from './export';
