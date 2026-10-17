// Hình khác của Class Diagram: N-ary Association, Association Class, Collaboration, REST Service.
import { z } from 'zod';
import { Select } from '@/ui';
import { pointAt } from '../engine/geometry';
import { registerShape, type RenderCtx, type ShapeInspectorProps, type Tx } from '../engine/registry';
import { makeRouteEnv } from '../engine/render';
import { routeConnector } from '../engine/route';
import { Label, fitText, textW } from '../engine/text';
import { dashArray, strokeProps } from '../shapes/common/helpers';
import { classifierDef, renderClassifier } from './classifier';

type P = Record<string, unknown>;
const str = (v: unknown, d = '') => (v === undefined || v === null ? d : String(v));

// ---------------- N-ary Association ----------------

registerShape<P>({
  type: 'cls.naryAssoc',
  label: 'N-ary Association',
  icon: 'nary-association',
  modelKind: 'uml.association',
  outline: 'diamond',
  defaultModel: () => ({ name: '', data: { nary: true } }),
  defaultSize: { w: 44, h: 44 },
  minSize: { w: 24, h: 24 },
  aspectLock: true,
  defaultStyle: { fill: '#FFFFFF', stroke: '#1F2937', strokeWidth: 1.3 },
  styleFields: ['fill', 'stroke', 'strokeWidth'],
  render: (ctx) => {
    const v = ctx.view;
    const name = ctx.model?.name ?? '';
    return (
      <>
        <polygon
          points={`${v.x + v.w / 2},${v.y} ${v.x + v.w},${v.y + v.h / 2} ${v.x + v.w / 2},${v.y + v.h} ${v.x},${v.y + v.h / 2}`}
          {...strokeProps(ctx)}
        />
        {name && ctx.editing !== 'name' && <Label x={v.x + v.w / 2} y={v.y - 9} text={name} size={12.5} />}
      </>
    );
  },
  textRegions: (ctx) => [
    {
      key: 'name',
      box: { x: ctx.view.x - 50, y: ctx.view.y - 22, w: ctx.view.w + 100, h: 20 },
      value: ctx.model?.name ?? '',
      align: 'center',
      fontSize: 12.5,
      commit: (tx, value) => ctx.model && tx.setModel(ctx.model.id, { name: value.trim() }),
    },
  ],
  catalog: [{ connector: 'cls.naryEnd', shape: 'cls.class', label: 'Đầu N-ary → Class' }],
});

// ---------------- Association Class ----------------

/** Điểm giữa đường association mà association class gắn vào (null nếu chưa gắn / đường đã xoá). */
function assocMid(ctx: RenderCtx): [number, number] | null {
  const id = str((ctx.props as P).associationId);
  const c = id ? ctx.lookup.conn(id) : undefined;
  if (!c) return null;
  const r = routeConnector(c, makeRouteEnv(ctx.lookup, undefined, false));
  return r ? pointAt(r.pts, 0.5) : null;
}

function AssocClassInspector({ view, apply, lookup, readOnly }: ShapeInspectorProps) {
  const options = [
    { value: '', label: '(Chưa gắn)' },
    ...lookup
      .conns()
      .filter((c) => c.modelId && lookup.model(c.modelId)?.kind === 'uml.association')
      .map((c) => {
        const n = (vid: string | null) => {
          const v = lookup.view(vid);
          return (v?.modelId && lookup.model(v.modelId)?.name) || '?';
        };
        const m = lookup.model(c.modelId);
        return { value: c.id, label: `${n(c.source.viewId)} — ${n(c.target.viewId)}${m?.name ? ` (${m.name})` : ''}` };
      }),
  ];
  return (
    <div className="pgroup">
      <div className="pgroup-h">Gắn vào association</div>
      <Select
        value={str(view.props.associationId)}
        disabled={readOnly}
        aria-label="Association được gắn"
        options={options}
        onChange={(e) => apply((tx) => tx.setViewProps(view.id, { associationId: e.target.value }))}
      />
      <p className="text-[11.5px] text-muted">
        Association class nối bằng nét đứt tới điểm giữa của association đã chọn.
      </p>
    </div>
  );
}

const assocClassBase = classifierDef('class');
registerShape({
  ...assocClassBase,
  type: 'cls.assocClass',
  label: 'Association Class',
  icon: 'association-class',
  modelKind: 'uml.associationClass',
  live: true,
  defaultModel: () => ({
    name: 'AssociationClass',
    data: { attributes: [], operations: [], stereotypes: [], templateParams: [] },
  }),
  inspector: AssocClassInspector,
  render: (ctx) => {
    const v = ctx.view;
    const mid = assocMid(ctx);
    let link = null;
    if (mid) {
      // từ cạnh hình gần điểm giữa nhất
      const cx = Math.max(v.x, Math.min(v.x + v.w, mid[0]));
      const cy = mid[1] < v.y ? v.y : mid[1] > v.y + v.h ? v.y + v.h : v.y + v.h / 2;
      const sw = Number(ctx.style.strokeWidth) || 1.3;
      link = (
        <path
          d={`M${cx},${cy} L${mid[0]},${mid[1]}`}
          stroke={ctx.style.stroke}
          strokeWidth={sw}
          strokeDasharray={dashArray(sw)}
          fill="none"
        />
      );
    }
    return (
      <>
        {link}
        {renderClassifier(ctx, 'class')}
      </>
    );
  },
});

