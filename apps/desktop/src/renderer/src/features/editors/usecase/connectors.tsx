// Đường nối của Use Case Diagram (docs/spec/notation-usecase.md mục 2) + luật allow().
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { uid, type Connector, type ModelElement } from '@umlab/core';
import { Checkbox, Select, promptDialog } from '@/ui';
import { registerConnector, type ComputedLabel, type EngineLookup, type Tx, type ViewCtx } from '../engine/registry';
import { extPoints } from './shapes';

type P = Record<string, unknown>;
const str = (v: unknown, d = '') => (v === undefined || v === null ? d : String(v));
const is = (c: ViewCtx, shape: string) => c.view.shape === shape;
const UC = 'uc.usecase';
const ACTOR = 'uc.actor';

/** Có đường đi (theo kind) từ view `from` tới view `to` trong sơ đồ hiện tại? (phát hiện vòng). */
export function reaches(lookup: EngineLookup, kind: string, from: string, to: string): boolean {
  const next = new Map<string, string[]>();
  for (const c of lookup.conns()) {
    if (c.kind !== kind || !c.source.viewId || !c.target.viewId) continue;
    const a = next.get(c.source.viewId) ?? [];
    a.push(c.target.viewId);
    next.set(c.source.viewId, a);
  }
  const seen = new Set<string>();
  const stack = [from];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === to) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    stack.push(...(next.get(cur) ?? []));
  }
  return false;
}

// ---------------- Association ----------------

const MULT = z.enum(['', '1', '0..1', '*', '0..*', '1..*']);
registerConnector({
  kind: 'uc.association',
  label: 'Association',
  icon: 'association',
  look: (c) => ({ line: 'solid', start: 'none', end: (c.props as P).navigable ? 'arrow-open' : 'none' }),
  defaultRouting: 'straight',
  defaultProps: () => ({ name: '', multSource: '', multTarget: '', navigable: false }),
  propsSchema: z.object({
    name: z.string().describe('Tên'),
    multSource: MULT.describe('Multiplicity đầu nguồn|select|opts:=(không)'),
    multTarget: MULT.describe('Multiplicity đầu đích|select|opts:=(không)'),
    navigable: z.boolean().describe('Navigable (mũi tên ở đầu đích)'),
  }),
  labels: (c) => {
    const p = c.props as P;
    const out: ComputedLabel[] = [];
    if (str(p.name)) out.push({ role: 'name', text: str(p.name), pos: 0.5, draggable: true });
    if (str(p.multSource)) out.push({ role: 'multSource', text: str(p.multSource), end: 'source', draggable: true });
    if (str(p.multTarget)) out.push({ role: 'multTarget', text: str(p.multTarget), end: 'target', draggable: true });
    return out;
  },
  allow: (s, t) => {
    if (is(s, ACTOR) && is(t, ACTOR)) return 'Không nối Association giữa hai actor (dùng Generalization)';
    const ok = (c: ViewCtx) => is(c, ACTOR) || is(c, UC);
    if (!ok(s) || !ok(t)) return 'Association nối Actor với Use Case';
    return true;
  },
  warn: (s, t) => (is(s, UC) && is(t, UC) ? 'Association giữa hai use case — nên dùng Include hoặc Extend' : null),
});

// ---------------- Include ----------------

registerConnector({
  kind: 'uc.include',
  label: 'Include',
  icon: 'include',
  look: { line: 'dashed', start: 'none', end: 'arrow-open', stereotype: 'include' },
  defaultRouting: 'straight',
  allow: (s, t) => {
    if (!is(s, UC) || !is(t, UC)) return 'Include chỉ nối giữa hai use case';
    if (s.view.id === t.view.id) return 'Use case không include chính nó';
    return true;
  },
  warn: (s, t, lookup) => (reaches(lookup, 'uc.include', t.view.id, s.view.id) ? 'Tạo thành vòng include' : null),
});

// ---------------- Extend ----------------

