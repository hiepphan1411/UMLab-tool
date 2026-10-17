// Inspector riêng của sơ đồ kiến trúc — giữ đúng bố cục Inspector của tool cũ (Tiêu đề, Nội dung, Icon, Màu nhanh…).
import { AlignCenter, AlignLeft, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import type { Connector, ModelElement } from '@umlab/core';
import { Checkbox, ColorField, NumberField, Segmented } from '@/ui';
import type { EngineLookup, ShapeInspectorProps, Tx } from '../engine/registry';
import { IconPreview, iconKeyInfo } from './icons';
import { GROUP_PRESETS, NODE_PRESETS, type CardIcon } from './presets';

type P = Record<string, unknown>;
const str = (v: unknown, d = '') => (v === undefined || v === null ? d : String(v));
const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);

/** Trạng thái giao diện chung giữa Inspector và tab Icon: thẻ đang chờ thêm icon. */
export const useArchUi = create<{ pickFor: string | null }>(() => ({ pickFor: null }));

function TextProp({
  label,
  value,
  onCommit,
  rows = 2,
  readOnly,
}: {
  label: string;
  value: string;
  onCommit: (v: string) => void;
  rows?: number;
  readOnly?: boolean;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <div>
      <span className="lbl">{label}</span>
      <textarea
        className="field"
        rows={rows}
        value={v}
        readOnly={readOnly}
        data-focus
        onChange={(e) => setV(e.target.value)}
        onBlur={() => v !== value && onCommit(v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) (e.target as HTMLTextAreaElement).blur();
        }}
      />
    </div>
  );
}

const WEIGHTS = [
  { value: 400, label: 'Thường' },
  { value: 500, label: 'Vừa' },
  { value: 700, label: 'Đậm' },
];
const ALIGN2 = [
  { value: 'left', label: <AlignLeft size={14} />, title: 'Trái' },
  { value: 'center', label: <AlignCenter size={14} />, title: 'Giữa' },
];

function useSet(apply: ShapeInspectorProps['apply'], id: string) {
  return (patch: P) => apply((tx) => tx.setViewProps(id, patch));
}
const setStyle = (tx: Tx, id: string, patch: P) => tx.setView(id, (v) => ({ ...v, style: { ...v.style, ...patch } }));

