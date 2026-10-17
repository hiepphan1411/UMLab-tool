// Activity Diagram (`activity`) — docs/phases/P10-activity.md, docs/spec/notation-activity.md.
import { FileText } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from 'zustand';
import { activityDiagram, layoutActivity, modelMap, normSpec, specToActivity, type UseCaseSpec } from '@umlab/core';
import uc03 from '@fixtures/uc03-spec.umlab.json';
import { Button } from '@/ui';
import { registerDiagramTemplates, registerEditor } from '../editor-registry';
import { CanvasEditor } from '../engine/canvas-editor';
import type { Engine } from '../engine/engine';
import { registerPalette, registerRules } from '../engine/registry';
import { GeneratedBanner, generatedFrom, takeFocus, useFocusRequest, type GeneratorDef } from '../generated';
import { COMMON_PALETTE_GROUPS } from '../shapes/common';
import './nodes';
import './pins';
import './regions';
import './swimlane';
import './connectors';
import { ACTIVITY_RULES } from './rules';

const commonB = COMMON_PALETTE_GROUPS.find((g) => g.id === 'common-b')!;
const commonC = COMMON_PALETTE_GROUPS.find((g) => g.id === 'common-c')!;
const commonD = COMMON_PALETTE_GROUPS.find((g) => g.id === 'common-d')!;

registerPalette('activity', [
  {
    id: 'act',
    items: [
      { id: 'act.activity' },
      { id: 'act.paramNode' },
      {
        id: 'act.action',
        variants: [
          { id: 'act.action' },
          { id: 'act.callBehavior' },
          { id: 'act.callOperation' },
          { id: 'act.sendSignal' },
          { id: 'act.acceptEvent' },
          { id: 'act.acceptTime' },
        ],
      },
      {
        id: 'act.decision',
        variants: [{ id: 'act.decision' }, { id: 'act.merge' }, { id: 'act.fork' }, { id: 'act.join' }],
      },
      { id: 'act.initial' },
      { id: 'act.final', variants: [{ id: 'act.final' }, { id: 'act.flowFinal' }] },
      {
        id: 'act.inputPin',
        variants: [
          { id: 'act.inputPin' },
          { id: 'act.outputPin' },
          { id: 'act.valuePin' },
          { id: 'act.actionInputPin' },
        ],
      },
      { id: 'act.object', variants: [{ id: 'act.object' }, { id: 'act.centralBuffer' }, { id: 'act.dataStore' }] },
      { id: 'act.interruptRegion' },
      { id: 'act.expansionRegion' },
      { id: 'act.expansionNode' },
      { id: 'act.swimlaneH', variants: [{ id: 'act.swimlaneH' }, { id: 'act.swimlaneV' }] },
      { id: 'act.controlFlow' },
      { id: 'act.objectFlow' },
      { id: 'act.exceptionHandler' },
      {
        id: 'act.structured',
        variants: [{ id: 'act.structured' }, { id: 'act.loop' }, { id: 'act.conditional' }, { id: 'act.sequenceNode' }],
      },
    ],
  },
  {
    id: 'act-notes',
    items: [
      { id: 'common.group' },
      { id: 'common.note' },
      { id: 'common.anchor' },
      { id: 'common.constraint' },
      { id: 'common.containment' },
    ],
  },
  { id: 'act-ctrl', items: [{ id: 'act.ctrlOpActivity' }, { id: 'act.ctrlOpAction' }, { id: 'act.valueSpec' }] },
  { ...commonB, label: undefined },
  { ...commonC, label: undefined },
  { ...commonD, label: undefined },
]);

registerRules('activity', ACTIVITY_RULES);

/** Sinh Activity từ đặc tả: đồ thị → bố cục làn dọc → views/connectors (core/generators). */
export function buildActivity(
  spec: UseCaseSpec,
  actorName: (id: string) => string,
  behaviorOf?: (useCaseId: string) => string | undefined,
) {
  const g = specToActivity(spec, { actorName });
  return activityDiagram(g, layoutActivity(g), { behaviorOf });
}

export const ACTIVITY_GENERATOR: GeneratorDef = {
  id: 'spec-activity@1',
  type: 'activity',
  prefix: 'Activity',
  build: (doc, spec) => {
    const model = modelMap(doc);
    // Call Behavior: trỏ tới Activity đã sinh của use case được include (nếu có)
    const behaviorOf = (ucId: string) => {
      const specD = model.get(ucId)?.data.specDiagramId;
      return typeof specD === 'string' ? generatedFrom(doc, specD, 'spec-activity@1')[0]?.id : undefined;
    };
    return buildActivity(spec, (id) => model.get(id)?.name ?? '(actor đã xoá)', behaviorOf);
  },
};

registerDiagramTemplates('activity', [
  { id: 'blank', label: 'Trống', description: 'Bắt đầu với khung vẽ trống', build: () => ({}) },
  {
    id: 'uc03',
    label: 'Check-in xe UniPark+',
    description:
      'Sinh từ đặc tả UC03: làn Sinh viên / Bảo vệ / Hệ thống, rẽ nhánh thẻ không hợp lệ, biển số không khớp…',
    build: () => {
      const spec = normSpec(uc03.diagram.data);
      const names = new Map(uc03.model.map((m) => [m.id, m.name]));
      const d = buildActivity(spec, (id) => names.get(id) ?? id);
      // mẫu không gắn actor của project
      for (const v of d.views)
        if (v.shape === 'act.swimlaneV')
          v.props.lanes = (v.props.lanes as { represents?: string }[]).map(({ represents: _r, ...l }) => (void _r, l));
      return d;
    },
  },
]);

/** Chọn các hình sinh từ bước `stepId` (đi từ đặc tả sang). */
function FocusStep({ e }: { e: Engine }) {
  const req = useStore(useFocusRequest, (s) => s.req);
  useEffect(() => {
    const stepId = takeFocus(e.diagramId);
    if (!stepId) return;
    const ids = e.lookup
      .views()
      .filter((v) => v.props.sourceStepId === stepId)
      .map((v) => v.id);
    if (ids.length) e.select(ids);
  }, [req, e]);
  return null;
}

/** Inspector phụ: hình sinh từ bước đặc tả → mở đặc tả tại bước đó. */
function StepLink({ e }: { e: Engine }) {
  const nav = useNavigate();
  const sel = useStore(e.store, (s) => s.sel);
  const gf = e.meta?.generatedFrom;
  if (sel.size !== 1 || !gf) return null;
  const v = e.lookup.view([...sel][0]);
  const stepId = typeof v?.props.sourceStepId === 'string' ? v.props.sourceStepId : null;
  if (!stepId) return null;
  return (
    <div className="pgroup">
      <Button
        variant="outline"
        icon={<FileText />}
        onClick={() => {
          useFocusRequest.getState().set({ diagramId: gf.sourceDiagramId, stepId });
          nav(`/p/${e.session.projectId}/d/${gf.sourceDiagramId}`);
        }}
      >
        Xem bước trong đặc tả
      </Button>
    </div>
  );
}

function ActivityEditor(p: Parameters<typeof CanvasEditor>[0]) {
  const nav = useNavigate();
  const open = (id: string) => nav(`/p/${p.session.projectId}/d/${id}`);
  return (
    <CanvasEditor
      {...p}
      options={{
        banner: (e) => (
          <>
            <FocusStep e={e} />
            <GeneratedBanner e={e} g={ACTIVITY_GENERATOR} open={open} />
          </>
        ),
        inspectorExtra: (e) => <StepLink e={e} />,
      }}
    />
  );
}

registerEditor('activity', (p) => <ActivityEditor {...p} />);
