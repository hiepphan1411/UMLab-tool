// Swimlane ngang / dọc (docs/spec/notation-activity.md "Swimlane (chi tiết)"): làn có tên, `represents` (actor /
// class), làn con tối đa 2 cấp; kéo vạch ngăn trên dải tiêu đề để đổi bề rộng; thêm/xoá/đổi tên/đổi thứ tự trong
// Inspector. Node thuộc làn theo vị trí (laneAt) — kéo swimlane thì node con đi theo (container).
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { uid, type View } from '@umlab/core';
import { IconButton, Select } from '@/ui';
import {
  registerShape,
  type RenderCtx,
  type ShapeDef,
  type ShapeInspectorProps,
  type ShapeHandle,
} from '../engine/registry';
import { Label, fitText } from '../engine/text';
import { INK } from '../shapes/common/helpers';

type P = Record<string, unknown>;

export interface Lane {
  id: string;
  name: string;
  /** Bề rộng (làn dọc) / chiều cao (làn ngang) — tỉ lệ, co giãn theo kích thước hình. */
  size: number;
  /** actor / class mà làn đại diện. */
  represents?: string;
  children?: Lane[];
}

export const lanesOf = (props: P): Lane[] =>
  Array.isArray(props.lanes)
    ? (props.lanes as Lane[]).map((l) => ({
        ...l,
        size: Number(l.size) > 0 ? Number(l.size) : 160,
        children: Array.isArray(l.children)
          ? l.children.map((c) => ({ ...c, size: Number(c.size) > 0 ? Number(c.size) : 120 }))
          : undefined,
      }))
    : [];

const SUB_H = 24;

export interface LaneBox {
  id: string;
  name: string;
  represents?: string;
  /** vị trí dọc trục làn (x với làn dọc, y với làn ngang) */
  a: number;
  len: number;
  depth: 0 | 1;
  parentId?: string;
}

/** Hình học các làn (cấp 1 + cấp 2) theo kích thước hiện tại của view. */
export function laneBoxes(view: Pick<View, 'x' | 'y' | 'w' | 'h' | 'shape' | 'props'>): LaneBox[] {
  const vertical = view.shape === 'act.swimlaneV';
  const lanes = lanesOf(view.props);
  const total = lanes.reduce((s, l) => s + l.size, 0) || 1;
  const span = vertical ? view.w : view.h;
  const start = vertical ? view.x : view.y;
  const out: LaneBox[] = [];
  let a = start;
  for (const l of lanes) {
    const len = (l.size / total) * span;
    out.push({ id: l.id, name: l.name, represents: l.represents, a, len, depth: 0 });
    const kids = l.children ?? [];
    const kt = kids.reduce((s, k) => s + k.size, 0) || 1;
    let b = a;
    for (const k of kids) {
      const kl = (k.size / kt) * len;
      out.push({ id: k.id, name: k.name, represents: k.represents, a: b, len: kl, depth: 1, parentId: l.id });
      b += kl;
    }
    a += len;
  }
  return out;
}

const headerOf = (view: Pick<View, 'props'>) => Number((view.props as P).header) || 34;

/** Làn (sâu nhất) chứa điểm (x, y) trên swimlane. */
export function laneAt(view: View, x: number, y: number): LaneBox | null {
  const vertical = view.shape === 'act.swimlaneV';
  const p = vertical ? x : y;
  const boxes = laneBoxes(view);
  const leaf = boxes.filter((b) => b.depth === 1 && p >= b.a && p <= b.a + b.len);
  if (leaf.length) return leaf[0];
  return boxes.find((b) => b.depth === 0 && p >= b.a && p <= b.a + b.len) ?? null;
}

