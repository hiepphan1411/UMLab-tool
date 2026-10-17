// Kiểm tra mô hình Use Case (docs/spec/notation-usecase.md mục 3).
import { createDiagram } from '@umlab/core';
import { LOCAL } from '../../workspace/session';
import type { Issue, Rule } from '../engine/registry';
import { reaches } from './connectors';
import { extPoints } from './shapes';
import { specOf } from './spec-link';

const nameOf = (r: Parameters<Rule>[0], id: string) => {
  const v = r.lookup.view(id);
  const m = v?.modelId ? r.lookup.model(v.modelId) : undefined;
  const code = typeof m?.data.code === 'string' && m.data.code ? m.data.code + ' ' : '';
  return code + (m?.name ?? '?');
};

export const USECASE_RULES: Rule[] = [
  // use case / actor không nối với nhau
  (r) => {
    const out: Issue[] = [];
    const assoc = r.conns.filter((c) => c.kind === 'uc.association');
    const kind = (id: string | null) => (id ? r.lookup.view(id)?.shape : undefined);
    for (const v of r.views) {
      if (v.shape === 'uc.usecase') {
        const withActor = assoc.some(
          (c) =>
            (c.source.viewId === v.id && kind(c.target.viewId) === 'uc.actor') ||
            (c.target.viewId === v.id && kind(c.source.viewId) === 'uc.actor'),
        );
        const reused = r.conns.some(
          (c) =>
            (c.kind === 'uc.include' && c.target.viewId === v.id) ||
            (c.kind === 'uc.extend' && c.source.viewId === v.id) ||
            (c.kind === 'uc.generalization' && c.source.viewId === v.id),
        );
        if (!withActor && !reused)
          out.push({
            level: 'warning',
            message: `Use case “${nameOf(r, v.id)}” chưa nối với actor nào`,
            targetId: v.id,
          });
      }
      if (v.shape === 'uc.actor') {
        const linked = assoc.some((c) => c.source.viewId === v.id || c.target.viewId === v.id);
        const gen = r.conns.some((c) => c.kind === 'uc.generalization' && c.source.viewId === v.id);
        if (!linked && !gen)
          out.push({
            level: 'warning',
            message: `Actor “${nameOf(r, v.id)}” chưa nối với use case nào`,
            targetId: v.id,
          });
      }
    }
    return out;
  },
  // vòng include / generalization
  (r) => {
    const out: Issue[] = [];
    for (const kind of ['uc.include', 'uc.generalization'] as const)
      for (const c of r.conns)
        if (
          c.kind === kind &&
          c.source.viewId &&
          c.target.viewId &&
          reaches(r.lookup, kind, c.target.viewId, c.source.viewId)
        )
          out.push({
            level: 'error',
            message: `Vòng ${kind === 'uc.include' ? 'include' : 'generalization'} qua “${nameOf(r, c.source.viewId)}”`,
            targetId: c.id,
          });
    return out;
  },
  // extend trỏ tới extension point không tồn tại
  (r) =>
    r.conns
      .filter((c) => c.kind === 'uc.extend' && c.props.extensionPoint)
      .filter((c) => {
        const base = r.lookup.view(c.target.viewId);
        const bm = base?.modelId ? r.lookup.model(base.modelId) : undefined;
        return !bm || !extPoints(bm.data).some((e) => e.id === c.props.extensionPoint);
      })
      .map((c) => ({
        level: 'error' as const,
        message: `Extend từ “${nameOf(r, c.source.viewId!)}” chọn extension point không còn trên use case gốc`,
        targetId: c.id,
        fix: { label: 'Bỏ chọn', run: (tx) => tx.setConnProps(c.id, { extensionPoint: '' }) },
      })),
  // trùng tên use case trong cùng System
  (r) => {
    const out: Issue[] = [];
    const seen = new Map<string, string>();
    for (const v of r.views) {
      if (v.shape !== 'uc.usecase') continue;
      const m = v.modelId ? r.lookup.model(v.modelId) : undefined;
      if (!m) continue;
      const k = (v.parentId ?? '') + '|' + m.name.trim().toLowerCase();
      if (seen.has(k) && seen.get(k) !== m.id)
        out.push({ level: 'warning', message: `Trùng tên use case “${m.name}” trong cùng hệ thống`, targetId: v.id });
      else seen.set(k, m.id);
    }
    return out;
  },
  // actor nằm trong ranh giới hệ thống
  (r) =>
    r.views
      .filter((v) => v.shape === 'uc.actor' && v.parentId && r.lookup.view(v.parentId)?.shape === 'uc.system')
      .map((v) => ({
        level: 'warning' as const,
        message: `Actor “${nameOf(r, v.id)}” thường nằm ngoài ranh giới hệ thống`,
        targetId: v.id,
        fix: { label: 'Đưa ra ngoài', run: (tx) => tx.setView(v.id, { parentId: null }) },
      })),
  // use case chưa có đặc tả (thông tin)
  (r) =>
    r.views
      .filter((v) => v.shape === 'uc.usecase' && v.modelId)
      .filter((v) => {
        const m = r.lookup.model(v.modelId);
        return m && !specOf(r.lookup, m);
      })
      .map((v) => ({
        level: 'info' as const,
        message: `“${nameOf(r, v.id)}” chưa có đặc tả`,
        targetId: v.id,
        fix: {
          label: 'Tạo đặc tả',
          run: (tx) => {
            const m = tx.model(v.modelId!);
            if (!m) return;
            const folder = r.lookup.diagram(r.lookup.diagramId)?.folderId ?? null;
            const code = typeof m.data.code === 'string' ? m.data.code : '';
            const id = createDiagram(r.lookup.doc, 'usecase-spec', `Đặc tả ${code} ${m.name}`.trim(), folder, LOCAL, {
              data: { useCaseId: m.id },
            });
            tx.setModelData(m.id, { specDiagramId: id });
          },
        },
      })),
];
