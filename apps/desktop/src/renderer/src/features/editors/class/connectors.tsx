// Đường nối của Class Diagram (docs/spec/notation-class.md mục 2).
import { useEffect, useState } from 'react';
import { z } from 'zod';
import type { Connector, ModelElement } from '@umlab/core';
import { Checkbox, Segmented } from '@/ui';
import {
  registerConnector,
  type ComputedLabel,
  type ConnLook,
  type EngineLookup,
  type MarkerKind,
  type Tx,
  type ViewCtx,
} from '../engine/registry';
import { reaches } from '../usecase/connectors';
import { CLASSIFIER_SHAPES, classData } from './model';

type P = Record<string, unknown>;
const str = (v: unknown, d = '') => (v === undefined || v === null ? d : String(v));
const isCls = (c: ViewCtx) => CLASSIFIER_SHAPES.has(c.view.shape);

// ---------------- Association (model `uml.association`) ----------------

export interface AssocEnd {
  classId: string | null;
  role: string;
  multiplicity: string;
  navigable: 'yes' | 'no' | 'unspecified';
  aggregation: 'none' | 'shared' | 'composite';
  visibility: '+' | '-' | '#' | '~' | '';
  isOrdered: boolean;
  isUnique: boolean;
  qualifier?: string;
}
export const newEnd = (classId: string | null, aggregation: AssocEnd['aggregation'] = 'none'): AssocEnd => ({
  classId,
  role: '',
  multiplicity: '',
  navigable: 'unspecified',
  aggregation,
  visibility: '',
  isOrdered: false,
  isUnique: false,
});

export function assocEnds(m: ModelElement | null | undefined): [AssocEnd, AssocEnd] {
  const e = (m?.data.ends as AssocEnd[] | undefined) ?? [];
  return [
    { ...newEnd(null), ...(e[0] ?? {}) },
    { ...newEnd(null), ...(e[1] ?? {}) },
  ];
}

function endMarker(e: AssocEnd): MarkerKind {
  if (e.aggregation === 'composite') return 'diamond-filled';
  if (e.aggregation === 'shared') return 'diamond-hollow';
  if (e.navigable === 'yes') return 'arrow-open';
  if (e.navigable === 'no') return 'cross-x';
  return 'none';
}

const assocLook = (_c: Connector, m: ModelElement | null): ConnLook => {
  const [a, b] = assocEnds(m);
  return { line: 'solid', start: endMarker(a), end: endMarker(b) };
};

function assocLabels(c: Connector, m: ModelElement | null): ComputedLabel[] {
  const out: ComputedLabel[] = [];
  const name = str(m?.name);
  if (name) out.push({ role: 'name', text: name + (m?.data.showDirection ? ' ▶' : ''), pos: 0.5, draggable: true });
  const [a, b] = assocEnds(m);
  const ends: [AssocEnd, 'source' | 'target'][] = [
    [a, 'source'],
    [b, 'target'],
  ];
  for (const [e, end] of ends) {
    const role = (e.visibility ? e.visibility + ' ' : '') + e.role;
    const tags = [e.isOrdered ? 'ordered' : '', e.isUnique ? 'unique' : ''].filter(Boolean);
    const mult = [e.multiplicity, tags.length ? `{${tags.join(', ')}}` : ''].filter(Boolean).join(' ');
    if (e.role) out.push({ role: end + 'Role', text: role, end, draggable: true });
    if (mult) out.push({ role: end + 'Mult', text: mult, end, draggable: true });
    if (e.qualifier) out.push({ role: end + 'Qual', text: `[${e.qualifier}]`, end, draggable: true });
  }
  void c;
  return out;
}