function renderSwimlane(ctx: RenderCtx) {
  const v = ctx.view;
  const vertical = v.shape === 'act.swimlaneV';
  const H = headerOf(v);
  const stroke = String(ctx.style.stroke || INK);
  const sw = Number(ctx.style.strokeWidth) || 1.3;
  const headFill = String((ctx.props as P).headerFill || '#F1F5F9');
  const boxes = laneBoxes(v);
  const nameOf = (b: LaneBox) => b.name || (b.represents ? (ctx.lookup.model(b.represents)?.name ?? '') : '');
  const out = [
    <rect
      key="bg"
      x={v.x}
      y={v.y}
      width={v.w}
      height={v.h}
      fill={ctx.style.fill || '#FFFFFF'}
      stroke={stroke}
      strokeWidth={sw}
    />,
  ];
  for (const b of boxes) {
    const thick = b.depth === 0 ? H : SUB_H;
    const off = b.depth === 0 ? 0 : H;
    // dải tiêu đề
    if (vertical) {
      out.push(
        <rect
          key={'h' + b.id}
          x={b.a}
          y={v.y + off}
          width={b.len}
          height={thick}
          fill={headFill}
          stroke={stroke}
          strokeWidth={sw}
        />,
      );
      if (b.a > v.x)
        out.push(
          <path
            key={'d' + b.id}
            d={`M${b.a},${v.y + off} V${v.y + v.h}`}
            stroke={stroke}
            strokeWidth={b.depth ? sw * 0.7 : sw}
          />,
        );
      if (ctx.editing !== 'lane:' + b.id)
        out.push(
          <Label
            key={'n' + b.id}
            x={b.a + b.len / 2}
            y={v.y + off + thick / 2}
            text={fitText(nameOf(b), b.depth ? 11.5 : 13, b.depth ? 500 : 700, b.len - 10)}
            size={b.depth ? 11.5 : 13}
            weight={b.depth ? 500 : 700}
          />,
        );
    } else {
      out.push(
        <rect
          key={'h' + b.id}
          x={v.x + off}
          y={b.a}
          width={thick}
          height={b.len}
          fill={headFill}
          stroke={stroke}
          strokeWidth={sw}
        />,
      );
      if (b.a > v.y)
        out.push(
          <path
            key={'d' + b.id}
            d={`M${v.x + off},${b.a} H${v.x + v.w}`}
            stroke={stroke}
            strokeWidth={b.depth ? sw * 0.7 : sw}
          />,
        );
      if (ctx.editing !== 'lane:' + b.id) {
        const cx = v.x + off + thick / 2;
        const cy = b.a + b.len / 2;
        out.push(
          <g key={'n' + b.id} transform={`rotate(-90 ${cx} ${cy})`}>
            <Label
              x={cx}
              y={cy}
              text={fitText(nameOf(b), b.depth ? 11.5 : 13, b.depth ? 500 : 700, b.len - 10)}
              size={b.depth ? 11.5 : 13}
              weight={b.depth ? 500 : 700}
            />
          </g>,
        );
      }
    }
  }
  return <>{out}</>;
}

/** Tay nắm vạch ngăn giữa hai làn cấp 1 (trên dải tiêu đề). */
function dividerHandles(ctx: RenderCtx): ShapeHandle[] {
  const v = ctx.view;
  const vertical = v.shape === 'act.swimlaneV';
  const H = headerOf(v);
  const top = laneBoxes(v).filter((b) => b.depth === 0);
  return top.slice(0, -1).map((b, i) => ({
    key: 'div:' + i,
    x: vertical ? b.a + b.len : v.x + H / 2,
    y: vertical ? v.y + H / 2 : b.a + b.len,
    shape: 'square' as const,
    title: 'Kéo để đổi bề rộng làn',
  }));
}

