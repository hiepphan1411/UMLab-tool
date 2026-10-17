// Hình của Use Case Diagram (docs/spec/notation-usecase.md mục 1): Use Case, Actor, System, Collaboration.
import { Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { uid } from '@umlab/core';
import {
  registerShape,
  type EngineLookup,
  type RenderCtx,
  type ShapeInspectorProps,
  type Tx,
} from '../engine/registry';
import { Label, TextLines, fitText, layoutText, textW, wrapText } from '../engine/text';
import { dashArray, strokeProps } from '../shapes/common/helpers';
import { specMenu, specOf } from './spec-link';

type P = Record<string, unknown>;
const str = (v: unknown, d = '') => (v === undefined || v === null ? d : String(v));
export interface ExtPoint {
  id: string;
  name: string;
}
export const extPoints = (data: Record<string, unknown>) =>
  ((data.extensionPoints as ExtPoint[] | undefined) ?? []).filter((e) => e && e.name !== undefined);

// ---------------- mã UC tự tăng theo project ----------------

/** Số lớn nhất trong các mã UCxx hiện có (để mã mới không trùng kể cả khi nhập tệp). */
export function maxUcCode(lookup: EngineLookup): number {
  let n = 0;
  for (const m of lookup.allModel())
    if (m.kind === 'uml.usecase') {
      const k = /(\d+)/.exec(str(m.data.code));
      if (k) n = Math.max(n, Number(k[1]));
    }
  return n;
}
export function nextUcCode(tx: Tx): string {
  const n = Math.max(Number(tx.meta('ucCounter') ?? 0), maxUcCode(tx.lookup)) + 1;
  tx.setMeta('ucCounter', n);
  return 'UC' + String(n).padStart(2, '0');
}

// ---------------- Use Case ----------------

const UC_FS = 13;
const UC_LH = UC_FS * 1.3;
const EP_FS = 11.5;
const EP_LH = EP_FS * 1.35;

function ucTitle(ctx: RenderCtx): string {
  const code = str(ctx.data.code);
  const name = ctx.model?.name ?? 'Use case';
  return (ctx.props as P).showCode !== false && code ? `**${code}** ${name}` : name;
}

function ucLayout(ctx: RenderCtx) {
  const v = ctx.view;
  const eps = (ctx.props as P).showExtensionPoints !== false ? extPoints(ctx.data) : [];
  const tw = v.w * 0.72;
  const title = layoutText(ucTitle(ctx), UC_FS, 500, tw);
  const tH = title.length * UC_LH;
  const eH = eps.length ? 6 + (1 + eps.length) * EP_LH : 0;
  const cy = v.y + v.h / 2;
  const top = cy - (tH + eH) / 2;
  return { title, tH, eps, top, cx: v.x + v.w / 2, cy, a: v.w / 2, b: v.h / 2 };
}

function DocIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`} pointerEvents="none">
      <path d="M0,0 h7 l3,3 v10 h-10 z" fill="#FFFFFF" stroke="#2E62E6" strokeWidth={1.1} strokeLinejoin="round" />
      <path d="M7,0 v3 h3 M2.2,6 h5.6 M2.2,8.6 h5.6 M2.2,11 h3.6" fill="none" stroke="#2E62E6" strokeWidth={0.9} />
      <title>Đã có đặc tả</title>
    </g>
  );
}

function UseCaseInspector({ view, model, apply, readOnly, lookup }: ShapeInspectorProps) {
  const eps = model ? extPoints(model.data) : [];
  const [name, setName] = useState('');
  const spec = model ? specOf(lookup, model) : null;
  const setEps = (next: ExtPoint[]) => model && apply((tx) => tx.setModelData(model.id, { extensionPoints: next }));
  void view;
  return (
    <div className="pgroup">
      <div className="pgroup-h">Extension points</div>
      <div className="grid gap-1.5">
        {eps.map((e, i) => (
          <EpRow
            key={e.id}
            value={e.name}
            readOnly={readOnly}
            onCommit={(v) => setEps(eps.map((x, j) => (j === i ? { ...x, name: v } : x)))}
            onRemove={() => setEps(eps.filter((_, j) => j !== i))}
          />
        ))}
        {!eps.length && <p className="text-[11.5px] text-muted">Chưa có extension point.</p>}
      </div>
      {!readOnly && (
        <div className="flex gap-2">
          <input
            className="field"
            style={{ height: 28 }}
            placeholder="VD: Thanh toán thất bại"
            value={name}
            aria-label="Extension point mới"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim()) {
                setEps([...eps, { id: uid('ep'), name: name.trim() }]);
                setName('');
              }
            }}
          />
          <button
            className="btn outline"
            onClick={() => {
              if (!name.trim()) return;
              setEps([...eps, { id: uid('ep'), name: name.trim() }]);
              setName('');
            }}
          >
            <Plus />
            Thêm
          </button>
        </div>
      )}
      <p className="text-[11.5px] text-muted">
        {spec ? `Đặc tả: ${spec.name} (chuột phải → Mở đặc tả)` : 'Chưa có đặc tả — chuột phải → Tạo đặc tả.'}
      </p>
    </div>
  );
}

function EpRow({
  value,
  onCommit,
  onRemove,
  readOnly,
}: {
  value: string;
  onCommit: (v: string) => void;
  onRemove: () => void;
  readOnly: boolean;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <div className="flex items-center gap-1">
      <input
        className="field"
        style={{ height: 26 }}
        value={v}
        readOnly={readOnly}
        aria-label="Tên extension point"
        onChange={(e) => setV(e.target.value)}
        onBlur={() => v.trim() && v !== value && onCommit(v.trim())}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
      {!readOnly && (
        <button className="ibtn sm" aria-label="Xoá extension point" onClick={onRemove}>
          <X />
        </button>
      )}
    </div>
  );
}

registerShape<P>({
  type: 'uc.usecase',
  label: 'Use Case',
  icon: 'usecase',
  modelKind: 'uml.usecase',
  outline: 'ellipse',
  defaultModel: () => ({
    name: 'Use case mới',
    data: {
      code: '',
      description: '',
      rank: 'medium',
      status: 'proposed',
      isBusiness: false,
      extensionPoints: [],
      specDiagramId: null,
    },
  }),
  defaultSize: { w: 150, h: 70 },
  minSize: { w: 60, h: 30 },
  defaultProps: () => ({ showExtensionPoints: true, showCode: true }),
  defaultStyle: { fill: '#FFFFFF', stroke: '#2E62E6', strokeWidth: 1.4 },
  propsSchema: z.object({
    showCode: z.boolean().describe('Hiện mã UC trước tên'),
    showExtensionPoints: z.boolean().describe('Hiện extension points'),
  }),
  modelSchema: z.object({
    code: z.string().describe('Mã (tự tăng, sửa được)'),
    description: z.string().describe('Mô tả|textarea'),
    rank: z.enum(['high', 'medium', 'low']).describe('Mức ưu tiên|opts:high=Cao;medium=Trung bình;low=Thấp'),
    status: z
      .enum(['proposed', 'approved', 'done'])
      .describe('Trạng thái|opts:proposed=Đề xuất;approved=Đã duyệt;done=Hoàn thành'),
    isBusiness: z.boolean().describe('Business use case'),
  }),
  styleFields: ['fill', 'stroke', 'strokeWidth'],
  inspector: UseCaseInspector,
  onCreate: (tx, v) => {
    if (!v.modelId) return;
    const m = tx.model(v.modelId);
    if (m && !str(m.data.code)) tx.setModelData(m.id, { code: nextUcCode(tx) });
  },
  render: (ctx) => {
    const v = ctx.view;
    const L = ucLayout(ctx);
    const sp = strokeProps(ctx);
    const out = [
      <ellipse key="e" cx={L.cx} cy={L.cy} rx={L.a} ry={L.b} {...sp} />,
      ctx.editing !== 'name' && (
        <TextLines key="t" lines={L.title} x={L.cx} y={L.top} size={UC_FS} color="#1F2937" align="center" lh={UC_LH} />
      ),
    ];
    if (L.eps.length) {
      const ly = L.top + L.tH + 3;
      const half = L.a * Math.sqrt(Math.max(0, 1 - ((ly - L.cy) / L.b) ** 2));
      out.push(
        <path key="sep" d={`M${L.cx - half},${ly} H${L.cx + half}`} stroke={sp.stroke} strokeWidth={1} />,
        <Label key="eph" x={L.cx} y={ly + 3 + EP_LH / 2} text="extension points" size={EP_FS} italic color="#334155" />,
      );
      if (ctx.editing !== 'ext')
        L.eps.forEach((e, i) =>
          out.push(
            <Label
              key={'ep' + e.id}
              x={L.cx}
              y={ly + 3 + EP_LH * (i + 1.5)}
              text={fitText(e.name, EP_FS, 400, L.a * 1.5)}
              size={EP_FS}
              color="#1F2937"
            />,
          ),
        );
    }
    if (ctx.data.isBusiness)
      out.push(
        <path
          key="biz"
          d={`M${L.cx - L.a * 0.82},${L.cy + L.b * 0.32} L${L.cx - L.a * 0.36},${L.cy + L.b * 0.92}`}
          stroke={sp.stroke}
          strokeWidth={sp.strokeWidth}
        />,
      );
    if (ctx.model && specOf(ctx.lookup, ctx.model))
      out.push(<DocIcon key="doc" x={v.x + v.w * 0.82} y={v.y + v.h * 0.06} />);
    return <>{out}</>;
  },
  measure: (ctx) => {
    const t = wrapText(ucTitle(ctx), UC_FS, 500, 200);
    const eps = (ctx.props as P).showExtensionPoints !== false ? extPoints(ctx.data) : [];
    const epW = Math.max(0, textW('extension points', EP_FS, 400, true), ...eps.map((e) => textW(e.name, EP_FS, 400)));
    const tw = Math.max(t.width, epW);
    const th = t.height + (eps.length ? 6 + (1 + eps.length) * EP_LH : 0);
    const w = Math.max(120, Math.round(tw * 1.45 + 24));
    const h = Math.max(56, Math.round(th * 1.5 + 14));
    return w > ctx.view.w || h > ctx.view.h ? { w: Math.max(w, ctx.view.w), h: Math.max(h, ctx.view.h) } : null;
  },
  textRegions: (ctx) => {
    const L = ucLayout(ctx);
    const v = ctx.view;
    const regs = [
      {
        key: 'name',
        box: { x: L.cx - L.a * 0.72, y: L.top - 2, w: L.a * 1.44, h: Math.max(UC_LH, L.tH) + 4 },
        value: ctx.model?.name ?? '',
        multiline: true,
        align: 'center' as const,
        fontSize: UC_FS,
        fontWeight: 500,
        commit: (tx: Tx, value: string) => ctx.model && tx.setModel(ctx.model.id, { name: value.trim() || 'Use case' }),
      },
    ];
    if ((ctx.props as P).showExtensionPoints !== false && L.eps.length)
      regs.push({
        key: 'ext',
        box: { x: L.cx - L.a * 0.7, y: L.top + L.tH + 6 + EP_LH, w: L.a * 1.4, h: L.eps.length * EP_LH + 4 },
        value: L.eps.map((e) => e.name).join('\n'),
        multiline: true,
        align: 'center',
        fontSize: EP_FS,
        fontWeight: 400,
        list: true,
        commit: (tx: Tx, value: string) => {
          if (!ctx.model) return;
          const names = value
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean);
          const old = L.eps;
          // giữ id theo thứ tự dòng để Extend đang trỏ tới không mất liên kết khi đổi tên
          const next = names.map((n, i) => ({ id: old[i]?.id ?? uid('ep'), name: n }));
          tx.setModelData(ctx.model.id, { extensionPoints: next });
        },
      } as (typeof regs)[number] & { list: boolean });
    void v;
    return regs;
  },
  contextMenu: (v, api) => [
    ...specMenu(v, api),
    {
      label: 'Thêm extension point',
      onSelect: () =>
        api.apply((tx) => {
          const m = v.modelId ? tx.model(v.modelId) : undefined;
          if (m)
            tx.setModelData(m.id, {
              extensionPoints: [...extPoints(m.data), { id: uid('ep'), name: 'extension point' }],
            });
          tx.setViewProps(v.id, { showExtensionPoints: true });
        }),
    },
  ],
  catalog: [
    { connector: 'uc.include', shape: 'uc.usecase', label: 'Include → Use Case' },
    { connector: 'uc.extend', shape: 'uc.usecase', label: 'Extend → Use Case', reverse: true },
    { connector: 'uc.association', shape: 'uc.actor', label: 'Association → Actor', reverse: true },
    { connector: 'uc.generalization', shape: 'uc.usecase', label: 'Generalization → Use Case' },
    { connector: 'common.anchor', shape: 'common.note', label: 'Anchor → Note' },
  ],
  name: (ctx) => `${str(ctx.data.code)} ${ctx.model?.name ?? ''}`.trim(),
});

// ---------------- Actor ----------------

function StickFigure({ ctx, x, y, w, h }: { ctx: RenderCtx; x: number; y: number; w: number; h: number }) {
  const s = ctx.style;
  const cx = x + w / 2;
  const r = Math.min(h * 0.13, w * 0.24);
  const hy = y + r + 1;
  const neck = hy + r;
  const hip = y + h * 0.64;
  const arm = y + h * 0.4;
  const common = { stroke: s.stroke, strokeWidth: s.strokeWidth, strokeLinecap: 'round' as const, fill: 'none' };
  return (
    <>
      <circle cx={cx} cy={hy} r={r} fill={s.fill} stroke={s.stroke} strokeWidth={s.strokeWidth} />
      <path
        d={`M${cx},${neck} V${hip} M${cx - w * 0.4},${arm} H${cx + w * 0.4} M${cx},${hip} L${cx - w * 0.32},${y + h} M${cx},${hip} L${cx + w * 0.32},${y + h}`}
        {...common}
      />
      {ctx.data.isBusiness ? (
        <path d={`M${cx - r * 1.05},${hy + r * 0.55} L${cx + r * 0.55},${hy - r * 1.05}`} {...common} />
      ) : null}
    </>
  );
}

registerShape<P>({
  type: 'uc.actor',
  label: 'Actor',
  icon: 'actor',
  modelKind: 'uml.actor',
  defaultModel: () => ({ name: 'Actor', data: { description: '', isBusiness: false, type: 'user' } }),
  defaultSize: { w: 46, h: 96 },
  minSize: { w: 24, h: 50 },
  defaultProps: () => ({ display: 'stick' }),
  defaultStyle: { fill: '#FFFFFF', stroke: '#1F2937', strokeWidth: 1.5 },
  propsSchema: z.object({
    display: z.enum(['stick', 'rect', 'icon']).describe('Kiểu hiển thị|opts:stick=Hình người;rect=Chữ nhật;icon=Icon'),
  }),
  modelSchema: z.object({
    description: z.string().describe('Mô tả|textarea'),
    type: z
      .enum(['user', 'external', 'device'])
      .describe('Loại|opts:user=Người dùng;external=Hệ thống ngoài;device=Thiết bị'),
    isBusiness: z.boolean().describe('Business actor'),
  }),
  styleFields: ['fill', 'stroke', 'strokeWidth'],
  render: (ctx) => {
    const v = ctx.view;
    const display = str((ctx.props as P).display, 'stick');
    const name = ctx.model?.name ?? 'Actor';
    const editing = ctx.editing === 'name';
    if (display === 'rect') {
      return (
        <>
          <rect x={v.x} y={v.y} width={v.w} height={v.h} rx={2} {...strokeProps(ctx)} />
          <Label x={v.x + v.w / 2} y={v.y + v.h / 2 - 9} text="«actor»" size={11.5} color="#475569" />
          {!editing && (
            <Label
              x={v.x + v.w / 2}
              y={v.y + v.h / 2 + 8}
              text={fitText(name, 13, 600, v.w - 10)}
              size={13}
              weight={600}
            />
          )}
          <StickFigure ctx={ctx} x={v.x + v.w - 18} y={v.y + 5} w={12} h={20} />
        </>
      );
    }
    const labelH = 18;
    const fig = display === 'icon' ? Math.min(v.w, v.h - labelH) : 0;
    return (
      <>
        <rect x={v.x} y={v.y} width={v.w} height={v.h} fill="transparent" />
        {display === 'icon' ? (
          <>
            <circle
              cx={v.x + v.w / 2}
              cy={v.y + fig / 2}
              r={fig / 2}
              fill="#E7EEFD"
              stroke={ctx.style.stroke}
              strokeWidth={ctx.style.strokeWidth}
            />
            <circle
              cx={v.x + v.w / 2}
              cy={v.y + fig * 0.38}
              r={fig * 0.15}
              fill="none"
              stroke={ctx.style.stroke}
              strokeWidth={1.4}
            />
            <path
              d={`M${v.x + v.w / 2 - fig * 0.27},${v.y + fig * 0.78} a${fig * 0.27},${fig * 0.22} 0 0 1 ${fig * 0.54},0`}
              fill="none"
              stroke={ctx.style.stroke}
              strokeWidth={1.4}
            />
          </>
        ) : (
          <StickFigure ctx={ctx} x={v.x} y={v.y} w={v.w} h={v.h - labelH - 4} />
        )}
        {!editing && <Label x={v.x + v.w / 2} y={v.y + v.h - labelH / 2 + 2} text={name} size={13} weight={500} />}
      </>
    );
  },
  textRegions: (ctx) => {
    const v = ctx.view;
    const w = Math.max(110, textW(ctx.model?.name ?? '', 13, 500) + 20);
    return [
      {
        key: 'name',
        box:
          str((ctx.props as P).display) === 'rect'
            ? { x: v.x, y: v.y + v.h / 2 - 2, w: v.w, h: 20 }
            : { x: v.x + v.w / 2 - w / 2, y: v.y + v.h - 20, w, h: 22 },
        value: ctx.model?.name ?? '',
        align: 'center',
        fontSize: 13,
        fontWeight: 500,
        commit: (tx: Tx, value: string) => ctx.model && tx.setModel(ctx.model.id, { name: value.trim() || 'Actor' }),
      },
    ];
  },
  catalog: [
    { connector: 'uc.association', shape: 'uc.usecase', label: 'Association → Use Case' },
    { connector: 'uc.generalization', shape: 'uc.actor', label: 'Generalization → Actor' },
  ],
});

// ---------------- System (subject) ----------------

registerShape<P>({
  type: 'uc.system',
  label: 'System',
  icon: 'system',
  modelKind: 'uml.subject',
  defaultModel: () => ({ name: 'Hệ thống', data: {} }),
  defaultSize: { w: 380, h: 300 },
  minSize: { w: 120, h: 80 },
  container: {
    accepts: ['uc.usecase', 'uc.collaboration', 'common.note', 'common.textbox', 'uc.actor'],
    autoGrow: true,
    padding: 16,
    header: 34,
  },
  defaultStyle: { fill: '#FFFFFF', stroke: '#1F2937', strokeWidth: 1.4 },
  styleFields: ['fill', 'stroke', 'strokeWidth', 'dash'],
  render: (ctx) => {
    const v = ctx.view;
    return (
      <>
        <rect x={v.x} y={v.y} width={v.w} height={v.h} {...strokeProps(ctx)} />
        {ctx.editing !== 'name' && (
          <Label
            x={v.x + v.w / 2}
            y={v.y + 18}
            text={fitText(ctx.model?.name ?? 'Hệ thống', 14, 700, v.w - 20)}
            size={14}
            weight={700}
          />
        )}
      </>
    );
  },
  textRegions: (ctx) => [
    {
      key: 'name',
      box: { x: ctx.view.x + 10, y: ctx.view.y + 6, w: ctx.view.w - 20, h: 24 },
      value: ctx.model?.name ?? '',
      align: 'center',
      fontSize: 14,
      fontWeight: 700,
      commit: (tx: Tx, value: string) => ctx.model && tx.setModel(ctx.model.id, { name: value.trim() || 'Hệ thống' }),
    },
  ],
});

// ---------------- Collaboration ----------------

registerShape<P>({
  type: 'uc.collaboration',
  label: 'Collaboration',
  icon: 'collaboration',
  modelKind: 'uml.collaboration',
  outline: 'ellipse',
  defaultModel: () => ({ name: 'Collaboration', data: { description: '' } }),
  defaultSize: { w: 150, h: 70 },
  minSize: { w: 60, h: 30 },
  defaultStyle: { fill: '#FFFFFF', stroke: '#2E62E6', strokeWidth: 1.4 },
  modelSchema: z.object({ description: z.string().describe('Mô tả|textarea') }),
  styleFields: ['fill', 'stroke', 'strokeWidth'],
  render: (ctx) => {
    const v = ctx.view;
    const sw = Number(ctx.style.strokeWidth) || 1.4;
    const t = wrapText(ctx.model?.name ?? '', UC_FS, 500, v.w * 0.72);
    return (
      <>
        <ellipse
          cx={v.x + v.w / 2}
          cy={v.y + v.h / 2}
          rx={v.w / 2}
          ry={v.h / 2}
          fill={ctx.style.fill}
          stroke={ctx.style.stroke}
          strokeWidth={sw}
          strokeDasharray={dashArray(sw)}
        />
        {ctx.editing !== 'name' && (
          <TextLines
            lines={t.lines}
            x={v.x + v.w / 2}
            y={v.y + (v.h - t.height) / 2}
            size={UC_FS}
            color="#1F2937"
            align="center"
            lh={t.lh}
          />
        )}
      </>
    );
  },
  textRegions: (ctx) => [
    {
      key: 'name',
      box: { x: ctx.view.x + ctx.view.w * 0.14, y: ctx.view.y + ctx.view.h / 2 - 12, w: ctx.view.w * 0.72, h: 24 },
      value: ctx.model?.name ?? '',
      multiline: true,
      align: 'center',
      fontSize: UC_FS,
      commit: (tx: Tx, value: string) =>
        ctx.model && tx.setModel(ctx.model.id, { name: value.trim() || 'Collaboration' }),
    },
  ],
  catalog: [{ connector: 'uc.realization', shape: 'uc.usecase', label: 'Realization → Use Case' }],
});
