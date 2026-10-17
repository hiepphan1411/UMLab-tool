import type * as Y from 'yjs';
import { connsMap, diagramsMap, modelMap, viewsMap, type View } from '@umlab/core';
import { drawOrder } from './engine';
import type { EngineLookup } from './registry';

/** Lookup chỉ đọc dựng thẳng từ Y.Doc (ảnh thu nhỏ, xuất nhiều sơ đồ, sinh tự động). */
export function staticLookup(doc: Y.Doc, diagramId: string): EngineLookup {
  const views = new Map(viewsMap(doc, diagramId).entries());
  const conns = new Map(connsMap(doc, diagramId).entries());
  const order = drawOrder(views);
  const kids = new Map<string, View[]>();
  for (const v of order)
    if (v.parentId) {
      const a = kids.get(v.parentId) ?? [];
      a.push(v);
      kids.set(v.parentId, a);
    }
  return {
    doc,
    diagramId,
    view: (id) => (id ? views.get(id) : undefined),
    conn: (id) => (id ? conns.get(id) : undefined),
    model: (id) => (id ? modelMap(doc).get(id) : undefined),
    views: () => order,
    conns: () => [...conns.values()],
    children: (pid) => kids.get(pid) ?? [],
    diagram: (id) => diagramsMap(doc).get(id),
    diagrams: () => [...diagramsMap(doc).values()],
    allModel: () => [...modelMap(doc).values()],
  };
}
