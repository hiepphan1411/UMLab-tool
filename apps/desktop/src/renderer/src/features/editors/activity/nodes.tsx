// Node của Activity Diagram (docs/spec/notation-activity.md mục 1): Action◢ (Action, Call Behavior, Call Operation,
// Send Signal, Accept Event, Accept Time), Control Operator Action, Value Specification Action, Decision / Merge,
// Fork / Join, Initial, Activity Final, Flow Final, Object Node◢ (Object, Central Buffer, Data Store).
import { z } from 'zod';
import type { ModelElement } from '@umlab/core';
import { registerShape, type RenderCtx, type ShapeDef, type TextRegion, type Tx } from '../engine/registry';
import { Label, fitText, textW } from '../engine/text';
import { INK, TextBlock, strokeProps, textHeight } from '../shapes/common/helpers';

type P = Record<string, unknown>;
const str = (v: unknown, d = '') => (v === undefined || v === null ? d : String(v));
const FS = 12.5;
const ST_FS = 11;

// ---------------- Action family ----------------

type ActionKind =
  'action' | 'callBehavior' | 'callOperation' | 'sendSignal' | 'acceptEvent' | 'ctrlOpAction' | 'valueSpec';

const ACTIONS: Record<ActionKind, { type: string; label: string; icon: string; name: string; stereo?: string }> = {
  action: { type: 'act.action', label: 'Action', icon: 'action', name: 'Action' },
  callBehavior: { type: 'act.callBehavior', label: 'Call Behavior Action', icon: 'call-behavior', name: 'Gọi hành vi' },
  callOperation: {
    type: 'act.callOperation',
    label: 'Call Operation Action',
    icon: 'call-operation',
    name: 'Gọi thao tác',
  },
  sendSignal: { type: 'act.sendSignal', label: 'Send Signal Action', icon: 'send-signal', name: 'Gửi tín hiệu' },
  acceptEvent: { type: 'act.acceptEvent', label: 'Accept Event Action', icon: 'accept-event', name: 'Nhận sự kiện' },
  ctrlOpAction: {
    type: 'act.ctrlOpAction',
    label: 'Control Operator Action',
    icon: 'control-operator-action',
    name: 'Điều khiển',
    stereo: 'controlOperator',
  },
  valueSpec: { type: 'act.valueSpec', label: 'Value Specification Action', icon: 'value-spec-action', name: 'Giá trị' },
};

/** Đường viền của action theo loại (ngũ giác lồi / lõm cho Send Signal / Accept Event). */
function actionPath(kind: ActionKind, x: number, y: number, w: number, h: number): string {
  const tip = Math.min(18, w / 5);
  if (kind === 'sendSignal')
    return `M${x},${y} H${x + w - tip} L${x + w},${y + h / 2} L${x + w - tip},${y + h} H${x} Z`;
  if (kind === 'acceptEvent') return `M${x},${y} H${x + w} V${y + h} H${x} L${x + tip},${y + h / 2} Z`;
  const r = Math.min(12, h / 2.4, w / 4);
  return `M${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x + r} Q${x},${y + h} ${x},${y + h - r} V${y + r} Q${x},${y} ${x + r},${y} Z`;
}

/** Dòng phụ dưới tên: (Class::operation), giá trị, «controlOperator». */
function subLine(kind: ActionKind, ctx: RenderCtx): string {
  const d = ctx.data;
  if (kind === 'callOperation' && str(d.operation)) return `(${str(d.operation)})`;
  if (kind === 'valueSpec') return str(d.value);
  return '';
}

function actionText(kind: ActionKind, ctx: RenderCtx) {
  const name = ctx.model?.name ?? str((ctx.props as P).name, ACTIONS[kind].name);
  const sub = subLine(kind, ctx);
  const st = ACTIONS[kind].stereo ? `«${ACTIONS[kind].stereo}»` : '';
  return { name, sub, st };
}

