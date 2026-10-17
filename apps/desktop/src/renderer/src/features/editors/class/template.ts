// Mẫu "Class UniPark+" khi tạo Class Diagram mới (mô hình ở @umlab/core: unipkClassModel).
import { uid, unipkClassModel, type Connector, type ModelElement, type View } from '@umlab/core';
import type { DiagramInit } from '../editor-registry';

export function unipkClassTemplate(): DiagramInit {
  const views: View[] = [];
  const model: ModelElement[] = [];
  const connectors: Connector[] = [];
  const viewOf = new Map<string, string>();
  let z = 0;
  const { classes, links } = unipkClassModel();
  for (const c of classes) {
    model.push(c.model);
    const enumKind = c.kind === 'enumeration';
    const h = Math.round(
      6 * 2 +
        13.5 * 1.3 +
        11.5 * 1.35 +
        (6 + Math.max(1, c.rows) * 18 + 2) +
        (enumKind ? 0 : 6 + Math.max(1, c.ops) * 18 + 2),
    );
    const id = uid('v');
    viewOf.set(c.model.id, id);
    views.push({
      id,
      shape: enumKind ? 'cls.enum' : 'cls.class',
      modelId: c.model.id,
      x: c.x,
      y: c.y,
      w: 240,
      h,
      z: z++,
      parentId: null,
      props: { autoSize: true },
      style: {},
    });
  }
  for (const l of links) {
    if (l.model) model.push(l.model);
    connectors.push({
      id: uid('c'),
      kind: l.kind,
      modelId: l.model?.id ?? null,
      source: { viewId: viewOf.get(l.from)! },
      target: { viewId: viewOf.get(l.to)! },
      routing: 'orthogonal',
      waypoints: [],
      labels: [],
      props: {},
      style: {},
      z: z++,
    });
  }
  return { views, connectors, model };
}
