// Kiểm tra Activity Diagram (docs/spec/notation-activity.md mục 3).
import type { Connector, View } from '@umlab/core';
import type { Issue, Rule } from '../engine/registry';
import { ACTION_SHAPES, sideOn, snapToBorder } from './pins';

const PINS = new Set(['act.inputPin', 'act.outputPin', 'act.valuePin', 'act.actionInputPin']);
const FLOWS = new Set(['act.controlFlow', 'act.objectFlow']);
const NODES = new Set([
  ...ACTION_SHAPES,
  'act.acceptTime',
  'act.decision',
  'act.merge',
  'act.fork',
  'act.join',
  'act.final',
  'act.flowFinal',
  'act.object',
  'act.centralBuffer',
  'act.dataStore',
]);
const str = (v: unknown) => (v === undefined || v === null ? '' : String(v));
const guardOf = (c: Connector) =>
  str((c.props as Record<string, unknown>).guard)
    .replace(/^\[|\]$/g, '')
    .trim();

/** Pin / node bám viền → tính như node cha (luồng vào pin = vào action). */
const owner = (r: { lookup: { view(id: string | null | undefined): View | undefined } }, id: string | null) => {
  const v = r.lookup.view(id);
  if (v && (PINS.has(v.shape) || v.shape === 'act.expansionNode') && v.parentId) return v.parentId;
  return id;
};

export const ACTIVITY_RULES: Rule[] = [
  // Initial / Final
  (r) => {
    const out: Issue[] = [];
    const nodes = r.views.filter((v) => NODES.has(v.shape) || v.shape === 'act.initial');
    if (!nodes.length) return out;
    const initials = r.views.filter((v) => v.shape === 'act.initial');
    if (!initials.length) out.push({ level: 'warning', message: 'Sơ đồ chưa có Initial Node' });
    // nhiều Initial trong cùng một Activity (cùng cha)
    const byParent = new Map<string, number>();
    for (const v of initials) byParent.set(v.parentId ?? '', (byParent.get(v.parentId ?? '') ?? 0) + 1);
    for (const [, n] of byParent)
      if (n > 1) out.push({ level: 'info', message: `Có ${n} Initial Node trong cùng một hoạt động` });
    if (!r.views.some((v) => v.shape === 'act.final' || v.shape === 'act.flowFinal'))
      out.push({ level: 'warning', message: 'Sơ đồ chưa có Activity Final / Flow Final' });
    return out;
  },
  // Decision: guard
  (r) => {
    const out: Issue[] = [];
    for (const d of r.views.filter((v) => v.shape === 'act.decision')) {
      const outs = r.conns.filter((c) => FLOWS.has(c.kind) && c.source.viewId === d.id);
      if (outs.length < 2) continue;
      const guards = outs.map(guardOf);
      if (guards.some((g) => !g))
        out.push({ level: 'warning', message: 'Decision có nhánh ra thiếu guard', targetId: d.id });
      if (!guards.some((g) => /^else$/i.test(g)))
        out.push({ level: 'info', message: 'Decision chưa có nhánh [else]', targetId: d.id });
      const seen = new Set<string>();
      for (const g of guards.filter(Boolean)) {
        if (seen.has(g.toLowerCase()))
          out.push({ level: 'warning', message: `Decision có guard trùng nhau [${g}]`, targetId: d.id });
        seen.add(g.toLowerCase());
      }
    }
    return out;
  },
  // Fork / Join cân
  (r) => {
    const forks = r.views.filter((v) => v.shape === 'act.fork');
    const joins = r.views.filter((v) => v.shape === 'act.join');
    if (!forks.length && !joins.length) return [];
    const outs = forks.reduce(
      (s, f) => s + r.conns.filter((c) => FLOWS.has(c.kind) && c.source.viewId === f.id).length,
      0,
    );
    const ins = joins.reduce(
      (s, j) => s + r.conns.filter((c) => FLOWS.has(c.kind) && c.target.viewId === j.id).length,
      0,
    );
    return outs !== ins
      ? [{ level: 'info' as const, message: `Fork/Join không cân: ${outs} nhánh tách, ${ins} nhánh gộp` }]
      : [];
  },
  // node không tới được từ Initial
  (r) => {
    const initials = r.views.filter((v) => v.shape === 'act.initial');
    if (!initials.length) return [];
    const next = new Map<string, string[]>();
    for (const c of r.conns) {
      if (!FLOWS.has(c.kind)) continue;
      const a = owner(r, c.source.viewId);
      const b = owner(r, c.target.viewId);
      if (a && b) next.set(a, [...(next.get(a) ?? []), b]);
    }
    const seen = new Set<string>();
    const st = initials.map((v) => v.id);
    while (st.length) {
      const x = st.pop()!;
      if (seen.has(x)) continue;
      seen.add(x);
      st.push(...(next.get(x) ?? []));
    }
    return r.views
      .filter((v) => NODES.has(v.shape) && !seen.has(v.id))
      .map((v) => ({
        level: 'warning' as const,
        message: `“${(v.modelId && r.lookup.model(v.modelId)?.name) || r.shape(v.shape)?.label}” không tới được từ Initial Node`,
        targetId: v.id,
      }));
  },
  // pin nằm trên viền action
  (r) => {
    const out: Issue[] = [];
    for (const p of r.views.filter((v) => PINS.has(v.shape))) {
      const a = r.lookup.view(p.parentId);
      if (!a || !ACTION_SHAPES.includes(a.shape)) {
        out.push({ level: 'warning', message: 'Pin không gắn vào Action nào', targetId: p.id });
        continue;
      }
      const cx = p.x + p.w / 2;
      const cy = p.y + p.h / 2;
      const side = sideOn(p, a);
      const off =
        side === 'top'
          ? Math.abs(cy - a.y)
          : side === 'bottom'
            ? Math.abs(cy - a.y - a.h)
            : side === 'left'
              ? Math.abs(cx - a.x)
              : Math.abs(cx - a.x - a.w);
      const inside = cx >= a.x - 1 && cx <= a.x + a.w + 1 && cy >= a.y - 1 && cy <= a.y + a.h + 1;
      if (off > 2 || !inside)
        out.push({
          level: 'warning',
          message: 'Pin không nằm trên viền Action',
          targetId: p.id,
          fix: { label: 'Đưa lên viền', run: (tx) => tx.setView(p.id, snapToBorder(p, a)) },
        });
    }
    return out;
  },
];
