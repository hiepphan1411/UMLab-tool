// Vùng chứa của Activity Diagram (docs/spec/notation-activity.md mục 1): Activity (khung bo góc lớn), Control
// Operator Activity, Interruptible Activity Region, Expansion Region, Structured Activity Node◢ (Structured, Loop,
// Conditional, Sequence).
import { z } from 'zod';
import { registerShape, type RenderCtx, type ShapeDef } from '../engine/registry';
import { Label, fitText } from '../engine/text';
import { INK, dashArray, strokeProps } from '../shapes/common/helpers';

type P = Record<string, unknown>;
const str = (v: unknown, d = '') => (v === undefined || v === null ? d : String(v));
const lines = (v: unknown) =>
  str(v)
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);

function nameRegion(ctx: RenderCtx, y: number, fs = 13) {
  return {
    key: 'name',
    box: { x: ctx.view.x + 10, y, w: Math.max(60, ctx.view.w - 20), h: fs * 1.5 },
    value: ctx.model?.name ?? str((ctx.props as P).name),
    align: 'left' as const,
    fontSize: fs,
    fontWeight: 700,
    commit: (tx: import('../engine/registry').Tx, value: string) => {
      if (ctx.model) tx.setModel(ctx.model.id, { name: value.trim() });
      else tx.setViewProps(ctx.view.id, { name: value.trim() });
    },
  };
}

// ---------------- Activity / Control Operator Activity ----------------

function activityDef(type: 'act.activity' | 'act.ctrlOpActivity'): ShapeDef {
  const ctrl = type === 'act.ctrlOpActivity';
  return {
    type,
    label: ctrl ? 'Control Operator Activity' : 'Activity',
    icon: ctrl ? 'control-operator-activity' : 'activity',
    modelKind: 'uml.activity',
    defaultModel: () => ({
      name: ctrl ? 'DieuKhien' : 'Hoạt động',
      data: { preconditions: '', postconditions: '', isReadOnly: false, isSingleExecution: false },
    }),
    defaultSize: { w: 520, h: 360 },
    minSize: { w: 160, h: 100 },
    container: { accepts: '*', autoGrow: true, padding: 24, header: 40 },
    defaultStyle: { fill: '#FFFFFF', stroke: INK, strokeWidth: 1.4 },
    styleFields: ['fill', 'stroke', 'strokeWidth'],
    modelSchema: z.object({
      preconditions: z.string().describe('«precondition» (mỗi dòng một điều kiện)|textarea'),
      postconditions: z.string().describe('«postcondition»|textarea'),
      isReadOnly: z.boolean().describe('isReadOnly'),
      isSingleExecution: z.boolean().describe('isSingleExecution'),
    }),
    render: (ctx) => {
      const v = ctx.view;
      const d = ctx.data;
      const out = [<rect key="r" x={v.x} y={v.y} width={v.w} height={v.h} rx={18} {...strokeProps(ctx)} />];
      let y = v.y + 16;
      if (ctrl) {
        out.push(
          <Label key="st" x={v.x + 14} y={y} text="«controlOperator»" size={11} anchor="start" color="#475569" />,
        );
        y += 15;
      }
      if (ctx.editing !== 'name')
        out.push(
          <Label
            key="n"
            x={v.x + 14}
            y={y}
            text={fitText(ctx.model?.name ?? '', 13, 700, v.w - 28)}
            size={13}
            weight={700}
            anchor="start"
          />,
        );
      y += 16;
      for (const [k, st] of [
        ['preconditions', 'precondition'],
        ['postconditions', 'postcondition'],
      ] as const)
        for (const t of lines(d[k])) {
          out.push(
            <Label
              key={k + t}
              x={v.x + 14}
              y={y}
              text={fitText(`«${st}» ${t}`, 11, 400, v.w - 28)}
              size={11}
              anchor="start"
              color="#475569"
            />,
          );
          y += 14;
        }
      return <>{out}</>;
    },
    textRegions: (ctx) => [nameRegion(ctx, ctx.view.y + (ctrl ? 22 : 7))],
  };
}
registerShape(activityDef('act.activity'));
registerShape(activityDef('act.ctrlOpActivity'));

// ---------------- vùng nét đứt ----------------

function dashedRect(ctx: RenderCtx) {
  const v = ctx.view;
  const sw = Number(ctx.style.strokeWidth) || 1.3;
  return (
    <rect
      x={v.x}
      y={v.y}
      width={v.w}
      height={v.h}
      rx={14}
      fill={ctx.style.fill || 'none'}
      stroke={ctx.style.stroke}
      strokeWidth={sw}
      strokeDasharray={dashArray(sw)}
    />
  );
}

registerShape<P>({
  type: 'act.interruptRegion',
  label: 'Interruptible Activity Region',
  icon: 'interruptible-region',
  defaultSize: { w: 320, h: 200 },
  minSize: { w: 80, h: 60 },
  container: { accepts: '*', autoGrow: true, padding: 16 },
  defaultStyle: { fill: 'none', stroke: INK, strokeWidth: 1.3 },
  styleFields: ['stroke', 'strokeWidth'],
  render: (ctx) => dashedRect(ctx),
});