function ExtendInspector({
  conn,
  apply,
  lookup,
  readOnly,
}: {
  conn: Connector;
  model: ModelElement | null;
  apply: (fn: (tx: Tx) => void) => void;
  lookup: EngineLookup;
  readOnly: boolean;
}) {
  const p = conn.props as P;
  const base = lookup.view(conn.target.viewId);
  const bm = base?.modelId ? lookup.model(base.modelId) : undefined;
  const eps = bm ? extPoints(bm.data) : [];
  const [cond, setCond] = useState(str(p.condition));
  useEffect(() => setCond(str(p.condition)), [p.condition]);
  const set = (patch: P) => apply((tx) => tx.setConnProps(conn.id, patch));
  const createEp = async () => {
    if (!bm) return;
    const name = await promptDialog({
      title: 'Extension point mới',
      label: `Tên extension point của “${bm.name}”`,
      placeholder: 'VD: Thanh toán thất bại',
    });
    if (!name?.trim()) return;
    const ep = { id: uid('ep'), name: name.trim() };
    apply((tx) => {
      const cur = tx.model(bm.id);
      if (cur) tx.setModelData(bm.id, { extensionPoints: [...extPoints(cur.data), ep] });
      tx.setConnProps(conn.id, { extensionPoint: ep.id });
      if (base) tx.setViewProps(base.id, { showExtensionPoints: true });
    });
  };
  return (
    <div className="pgroup">
      <div className="pgroup-h">Extend</div>
      <div>
        <span className="lbl">Điều kiện (condition)</span>
        <input
          className="field"
          value={cond}
          readOnly={readOnly}
          placeholder="VD: số dư không đủ"
          aria-label="Điều kiện"
          onChange={(e) => setCond(e.target.value)}
          onBlur={() => cond !== str(p.condition) && set({ condition: cond })}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
      </div>
      <div>
        <span className="lbl">Extension point của “{bm?.name ?? 'use case gốc'}”</span>
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <Select
              value={str(p.extensionPoint)}
              disabled={readOnly || !bm}
              aria-label="Extension point"
              onChange={(e) => set({ extensionPoint: e.target.value })}
              options={[{ value: '', label: '(Không chọn)' }, ...eps.map((e) => ({ value: e.id, label: e.name }))]}
            />
          </div>
          {!readOnly && bm && (
            <button className="btn outline" onClick={() => void createEp()}>
              <Plus />
              Tạo mới
            </button>
          )}
        </div>
      </div>
      <Checkbox
        label="Hiện note điều kiện trên đường"
        checked={p.showNote !== false}
        disabled={readOnly}
        onChange={(showNote) => set({ showNote })}
      />
    </div>
  );
}

registerConnector({
  kind: 'uc.extend',
  label: 'Extend',
  icon: 'extend',
  look: { line: 'dashed', start: 'none', end: 'arrow-open', stereotype: 'extend' },
  defaultRouting: 'straight',
  defaultProps: () => ({ condition: '', extensionPoint: '', showNote: true }),
  live: true,
  inspector: ExtendInspector,
  labels: (c, _m, lookup) => {
    const p = c.props as P;
    const out: ComputedLabel[] = [];
    const cond = str(p.condition);
    const base = lookup.view(c.target.viewId);
    const bm = base?.modelId ? lookup.model(base.modelId) : undefined;
    const ep = bm ? extPoints(bm.data).find((e) => e.id === p.extensionPoint) : undefined;
    if (cond) out.push({ role: 'cond', text: `[${cond}]`, pos: 0.5, draggable: true });
    if ((cond || ep) && p.showNote !== false)
      out.push({
        role: 'note',
        note: true,
        text: `Condition: {${cond || '…'}}\nextension point: ${ep?.name ?? '—'}`,
        pos: 0.5,
        draggable: true,
      });
    return out;
  },
  allow: (s, t) => {
    if (!is(s, UC) || !is(t, UC)) return 'Extend chỉ nối giữa hai use case (use case mở rộng → use case gốc)';
    if (s.view.id === t.view.id) return 'Use case không extend chính nó';
    return true;
  },
});

// ---------------- Dependency ----------------

registerConnector({
  kind: 'uc.dependency',
  label: 'Dependency',
  icon: 'dependency',
  look: (c) => {
    const st = str((c.props as P).stereotype).replace(/^«|»$/g, '');
    return { line: 'dashed', start: 'none', end: 'arrow-open', stereotype: st || undefined };
  },
  defaultRouting: 'straight',
  defaultProps: () => ({ name: '', stereotype: '' }),
  propsSchema: z.object({
    name: z.string().describe('Tên'),
    stereotype: z.string().describe('Stereotype (use, trace… hoặc tự nhập)'),
  }),
  labels: (c) =>
    str((c.props as P).name) ? [{ role: 'name', text: str((c.props as P).name), pos: 0.5, draggable: true }] : [],
});

// ---------------- Generalization / Realization ----------------

registerConnector({
  kind: 'uc.generalization',
  label: 'Generalization',
  icon: 'generalization',
  look: { line: 'solid', start: 'none', end: 'triangle-hollow' },
  defaultRouting: 'straight',
  allow: (s, t, lookup) => {
    const same = (is(s, ACTOR) && is(t, ACTOR)) || (is(s, UC) && is(t, UC));
    if (!same) return 'Generalization chỉ nối Actor → Actor hoặc Use Case → Use Case (con → cha)';
    if (s.view.id === t.view.id) return 'Phần tử không kế thừa chính nó';
    if (reaches(lookup, 'uc.generalization', t.view.id, s.view.id)) return 'Tạo thành vòng kế thừa';
    return true;
  },
});

registerConnector({
  kind: 'uc.realization',
  label: 'Realization',
  icon: 'realization',
  look: { line: 'dashed', start: 'none', end: 'triangle-hollow' },
  defaultRouting: 'straight',
  allow: (s, t) => (is(s, 'uc.collaboration') && is(t, UC) ? true : 'Realization nối Collaboration → Use Case'),
});
