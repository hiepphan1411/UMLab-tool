import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  ArrowDown,
  ArrowRightLeft,
  ArrowUp,
  BringToFront,
  Crosshair,
  Copy,
  Group,
  Lock,
  LockOpen,
  SendToBack,
  Trash2,
  Ungroup,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useStore } from 'zustand';
import { diagramsMap, type Connector, type View } from '@umlab/core';
import { Checkbox, ColorField, IconButton, NumberField, Segmented, Tabs } from '@/ui';
import { LOCAL } from '../../workspace/session';
import type { Engine } from './engine';
import { align, deleteSelection, duplicateSelection, groupSelection, toggleFlag, zOrder, type AlignCmd } from './ops';
import { getConnector, getShape } from './registry';
import { viewName } from './render';
import { ZodForm } from './zod-form';

export function Group2({ title, children, right }: { title?: ReactNode; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="pgroup">
      {(title || right) && (
        <div className="flex items-center justify-between gap-2">
          <div className="pgroup-h">{title}</div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

function NameField({
  value,
  onCommit,
  readOnly,
  label = 'Tên',
}: {
  value: string;
  onCommit: (v: string) => void;
  readOnly?: boolean;
  label?: string;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <div>
      <span className="lbl">{label}</span>
      <input
        className="field"
        data-focus
        value={v}
        readOnly={readOnly}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => v !== value && onCommit(v)}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
    </div>
  );
}

const STYLE_FIELDS = ['fill', 'stroke', 'strokeWidth', 'dash', 'radius', 'fontSize'] as const;

function StyleGroup({ engine, view }: { engine: Engine; view: View }) {
  const def = getShape(view.shape);
  const allowed =
    def?.styleFields === false ? [] : Array.isArray(def?.styleFields) ? def.styleFields : STYLE_FIELDS.slice(0, 4);
  if (!allowed.length) return null;
  const st = { ...(def?.defaultStyle ?? {}), ...view.style };
  const set = (patch: Record<string, unknown>) =>
    engine.apply((tx) => tx.setView(view.id, (v) => ({ ...v, style: { ...v.style, ...patch } })));
  return (
    <Group2 title="Nền & viền">
      <div className="row2">
        {allowed.includes('fill') && (
          <div>
            <span className="lbl">Màu nền</span>
            <ColorField
              value={String(st.fill ?? '#FFFFFF')}
              onChange={(v) => set({ fill: v })}
              allowNone
              ariaLabel="Màu nền"
            />
          </div>
        )}
        {allowed.includes('stroke') && (
          <div>
            <span className="lbl">Màu viền</span>
            <ColorField
              value={String(st.stroke ?? '#1F2937')}
              onChange={(v) => set({ stroke: v })}
              allowNone
              ariaLabel="Màu viền"
            />
          </div>
        )}
      </div>
      <div className="row2">
        {allowed.includes('strokeWidth') && (
          <div>
            <span className="lbl">Độ dày viền</span>
            <NumberField
              value={Number(st.strokeWidth ?? 1.4)}
              step={0.25}
              min={0}
              onChange={(v) => set({ strokeWidth: v })}
            />
          </div>
        )}
        {allowed.includes('radius') && (
          <div>
            <span className="lbl">Bo góc</span>
            <NumberField value={Number(st.radius ?? 0)} min={0} onChange={(v) => set({ radius: v })} />
          </div>
        )}
        {allowed.includes('fontSize') && (
          <div>
            <span className="lbl">Cỡ chữ</span>
            <NumberField value={Number(st.fontSize ?? 13)} step={0.5} min={6} onChange={(v) => set({ fontSize: v })} />
          </div>
        )}
      </div>
      {allowed.includes('dash') && <Checkbox label="Nét đứt" checked={!!st.dash} onChange={(v) => set({ dash: v })} />}
    </Group2>
  );
}

function ArrangeGroup({ engine, view }: { engine: Engine; view: View }) {
  return (
    <Group2 title="Sắp xếp">
      <div className="flex flex-wrap gap-1">
        <IconButton label="Lên trên cùng" onClick={() => zOrder(engine, 'front')}>
          <BringToFront />
        </IconButton>
        <IconButton label="Lên một lớp" onClick={() => zOrder(engine, 'fwd')}>
          <ArrowUp />
        </IconButton>
        <IconButton label="Xuống một lớp" onClick={() => zOrder(engine, 'bwd')}>
          <ArrowDown />
        </IconButton>
        <IconButton label="Xuống dưới cùng" onClick={() => zOrder(engine, 'back')}>
          <SendToBack />
        </IconButton>
        <span className="flex-1" />
        <IconButton label={view.locked ? 'Mở khoá' : 'Khoá'} onClick={() => toggleFlag(engine, 'locked')}>
          {view.locked ? <Lock /> : <LockOpen />}
        </IconButton>
        <IconButton label="Nhân bản" shortcut="Ctrl+D" onClick={() => duplicateSelection(engine)}>
          <Copy />
        </IconButton>
        <IconButton
          label="Xoá"
          shortcut="Delete"
          onClick={() => deleteSelection(engine)}
          style={{ color: 'var(--danger)' }}
        >
          <Trash2 />
        </IconButton>
      </div>
    </Group2>
  );
}

function ViewInspector({ engine, view }: { engine: Engine; view: View }) {
  const def = getShape(view.shape);
  const model = view.modelId ? engine.lookup.model(view.modelId) : null;
  const [tab, setTab] = useState<'shape' | 'model'>('shape');
  const ro = engine.readOnly;
  const hasModelTab = !!model;
  const geom = (k: 'x' | 'y' | 'w' | 'h', v: number) => engine.apply((tx) => tx.setView(view.id, { [k]: v }));
  const Custom = def?.inspector;
  return (
    <>
      <Group2
        title={def?.label ?? view.shape}
        right={view.locked ? <span className="text-[11px] text-muted">Đang khoá</span> : null}
      >
        {model ? (
          <NameField
            value={model.name}
            readOnly={ro}
            onCommit={(name) => engine.apply((tx) => tx.setModel(model.id, { name }))}
          />
        ) : (
          <NameField
            label="Tên lớp (tuỳ chọn)"
            value={String((view.props as { name?: string }).name ?? '')}
            readOnly={ro}
            onCommit={(name) => engine.apply((tx) => tx.setViewProps(view.id, { name }))}
          />
        )}
      </Group2>
      <div className="pgroup">
        <div className="row4">
          {(['x', 'y', 'w', 'h'] as const).map((k) => (
            <div key={k}>
              <span className="lbl">{{ x: 'X', y: 'Y', w: 'R', h: 'C' }[k]}</span>
              <NumberField value={view[k]} onChange={(v) => geom(k, v)} ariaLabel={k} />
            </div>
          ))}
        </div>
      </div>
      {hasModelTab && (
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: 'shape', label: 'Hình dạng' },
            { value: 'model', label: 'Mô hình' },
          ]}
        />
      )}
      {(tab === 'shape' || !hasModelTab) && (
        <>
          {Custom && (
            <Custom
              view={view}
              model={model ?? null}
              apply={(fn) => engine.apply(fn)}
              lookup={engine.lookup}
              readOnly={ro}
              requestTab={(t) => engine.set({ leftTab: t })}
            />
          )}
          {def?.propsSchema && (
            <Group2 title="Thuộc tính hiển thị">
              <ZodForm
                schema={def.propsSchema}
                value={{ ...(def.defaultProps?.() ?? {}), ...view.props }}
                readOnly={ro}
                onChange={(v, key) => engine.apply((tx) => tx.setViewProps(view.id, { [key]: v[key] }))}
              />
            </Group2>
          )}
          <StyleGroup engine={engine} view={view} />
        </>
      )}
      {tab === 'model' && hasModelTab && model && (
        <Group2 title={`Phần tử mô hình · ${model.kind}`}>
          {def?.modelSchema ? (
            <ZodForm
              schema={def.modelSchema}
              value={model.data}
              readOnly={ro}
              onChange={(v, key) => engine.apply((tx) => tx.setModelData(model.id, { [key]: v[key] }))}
            />
          ) : (
            <p className="text-muted">Không có thuộc tính mô hình riêng.</p>
          )}
        </Group2>
      )}
      {!ro && <ArrangeGroup engine={engine} view={view} />}
    </>
  );
}

