// Đặc tả trong Y.Doc: `data:<diagramId>` lưu mỗi trường cấp 1 một khoá `f:<trường>` (project/ydoc.ts) —
// hai người sửa hai phần khác nhau (luồng chính / quy tắc nghiệp vụ…) không đè nhau.
import type * as Y from 'yjs';
import { connsMap, dataMap, decodeData, diagramsMap, modelMap, viewsMap } from '../project/ydoc';
import { clone, jsonEqual } from '../util/json';
import { normSpec, type UseCaseSpec } from './model';
import type { SpecContext } from './render';

export function readSpec(doc: Y.Doc, diagramId: string): UseCaseSpec {
  return normSpec(decodeData('usecase-spec', Object.fromEntries(dataMap(doc, diagramId).entries())) ?? {});
}

/** Ghi các trường đã đổi; tăng `version` khi nội dung đổi. Trả về true nếu có ghi. */
export function writeSpec(doc: Y.Doc, diagramId: string, next: UseCaseSpec, origin?: unknown): boolean {
  const m = dataMap(doc, diagramId);
  const cur = readSpec(doc, diagramId);
  const keys = (Object.keys(next) as (keyof UseCaseSpec)[]).filter(
    (k) => k !== 'version' && !jsonEqual(cur[k], next[k]),
  );
  const removed = (Object.keys(cur) as (keyof UseCaseSpec)[]).filter((k) => !(k in next));
  if (!keys.length && !removed.length) return false;
  doc.transact(() => {
    for (const k of keys) m.set('f:' + k, clone(next[k]));
    for (const k of removed) m.delete('f:' + k);
    m.set('f:version', (cur.version || 0) + 1);
  }, origin);
  return true;
}

const ucLabelOf = (doc: Y.Doc) => (id: string) => {
  const m = modelMap(doc).get(id);
  if (!m) return '(use case đã xoá)';
  const code = typeof m.data.code === 'string' ? m.data.code : '';
  return `${code} ${m.name}`.trim();
};

export function specContext(doc: Y.Doc, spec: UseCaseSpec): SpecContext {
  const uc = modelMap(doc).get(spec.useCaseId);
  return {
    code: typeof uc?.data.code === 'string' ? uc.data.code : '',
    name: uc?.name ?? '(chưa gắn use case)',
    actorName: (id) => modelMap(doc).get(id)?.name ?? '(actor đã xoá)',
    useCaseLabel: ucLabelOf(doc),
  };
}

/**
 * Thông tin rút từ các Use Case Diagram trong project: actor nối với use case (người dùng → chính,
 * hệ thống ngoài / thiết bị → phụ), use case được include, use case có quan hệ extend.
 */
export function deriveFromDiagrams(doc: Y.Doc, useCaseId: string) {
  const primary = new Set<string>();
  const secondary = new Set<string>();
  const includes = new Set<string>();
  const extendsSet = new Set<string>();
  for (const d of diagramsMap(doc).values()) {
    if (d.type !== 'usecase') continue;
    const vm = viewsMap(doc, d.id);
    const mine = new Set([...vm.values()].filter((v) => v.modelId === useCaseId).map((v) => v.id));
    if (!mine.size) continue;
    const modelOf = (viewId: string | null) => (viewId ? (vm.get(viewId)?.modelId ?? null) : null);
    for (const c of connsMap(doc, d.id).values()) {
      const s = c.source.viewId;
      const t = c.target.viewId;
      if (!s || !t) continue;
      const other = mine.has(s) ? t : mine.has(t) ? s : null;
      if (!other) continue;
      const om = modelOf(other);
      if (!om) continue;
      if (c.kind === 'uc.association' && vm.get(other)?.shape === 'uc.actor') {
        const a = modelMap(doc).get(om);
        (a && a.data.type && a.data.type !== 'user' ? secondary : primary).add(om);
      }
      if (c.kind === 'uc.include' && mine.has(s)) includes.add(om);
      if (c.kind === 'uc.extend') extendsSet.add(om);
    }
  }
  return { primary: [...primary], secondary: [...secondary], includes: [...includes], extends: [...extendsSet] };
}
