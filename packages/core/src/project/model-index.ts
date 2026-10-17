// Chỉ mục phần tử mô hình toàn project (docs/phases/P12-model-explorer.md): nơi xuất hiện, xoá khỏi mô hình, phần tử
// mồ côi, nhóm theo loại cho Model Explorer, ma trận truy vết Use Case × sơ đồ, tìm kiếm toàn project.
import type * as Y from 'yjs';
import type { DiagramMeta, ModelElement } from '../format/types';
import { readSpec } from '../spec/doc';
import type { Step } from '../spec/model';
import { searchKey } from '../util/text';
import { connsMap, dataMap, diagramsMap, modelMap, viewsMap } from './ydoc';

export interface ModelUsage {
  diagram: DiagramMeta;
  viewIds: string[];
  connIds: string[];
}

/** Các sơ đồ có hình / đường nối tham chiếu phần tử `modelId`. */
export function modelUsages(doc: Y.Doc, modelId: string): ModelUsage[] {
  const out: ModelUsage[] = [];
  for (const d of diagramsMap(doc).values()) {
    const viewIds = [...viewsMap(doc, d.id).values()].filter((v) => v.modelId === modelId).map((v) => v.id);
    const connIds = [...connsMap(doc, d.id).values()].filter((c) => c.modelId === modelId).map((c) => c.id);
    if (viewIds.length || connIds.length) out.push({ diagram: d, viewIds, connIds });
  }
  return out;
}

/** Số sơ đồ chứa mỗi phần tử (một lượt quét). */
export function usageCounts(doc: Y.Doc): Map<string, number> {
  const out = new Map<string, number>();
  for (const d of diagramsMap(doc).values()) {
    const ids = new Set<string>();
    for (const v of viewsMap(doc, d.id).values()) if (v.modelId) ids.add(v.modelId);
    for (const c of connsMap(doc, d.id).values()) if (c.modelId) ids.add(c.modelId);
    for (const id of ids) out.set(id, (out.get(id) ?? 0) + 1);
  }
  return out;
}

/**
 * Xoá phần tử khỏi mô hình: mọi view (kèm hình con) / đường nối tham chiếu nó ở mọi sơ đồ, đường nối treo vào view
 * bị xoá, rồi chính phần tử. Gọi trong một transaction của người gọi.
 */
export function deleteModelEverywhere(doc: Y.Doc, modelIds: string[]): void {
  const ids = new Set(modelIds);
  for (const d of diagramsMap(doc).values()) {
    const vm = viewsMap(doc, d.id);
    const cm = connsMap(doc, d.id);
    const gone = new Set([...vm.values()].filter((v) => v.modelId && ids.has(v.modelId)).map((v) => v.id));
    if (!gone.size && ![...cm.values()].some((c) => c.modelId && ids.has(c.modelId))) continue;
    // hình con của hình bị xoá
    for (let changed = true; changed;) {
      changed = false;
      for (const v of vm.values())
        if (v.parentId && gone.has(v.parentId) && !gone.has(v.id)) {
          gone.add(v.id);
          changed = true;
        }
    }
    for (const c of cm.values())
      if ((c.modelId && ids.has(c.modelId)) || gone.has(c.source.viewId ?? '') || gone.has(c.target.viewId ?? ''))
        cm.delete(c.id);
    for (const id of gone) vm.delete(id);
  }
  for (const id of ids) modelMap(doc).delete(id);
}

/** Mọi chuỗi trong một giá trị JSON (để biết id nào còn được tham chiếu). */
function collectStrings(v: unknown, out: Set<string>, depth = 0): void {
  if (depth > 12 || v === null || v === undefined) return;
  if (typeof v === 'string') out.add(v);
  else if (Array.isArray(v)) for (const x of v) collectStrings(x, out, depth + 1);
  else if (typeof v === 'object')
    for (const x of Object.values(v as Record<string, unknown>)) collectStrings(x, out, depth + 1);
}

/**
 * Phần tử mồ côi: không còn hình / đường nối nào ở mọi sơ đồ và không được dữ liệu nào khác tham chiếu (đặc tả gắn
 * use case, lifeline gắn class, operationRef, kiểu thuộc tính…).
 */