function ConnInspector({ engine, conn }: { engine: Engine; conn: Connector }) {
  const def = getConnector(conn.kind);
  const model = conn.modelId ? engine.lookup.model(conn.modelId) : null;
  const ro = engine.readOnly;
  const Custom = def?.inspector;
  const routing = conn.waypoints.length ? 'manual' : conn.routing;
  return (
    <>
      <Group2 title={def?.label ?? conn.kind}>
        {model && (
          <NameField
            value={model.name}
            readOnly={ro}
            onCommit={(name) => engine.apply((tx) => tx.setModel(model.id, { name }))}
          />
        )}
        <div>
          <span className="lbl">Kiểu nối</span>
          <Segmented
            value={routing}
            onChange={(v) =>
              engine.apply((tx) =>
                tx.setConn(conn.id, (c) => ({
                  ...c,
                  routing: v === 'manual' ? 'manual' : v,
                  waypoints: v === 'manual' ? c.waypoints : [],
                })),
              )
            }
            options={[
              { value: 'orthogonal', label: 'Vuông', title: 'Vuông góc' },
              { value: 'smart', label: 'Thông minh', title: 'Vuông góc, né các khối' },
              { value: 'straight', label: 'Thẳng' },
              { value: 'curved', label: 'Cong' },
            ]}
          />
          {routing === 'manual' && (
            <p className="mt-1 text-[11.5px] text-muted">
              Đang chỉnh tay {conn.waypoints.length} điểm uốn. Chọn kiểu khác để bỏ.
            </p>
          )}
        </div>
        <div className="row2">
          <div>
            <span className="lbl">Màu</span>
            <ColorField
              value={String(conn.style.stroke ?? '#1F2937')}
              onChange={(v) =>
                engine.apply((tx) => tx.setConn(conn.id, (c) => ({ ...c, style: { ...c.style, stroke: v } })))
              }
            />
          </div>
          <div>
            <span className="lbl">Độ dày</span>
            <NumberField
              value={Number(conn.style.strokeWidth ?? 1.3)}
              step={0.2}
              min={0.4}
              onChange={(v) =>
                engine.apply((tx) => tx.setConn(conn.id, (c) => ({ ...c, style: { ...c.style, strokeWidth: v } })))
              }
            />
          </div>
        </div>
        <p className="text-[11.5px] text-muted" style={{ lineHeight: 1.5 }}>
          Kéo đầu mút trượt dọc cạnh hình để đổi vị trí (hoặc sang hình khác để nối lại). Nhấp đúp lên đường để bẻ vuông
          góc tại chỗ đó, nhấp đúp điểm uốn để xoá, kéo tay nắm giữa đoạn để dời cả đoạn.
        </p>
      </Group2>
      {Custom && (
        <Custom
          conn={conn}
          model={model ?? null}
          apply={(fn) => engine.apply(fn)}
          lookup={engine.lookup}
          readOnly={ro}
        />
      )}
      {def?.propsSchema && (
        <Group2 title="Thuộc tính">
          <ZodForm
            schema={def.propsSchema}
            value={{ ...(def.defaultProps?.() ?? {}), ...conn.props }}
            readOnly={ro}
            onChange={(v, key) => engine.apply((tx) => tx.setConnProps(conn.id, { [key]: v[key] }))}
          />
        </Group2>
      )}
      {def?.modelSchema && model && (
        <Group2 title="Mô hình">
          <ZodForm
            schema={def.modelSchema}
            value={model.data}
            readOnly={ro}
            onChange={(v, key) => engine.apply((tx) => tx.setModelData(model.id, { [key]: v[key] }))}
          />
        </Group2>
      )}
      {!ro && (
        <Group2>
          <div className="flex gap-2">
            <button
              className="btn outline"
              onClick={() =>
                engine.apply((tx) =>
                  tx.setConn(conn.id, (c) => ({
                    ...c,
                    source: c.target,
                    target: c.source,
                    waypoints: [...c.waypoints].reverse(),
                  })),
                )
              }
            >
              <ArrowRightLeft />
              Đảo chiều
            </button>
            {(conn.source.side || conn.target.side) && (
              <button
                className="btn outline"
                title="Bỏ khoá vị trí đầu mút — tự chọn giữa cạnh hướng về đầu kia"
                onClick={() =>
                  engine.apply((tx) =>
                    tx.setConn(conn.id, (c) => ({
                      ...c,
                      source: c.source.viewId ? { viewId: c.source.viewId } : c.source,
                      target: c.target.viewId ? { viewId: c.target.viewId } : c.target,
                    })),
                  )
                }
              >
                <Crosshair />
                Đầu mút về giữa
              </button>
            )}
            <button className="btn outline ghost-danger" onClick={() => deleteSelection(engine)}>
              <Trash2 />
              Xoá
            </button>
          </div>
        </Group2>
      )}
    </>
  );
}