// ---------------- Collaboration (class) ----------------

registerShape<P>({
  type: 'cls.collaboration',
  label: 'Collaboration',
  icon: 'collaboration',
  modelKind: 'uml.collaboration',
  outline: 'ellipse',
  defaultModel: () => ({ name: 'Collaboration', data: { roles: [] } }),
  defaultSize: { w: 170, h: 90 },
  minSize: { w: 60, h: 36 },
  defaultStyle: { fill: '#FFFFFF', stroke: '#1F2937', strokeWidth: 1.3 },
  modelSchema: z.object({
    roles: z.array(z.string().describe('Role')).describe('Roles (vd. nguoiMua : SinhVien)'),
  }),
  styleFields: ['fill', 'stroke', 'strokeWidth'],
  render: (ctx) => {
    const v = ctx.view;
    const sw = Number(ctx.style.strokeWidth) || 1.3;
    const roles = (ctx.data.roles as string[] | undefined) ?? [];
    const cy = v.y + v.h / 2;
    const ny = roles.length ? v.y + v.h * 0.3 : cy;
    const half = (y: number) => (v.w / 2) * Math.sqrt(Math.max(0, 1 - ((y - cy) / (v.h / 2)) ** 2));
    const sy = v.y + v.h * 0.42;
    return (
      <>
        <ellipse
          cx={v.x + v.w / 2}
          cy={cy}
          rx={v.w / 2}
          ry={v.h / 2}
          fill={ctx.style.fill}
          stroke={ctx.style.stroke}
          strokeWidth={sw}
          strokeDasharray={dashArray(sw)}
        />
        {ctx.editing !== 'name' && (
          <Label
            x={v.x + v.w / 2}
            y={ny}
            text={fitText(ctx.model?.name ?? '', 13, 600, v.w * 0.7)}
            size={13}
            weight={600}
          />
        )}
        {roles.length > 0 && (
          <>
            <path
              d={`M${v.x + v.w / 2 - half(sy)},${sy} H${v.x + v.w / 2 + half(sy)}`}
              stroke={ctx.style.stroke}
              strokeWidth={1}
              strokeDasharray={dashArray(1)}
            />
            {roles.slice(0, 4).map((r, i) => (
              <Label
                key={i}
                x={v.x + v.w / 2}
                y={sy + 13 + i * 15}
                text={fitText(r, 11.5, 400, v.w * 0.7)}
                size={11.5}
              />
            ))}
          </>
        )}
      </>
    );
  },
  textRegions: (ctx) => [
    {
      key: 'name',
      box: { x: ctx.view.x + ctx.view.w * 0.15, y: ctx.view.y + ctx.view.h * 0.3 - 11, w: ctx.view.w * 0.7, h: 22 },
      value: ctx.model?.name ?? '',
      align: 'center',
      fontSize: 13,
      fontWeight: 600,
      commit: (tx, value) => ctx.model && tx.setModel(ctx.model.id, { name: value.trim() || 'Collaboration' }),
    },
  ],
});

// ---------------- REST Service ----------------

export const METHOD_COLORS: Record<string, string> = {
  GET: '#1F9D66',
  POST: '#2E6BE6',
  PUT: '#D98A1C',
  PATCH: '#7C5CC4',
  DELETE: '#D9463E',
};

interface RestParam {
  name: string;
  in: 'path' | 'query' | 'header' | 'body';
  type: string;
  required: boolean;
}
interface RestResponse {
  status: string;
  description: string;
  type: string;
}

function restSections(ctx: RenderCtx) {
  const d = ctx.data as {
    uri?: string;
    method?: string;
    requestParams?: RestParam[];
    requestBody?: string;
    responses?: RestResponse[];
  };
  const req = [
    ...(d.requestParams ?? []).map((p) => `${p.in} ${p.name}${p.required ? '*' : ''} : ${p.type || 'string'}`),
    ...(d.requestBody ? [`body : ${d.requestBody}`] : []),
  ];
  const res = (d.responses ?? []).map((r) => `${r.status} ${r.description}${r.type ? ' : ' + r.type : ''}`.trim());
  return { uri: str(d.uri, '/'), method: str(d.method, 'GET').toUpperCase(), req, res };
}