function innerBox(kind: ActionKind, ctx: RenderCtx) {
  const v = ctx.view;
  const tip = kind === 'sendSignal' || kind === 'acceptEvent' ? Math.min(18, v.w / 5) : 0;
  const left = kind === 'acceptEvent' ? tip : 0;
  const right = kind === 'sendSignal' ? tip : 0;
  const bottom = kind === 'callBehavior' ? 12 : 0;
  return { x: v.x + 10 + left, y: v.y + 6, w: v.w - 20 - left - right, h: v.h - 12 - bottom };
}

function renderAction(kind: ActionKind, ctx: RenderCtx) {
  const v = ctx.view;
  const sp = strokeProps(ctx);
  const t = actionText(kind, ctx);
  const b = innerBox(kind, ctx);
  const extraH = (t.sub ? ST_FS * 1.4 : 0) + (t.st ? ST_FS * 1.4 : 0);
  const nameH = textHeight(t.name, FS, 500, b.w);
  const top = b.y + Math.max(0, (b.h - nameH - extraH) / 2);
  const out = [<path key="o" d={actionPath(kind, v.x, v.y, v.w, v.h)} {...sp} />];
  if (t.st)
    out.push(<Label key="st" x={b.x + b.w / 2} y={top + ST_FS * 0.7} text={t.st} size={ST_FS} color="#475569" />);
  out.push(
    <TextBlock
      key="n"
      ctx={ctx}
      editKey="name"
      text={t.name}
      size={FS}
      weight={500}
      box={{ x: b.x, y: top + (t.st ? ST_FS * 1.4 : 0), w: b.w, h: nameH }}
      valign="top"
    />,
  );
  if (t.sub)
    out.push(
      <Label
        key="sub"
        x={b.x + b.w / 2}
        y={top + (t.st ? ST_FS * 1.4 : 0) + nameH + ST_FS * 0.75}
        text={fitText(t.sub, ST_FS, 400, b.w)}
        size={ST_FS}
        color="#475569"
      />,
    );
  // icon cào ⋔ của Call Behavior
  if (kind === 'callBehavior') {
    const x = v.x + v.w - 18;
    const y = v.y + v.h - 14;
    out.push(
      <path
        key="rake"
        d={`M${x + 4},${y} V${y + 9} M${x},${y + 9} V${y + 4.5} H${x + 8} V${y + 9}`}
        stroke={sp.stroke}
        strokeWidth={1.2}
        fill="none"
      />,
    );
  }
  return <>{out}</>;
}