function EndEditor({
  title,
  e,
  onChange,
  readOnly,
}: {
  title: string;
  e: AssocEnd;
  onChange: (p: Partial<AssocEnd>) => void;
  readOnly: boolean;
}) {
  const [role, setRole] = useState(e.role);
  const [mult, setMult] = useState(e.multiplicity);
  const [qual, setQual] = useState(e.qualifier ?? '');
  useEffect(() => {
    setRole(e.role);
    setMult(e.multiplicity);
    setQual(e.qualifier ?? '');
  }, [e.role, e.multiplicity, e.qualifier]);
  return (
    <div className="grid gap-2 rounded-md border border-line p-2" style={{ background: 'var(--panel-2)' }}>
      <div className="text-[11.5px] font-semibold">{title}</div>
      <div className="row2">
        <div>
          <span className="lbl">Role</span>
          <input
            className="field"
            value={role}
            readOnly={readOnly}
            aria-label={`${title} role`}
            onChange={(x) => setRole(x.target.value)}
            onBlur={() => role !== e.role && onChange({ role })}
            onKeyDown={(x) => x.key === 'Enter' && (x.target as HTMLInputElement).blur()}
          />
        </div>
        <div>
          <span className="lbl">Multiplicity</span>
          <input
            className="field"
            list="cls-mult"
            value={mult}
            readOnly={readOnly}
            aria-label={`${title} multiplicity`}
            placeholder="1, 0..1, *, 1..*"
            onChange={(x) => setMult(x.target.value)}
            onBlur={() => mult !== e.multiplicity && onChange({ multiplicity: mult.trim() })}
            onKeyDown={(x) => x.key === 'Enter' && (x.target as HTMLInputElement).blur()}
          />
        </div>
      </div>
      <div>
        <span className="lbl">Navigable</span>
        <Segmented
          value={e.navigable}
          onChange={(navigable) => onChange({ navigable })}
          options={[
            { value: 'unspecified', label: 'Không rõ' },
            { value: 'yes', label: 'Có →' },
            { value: 'no', label: 'Không ✕' },
          ]}
        />
      </div>
      <div>
        <span className="lbl">Aggregation</span>
        <Segmented
          value={e.aggregation}
          onChange={(aggregation) => onChange({ aggregation })}
          options={[
            { value: 'none', label: 'Không' },
            { value: 'shared', label: '◇ Shared' },
            { value: 'composite', label: '◆ Composite' },
          ]}
        />
      </div>
      <div className="row2">
        <div>
          <span className="lbl">Visibility</span>
          <Segmented
            value={e.visibility || 'none'}
            onChange={(v) => onChange({ visibility: v === 'none' ? '' : (v as AssocEnd['visibility']) })}
            options={[
              { value: 'none', label: '—' },
              { value: '+', label: '+' },
              { value: '-', label: '-' },
              { value: '#', label: '#' },
            ]}
          />
        </div>
        <div>
          <span className="lbl">Qualifier</span>
          <input
            className="field"
            value={qual}
            readOnly={readOnly}
            aria-label={`${title} qualifier`}
            onChange={(x) => setQual(x.target.value)}
            onBlur={() => qual !== (e.qualifier ?? '') && onChange({ qualifier: qual.trim() || undefined })}
          />
        </div>
      </div>
      <div className="flex gap-4">
        <Checkbox
          label="{ordered}"
          checked={e.isOrdered}
          disabled={readOnly}
          onChange={(isOrdered) => onChange({ isOrdered })}
        />
        <Checkbox
          label="{unique}"
          checked={e.isUnique}
          disabled={readOnly}
          onChange={(isUnique) => onChange({ isUnique })}
        />
      </div>
    </div>
  );
}

