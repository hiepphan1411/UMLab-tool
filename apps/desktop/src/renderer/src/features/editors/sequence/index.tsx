// Sequence Diagram (`sequence`) — docs/phases/P11-sequence.md, docs/spec/notation-sequence.md.
import { useNavigate } from 'react-router-dom';
import { useStore } from 'zustand';
import {
  diagramsMap,
  layoutSequence,
  modelMap,
  normSpec,
  sequenceDiagram,
  specToSequence,
  uid,
  type SequenceGraph,
  type UseCaseSpec,
} from '@umlab/core';
import uc03 from '@fixtures/uc03-spec.umlab.json';
import { Checkbox } from '@/ui';
import { LOCAL } from '../../workspace/session';
import { registerDiagramTemplates, registerEditor } from '../editor-registry';
import { CanvasEditor } from '../engine/canvas-editor';
import type { Engine } from '../engine/engine';
import { registerNormalizer, registerPalette, registerRules, type PaletteItem } from '../engine/registry';
import { FocusStep, GeneratedBanner, StepLink, generatedFrom, type GeneratorDef } from '../generated';
import { COMMON_PALETTE_GROUPS } from '../shapes/common';
import './lifelines';
import './messages';
import { OPERATORS } from './fragments';
import { SEQUENCE_RULES } from './rules';
import { normalizeSequence } from './state';

const commonB = COMMON_PALETTE_GROUPS.find((g) => g.id === 'common-b')!;
const commonC = COMMON_PALETTE_GROUPS.find((g) => g.id === 'common-c')!;
const commonD = COMMON_PALETTE_GROUPS.find((g) => g.id === 'common-d')!;

const fragmentVariants: PaletteItem[] = OPERATORS.map((op) => ({
  id: op === 'alt' ? 'seq.fragment' : `seq.fragment#${op}`,
  label: op === 'alt' ? 'Alt. Combined Fragment' : `Combined Fragment ${op}`,
  icon: 'combined-fragment',
  preset: { props: { operator: op } },
}));

registerPalette('sequence', [
  {
    id: 'seq',
    items: [
      {
        id: 'seq.lifeline',
        variants: [{ id: 'seq.lifeline' }, { id: 'seq.boundary' }, { id: 'seq.control' }, { id: 'seq.entity' }],
      },
      {
        id: 'seq.sync',
        variants: [{ id: 'seq.sync' }, { id: 'seq.async' }, { id: 'seq.reply' }, { id: 'seq.destroy' }],
      },
      { id: 'seq.duration' },
      { id: 'seq.create' },
      { id: 'seq.self' },
      { id: 'seq.recursive' },
      { id: 'seq.found' },
      { id: 'seq.lost' },
      { id: 'seq.reentrant' },
    ],
  },
  {
    id: 'seq-b',
    items: [
      { id: 'seq.fragment', variants: fragmentVariants },
      { id: 'seq.ref' },
      { id: 'seq.frame' },
      { id: 'seq.actor' },
      { id: 'seq.coregion' },
      { id: 'seq.continuation' },
      { id: 'seq.gate' },
      {
        id: 'seq.durationConstraint',
        variants: [
          { id: 'seq.durationConstraint' },
          { id: 'seq.timeConstraint' },
          { id: 'seq.durationObs' },
          { id: 'seq.timeObs' },
        ],
      },
      { id: 'seq.stateInvariant' },
    ],
  },
  {
    id: 'seq-notes',
    items: [{ id: 'common.group' }, { id: 'common.note' }, { id: 'common.anchor' }, { id: 'common.constraint' }],
  },
  { ...commonB, label: undefined },
  { ...commonC, label: undefined },
  { ...commonD, label: undefined },
]);

registerRules('sequence', SEQUENCE_RULES);
registerNormalizer('sequence', normalizeSequence);

/** Đồ thị → bố cục cố định → views / connectors / model. */
export function buildSequence(g: SequenceGraph, refDiagramOf?: (useCaseId: string) => string | undefined) {
  return sequenceDiagram(g, layoutSequence(g), { refDiagramOf });
}

export const SEQUENCE_GENERATOR: GeneratorDef = {
  id: 'spec-sequence@1',
  type: 'sequence',
  prefix: 'Sequence',
  build: (doc, spec: UseCaseSpec) => {
    const model = modelMap(doc);
    const all = [...model.values()];
    const g = specToSequence(spec, {
      actorName: (id) => model.get(id)?.name ?? '(actor đã xoá)',
      useCaseName: model.get(spec.useCaseId)?.name ?? 'Use case',
      useCaseNameOf: (id) => model.get(id)?.name ?? 'Use case',
      classIdOf: (name) => all.find((m) => m.kind === 'uml.class' && m.name === name)?.id,
    });
    // ref → Sequence đã sinh của use case được include (nếu có)
    const refOf = (ucId: string) => {
      const specD = model.get(ucId)?.data.specDiagramId;
      return typeof specD === 'string' ? generatedFrom(doc, specD, 'spec-sequence@1')[0]?.id : undefined;
    };
    return buildSequence(g, refOf);
  },
};