export function orphanModels(doc: Y.Doc): ModelElement[] {
  const used = new Set<string>();
  const refs = new Set<string>();
  for (const d of diagramsMap(doc).values()) {
    for (const v of viewsMap(doc, d.id).values()) {
      if (v.modelId) used.add(v.modelId);
      collectStrings(v.props, refs);
    }
    for (const c of connsMap(doc, d.id).values()) {
      if (c.modelId) used.add(c.modelId);
      collectStrings(c.props, refs);
    }
    for (const x of dataMap(doc, d.id).values()) collectStrings(x, refs);
  }
  const all = [...modelMap(doc).values()];
  // tham chiếu từ phần tử khác chỉ tính khi phần tử đó còn được dùng
  for (const m of all) if (used.has(m.id)) collectStrings(m.data, refs);
  return all.filter((m) => !used.has(m.id) && !refs.has(m.id));
}

// ---------------------------------------------------------------- nhóm theo loại ----------------------------------

/** Nhóm của Model Explorer theo model kind (thứ tự hiển thị). */
export const MODEL_GROUPS: { id: string; label: string; kinds: string[] }[] = [
  { id: 'packages', label: 'Packages', kinds: ['package', 'uml.package', 'uml.model', 'uml.subject'] },
  { id: 'actors', label: 'Actors', kinds: ['uml.actor'] },
  { id: 'usecases', label: 'Use Cases', kinds: ['uml.usecase'] },
  { id: 'classes', label: 'Classes', kinds: ['uml.class', 'uml.associationClass'] },
  { id: 'interfaces', label: 'Interfaces', kinds: ['uml.interface'] },
  {
    id: 'types',
    label: 'Enumerations & Data Types',
    kinds: ['uml.enumeration', 'uml.datatype', 'uml.primitive', 'uml.signal'],
  },
  {
    id: 'entities',
    label: 'Entities (ERD)',
    kinds: ['erd.entity', 'erd.view', 'erd.resultset', 'erd.procedures', 'erd.triggers', 'erd.sequence'],
  },
  {
    id: 'activities',
    label: 'Activities & Actions',
    kinds: ['uml.activity', 'uml.action', 'uml.objectNode', 'uml.pin', 'uml.parameterNode'],
  },
  { id: 'lifelines', label: 'Lifelines', kinds: ['uml.lifeline'] },
  { id: 'relations', label: 'Relationships', kinds: ['uml.association', 'erd.relationship', 'uml.collaboration'] },
  { id: 'services', label: 'Services', kinds: ['rest.resource'] },
];

export const modelGroupOf = (kind: string) => MODEL_GROUPS.find((g) => g.kinds.includes(kind))?.id ?? 'other';

/** Nhãn ngắn của loại phần tử. */
export function modelKindLabel(kind: string): string {
  const k = kind.replace(/^(uml|erd|rest)\./, '');
  const map: Record<string, string> = {
    usecase: 'Use Case',
    actor: 'Actor',
    class: 'Class',
    associationClass: 'Association Class',
    interface: 'Interface',
    enumeration: 'Enumeration',
    datatype: 'Data Type',
    primitive: 'Primitive Type',
    signal: 'Signal',
    entity: 'Entity',
    lifeline: 'Lifeline',
    action: 'Action',
    activity: 'Activity',
    subject: 'System',
    package: 'Package',
    association: 'Association',
    relationship: 'Relationship',
    resource: 'REST Resource',
  };
  return map[k] ?? k;
}

// ---------------------------------------------------------------- truy vết ----------------------------------------

export interface TraceRow {
  useCase: ModelElement;
  code: string;
  specs: DiagramMeta[];
  activities: DiagramMeta[];
  sequences: DiagramMeta[];
  classes: ModelElement[];
}

const CLASS_KINDS = new Set(['uml.class', 'uml.interface', 'uml.associationClass', 'uml.enumeration', 'uml.datatype']);
const codeOf = (m: ModelElement) => (typeof m.data.code === 'string' ? m.data.code : '');