function actionDef(kind: ActionKind): ShapeDef {
  const info = ACTIONS[kind];
  return {
    type: info.type,
    label: info.label,
    icon: info.icon,
    modelKind: 'uml.action',
    defaultModel: () => ({ name: info.name, data: { actionKind: kind } }),
    defaultSize: { w: 140, h: 52 },
    minSize: { w: 60, h: 32 },
    defaultProps: () => ({ autoSize: true }),
    defaultStyle: { fill: '#FFFFFF', stroke: INK, strokeWidth: 1.3 },
    styleFields: ['fill', 'stroke', 'strokeWidth'],
    propsSchema: z.object({ autoSize: z.boolean().describe('Tự giãn theo nội dung') }),
    modelSchema:
      kind === 'callBehavior'
        ? z.object({ behavior: z.string().describe('Hành vi (id sơ đồ Activity)|diagram:activity') })
        : kind === 'callOperation'
          ? z.object({ operation: z.string().describe('Thao tác (Class::operation)') })
          : kind === 'sendSignal'
            ? z.object({ signal: z.string().describe('Tín hiệu') })
            : kind === 'acceptEvent'
              ? z.object({ event: z.string().describe('Sự kiện') })
              : kind === 'valueSpec'
                ? z.object({ value: z.string().describe('Biểu thức giá trị') })
                : z.object({
                    body: z.string().describe('Thân (opaque)|textarea'),
                    localPre: z.string().describe('«localPrecondition»'),
                    localPost: z.string().describe('«localPostcondition»'),
                  }),
    render: (ctx) => renderAction(kind, ctx),
    textRegions: (ctx): TextRegion[] => {
      const b = innerBox(kind, ctx);
      return [
        {
          key: 'name',
          box: b,
          value: actionText(kind, ctx).name,
          multiline: true,
          align: 'center',
          fontSize: FS,
          fontWeight: 500,
          commit: (tx: Tx, value: string) =>
            ctx.model && tx.setModel(ctx.model.id, { name: value.trim() || info.name }),
        },
      ];
    },
    measure: (ctx) => {
      if ((ctx.props as P).autoSize === false) return null;
      const t = actionText(kind, ctx);
      const pad = (kind === 'sendSignal' || kind === 'acceptEvent' ? 22 : 0) + 24;
      const w = Math.max(100, Math.min(220, textW(t.name, FS, 500) + pad), t.sub ? textW(t.sub, ST_FS, 400) + pad : 0);
      const inner = w - pad;
      const h =
        textHeight(t.name, FS, 500, inner) +
        (t.sub ? ST_FS * 1.4 : 0) +
        (t.st ? ST_FS * 1.4 : 0) +
        18 +
        (kind === 'callBehavior' ? 12 : 0);
      return { w: Math.round(w), h: Math.round(Math.max(44, h)) };
    },
    onDoubleClick:
      kind === 'callBehavior'
        ? (v, api) => {
            const m = v.modelId ? api.lookup.model(v.modelId) : undefined;
            const target = str(m?.data.behavior);
            if (target && api.lookup.diagram(target)) {
              api.open(target);
              return true;
            }
            return false;
          }
        : undefined,
    catalog: [
      { connector: 'act.controlFlow', shape: 'act.action', label: 'Control Flow → Action' },
      { connector: 'act.controlFlow', shape: 'act.decision', label: 'Control Flow → Decision' },
      { connector: 'act.controlFlow', shape: 'act.fork', label: 'Control Flow → Fork' },
      { connector: 'act.controlFlow', shape: 'act.final', label: 'Control Flow → Activity Final' },
      { connector: 'act.objectFlow', shape: 'act.object', label: 'Object Flow → Object Node' },
    ],
  };
}

for (const k of Object.keys(ACTIONS) as ActionKind[]) registerShape(actionDef(k));

// ---------------- Accept Time Event: đồng hồ cát + nhãn dưới ----------------

registerShape<P>({
  type: 'act.acceptTime',
  label: 'Accept Time Event Action',
  icon: 'accept-time',
  modelKind: 'uml.action',
  defaultModel: () => ({ name: 'sau 30 giây', data: { actionKind: 'acceptTime' } }),
  defaultSize: { w: 28, h: 36 },
  resizable: false,
  defaultStyle: { fill: '#FFFFFF', stroke: INK, strokeWidth: 1.3 },
  styleFields: ['stroke', 'strokeWidth'],
  render: (ctx) => {
    const v = ctx.view;
    const sp = strokeProps(ctx);
    return (
      <>
        <path d={`M${v.x},${v.y} H${v.x + v.w} L${v.x},${v.y + v.h} H${v.x + v.w} Z`} {...sp} />
        {ctx.editing !== 'name' && (
          <Label x={v.x + v.w / 2} y={v.y + v.h + 11} text={ctx.model?.name ?? ''} size={11.5} />
        )}
      </>
    );
  },
  textRegions: (ctx) => [
    {
      key: 'name',
      box: { x: ctx.view.x - 50, y: ctx.view.y + ctx.view.h + 2, w: ctx.view.w + 100, h: 18 },
      value: ctx.model?.name ?? '',
      align: 'center',
      fontSize: 11.5,
      commit: (tx, value) => ctx.model && tx.setModel(ctx.model.id, { name: value.trim() }),
    },
  ],
});