const ALIGN: [AlignCmd, ReactNode, string][] = [
  ['al', <AlignStartVertical key="a" />, 'Căn trái'],
  ['ac', <AlignCenterVertical key="b" />, 'Căn giữa dọc'],
  ['ar', <AlignEndVertical key="c" />, 'Căn phải'],
  ['at', <AlignStartHorizontal key="d" />, 'Căn trên'],
  ['am', <AlignCenterHorizontal key="e" />, 'Căn giữa ngang'],
  ['ab', <AlignEndHorizontal key="f" />, 'Căn dưới'],
  ['dh', <AlignHorizontalDistributeCenter key="g" />, 'Giãn đều ngang'],
  ['dv', <AlignVerticalDistributeCenter key="h" />, 'Giãn đều dọc'],
];

function MultiInspector({ engine, count }: { engine: Engine; count: number }) {
  const grouped = [...engine.state.sel].some((id) => engine.lookup.view(id)?.groupId);
  return (
    <Group2 title={`${count} đối tượng`}>
      <div>
        <span className="lbl">Căn chỉnh</span>
        <div className="flex flex-wrap gap-1">
          {ALIGN.map(([c, icon, t]) => (
            <IconButton
              key={c}
              label={t}
              onClick={() => align(engine, c)}
              disabled={engine.readOnly || (count < 3 && (c === 'dh' || c === 'dv'))}
            >
              {icon}
            </IconButton>
          ))}
        </div>
      </div>
      <div className="row2">
        <button className="btn outline" onClick={() => align(engine, 'samew')} disabled={engine.readOnly}>
          Cùng rộng
        </button>
        <button className="btn outline" onClick={() => align(engine, 'sameh')} disabled={engine.readOnly}>
          Cùng cao
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn outline" onClick={() => groupSelection(engine, !grouped)} disabled={engine.readOnly}>
          {grouped ? <Ungroup /> : <Group />}
          {grouped ? 'Bỏ nhóm' : 'Nhóm (Ctrl+G)'}
        </button>
        <button className="btn outline" onClick={() => duplicateSelection(engine)} disabled={engine.readOnly}>
          <Copy />
          Nhân bản
        </button>
        <button className="btn outline ghost-danger" onClick={() => deleteSelection(engine)} disabled={engine.readOnly}>
          <Trash2 />
          Xoá
        </button>
      </div>
    </Group2>
  );
}