/** Ma trận Use Case × (Đặc tả, Activity, Sequence, Class liên quan). */
export function traceMatrix(doc: Y.Doc): TraceRow[] {
  const model = [...modelMap(doc).values()];
  const diagrams = [...diagramsMap(doc).values()];
  const classByName = new Map(model.filter((m) => CLASS_KINDS.has(m.kind)).map((m) => [m.name, m]));
  const specOfUc = new Map<string, DiagramMeta[]>();
  for (const d of diagrams.filter((x) => x.type === 'usecase-spec')) {
    const uc = readSpec(doc, d.id).useCaseId;
    if (uc) specOfUc.set(uc, [...(specOfUc.get(uc) ?? []), d]);
  }
  return model
    .filter((m) => m.kind === 'uml.usecase')
    .map((uc): TraceRow => {
      const specs = specOfUc.get(uc.id) ?? [];
      const sids = new Set(specs.map((s) => s.id));
      const gen = (type: string) =>
        diagrams.filter((d) => d.type === type && d.generatedFrom && sids.has(d.generatedFrom.sourceDiagramId));
      const activities = gen('activity');
      const sequences = gen('sequence');
      const classes = new Map<string, ModelElement>();
      for (const s of specs)
        for (const e of readSpec(doc, s.id).entities) {
          const c = (e.classId && modelMap(doc).get(e.classId)) || classByName.get(e.name);
          if (c && CLASS_KINDS.has(c.kind)) classes.set(c.id, c);
        }
      for (const d of sequences)
        for (const v of viewsMap(doc, d.id).values()) {
          const l = v.modelId ? modelMap(doc).get(v.modelId) : undefined;
          const c =
            l?.kind === 'uml.lifeline' && typeof l.data.baseClassifier === 'string'
              ? modelMap(doc).get(l.data.baseClassifier)
              : undefined;
          if (c && CLASS_KINDS.has(c.kind)) classes.set(c.id, c);
        }
      return {
        useCase: uc,
        code: codeOf(uc),
        specs,
        activities,
        sequences,
        classes: [...classes.values()].sort((a, b) => a.name.localeCompare(b.name)),
      };
    })
    .sort(
      (a, b) =>
        (a.code || '~').localeCompare(b.code || '~', undefined, { numeric: true }) ||
        a.useCase.name.localeCompare(b.useCase.name),
    );
}

// ---------------------------------------------------------------- tìm kiếm ----------------------------------------

export interface StepHit {
  diagram: DiagramMeta;
  stepId: string;
  /** "UC03 · bước 2", "UC03 · A1.1". */
  label: string;
  text: string;
}

export interface SearchResult {
  diagrams: DiagramMeta[];
  model: ModelElement[];
  steps: StepHit[];
}

/** Tìm sơ đồ (tên), phần tử mô hình (tên, mã), bước đặc tả (nội dung) — không phân biệt dấu / hoa thường. */
export function searchProject(doc: Y.Doc, q: string, limit = 20): SearchResult {
  const k = searchKey(q);
  const out: SearchResult = { diagrams: [], model: [], steps: [] };
  if (!k) return out;
  const hit = (s: string) => searchKey(s).includes(k);
  out.diagrams = [...diagramsMap(doc).values()].filter((d) => hit(d.name)).slice(0, limit);
  out.model = [...modelMap(doc).values()]
    .filter((m) => m.name && (hit(m.name) || (codeOf(m) && hit(codeOf(m)))))
    .slice(0, limit);
  for (const d of diagramsMap(doc).values()) {
    if (d.type !== 'usecase-spec' || out.steps.length >= limit) continue;
    const spec = readSpec(doc, d.id);
    const uc = modelMap(doc).get(spec.useCaseId);
    const pre = uc && codeOf(uc) ? `${codeOf(uc)} · ` : '';
    const add = (s: Step, label: string) => {
      if (out.steps.length < limit && hit(s.text))
        out.steps.push({ diagram: d, stepId: s.id, label: pre + label, text: s.text });
    };
    for (const s of spec.mainFlow) add(s, `bước ${s.no}`);
    for (const f of [...spec.alternativeFlows, ...spec.exceptionFlows])
      for (const s of f.steps) add(s, `${f.code}.${s.no}`);
  }
  return out;
}
