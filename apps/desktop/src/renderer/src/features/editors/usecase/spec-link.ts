// Liên kết Use Case ↔ đặc tả (`usecase-spec`): Tạo đặc tả / Mở đặc tả (docs/spec/notation-usecase.md mục 4).
import { createDiagram, type DiagramMeta, type ModelElement, type View } from '@umlab/core';
import { LOCAL } from '../../workspace/session';
import type { EngineLookup, Tx } from '../engine/registry';

/** Sơ đồ đặc tả của use case (nếu còn tồn tại). */
export function specOf(lookup: EngineLookup, m: ModelElement): DiagramMeta | undefined {
  const id = m.data.specDiagramId;
  if (typeof id !== 'string' || !id) return undefined;
  const d = lookup.diagram(id);
  return d && d.type === 'usecase-spec' ? d : undefined;
}

/** Tạo sơ đồ `usecase-spec` rỗng gắn useCaseId, cùng thư mục với sơ đồ đang mở. Trả về id sơ đồ mới. */
export function createSpec(lookup: EngineLookup, m: ModelElement, apply: (fn: (tx: Tx) => void) => void): string {
  const cur = lookup.diagram(lookup.diagramId);
  const code = typeof m.data.code === 'string' ? m.data.code : '';
  const id = createDiagram(
    lookup.doc,
    'usecase-spec',
    `Đặc tả ${code} ${m.name}`.replace(/\s+/g, ' ').trim(),
    cur?.folderId ?? null,
    LOCAL,
    {
      data: { useCaseId: m.id },
    },
  );
  apply((tx) => tx.setModelData(m.id, { specDiagramId: id }));
  return id;
}

export function specMenu(
  v: View,
  api: { apply: (fn: (tx: Tx) => void) => void; lookup: EngineLookup; open: (diagramId: string) => void },
) {
  const m = v.modelId ? api.lookup.model(v.modelId) : undefined;
  if (!m) return [];
  const spec = specOf(api.lookup, m);
  return spec
    ? [{ label: 'Mở đặc tả', onSelect: () => api.open(spec.id) }]
    : [{ label: 'Tạo đặc tả', onSelect: () => api.open(createSpec(api.lookup, m, api.apply)) }];
}