function DiagramInspector({ engine }: { engine: Engine }) {
  const meta = engine.meta;
  const st = engine.store.getState();
  if (!meta) return null;
  const setCanvas = (patch: Record<string, unknown>) => {
    if (engine.readOnly) return;
    engine.doc.transact(() => {
      const m = diagramsMap(engine.doc).get(engine.diagramId);
      if (m) diagramsMap(engine.doc).set(engine.diagramId, { ...m, canvas: { ...m.canvas, ...patch } });
    }, LOCAL);
  };
  return (
    <>
      <Group2 title="Sơ đồ">
        <div>
          <span className="lbl">Nền khi xuất ảnh</span>
          <ColorField value={meta.canvas.background} onChange={(v) => setCanvas({ background: v })} />
        </div>
        <Checkbox
          label="Hiện lưới & bắt dính (giữ Alt để tắt tạm)"
          checked={st.grid}
          onChange={(v) => engine.set({ grid: v })}
        />
        <Checkbox
          label="Cầu nhảy tại chỗ đường cắt nhau"
          checked={meta.canvas.lineJumps !== false}
          onChange={(v) => setCanvas({ lineJumps: v })}
        />
        <p className="text-[11.5px] text-muted">
          {st.views.size} hình · {st.conns.size} đường nối. Chọn một hình hoặc đường nối để chỉnh thuộc tính.
        </p>
      </Group2>
      <Group2 title="Phím tắt chính">
        <div className="grid gap-1.5 text-[11.5px] text-muted">
          {[
            ['V / H', 'Chọn · Kéo khung nhìn'],
            ['Space + kéo', 'Di chuyển khung nhìn'],
            ['Ctrl + cuộn', 'Thu phóng'],
            ['Shift + 1', 'Vừa màn hình'],
            ['Ctrl + D', 'Nhân bản'],
            ['Ctrl + G', 'Nhóm'],
            ['Ctrl + Z', 'Hoàn tác'],
            ['Ctrl + F', 'Tìm hình'],
            ['Delete / Ctrl+Delete', 'Xoá / Xoá khỏi mô hình'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2">
              <span className="kbd">{k}</span>
              <span>{v}</span>
            </div>
          ))}
        </div>
      </Group2>
    </>
  );
}

/** Inspector bên phải: sơ đồ (không chọn gì) / một hình / một đường nối / nhiều hình. */
export function Inspector({ engine, extra }: { engine: Engine; extra?: ReactNode }) {
  const sel = useStore(engine.store, (s) => s.sel);
  const selConns = useStore(engine.store, (s) => s.selConns);
  useStore(engine.store, (s) => s.version);
  let body: ReactNode;
  if (sel.size > 1) body = <MultiInspector engine={engine} count={sel.size} />;
  else if (sel.size === 1) {
    const v = engine.lookup.view([...sel][0]);
    body = v ? <ViewInspector key={v.id} engine={engine} view={v} /> : null;
  } else if (selConns.size === 1) {
    const c = engine.lookup.conn([...selConns][0]);
    body = c ? <ConnInspector key={c.id} engine={engine} conn={c} /> : null;
  } else body = <DiagramInspector engine={engine} />;
  return (
    <div className="scroll" aria-label="Thuộc tính">
      {body}
      {extra}
    </div>
  );
}

export const nameOf = (engine: Engine, v: View) => viewName(v, engine.lookup);