// ---------------- Control node ----------------

const black = (ctx: RenderCtx) => String(ctx.style.stroke || INK);

registerShape<P>({
  type: 'act.initial',
  label: 'Initial Node',
  icon: 'initial',
  outline: 'ellipse',
  aspectLock: true,
  defaultSize: { w: 26, h: 26 },
  minSize: { w: 14, h: 14 },
  defaultStyle: { stroke: INK, strokeWidth: 1 },
  styleFields: ['stroke'],
  render: (ctx) => {
    const v = ctx.view;
    return <ellipse cx={v.x + v.w / 2} cy={v.y + v.h / 2} rx={v.w / 2} ry={v.h / 2} fill={black(ctx)} />;
  },
  catalog: [{ connector: 'act.controlFlow', shape: 'act.action', label: 'Control Flow → Action' }],
});

registerShape<P>({
  type: 'act.final',
  label: 'Activity Final Node',
  icon: 'final',
  outline: 'ellipse',
  aspectLock: true,
  defaultSize: { w: 28, h: 28 },
  minSize: { w: 16, h: 16 },
  defaultStyle: { fill: '#FFFFFF', stroke: INK, strokeWidth: 1.4 },
  styleFields: ['stroke'],
  render: (ctx) => {
    const v = ctx.view;
    const cx = v.x + v.w / 2;
    const cy = v.y + v.h / 2;
    return (
      <>
        <ellipse
          cx={cx}
          cy={cy}
          rx={v.w / 2}
          ry={v.h / 2}
          fill="#FFFFFF"
          stroke={black(ctx)}
          strokeWidth={ctx.style.strokeWidth}
        />
        <ellipse cx={cx} cy={cy} rx={v.w / 2 - 5} ry={v.h / 2 - 5} fill={black(ctx)} />
      </>
    );
  },
});

registerShape<P>({
  type: 'act.flowFinal',
  label: 'Flow Final Node',
  icon: 'flow-final',
  outline: 'ellipse',
  aspectLock: true,
  defaultSize: { w: 28, h: 28 },
  minSize: { w: 16, h: 16 },
  defaultStyle: { fill: '#FFFFFF', stroke: INK, strokeWidth: 1.4 },
  styleFields: ['stroke'],
  render: (ctx) => {
    const v = ctx.view;
    const cx = v.x + v.w / 2;
    const cy = v.y + v.h / 2;
    const k = (v.w / 2) * 0.7071;
    return (
      <>
        <ellipse
          cx={cx}
          cy={cy}
          rx={v.w / 2}
          ry={v.h / 2}
          fill="#FFFFFF"
          stroke={black(ctx)}
          strokeWidth={ctx.style.strokeWidth}
        />
        <path
          d={`M${cx - k},${cy - k} L${cx + k},${cy + k} M${cx + k},${cy - k} L${cx - k},${cy + k}`}
          stroke={black(ctx)}
          strokeWidth={ctx.style.strokeWidth}
        />
      </>
    );
  },
});