const R_LH = 17;
registerShape<P>({
  type: 'cls.rest',
  label: 'REST Service',
  icon: 'rest-service',
  modelKind: 'rest.resource',
  defaultModel: () => ({
    name: 'Resource',
    data: {
      uri: '/api/resource',
      method: 'GET',
      description: '',
      requestParams: [],
      requestBody: '',
      responses: [{ status: '200', description: 'OK', type: '' }],
    },
  }),
  defaultSize: { w: 240, h: 150 },
  minSize: { w: 120, h: 80 },
  defaultStyle: { fill: '#FFFFFF', stroke: '#1F2937', strokeWidth: 1.3 },
  modelSchema: z.object({
    uri: z.string().describe('URI'),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).describe('Method|select'),
    description: z.string().describe('Mô tả|textarea'),
    requestParams: z
      .array(
        z.object({
          name: z.string().describe('Tên'),
          in: z.enum(['path', 'query', 'header', 'body']).describe('Vị trí|select'),
          type: z.string().describe('Kiểu'),
          required: z.boolean().describe('Bắt buộc'),
        }),
      )
      .describe('Tham số request'),
    requestBody: z.string().describe('Request body (class)'),
    responses: z
      .array(
        z.object({
          status: z.string().describe('Status'),
          description: z.string().describe('Mô tả'),
          type: z.string().describe('Kiểu'),
        }),
      )
      .describe('Response'),
  }),
  styleFields: ['fill', 'stroke', 'strokeWidth'],
  render: (ctx) => {
    const v = ctx.view;
    const s = restSections(ctx);
    const sp = strokeProps(ctx);
    const mc = METHOD_COLORS[s.method] ?? '#64748B';
    const hdr = 42;
    const out = [
      <rect key="b" x={v.x} y={v.y} width={v.w} height={v.h} {...sp} />,
      <Label key="st" x={v.x + v.w / 2} y={v.y + 12} text="«REST Resource»" size={11} color="#334155" />,
      ctx.editing !== 'name' && (
        <Label
          key="nm"
          x={v.x + v.w / 2}
          y={v.y + 29}
          text={fitText(ctx.model?.name ?? '', 13, 700, v.w - 40)}
          size={13}
          weight={700}
        />
      ),
      // địa cầu góc trên phải
      <g
        key="globe"
        transform={`translate(${v.x + v.w - 22},${v.y + 6})`}
        fill="none"
        stroke="#2E62E6"
        strokeWidth={1.1}
      >
        <circle cx={8} cy={8} r={7} />
        <path d="M1,8 H15 M8,1 C5,4 5,12 8,15 M8,1 C11,4 11,12 8,15" />
      </g>,
      <path key="s1" d={`M${v.x},${v.y + hdr} H${v.x + v.w}`} stroke={sp.stroke} strokeWidth={sp.strokeWidth} />,
    ];
    let y = v.y + hdr + 6;
    const mw = textW(s.method, 10.5, 700) + 14;
    out.push(
      <rect key="mb" x={v.x + 8} y={y} width={mw} height={17} rx={8.5} fill={mc} />,
      <Label key="mt" x={v.x + 8 + mw / 2} y={y + 8.5} text={s.method} size={10.5} weight={700} color="#FFFFFF" />,
      <Label
        key="uri"
        x={v.x + 14 + mw}
        y={y + 8.5}
        text={fitText(s.uri, 12, 500, v.w - mw - 24)}
        size={12}
        weight={500}
        anchor="start"
      />,
    );
    y += 24;
    const block = (title: string, lines: string[], key: string) => {
      out.push(<path key={key + 's'} d={`M${v.x},${y} H${v.x + v.w}`} stroke={sp.stroke} strokeWidth={0.8} />);
      out.push(
        <Label
          key={key + 't'}
          x={v.x + 8}
          y={y + 9}
          text={title}
          size={10.5}
          weight={600}
          color="#64748B"
          anchor="start"
        />,
      );
      y += 16;
      lines.forEach((l, i) =>
        out.push(
          <Label
            key={key + i}
            x={v.x + 10}
            y={y + i * R_LH + 6}
            text={fitText(l, 11.5, 400, v.w - 18)}
            size={11.5}
            anchor="start"
          />,
        ),
      );
      y += Math.max(1, lines.length) * R_LH;
    };
    block('REQUEST', s.req.length ? s.req : ['—'], 'rq');
    block('RESPONSE', s.res.length ? s.res : ['—'], 'rs');
    return <>{out}</>;
  },
  measure: (ctx) => {
    const s = restSections(ctx);
    const h = 42 + 30 + 16 + Math.max(1, s.req.length) * R_LH + 16 + Math.max(1, s.res.length) * R_LH + 6;
    const w = Math.max(200, ...[...s.req, ...s.res].map((l) => textW(l, 11.5, 400) + 24), textW(s.uri, 12, 500) + 80);
    return { w: Math.max(ctx.view.w, Math.round(w)), h: Math.round(h) };
  },
  textRegions: (ctx) => [
    {
      key: 'name',
      box: { x: ctx.view.x + 20, y: ctx.view.y + 19, w: ctx.view.w - 40, h: 20 },
      value: ctx.model?.name ?? '',
      align: 'center',
      fontSize: 13,
      fontWeight: 700,
      commit: (tx: Tx, value: string) => ctx.model && tx.setModel(ctx.model.id, { name: value.trim() || 'Resource' }),
    },
  ],
});