export function GroupInspector({ view, apply, readOnly }: ShapeInspectorProps) {
  const p = view.props as P;
  const set = useSet(apply, view.id);
  return (
    <>
      <div className="pgroup">
        <div className="pgroup-h">Tiêu đề</div>
        <TextProp
          label="Tiêu đề — **chữ** để in đậm"
          value={str(p.title)}
          onCommit={(title) => set({ title })}
          readOnly={readOnly}
        />
        <div className="row2">
          <div>
            <span className="lbl">Cỡ chữ</span>
            <NumberField value={num(p.titleSize, 14)} step={0.5} min={6} onChange={(titleSize) => set({ titleSize })} />
          </div>
          <div>
            <span className="lbl">Độ đậm</span>
            <Segmented
              value={num(p.titleWeight, 500)}
              options={WEIGHTS}
              onChange={(titleWeight) => set({ titleWeight })}
            />
          </div>
        </div>
        <div className="row2">
          <div>
            <span className="lbl">Màu chữ</span>
            <ColorField value={str(p.titleColor, '#1F2937')} onChange={(titleColor) => set({ titleColor })} />
          </div>
          <div>
            <span className="lbl">Căn</span>
            <Segmented
              value={str(p.titleAlign, 'left')}
              options={ALIGN2}
              onChange={(titleAlign) => set({ titleAlign })}
            />
          </div>
        </div>
      </div>
      {!readOnly && (
        <div className="pgroup">
          <div className="pgroup-h">Màu nhanh</div>
          <div className="grid grid-cols-6 gap-1.5">
            {GROUP_PRESETS.map((g) => (
              <button
                key={g.n}
                className="swatch-tile"
                style={{ height: 24, background: g.fill, borderColor: g.stroke }}
                title={g.n}
                aria-label={`Nhóm ${g.n}`}
                onClick={() => apply((tx) => setStyle(tx, view.id, { fill: g.fill, stroke: g.stroke }))}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function IconRow({
  ic,
  onColor,
  onRemove,
  readOnly,
}: {
  ic: CardIcon;
  onColor: (c: string) => void;
  onRemove: () => void;
  readOnly?: boolean;
}) {
  const inf = iconKeyInfo(ic.k);
  return (
    <div className="flex items-center gap-2 rounded-md p-1.5" style={{ background: 'var(--panel-2)' }}>
      <span style={{ color: ic.c || 'inherit', display: 'grid' }}>
        <IconPreview k={ic.k} size={20} />
      </span>
      <span className="min-w-0 flex-1 truncate">{inf ? inf.label : ic.k}</span>
      {inf && inf.ns !== 'brand' && (
        <input
          type="color"
          value={ic.c || '#334155'}
          disabled={readOnly}
          onChange={(e) => onColor(e.target.value)}
          aria-label="Màu icon"
          style={{ width: 22, height: 22, border: 'none', background: 'none' }}
        />
      )}
      {!readOnly && (
        <button className="ibtn sm" aria-label="Bỏ icon" title="Bỏ icon" onClick={onRemove}>
          <X />
        </button>
      )}
    </div>
  );
}

export function CardInspector({ view, apply, readOnly, requestTab }: ShapeInspectorProps) {
  const p = view.props as P;
  const set = useSet(apply, view.id);
  const icons = ((p.icons as CardIcon[]) ?? []).filter(Boolean);
  const pick = useArchUi((s) => s.pickFor === view.id);
  return (
    <>
      <div className="pgroup">
        <div className="pgroup-h">Nội dung</div>
        <TextProp
          label="Tiêu đề — dùng **chữ** để in đậm"
          value={str(p.title)}
          onCommit={(title) => set({ title })}
          readOnly={readOnly}
        />
        <TextProp
          label="Mô tả"
          value={str(p.subtitle)}
          onCommit={(subtitle) => set({ subtitle })}
          readOnly={readOnly}
        />
        <div className="row2">
          <div>
            <span className="lbl">Cỡ tiêu đề</span>
            <NumberField value={num(p.titleSize, 15)} step={0.5} min={6} onChange={(titleSize) => set({ titleSize })} />
          </div>
          <div>
            <span className="lbl">Cỡ mô tả</span>
            <NumberField value={num(p.subSize, 13)} step={0.5} min={6} onChange={(subSize) => set({ subSize })} />
          </div>
        </div>
        <div className="row2">
          <div>
            <span className="lbl">Độ đậm</span>
            <Segmented
              value={num(p.titleWeight, 500)}
              options={WEIGHTS}
              onChange={(titleWeight) => set({ titleWeight })}
            />
          </div>
          <div>
            <span className="lbl">Căn chữ</span>
            <Segmented
              value={str(p.textAlign, 'center')}
              options={ALIGN2}
              onChange={(textAlign) => set({ textAlign })}
            />
          </div>
        </div>
        <div className="row2">
          <div>
            <span className="lbl">Màu tiêu đề</span>
            <ColorField value={str(p.textColor, '#1F2937')} onChange={(textColor) => set({ textColor })} />
          </div>
          <div>
            <span className="lbl">Màu mô tả</span>
            <ColorField value={str(p.subColor, '#374151')} onChange={(subColor) => set({ subColor })} />
          </div>
        </div>
      </div>
      <div className="pgroup">
        <div className="pgroup-h">Icon</div>
        <div>
          <span className="lbl">Vị trí icon</span>
          <Segmented
            value={str(p.layout, 'left')}
            options={[
              { value: 'left', label: 'Bên trái' },
              { value: 'top', label: 'Bên trên' },
              { value: 'none', label: 'Ẩn' },
            ]}
            onChange={(layout) => set({ layout })}
          />
        </div>
        <div className="grid gap-1.5">
          {icons.map((ic, i) => (
            <IconRow
              key={i + ic.k}
              ic={ic}
              readOnly={readOnly}
              onColor={(c) => set({ icons: icons.map((x, j) => (j === i ? { ...x, c } : x)) })}
              onRemove={() => set({ icons: icons.filter((_, j) => j !== i) })}
            />
          ))}
        </div>
        <div className="row2">
          <button
            className={'btn outline' + (pick ? ' on' : '')}
            disabled={readOnly}
            onClick={() => {
              useArchUi.setState({ pickFor: view.id });
              requestTab?.('icons');
            }}
          >
            <Plus />
            Thêm icon
          </button>
          <div>
            <span className="lbl">Cỡ icon</span>
            <NumberField value={num(p.iconSize, 30)} min={8} onChange={(iconSize) => set({ iconSize })} />
          </div>
        </div>
        {pick && <p className="text-[11.5px] text-accent">Bấm một icon ở tab Icon để thêm vào thẻ này.</p>}
        <Checkbox label="Đổ bóng" checked={!!p.shadow} onChange={(shadow) => set({ shadow })} disabled={readOnly} />
      </div>
      {!readOnly && (
        <div className="pgroup">
          <div className="pgroup-h">Kiểu nhanh</div>
          <div className="grid grid-cols-6 gap-1.5">
            {NODE_PRESETS.map((n) => (
              <button
                key={n.n}
                title={n.n}
                aria-label={n.n}
                style={{ height: 24, borderRadius: 5, background: n.fill, border: `1.5px solid ${n.stroke}` }}
                onClick={() =>
                  apply((tx) => {
                    setStyle(tx, view.id, { fill: n.fill, stroke: n.stroke });
                    tx.setViewProps(view.id, {
                      icons: icons.map((ic) => (ic.k.startsWith('brand') ? ic : { ...ic, c: n.ic })),
                    });
                  })
                }
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export function IconInspector({ view, apply, readOnly, requestTab }: ShapeInspectorProps) {
  const p = view.props as P;
  const set = useSet(apply, view.id);
  const k = str(p.icon, 'lucide:box');
  const inf = iconKeyInfo(k);
  return (
    <div className="pgroup">
      <div className="pgroup-h">Icon</div>
      <div className="flex items-center gap-2">
        <span style={{ color: str(p.color) || undefined, display: 'grid' }}>
          <IconPreview k={k} size={24} />
        </span>
        <span className="min-w-0 flex-1 truncate">{inf?.label ?? k}</span>
        <button
          className="btn outline"
          disabled={readOnly}
          onClick={() => {
            useArchUi.setState({ pickFor: view.id });
            requestTab?.('icons');
          }}
        >
          Đổi
        </button>
      </div>
      {inf?.ns !== 'brand' && (
        <div>
          <span className="lbl">Màu</span>
          <ColorField value={str(p.color, '#334155')} onChange={(color) => set({ color })} />
        </div>
      )}
    </div>
  );
}

export function LinkInspector({
  conn,
  apply,
  readOnly,
}: {
  conn: Connector;
  model: ModelElement | null;
  apply: (fn: (tx: Tx) => void) => void;
  lookup: EngineLookup;
  readOnly: boolean;
}) {
  const p = conn.props as P;
  const lab = conn.labels.find((l) => l.role === 'name');
  const [text, setText] = useState(lab?.text ?? '');
  useEffect(() => setText(lab?.text ?? ''), [lab?.text]);
  const arrows = (p.arrowStart ? 's' : '') + (p.arrowEnd === false ? '' : 'e') || 'none';
  const setProps = (patch: P) => apply((tx) => tx.setConnProps(conn.id, patch));
  const setLabel = (patch: { text?: string; pos?: number }) =>
    apply((tx) =>
      tx.setConn(conn.id, (c) => {
        const cur = c.labels.find((l) => l.role === 'name') ?? { role: 'name', text: '', pos: 0.5 };
        const next = { ...cur, ...patch };
        const rest = c.labels.filter((l) => l.role !== 'name');
        return { ...c, labels: next.text ? [...rest, next] : rest };
      }),
    );
  return (
    <div className="pgroup">
      <div className="pgroup-h">Liên kết</div>
      <div>
        <span className="lbl">Mũi tên</span>
        <Segmented
          value={arrows}
          options={[
            { value: 'none', label: 'Không' },
            { value: 'e', label: '→' },
            { value: 's', label: '←' },
            { value: 'se', label: '↔' },
          ]}
          onChange={(v) => setProps({ arrowStart: v.includes('s'), arrowEnd: v.includes('e') })}
        />
      </div>
      <div className="row2">
        <Checkbox label="Nét đứt" checked={!!p.dash} onChange={(dash) => setProps({ dash })} disabled={readOnly} />
        <div>
          <span className="lbl">Bo góc đường</span>
          <NumberField value={num(p.radius, 8)} min={0} onChange={(radius) => setProps({ radius })} />
        </div>
      </div>
      <div>
        <span className="lbl">Nhãn</span>
        <input
          className="field"
          value={text}
          readOnly={readOnly}
          placeholder="VD: REST, MQTT…"
          onChange={(e) => setText(e.target.value)}
          onBlur={() => text !== (lab?.text ?? '') && setLabel({ text })}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
      </div>
      {lab?.text && (
        <div>
          <span className="lbl">Vị trí nhãn</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={lab.pos ?? 0.5}
            disabled={readOnly}
            onChange={(e) => setLabel({ pos: Number(e.target.value) })}
            className="w-full"
            style={{ accentColor: 'var(--accent)' }}
          />
        </div>
      )}
    </div>
  );
}