function diamondDef(type: 'act.decision' | 'act.merge', label: string, icon: string): ShapeDef {
  return {
    type,
    label,
    icon,
    outline: 'diamond',
    defaultSize: { w: 36, h: 36 },
    minSize: { w: 20, h: 20 },
    defaultProps: () => ({ label: '' }),
    defaultStyle: { fill: '#FFFFFF', stroke: INK, strokeWidth: 1.3 },
    styleFields: ['fill', 'stroke', 'strokeWidth'],
    propsSchema:
      type === 'act.decision'
        ? z.object({
            label: z.string().describe('Câu hỏi (cạnh thoi)'),
            decisionInput: z.string().describe('«decisionInput»'),
          })
        : z.object({ label: z.string().describe('Nhãn') }),
    render: (ctx) => {
      const v = ctx.view;
      const p = ctx.props as P;
      const cx = v.x + v.w / 2;
      const cy = v.y + v.h / 2;
      return (
        <>
          <path d={`M${cx},${v.y} L${v.x + v.w},${cy} L${cx},${v.y + v.h} L${v.x},${cy} Z`} {...strokeProps(ctx)} />
          {str(p.label) && ctx.editing !== 'label' && (
            <Label x={v.x + v.w + 6} y={v.y - 4} text={str(p.label)} size={11.5} anchor="start" color="#334155" />
          )}
          {str(p.decisionInput) && (
            <Label
              x={cx}
              y={v.y + v.h + 12}
              text={`«decisionInput» ${str(p.decisionInput)}`}
              size={10.5}
              color="#64748B"
            />
          )}
        </>
      );
    },
    textRegions: (ctx) => [
      {
        key: 'label',
        box: { x: ctx.view.x + ctx.view.w + 2, y: ctx.view.y - 14, w: 180, h: 20 },
        value: str((ctx.props as P).label),
        align: 'left',
        fontSize: 11.5,
        placeholder: type === 'act.decision' ? 'Câu hỏi?' : '',
        commit: (tx, value) => tx.setViewProps(ctx.view.id, { label: value.trim() }),
      },
    ],
    catalog: [
      { connector: 'act.controlFlow', shape: 'act.action', label: 'Control Flow → Action' },
      { connector: 'act.controlFlow', shape: 'act.merge', label: 'Control Flow → Merge' },
    ],
  };
}
registerShape(diamondDef('act.decision', 'Decision Node', 'decision'));
registerShape(diamondDef('act.merge', 'Merge Node', 'merge'));

function barDef(type: 'act.fork' | 'act.join', label: string, icon: string): ShapeDef {
  return {
    type,
    label,
    icon,
    defaultSize: { w: 120, h: 7 },
    minSize: { w: 5, h: 5 },
    defaultProps: () => (type === 'act.join' ? { joinSpec: '' } : {}),
    defaultStyle: { fill: INK, stroke: INK, strokeWidth: 1 },
    styleFields: ['fill'],
    propsSchema: type === 'act.join' ? z.object({ joinSpec: z.string().describe('{joinSpec = …}') }) : undefined,
    render: (ctx) => {
      const v = ctx.view;
      const js = str((ctx.props as P).joinSpec);
      return (
        <>
          <rect x={v.x} y={v.y} width={v.w} height={v.h} rx={1.5} fill={String(ctx.style.fill || INK)} />
          {js && (
            <Label
              x={v.x + v.w + 6}
              y={v.y + v.h / 2}
              text={`{joinSpec = ${js}}`}
              size={11}
              anchor="start"
              color="#334155"
            />
          )}
        </>
      );
    },
    contextMenu: (view, api) => [
      {
        label: view.w >= view.h ? 'Xoay dọc' : 'Xoay ngang',
        onSelect: () =>
          api.apply((tx) =>
            tx.setView(view.id, (v) => ({
              ...v,
              w: v.h,
              h: v.w,
              x: Math.round(v.x + v.w / 2 - v.h / 2),
              y: Math.round(v.y + v.h / 2 - v.w / 2),
            })),
          ),
      },
    ],
  };
}
registerShape(barDef('act.fork', 'Fork Node', 'fork'));
registerShape(barDef('act.join', 'Join Node', 'join'));

// ---------------- Object node ----------------

type ObjKind = 'object' | 'centralBuffer' | 'dataStore';
const OBJ: Record<ObjKind, { type: string; label: string; icon: string; stereo: string }> = {
  object: { type: 'act.object', label: 'Object Node', icon: 'object-node', stereo: '' },
  centralBuffer: {
    type: 'act.centralBuffer',
    label: 'Central Buffer Node',
    icon: 'central-buffer',
    stereo: 'centralBuffer',
  },
  dataStore: { type: 'act.dataStore', label: 'Data Store Node', icon: 'data-store', stereo: 'datastore' },
};