function swimDef(vertical: boolean): ShapeDef {
  return {
    type: vertical ? 'act.swimlaneV' : 'act.swimlaneH',
    label: vertical ? 'Vertical Swimlane' : 'Horizontal Swimlane',
    icon: vertical ? 'swimlane-v' : 'swimlane-h',
    defaultSize: vertical ? { w: 480, h: 420 } : { w: 620, h: 300 },
    minSize: { w: 120, h: 100 },
    container: { accepts: '*', autoGrow: true, padding: 12, header: vertical ? 40 : 0 },
    defaultProps: () => ({
      header: 34,
      headerFill: '',
      lanes: [
        { id: uid('ln'), name: 'Làn 1', size: 240 },
        { id: uid('ln'), name: 'Làn 2', size: 240 },
      ],
    }),
    defaultStyle: { fill: '#FFFFFF', stroke: INK, strokeWidth: 1.3 },
    styleFields: ['fill', 'stroke', 'strokeWidth'],
    render: renderSwimlane,
    handles: dividerHandles,
    dragHandle: (ctx, key, pt) => {
      const i = Number(key.split(':')[1]);
      const v = ctx.view;
      const lanes = lanesOf(ctx.props as P);
      const boxes = laneBoxes(v).filter((b) => b.depth === 0);
      const a = boxes[i];
      const b = boxes[i + 1];
      if (!a || !b) return null;
      const p = vertical ? pt[0] : pt[1];
      const min = 40;
      const cut = Math.max(a.a + min, Math.min(b.a + b.len - min, p));
      const scale = (lanes.reduce((s, l) => s + l.size, 0) || 1) / (vertical ? v.w : v.h);
      const next = lanes.map((l, k) =>
        k === i ? { ...l, size: (cut - a.a) * scale } : k === i + 1 ? { ...l, size: (b.a + b.len - cut) * scale } : l,
      );
      return { lanes: next };
    },
    textRegions: (ctx) => {
      const v = ctx.view;
      const H = headerOf(v);
      return laneBoxes(v).map((b) => {
        const thick = b.depth === 0 ? H : SUB_H;
        const off = b.depth === 0 ? 0 : H;
        return {
          key: 'lane:' + b.id,
          box: vertical
            ? { x: b.a + 4, y: v.y + off + 4, w: b.len - 8, h: thick - 8 }
            : { x: v.x + off + 2, y: b.a + b.len / 2 - 11, w: Math.max(thick - 4, 120), h: 22 },
          value: b.name,
          align: 'center' as const,
          fontSize: b.depth ? 11.5 : 13,
          fontWeight: b.depth ? 500 : 700,
          commit: (tx, value) =>
            tx.setViewProps(v.id, {
              lanes: lanesOf(tx.view(v.id)?.props ?? {}).map((l) =>
                l.id === b.id
                  ? { ...l, name: value.trim() }
                  : { ...l, children: l.children?.map((c) => (c.id === b.id ? { ...c, name: value.trim() } : c)) },
              ),
            }),
        };
      });
    },
    inspector: SwimlaneInspector,
  };
}

function LaneRow({
  lane,
  depth,
  index,
  count,
  readOnly,
  options,
  onChange,
  onMove,
  onRemove,
  onAddSub,
}: {
  lane: Lane;
  depth: number;
  index: number;
  count: number;
  readOnly: boolean;
  options: { value: string; label: string }[];
  onChange: (p: Partial<Lane>) => void;
  onMove: (d: -1 | 1) => void;
  onRemove: () => void;
  onAddSub?: () => void;
}) {
  const [name, setName] = useState(lane.name);
  useEffect(() => setName(lane.name), [lane.name]);
  return (
    <div
      className="grid gap-1 rounded-md border border-line p-1.5"
      style={{ marginLeft: depth * 14, background: 'var(--panel-2)' }}
    >
      <div className="flex items-center gap-1">
        <input
          className="field"
          style={{ height: 26 }}
          aria-label={`Tên làn ${index + 1}`}
          value={name}
          readOnly={readOnly}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name !== lane.name && onChange({ name })}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
        <IconButton label="Lên" size="sm" disabled={readOnly || index === 0} onClick={() => onMove(-1)}>
          <ArrowUp />
        </IconButton>
        <IconButton label="Xuống" size="sm" disabled={readOnly || index === count - 1} onClick={() => onMove(1)}>
          <ArrowDown />
        </IconButton>
        {onAddSub && (
          <IconButton label="Thêm làn con" size="sm" disabled={readOnly} onClick={onAddSub}>
            <Plus />
          </IconButton>
        )}
        <IconButton label="Xoá làn" size="sm" disabled={readOnly || (depth === 0 && count <= 1)} onClick={onRemove}>
          <Trash2 />
        </IconButton>
      </div>
      <Select
        aria-label="Đại diện (represents)"
        value={lane.represents ?? ''}
        disabled={readOnly}
        onChange={(e) => onChange({ represents: e.target.value || undefined })}
        options={options}
      />
    </div>
  );
}