function AssociationInspector({
  conn,
  model,
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
  if (!model) return null;
  const ends = assocEnds(model);
  const nameOf = (viewId: string | null) => {
    const v = lookup.view(viewId);
    return (v?.modelId && lookup.model(v.modelId)?.name) || '?';
  };
  const setEnd = (i: 0 | 1, patch: Partial<AssocEnd>) =>
    apply((tx) => {
      const m = tx.model(model.id);
      if (!m) return;
      const e = assocEnds(m);
      e[i] = { ...e[i], ...patch };
      // một đầu là tổng thể thì đầu kia không thể cũng là tổng thể
      if (patch.aggregation && patch.aggregation !== 'none') e[1 - i] = { ...e[1 - i], aggregation: 'none' };
      tx.setModelData(m.id, { ends: e });
    });
  return (
    <div className="pgroup">
      <div className="pgroup-h">Association</div>
      <Checkbox
        label="Hiện hướng đọc ▶ cạnh tên"
        checked={!!model.data.showDirection}
        disabled={readOnly}
        onChange={(showDirection) => apply((tx) => tx.setModelData(model.id, { showDirection }))}
      />
      <EndEditor
        title={`Đầu nguồn · ${nameOf(conn.source.viewId)}`}
        e={ends[0]}
        readOnly={readOnly}
        onChange={(p) => setEnd(0, p)}
      />
      <EndEditor
        title={`Đầu đích · ${nameOf(conn.target.viewId)}`}
        e={ends[1]}
        readOnly={readOnly}
        onChange={(p) => setEnd(1, p)}
      />
      <datalist id="cls-mult">
        {['1', '0..1', '*', '0..*', '1..*'].map((x) => (
          <option key={x} value={x} />
        ))}
      </datalist>
    </div>
  );
}

const assocAllow = (s: ViewCtx, t: ViewCtx) =>
  isCls(s) && isCls(t) ? true : 'Association nối giữa hai classifier (class, interface…)';

/** Có vòng aggregation/composition nếu thêm đường whole(s) → part(t)? */
function aggCycle(lookup: EngineLookup, whole: string, part: string): boolean {
  const next = new Map<string, string[]>();
  for (const c of lookup.conns()) {
    if (!c.modelId || !c.source.viewId || !c.target.viewId) continue;
    const m = lookup.model(c.modelId);
    if (m?.kind !== 'uml.association') continue;
    const [a, b] = assocEnds(m);
    const add = (w: string, p: string) => next.set(w, [...(next.get(w) ?? []), p]);
    if (a.aggregation !== 'none') add(c.source.viewId, c.target.viewId);
    if (b.aggregation !== 'none') add(c.target.viewId, c.source.viewId);
  }
  const seen = new Set<string>();
  const st = [part];
  while (st.length) {
    const x = st.pop()!;
    if (x === whole) return true;
    if (seen.has(x)) continue;
    seen.add(x);
    st.push(...(next.get(x) ?? []));
  }
  return false;
}

const assocBase = {
  modelKind: 'uml.association',
  look: assocLook,
  labels: assocLabels,
  defaultRouting: 'orthogonal' as const,
  selfLoop: true,
  live: true,
  inspector: AssociationInspector,
};

registerConnector({
  ...assocBase,
  kind: 'cls.association',
  label: 'Association',
  icon: 'association',
  defaultModel: (s, t) => ({
    name: '',
    data: { showDirection: false, ends: [newEnd(s.model?.id ?? null), newEnd(t.model?.id ?? null)] },
  }),
  allow: assocAllow,
  onCreate: (tx, c) => {
    // biến thể Directed Association: đầu đích navigable
    if ((c.props as P).directed && c.modelId) {
      const m = tx.model(c.modelId);
      if (m) {
        const e = assocEnds(m);
        e[1].navigable = 'yes';
        tx.setModelData(m.id, { ends: e });
      }
      tx.setConnProps(c.id, { directed: undefined });
    }
  },
});

registerConnector({
  ...assocBase,
  kind: 'cls.aggregation',
  label: 'Aggregation',
  icon: 'aggregation',
  defaultModel: (s, t) => ({
    name: '',
    data: { showDirection: false, ends: [newEnd(s.model?.id ?? null, 'shared'), newEnd(t.model?.id ?? null)] },
  }),
  allow: (s, t, lookup) => {
    const ok = assocAllow(s, t);
    if (ok !== true) return ok;
    return aggCycle(lookup, s.view.id, t.view.id) ? 'Tạo thành vòng aggregation' : true;
  },
});

registerConnector({
  ...assocBase,
  kind: 'cls.composition',
  label: 'Composition',
  icon: 'composition',
  defaultModel: (s, t) => ({
    name: '',
    data: { showDirection: false, ends: [newEnd(s.model?.id ?? null, 'composite'), newEnd(t.model?.id ?? null)] },
  }),
  allow: (s, t, lookup) => {
    const ok = assocAllow(s, t);
    if (ok !== true) return ok;
    if (s.view.id === t.view.id) return 'Phần tử không là thành phần của chính nó';
    return aggCycle(lookup, s.view.id, t.view.id) ? 'Tạo thành vòng composition' : true;
  },
  warn: (_s, t, lookup) => {
    const already = lookup.conns().some((c) => {
      const m = c.modelId ? lookup.model(c.modelId) : undefined;
      if (m?.kind !== 'uml.association') return false;
      const [a, b] = assocEnds(m);
      return (
        (c.target.viewId === t.view.id && a.aggregation === 'composite') ||
        (c.source.viewId === t.view.id && b.aggregation === 'composite')
      );
    });
    return already ? 'Phần này đã thuộc một composition khác (một phần chỉ nên thuộc một tổng thể)' : null;
  },
});

// ---------------- Generalization / Realization ----------------

const kindOf = (c: ViewCtx) => (c.view.shape === 'cls.assocClass' ? 'cls.class' : c.view.shape);

registerConnector({
  kind: 'cls.generalization',
  label: 'Generalization',
  icon: 'generalization',
  look: { line: 'solid', start: 'none', end: 'triangle-hollow' },
  defaultRouting: 'orthogonal',
  allow: (s, t, lookup) => {
    if (!isCls(s) || !isCls(t)) return 'Generalization nối giữa hai classifier (con → cha)';
    if (kindOf(s) !== kindOf(t))
      return 'Generalization chỉ giữa hai phần tử cùng loại (Class → Class, Interface → Interface)';
    if (s.view.id === t.view.id) return 'Phần tử không kế thừa chính nó';
    if (classData(t.model).isLeaf) return `“${t.model?.name}” là leaf, không cho kế thừa`;
    if (reaches(lookup, 'cls.generalization', t.view.id, s.view.id)) return 'Tạo thành vòng kế thừa';
    return true;
  },
});

registerConnector({
  kind: 'cls.realization',
  label: 'Realization',
  icon: 'realization',
  look: { line: 'dashed', start: 'none', end: 'triangle-hollow' },
  defaultRouting: 'orthogonal',
  allow: (s, t) =>
    t.view.shape === 'cls.interface' && isCls(s) && s.view.shape !== 'cls.interface'
      ? true
      : 'Realization nối Class → Interface',
});

// ---------------- Usage / Dependency ◢ / Abstraction ◢ ----------------

const stereoLook =
  (fallback?: string) =>
  (c: Connector): ConnLook => ({
    line: 'dashed',
    start: 'none',
    end: 'arrow-open',
    stereotype: str((c.props as P).stereotype, fallback ?? '').replace(/^«|»$/g, '') || undefined,
  });
const nameLabel = (c: Connector): ComputedLabel[] =>
  str((c.props as P).name) ? [{ role: 'name', text: str((c.props as P).name), pos: 0.5, draggable: true }] : [];

registerConnector({
  kind: 'cls.usage',
  label: 'Usage',
  icon: 'usage',
  look: stereoLook('use'),
  defaultRouting: 'straight',
  defaultProps: () => ({ name: '', stereotype: 'use' }),
  propsSchema: z.object({ name: z.string().describe('Tên'), stereotype: z.string().describe('Stereotype') }),
  labels: nameLabel,
});

export const DEPENDENCY_STEREOTYPES = ['', 'instantiate', 'call', 'create', 'send', 'permit'];
export const ABSTRACTION_STEREOTYPES = ['abstraction', 'derive', 'refine', 'trace', 'substitute'];

registerConnector({
  kind: 'cls.dependency',
  label: 'Dependency',
  icon: 'dependency',
  look: stereoLook(),
  defaultRouting: 'straight',
  defaultProps: () => ({ name: '', stereotype: '' }),
  propsSchema: z.object({ name: z.string().describe('Tên'), stereotype: z.string().describe('Stereotype') }),
  labels: nameLabel,
});

registerConnector({
  kind: 'cls.abstraction',
  label: 'Abstraction',
  icon: 'abstraction',
  look: stereoLook('abstraction'),
  defaultRouting: 'straight',
  defaultProps: () => ({ name: '', stereotype: 'abstraction' }),
  propsSchema: z.object({ name: z.string().describe('Tên'), stereotype: z.string().describe('Stereotype') }),
  labels: nameLabel,
});

// ---------------- N-ary association: đường từ thoi tới từng class ----------------

registerConnector({
  kind: 'cls.naryEnd',
  label: 'Đầu N-ary',
  icon: 'association',
  look: { line: 'solid', start: 'none', end: 'none' },
  defaultRouting: 'straight',
  defaultProps: () => ({ role: '', multiplicity: '' }),
  propsSchema: z.object({ role: z.string().describe('Role'), multiplicity: z.string().describe('Multiplicity') }),
  labels: (c) => {
    const p = c.props as P;
    const out: ComputedLabel[] = [];
    if (str(p.role)) out.push({ role: 'role', text: str(p.role), end: 'target', draggable: true });
    if (str(p.multiplicity)) out.push({ role: 'mult', text: str(p.multiplicity), end: 'target', draggable: true });
    return out;
  },
  allow: (s, t) => (s.view.shape === 'cls.naryAssoc' && isCls(t) ? true : 'Kéo từ hình thoi N-ary tới một class'),
});