const objTitle = (m: ModelElement | null, d: Record<string, unknown>) =>
  [m?.name ?? '', str(d.type)].filter(Boolean).join(' : ');

function objDef(kind: ObjKind): ShapeDef {
  const info = OBJ[kind];
  return {
    type: info.type,
    label: info.label,
    icon: info.icon,
    modelKind: 'uml.objectNode',
    defaultModel: () => ({
      name: kind === 'dataStore' ? 'CSDL' : 'doiTuong',
      data: { type: '', inState: '', upperBound: '', ordering: 'FIFO', objectKind: kind },
    }),
    defaultSize: { w: 130, h: 46 },
    minSize: { w: 60, h: 30 },
    defaultProps: () => ({ autoSize: true }),
    defaultStyle: { fill: '#FFFFFF', stroke: INK, strokeWidth: 1.3 },
    styleFields: ['fill', 'stroke', 'strokeWidth'],
    modelSchema: z.object({
      type: z.string().describe('Kiểu'),
      inState: z.string().describe('Trạng thái [state]'),
      upperBound: z.string().describe('upperBound'),
      ordering: z.enum(['FIFO', 'LIFO', 'ordered', 'unordered']).describe('Thứ tự'),
    }),
    render: (ctx) => {
      const v = ctx.view;
      const d = ctx.data;
      const lines = [
        info.stereo ? `«${info.stereo}»` : '',
        ctx.editing === 'name' ? '' : objTitle(ctx.model, d),
        str(d.inState) ? `[${str(d.inState)}]` : '',
      ];
      const shown = lines.filter((x, i) => x || i === 1);
      const top = v.y + v.h / 2 - (shown.length * 16) / 2 + 8;
      return (
        <>
          <rect x={v.x} y={v.y} width={v.w} height={v.h} {...strokeProps(ctx)} />
          {shown.map((t, i) =>
            t ? (
              <Label
                key={i}
                x={v.x + v.w / 2}
                y={top + i * 16}
                text={fitText(t, i === 0 && info.stereo ? 11 : FS, i === 0 && info.stereo ? 400 : 500, v.w - 10)}
                size={i === 0 && info.stereo ? 11 : FS}
                weight={t.startsWith('«') || t.startsWith('[') ? 400 : 500}
                color={t.startsWith('«') || t.startsWith('[') ? '#475569' : INK}
                underline={false}
              />
            ) : null,
          )}
        </>
      );
    },
    textRegions: (ctx) => [
      {
        key: 'name',
        box: { x: ctx.view.x + 4, y: ctx.view.y + ctx.view.h / 2 - 11, w: ctx.view.w - 8, h: 22 },
        value: objTitle(ctx.model, ctx.data),
        align: 'center',
        fontSize: FS,
        fontWeight: 500,
        placeholder: 'ten : Kieu',
        commit: (tx, value) => {
          if (!ctx.model) return;
          const [name, ...rest] = value.split(':');
          tx.setModel(ctx.model.id, (m) => ({
            ...m,
            name: name.trim() || 'doiTuong',
            data: { ...m.data, type: rest.join(':').trim() },
          }));
        },
      },
    ],
    measure: (ctx) => {
      if ((ctx.props as P).autoSize === false) return null;
      const d = ctx.data;
      const rows = 1 + (info.stereo ? 1 : 0) + (str(d.inState) ? 1 : 0);
      const w = Math.max(
        90,
        textW(objTitle(ctx.model, d), FS, 500) + 24,
        info.stereo ? textW(`«${info.stereo}»`, 11, 400) + 24 : 0,
      );
      return { w: Math.round(w), h: Math.max(40, rows * 16 + 18) };
    },
    catalog: [{ connector: 'act.objectFlow', shape: 'act.action', label: 'Object Flow → Action' }],
  };
}
for (const k of Object.keys(OBJ) as ObjKind[]) registerShape(objDef(k));
