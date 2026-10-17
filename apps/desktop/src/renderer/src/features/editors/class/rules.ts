// Kiểm tra Class Diagram (docs/spec/notation-class.md mục 3).
import { uid, type ModelElement, type View } from '@umlab/core';
import type { Issue, Rule, Tx } from '../engine/registry';
import { assocEnds } from './connectors';
import { CLASSIFIER_SHAPES, classData, classifierNames, unknownTypes } from './model';

const classViews = (views: View[]) => views.filter((v) => CLASSIFIER_SHAPES.has(v.shape) && v.modelId);

/** Tạo class mới (phần tử mô hình + hình) bên phải hình `near`. */
export function createClassNear(tx: Tx, near: View, name: string): string {
  const m: ModelElement = {
    id: uid('m'),
    kind: 'uml.class',
    name,
    data: {
      stereotypes: [],
      visibility: '+',
      isAbstract: false,
      isLeaf: false,
      isActive: false,
      templateParams: [],
      attributes: [],
      operations: [],
      literals: [],
      documentation: '',
    },
  };
  tx.addModel(m);
  const id = uid('v');
  const z = Math.max(0, ...tx.lookup.views().map((v) => v.z ?? 0)) + 1;
  tx.addView({
    id,
    shape: 'cls.class',
    modelId: m.id,
    x: near.x + near.w + 80,
    y: near.y,
    w: 160,
    h: 70,
    z,
    parentId: near.parentId,
    props: { autoSize: true },
    style: {},
  });
  return id;
}

export const CLASS_RULES: Rule[] = [
  // trùng tên class trong cùng package
  (r) => {
    const out: Issue[] = [];
    const seen = new Map<string, string>();
    for (const v of classViews(r.views)) {
      const m = r.lookup.model(v.modelId)!;
      const k = (v.parentId ?? '') + '|' + m.name.trim().toLowerCase();
      if (seen.has(k) && seen.get(k) !== m.id)
        out.push({ level: 'warning', message: `Trùng tên class “${m.name}” trong cùng package`, targetId: v.id });
      else seen.set(k, m.id);
    }
    return out;
  },
  // thuộc tính / phương thức trùng; abstract không có phương thức abstract; interface có thuộc tính non-static
  (r) => {
    const out: Issue[] = [];
    const done = new Set<string>();
    for (const v of classViews(r.views)) {
      const m = r.lookup.model(v.modelId)!;
      if (done.has(m.id)) continue;
      done.add(m.id);
      const d = classData(m);
      const an = new Set<string>();
      for (const a of d.attributes) {
        if (an.has(a.name))
          out.push({ level: 'warning', message: `“${m.name}” có thuộc tính trùng tên “${a.name}”`, targetId: v.id });
        an.add(a.name);
      }
      const sig = new Set<string>();
      for (const o of d.operations) {
        const s = `${o.name}(${o.params.map((p) => p.type).join(',')})`;
        if (sig.has(s))
          out.push({ level: 'warning', message: `“${m.name}” có phương thức trùng chữ ký ${s}`, targetId: v.id });
        sig.add(s);
      }
      if (d.isAbstract && v.shape === 'cls.class' && !d.operations.some((o) => o.isAbstract))
        out.push({ level: 'info', message: `Class abstract “${m.name}” chưa có phương thức abstract`, targetId: v.id });
      if (v.shape === 'cls.interface' && d.attributes.some((a) => !a.isStatic))
        out.push({ level: 'warning', message: `Interface “${m.name}” có thuộc tính không static`, targetId: v.id });
    }
    return out;
  },
  // kiểu không tồn tại → sửa nhanh "Tạo class"
  (r) => {
    const out: Issue[] = [];
    const known = new Set(classifierNames(r.lookup));
    const reported = new Set<string>();
    for (const v of classViews(r.views)) {
      const m = r.lookup.model(v.modelId)!;
      const d = classData(m);
      const tps = d.templateParams.map((t) => t.name);
      const types = [
        ...d.attributes.map((a) => a.type),
        ...d.operations.flatMap((o) => [o.returnType, ...o.params.map((p) => p.type)]),
      ];
      for (const t of new Set(types.flatMap((x) => unknownTypes(x, known, tps)))) {
        if (reported.has(t)) continue;
        reported.add(t);
        out.push({
          level: 'warning',
          message: `Kiểu “${t}” (trong ${m.name}) không tồn tại trong project`,
          targetId: v.id,
          fix: { label: `Tạo class ${t}`, run: (tx) => void createClassNear(tx, v, t) },
        });
      }
    }
    return out;
  },
  // một phần thuộc nhiều composition
  (r) => {
    const count = new Map<string, number>();
    for (const c of r.conns) {
      const m = c.modelId ? r.lookup.model(c.modelId) : undefined;
      if (m?.kind !== 'uml.association' || !c.source.viewId || !c.target.viewId) continue;
      const [a, b] = assocEnds(m);
      const part =
        a.aggregation === 'composite' ? c.target.viewId : b.aggregation === 'composite' ? c.source.viewId : null;
      if (part) count.set(part, (count.get(part) ?? 0) + 1);
    }
    return [...count]
      .filter(([, n]) => n > 1)
      .map(([id, n]) => ({
        level: 'warning' as const,
        message: `“${r.lookup.model(r.lookup.view(id)?.modelId)?.name ?? '?'}” là thành phần của ${n} composition`,
        targetId: id,
      }));
  },
];
