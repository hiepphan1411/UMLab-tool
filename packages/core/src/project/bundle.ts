import type { DiagramRecord, ModelElement, ProjectBundle } from '../format/types';
import { uid } from '../util/ids';
import { clone } from '../util/json';

/** Thay mọi chuỗi trùng khớp id cũ trong một giá trị JSON (props, data, model.data…) bằng id mới. */
export function remapDeep<T>(value: T, map: Map<string, string>): T {
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') return map.get(v) ?? v;
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') {
      const o: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) o[k] = walk(x);
      return o;
    }
    return v;
  };
  return walk(value) as T;
}

const prefixOf = (id: string, fallback: string) => (/^([a-z]+)_/i.exec(id)?.[1] ?? fallback).slice(0, 6);

/**
 * Sinh lại toàn bộ id (thư mục, sơ đồ, hình, đường nối, phần tử mô hình) và cập nhật mọi tham chiếu —
 * dùng khi nhập project, nhân bản project, tạo từ mẫu. Hai bundle sau đó không đụng nhau.
 */
export function regenerateIds(b: ProjectBundle): ProjectBundle {
  const map = new Map<string, string>();
  const fresh = (old: string, p: string) => {
    if (!map.has(old)) map.set(old, uid(prefixOf(old, p)));
    return map.get(old)!;
  };
  b.folders.forEach((f) => fresh(f.id, 'f'));
  b.model.forEach((m) => fresh(m.id, 'm'));
  b.diagrams.forEach((d) => {
    fresh(d.id, 'dg');
    d.views.forEach((v) => fresh(v.id, 'v'));
    d.connectors.forEach((c) => fresh(c.id, 'c'));
    d.views.forEach((v) => {
      if (v.groupId) fresh(v.groupId, 'grp');
    });
  });
  const out = remapDeep(clone(b), map);
  out.project = { ...out.project, id: '' };
  return out;
}

/** Phần tử mô hình mà một sơ đồ tham chiếu (trực tiếp hoặc qua props/data), để file sơ đồ tự đủ. */
export function referencedModel(d: DiagramRecord, model: ModelElement[]): ModelElement[] {
  const ids = new Set(model.map((m) => m.id));
  const found = new Set<string>();
  const scan = (v: unknown) => {
    if (typeof v === 'string') {
      if (ids.has(v)) found.add(v);
    } else if (Array.isArray(v)) v.forEach(scan);
    else if (v && typeof v === 'object') Object.values(v).forEach(scan);
  };
  scan(d.views);
  scan(d.connectors);
  scan(d.data);
  // phần tử mô hình có thể tham chiếu phần tử khác (association → class, extend → extension point…)
  let grew = true;
  while (grew) {
    const before = found.size;
    for (const m of model) if (found.has(m.id)) scan(m.data);
    grew = found.size > before;
  }
  return model.filter((m) => found.has(m.id));
}

export function emptyBundle(name: string): ProjectBundle {
  return {
    project: { id: '', name, description: '', color: '#2E62E6', icon: 'folder-kanban' },
    folders: [],
    diagrams: [],
    model: [],
    meta: {},
  };
}