function SwimlaneInspector({ view, apply, readOnly, lookup }: ShapeInspectorProps) {
  const lanes = lanesOf(view.props);
  const set = (next: Lane[]) => apply((tx) => tx.setViewProps(view.id, { lanes: next }));
  const options = [
    { value: '', label: '(không đại diện)' },
    ...lookup
      .allModel()
      .filter((m) => m.kind === 'uml.actor' || m.kind === 'uml.class')
      .map((m) => ({ value: m.id, label: `${m.kind === 'uml.actor' ? 'Actor' : 'Class'}: ${m.name}` })),
  ];
  const move = <T,>(arr: T[], i: number, d: number) => {
    const n = [...arr];
    const [x] = n.splice(i, 1);
    n.splice(i + d, 0, x);
    return n;
  };
  const avg = lanes.reduce((s, l) => s + l.size, 0) / Math.max(1, lanes.length);
  return (
    <div className="pgroup">
      <div className="flex items-center justify-between">
        <div className="pgroup-h">Làn ({lanes.length})</div>
        <IconButton
          label="Thêm làn"
          disabled={readOnly}
          onClick={() => {
            const vertical = view.shape === 'act.swimlaneV';
            apply((tx) => {
              tx.setViewProps(view.id, {
                lanes: [...lanes, { id: uid('ln'), name: `Làn ${lanes.length + 1}`, size: avg || 200 }],
              });
              // nới hình để làn mới có chỗ
              tx.setView(view.id, (v) =>
                vertical
                  ? { ...v, w: Math.round(v.w + v.w / lanes.length) }
                  : { ...v, h: Math.round(v.h + v.h / lanes.length) },
              );
            });
          }}
        >
          <Plus />
        </IconButton>
      </div>
      {lanes.map((l, i) => (
        <div key={l.id} className="grid gap-1">
          <LaneRow
            lane={l}
            depth={0}
            index={i}
            count={lanes.length}
            readOnly={readOnly}
            options={options}
            onChange={(p) => set(lanes.map((x) => (x.id === l.id ? { ...x, ...p } : x)))}
            onMove={(d) => set(move(lanes, i, d))}
            onRemove={() => set(lanes.filter((x) => x.id !== l.id))}
            onAddSub={() =>
              set(
                lanes.map((x) =>
                  x.id === l.id
                    ? {
                        ...x,
                        children: [
                          ...(x.children ?? []),
                          { id: uid('ln'), name: `${x.name}.${(x.children?.length ?? 0) + 1}`, size: 120 },
                        ],
                      }
                    : x,
                ),
              )
            }
          />
          {(l.children ?? []).map((c, k) => (
            <LaneRow
              key={c.id}
              lane={c}
              depth={1}
              index={k}
              count={l.children!.length}
              readOnly={readOnly}
              options={options}
              onChange={(p) =>
                set(
                  lanes.map((x) =>
                    x.id === l.id
                      ? { ...x, children: x.children!.map((y) => (y.id === c.id ? { ...y, ...p } : y)) }
                      : x,
                  ),
                )
              }
              onMove={(d) => set(lanes.map((x) => (x.id === l.id ? { ...x, children: move(x.children!, k, d) } : x)))}
              onRemove={() =>
                set(
                  lanes.map((x) => (x.id === l.id ? { ...x, children: x.children!.filter((y) => y.id !== c.id) } : x)),
                )
              }
            />
          ))}
        </div>
      ))}
      <p className="text-[11.5px] text-muted">
        Kéo ô vuông trên dải tiêu đề để đổi bề rộng làn; nhấp đúp tên làn để sửa. Node thả vào làn thuộc làn đó (theo vị
        trí).
      </p>
    </div>
  );
}

registerShape(swimDef(true));
registerShape(swimDef(false));