/** Mẫu Đăng nhập: 5 lifeline, alt đúng / sai mật khẩu. */
function loginGraph(): SequenceGraph {
  const ll = (kind: SequenceGraph['lifelines'][number]['kind'], name: string) => ({ id: uid('ll'), kind, name });
  const u = ll('actor', 'Người dùng');
  const ui = ll('boundary', 'Màn hình đăng nhập');
  const c = ll('control', 'DangNhapController');
  const tk = ll('entity', 'TaiKhoan');
  const s = ll('entity', 'PhienDangNhap');
  const m = (kind: 'sync' | 'reply' | 'self' | 'create', from: { id: string }, to: { id: string }, name: string) => ({
    type: 'msg' as const,
    msg: { id: uid('msg'), kind, from: from.id, to: to.id, name },
  });
  return {
    lifelines: [u, ui, c, tk, s],
    items: [
      m('sync', u, ui, 'nhapThongTin(email, matKhau)'),
      m('sync', ui, c, 'dangNhap(email, matKhau)'),
      m('sync', c, tk, 'timTheoEmail(email)'),
      m('reply', tk, c, 'taiKhoan'),
      m('self', c, c, 'kiemTraMatKhau(matKhau)'),
      {
        type: 'fragment',
        id: uid('frag'),
        operator: 'alt',
        operands: [
          {
            guard: 'mật khẩu đúng',
            items: [m('create', c, s, 'tao(taiKhoan)'), m('reply', s, c, 'phien'), m('reply', c, ui, 'thanhCong')],
          },
          { guard: 'else', items: [m('reply', c, ui, 'loi("Sai mật khẩu")')] },
        ],
      },
      m('reply', ui, u, 'hienThiKetQua'),
    ],
  };
}

registerDiagramTemplates('sequence', [
  { id: 'blank', label: 'Trống', description: 'Bắt đầu với khung vẽ trống', build: () => ({}) },
  {
    id: 'login',
    label: 'Đăng nhập',
    description: '5 lifeline (Actor, Boundary, Control, 2 Entity), alt đúng / sai mật khẩu, Create Message',
    build: () => buildSequence(loginGraph()),
  },
  {
    id: 'uc03',
    label: 'Check-in xe UniPark+',
    description: 'Sinh từ đặc tả UC03: CheckInXeController, alt thẻ không hợp lệ / biển số không khớp / không đủ số dư',
    build: () => {
      const spec = normSpec(uc03.diagram.data);
      const names = new Map(uc03.model.map((m) => [m.id, m.name]));
      return buildSequence(
        specToSequence(spec, {
          actorName: (id) => names.get(id) ?? id,
          useCaseName: names.get(spec.useCaseId) ?? 'Use case',
        }),
      );
    },
  },
]);

/** Inspector khi không chọn gì: bật/tắt đánh số message. */
function NumberingToggle({ e }: { e: Engine }) {
  const sel = useStore(e.store, (s) => s.sel.size + s.selConns.size);
  useStore(e.store, (s) => s.metaVersion);
  const meta = e.meta;
  if (sel || !meta) return null;
  return (
    <div className="pgroup">
      <Checkbox
        label="Đánh số message tự động (1, 1.1, 1.1.2…)"
        checked={meta.canvas.numbering !== false}
        onChange={(v) => {
          if (e.readOnly) return;
          e.doc.transact(() => {
            const m = diagramsMap(e.doc).get(e.diagramId);
            if (m) diagramsMap(e.doc).set(e.diagramId, { ...m, canvas: { ...m.canvas, numbering: v } });
          }, LOCAL);
        }}
      />
    </div>
  );
}

function SequenceEditor(p: Parameters<typeof CanvasEditor>[0]) {
  const nav = useNavigate();
  const open = (id: string) => nav(`/p/${p.session.projectId}/d/${id}`);
  return (
    <CanvasEditor
      {...p}
      options={{
        banner: (e) => (
          <>
            <FocusStep e={e} />
            <GeneratedBanner e={e} g={SEQUENCE_GENERATOR} open={open} />
          </>
        ),
        inspectorExtra: (e) => (
          <>
            <NumberingToggle e={e} />
            <StepLink e={e} />
          </>
        ),
      }}
    />
  );
}

registerEditor('sequence', (p) => <SequenceEditor {...p} />);