registerShape<P>({
  type: 'act.expansionRegion',
  label: 'Expansion Region',
  icon: 'expansion-region',
  defaultSize: { w: 320, h: 200 },
  minSize: { w: 100, h: 70 },
  container: { accepts: '*', autoGrow: true, padding: 20, header: 24 },
  defaultProps: () => ({ mode: 'iterative' }),
  defaultStyle: { fill: 'none', stroke: INK, strokeWidth: 1.3 },
  styleFields: ['stroke', 'strokeWidth'],
  propsSchema: z.object({
    mode: z
      .enum(['iterative', 'parallel', 'stream'])
      .describe('Chế độ|opts:iterative=«iterative»;parallel=«parallel»;stream=«stream»'),
  }),
  render: (ctx) => {
    const v = ctx.view;
    return (
      <>
        {dashedRect(ctx)}
        <Label
          x={v.x + 12}
          y={v.y + 14}
          text={`«${str((ctx.props as P).mode, 'iterative')}»`}
          size={11}
          anchor="start"
          color="#475569"
        />
      </>
    );
  },
});

// ---------------- Structured Activity Node ◢ ----------------

type StructKind = 'structured' | 'loop' | 'conditional' | 'sequenceNode';
const STRUCT: Record<StructKind, { type: string; label: string; icon: string; stereo: string }> = {
  structured: {
    type: 'act.structured',
    label: 'Structured Activity Node',
    icon: 'structured-node',
    stereo: 'structured',
  },
  loop: { type: 'act.loop', label: 'Loop Node', icon: 'loop-node', stereo: 'loop' },
  conditional: { type: 'act.conditional', label: 'Conditional Node', icon: 'conditional-node', stereo: 'conditional' },
  sequenceNode: { type: 'act.sequenceNode', label: 'Sequence Node', icon: 'sequence-node', stereo: 'sequence' },
};

interface Clause {
  test: string;
  body: string;
}
const clauses = (v: unknown): Clause[] =>
  Array.isArray(v) ? (v as Clause[]).map((c) => ({ test: str(c?.test), body: str(c?.body) })) : [];

function structDef(kind: StructKind): ShapeDef {
  const info = STRUCT[kind];
  return {
    type: info.type,
    label: info.label,
    icon: info.icon,
    defaultSize: kind === 'loop' || kind === 'conditional' ? { w: 300, h: 220 } : { w: 280, h: 180 },
    minSize: { w: 120, h: 80 },
    container: { accepts: '*', autoGrow: true, padding: 16, header: 32 },
    defaultProps: () =>
      kind === 'loop'
        ? { name: '', setup: '', test: '', body: '', testedFirst: true }
        : kind === 'conditional'
          ? {
              name: '',
              clauses: [
                { test: 'điều kiện 1', body: '' },
                { test: 'else', body: '' },
              ],
              isAssured: false,
              isDeterminate: false,
            }
          : { name: '' },
    defaultStyle: { fill: 'none', stroke: INK, strokeWidth: 1.3 },
    styleFields: ['stroke', 'strokeWidth'],
    propsSchema:
      kind === 'loop'
        ? z.object({
            setup: z.string().describe('setup|textarea'),
            test: z.string().describe('test|textarea'),
            body: z.string().describe('body|textarea'),
            testedFirst: z.boolean().describe('Kiểm tra trước (testedFirst)'),
          })
        : kind === 'conditional'
          ? z.object({
              clauses: z
                .array(z.object({ test: z.string().describe('test'), body: z.string().describe('body') }))
                .describe('Mệnh đề'),
              isAssured: z.boolean().describe('isAssured'),
              isDeterminate: z.boolean().describe('isDeterminate'),
            })
          : undefined,
    render: (ctx) => {
      const v = ctx.view;
      const p = ctx.props as P;
      const sw = Number(ctx.style.strokeWidth) || 1.3;
      const out = [
        dashedRect(ctx),
        <Label key="st" x={v.x + 12} y={v.y + 14} text={`«${info.stereo}»`} size={11} anchor="start" color="#475569" />,
      ];
      if (str(p.name) && ctx.editing !== 'name')
        out.push(
          <Label key="n" x={v.x + 12} y={v.y + 28} text={str(p.name)} size={12.5} weight={700} anchor="start" />,
        );
      const sections: [string, string][] =
        kind === 'loop'
          ? p.testedFirst === false
            ? [
                ['setup', str(p.setup)],
                ['body', str(p.body)],
                ['test', str(p.test)],
              ]
            : [
                ['setup', str(p.setup)],
                ['test', str(p.test)],
                ['body', str(p.body)],
              ]
          : kind === 'conditional'
            ? clauses(p.clauses).flatMap(
                (c) =>
                  [
                    ['test', c.test],
                    ['body', c.body],
                  ] as [string, string][],
              )
            : [];
      if (sections.length) {
        const top = v.y + 36;
        const h = (v.h - 36) / sections.length;
        sections.forEach(([k, val], i) => {
          const y = top + i * h;
          out.push(
            <path
              key={'s' + i}
              d={`M${v.x},${y} H${v.x + v.w}`}
              stroke={String(ctx.style.stroke)}
              strokeWidth={sw * 0.8}
              strokeDasharray={dashArray(sw)}
            />,
            <Label
              key={'k' + i}
              x={v.x + 10}
              y={y + 12}
              text={k}
              size={11}
              weight={700}
              anchor="start"
              color="#475569"
            />,
          );
          if (val)
            out.push(
              <Label
                key={'v' + i}
                x={v.x + 48}
                y={y + 12}
                text={fitText(val.split('\n')[0], 11.5, 400, v.w - 60)}
                size={11.5}
                anchor="start"
              />,
            );
        });
      }
      return <>{out}</>;
    },
    textRegions: (ctx) => [nameRegion(ctx, ctx.view.y + 20, 12.5)],
  };
}
for (const k of Object.keys(STRUCT) as StructKind[]) registerShape(structDef(k));
