import type * as Y from 'yjs';
import type { DiagramMeta } from '@umlab/core';

type ThumbRenderer = (doc: Y.Doc, d: DiagramMeta) => string | null;
const renderers = new Map<string, ThumbRenderer>();

/** Mỗi loại sơ đồ (engine canvas, Gantt, đặc tả…) đăng ký cách dựng ảnh thu nhỏ SVG của mình. */
export function registerThumbnail(type: string, fn: ThumbRenderer): void {
  renderers.set(type, fn);
}

const cache = new WeakMap<Y.Doc, Map<string, { key: string; svg: string | null }>>();

/** SVG thu nhỏ (320×200) của sơ đồ; cache theo updatedAt để không dựng lại khi không đổi. */
export function renderThumbnail(doc: Y.Doc, d: DiagramMeta): string | null {
  const fn = renderers.get(d.type) ?? renderers.get('*');
  if (!fn) return null;
  let m = cache.get(doc);
  if (!m) cache.set(doc, (m = new Map()));
  const key = d.updatedAt + '|' + d.name;
  const hit = m.get(d.id);
  if (hit && hit.key === key) return hit.svg;
  let svg: string | null = null;
  try {
    svg = fn(doc, d);
  } catch (e) {
    console.warn('[thumbnail]', e);
  }
  m.set(d.id, { key, svg });
  return svg;
}
