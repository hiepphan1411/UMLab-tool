// Inspector của Gantt (port renderGanttInspector của tool cũ).
import { ArrowDown, ArrowUp, Copy, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  GCOLS,
  GST,
  ds,
  dn,
  durOf,
  gSummary,
  plannedPct,
  reportDay,
  statusOf,
  syncProg,
  type GanttData,
  type GanttStatus,
  type GanttTask,
} from '@umlab/core';
import { Checkbox, IconButton, Segmented, Select } from '@/ui';
import { ImageAttachments } from '../../media/image-attachments';
import { IconPreview, iconKeyInfo } from '../architecture/icons';
import { isModule } from './chart';
import type { GanttOps } from './ops';

const TASK_ICONS = [
  'hand',
  'car-front',
  'credit-card',
  'thumbs-up',
  'user-round',
  'bell',
  'shield-check',
  'brain',
  'radio',
  'database',
  'server',
  'smartphone',
  'laptop',
  'box',
  'cctv',
  'wallet',
  'file-text',
  'settings',
];

function Txt({
  label,
  value,
  onCommit,
  rows,
  placeholder,
  readOnly,
  focus,
}: {
  label: string;
  value: string;
  onCommit: (v: string) => void;
  rows?: number;
  placeholder?: string;
  readOnly?: boolean;
  focus?: boolean;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const p = {
    className: 'field',
    value: v,
    readOnly,
    placeholder,
    'data-focus': focus ? true : undefined,
    onChange: (e: { target: { value: string } }) => setV(e.target.value),
    onBlur: () => v !== value && onCommit(v),
  };
  return (
    <div>
      <span className="lbl">{label}</span>
      {rows ? (
        <textarea rows={rows} {...p} />
      ) : (
        <input {...p} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
      )}
    </div>
  );
}

const STATUS_HELP: [GanttStatus, string][] = [
  ['done', 'Tiến độ 100%'],
  ['late', 'Đã qua ngày kết thúc mà chưa xong'],
  ['risk', 'Đang chạy, chậm hơn kế hoạch trên 20%'],
  ['progress', 'Đang trong thời gian thực hiện'],
  ['todo', 'Chưa tới ngày bắt đầu'],
  ['paused', 'Chỉ khi đặt tay'],
];

export function BoardInspector({ g, ops, readOnly }: { g: GanttData; ops: GanttOps; readOnly: boolean }) {
  const sm = gSummary(g);
  const unit = isModule(g) ? 'module' : 'giai đoạn';
  return (
    <>
      <div className="pgroup">
        <div className="pgroup-h">{isModule(g) ? 'Gantt theo module' : 'Gantt theo sprint'}</div>
        <Txt label="Tên dự án" value={g.title} onCommit={(title) => ops.setMeta({ title })} readOnly={readOnly} />
        <div>
          <span className="lbl">Ngày báo cáo (để trống = hôm nay)</span>
          <input
            type="date"
            className="field"
            value={g.reportDate}
            readOnly={readOnly}
            aria-label="Ngày báo cáo"
            onChange={(e) => ops.setMeta({ reportDate: e.target.value })}
          />
        </div>
        <div>
          <span className="lbl">Chia theo</span>
          <Segmented
            value={g.scale}
            onChange={(scale) => ops.setMeta({ scale })}
            options={[
              { value: 'day', label: 'Ngày' },
              { value: 'week', label: 'Tuần' },
              { value: 'month', label: 'Tháng' },
            ]}
          />
        </div>
        <Checkbox
          label="Tô màu cuối tuần"
          checked={g.weekends}
          onChange={(weekends) => ops.setMeta({ weekends })}
          disabled={readOnly}
        />
      </div>
      <div className="pgroup">
        <div className="pgroup-h">Cột hiển thị</div>
        <div className="grid grid-cols-2 gap-2">
          {GCOLS.map((c) => (
            <Checkbox
              key={c.k}
              label={c.k === 'name' && isModule(g) ? 'Module' : c.l}
              checked={g.columns[c.k]}
              disabled={readOnly}
              onChange={(v) => ops.setMeta({ columns: { ...g.columns, [c.k]: v } })}
            />
          ))}
        </div>
      </div>
      <div className="pgroup">
        <div className="pgroup-h">Trạng thái tự động</div>
        <div className="grid gap-2 text-[11.5px]" style={{ lineHeight: 1.5 }}>
          {STATUS_HELP.map(([k, d]) => (
            <div key={k} className="flex items-start gap-2">
              <span className="pill" style={{ background: GST[k].c + '1F', color: GST[k].c, flex: 'none' }}>
                {GST[k].n}
              </span>
              <span className="text-muted">{d}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="pgroup">
        <p className="text-[11.5px] text-muted" style={{ lineHeight: 1.55 }}>
          {g.tasks.length} {unit} · tiến độ chung {sm.overall}%. Bấm vào ô <b>Tiến độ</b> (có biểu tượng bút) để cập
          nhật % nhanh. Bấm một thanh để xem chi tiết. Kéo thân thanh để dời lịch, kéo hai đầu để đổi ngày, kéo tam giác
          dưới thanh đang chọn để chỉnh %.
        </p>
      </div>
    </>
  );
}

export function TaskInspector({
  g,
  t,
  ops,
  readOnly,
  onDuplicate,
  onDelete,
}: {
  g: GanttData;
  t: GanttTask;
  ops: GanttOps;
  readOnly: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const rd = reportDay(g);
  const st = statusOf(t, rd);
  const ms = t.type === 'milestone';
  const mod = isModule(g);
  const set = (patch: Partial<GanttTask>) => ops.setTask(t.id, patch);
  const [newItem, setNewItem] = useState('');
  const auto = t.autoProg && t.items.length > 0;
  const setItems = (items: GanttTask['items'], extra: Partial<GanttTask> = {}) =>
    ops.setTask(t.id, (x) => {
      const n = { ...x, items, ...extra };
      syncProg(n);
      return n;
    });
  const addItem = () => {
    const v = newItem.trim();
    if (!v) return;
    setItems([...t.items, { t: v, done: false }], t.items.length === 0 && !t.autoProg ? { autoProg: true } : {});
    setNewItem('');
  };
  const iconOpts = [
    { value: '', label: 'Không icon' },
    ...TASK_ICONS.map((k) => ({ value: 'lucide:' + k, label: k })),
    ...(t.icon && !TASK_ICONS.includes(t.icon.replace('lucide:', '')) ? [{ value: t.icon, label: t.icon }] : []),
  ];
  return (
    <>
      <div className="pgroup">
        <div className="flex items-center justify-between">
          <div className="pgroup-h">{ms ? 'Mốc' : mod ? 'Module' : 'Giai đoạn'}</div>
          <span className="pill" style={{ background: GST[st].c + '1F', color: GST[st].c }}>
            {GST[st].n}
          </span>
        </div>
        <div>
          <span className="lbl">Loại</span>
          <Segmented
            value={t.type}
            onChange={(type) =>
              set(
                type === 'milestone'
                  ? { type, end: t.start }
                  : { type, end: t.end === t.start ? ds(dn(t.start) + 13) : t.end },
              )
            }
            options={[
              { value: 'task', label: 'Giai đoạn' },
              { value: 'milestone', label: 'Mốc' },
            ]}
          />
        </div>
        <div className="row2">
          <Txt
            label={mod ? 'Thuộc sprint' : 'Mã'}
            value={t.code}
            onCommit={(code) => set({ code })}
            readOnly={readOnly}
          />
          <Txt
            label="Phụ trách"
            value={t.owner}
            placeholder="Hiệp + Giang"
            onCommit={(owner) => set({ owner })}
            readOnly={readOnly}
          />
        </div>
        <Txt
          label={mod ? 'Tên module' : 'Tên giai đoạn'}
          value={t.name}
          onCommit={(name) => set({ name })}
          readOnly={readOnly}
          focus
        />
        <div className="flex items-center gap-2">
          <span className="lbl" style={{ margin: 0 }}>
            Icon
          </span>
          {t.icon && iconKeyInfo(t.icon) ? (
            <>
              <IconPreview k={t.icon} size={20} />
              <span className="min-w-0 flex-1 truncate">{iconKeyInfo(t.icon)?.label}</span>
            </>
          ) : (
            <span className="flex-1 text-muted">Không có</span>
          )}
          <div style={{ width: 120 }}>
            <Select
              value={t.icon}
              disabled={readOnly}
              options={iconOpts}
              onChange={(e) => set({ icon: e.target.value })}
            />
          </div>
        </div>
      </div>
      <div className="pgroup">
        <div className="pgroup-h">Thời gian</div>
        <div className="row2">
          <div>
            <span className="lbl">{ms ? 'Ngày' : 'Bắt đầu'}</span>
            <input
              type="date"
              className="field"
              value={t.start}
              readOnly={readOnly}
              aria-label={ms ? 'Ngày' : 'Bắt đầu'}
              onChange={(e) => {
                const v = e.target.value;
                if (isNaN(dn(v))) return;
                const dur = dn(t.end) - dn(t.start);
                set({ start: v, end: ms ? v : ds(dn(v) + dur) });
              }}
            />
          </div>
          {!ms && (
            <div>
              <span className="lbl">Kết thúc</span>
              <input
                type="date"
                className="field"
                value={t.end}
                readOnly={readOnly}
                aria-label="Kết thúc"
                onChange={(e) => {
                  const v = e.target.value;
                  if (!isNaN(dn(v))) set({ end: ds(Math.max(dn(t.start), dn(v))) });
                }}
              />
            </div>
          )}
        </div>
        {!ms && (
          <div className="row2">
            <div>
              <span className="lbl">Số ngày</span>
              <input
                type="number"
                min={1}
                className="field"
                defaultValue={durOf(t)}
                key={durOf(t)}
                readOnly={readOnly}
                aria-label="Số ngày"
                onBlur={(e) => {
                  const n = Math.max(1, Math.round(Number(e.target.value) || 1));
                  if (n !== durOf(t)) set({ end: ds(dn(t.start) + n - 1) });
                }}
              />
            </div>
            <div>
              <span className="lbl">Dời lịch</span>
              <div className="flex gap-1">
                {[-7, 7].map((k) => (
                  <button
                    key={k}
                    className="btn outline"
                    disabled={readOnly}
                    title={k < 0 ? 'Lùi 1 tuần' : 'Tiến 1 tuần'}
                    onClick={() => set({ start: ds(dn(t.start) + k), end: ds(dn(t.end) + k) })}
                  >
                    {k < 0 ? '−1T' : '+1T'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="pgroup">
        {!ms && (
          <>
            <div className="pgroup-h">Tiến độ & trạng thái</div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={t.progress}
                disabled={readOnly || auto}
                className="flex-1"
                style={{ accentColor: GST[st].c }}
                aria-label="Tiến độ"
                onChange={(e) => set({ progress: Number(e.target.value) })}
              />
              <input
                type="number"
                min={0}
                max={100}
                className="field"
                style={{ width: 64 }}
                key={'p' + t.progress}
                defaultValue={t.progress}
                disabled={readOnly || auto}
                aria-label="Tiến độ (%)"
                onBlur={(e) => set({ progress: Math.max(0, Math.min(100, Math.round(Number(e.target.value) || 0))) })}
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {[0, 25, 50, 75, 100].map((v) => (
                <button
                  key={v}
                  className="btn outline"
                  style={{ height: 26, padding: '0 8px' }}
                  disabled={readOnly || auto}
                  onClick={() => set({ progress: v })}
                >
                  {v}%
                </button>
              ))}
            </div>
            <p className="text-[11.5px] text-muted">Theo kế hoạch đến ngày báo cáo: {plannedPct(t, rd)}%</p>
          </>
        )}
        <div>
          <span className="lbl">Trạng thái</span>
          <Select
            value={t.status}
            disabled={readOnly}
            onChange={(e) => set({ status: e.target.value as GanttTask['status'] })}
            options={[
              { value: 'auto', label: `Tự động (${GST[statusOf({ ...t, status: 'auto' }, rd)].n})` },
              ...Object.entries(GST).map(([k, v]) => ({ value: k, label: v.n })),
            ]}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(GST).map(([k, v]) => (
            <button
              key={k}
              className={'swatchbtn' + (t.status === k ? ' on' : '')}
              title={v.n}
              aria-label={v.n}
              disabled={readOnly}
              style={{ background: v.c }}
              onClick={() => set({ status: t.status === k ? 'auto' : (k as GanttStatus) })}
            />
          ))}
        </div>
      </div>
      {!ms && (
        <div className="pgroup">
          <div className="pgroup-h">Hạng mục con (checklist)</div>
          <div className="grid gap-1.5">
            {t.items.map((it, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={it.done}
                  disabled={readOnly}
                  aria-label="Đã xong"
                  style={{ accentColor: 'var(--ok)' }}
                  onChange={(e) => setItems(t.items.map((x, j) => (j === i ? { ...x, done: e.target.checked } : x)))}
                />
                <ItemText
                  value={it.t}
                  readOnly={readOnly}
                  onCommit={(v) => setItems(t.items.map((x, j) => (j === i ? { ...x, t: v } : x)))}
                />
                {!readOnly && (
                  <button
                    className="ibtn sm"
                    title="Xoá hạng mục"
                    onClick={() => setItems(t.items.filter((_, j) => j !== i))}
                  >
                    <X />
                  </button>
                )}
              </div>
            ))}
            {!t.items.length && (
              <p className="text-[11.5px] text-muted">
                Chưa có hạng mục. Thêm các chức năng con để đánh dấu xong từng phần.
              </p>
            )}
          </div>
          {!readOnly && (
            <div className="flex gap-2">
              <input
                className="field"
                style={{ height: 28 }}
                placeholder="VD: Quên mật khẩu OTP"
                value={newItem}
                aria-label="Hạng mục mới"
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addItem()}
              />
              <button className="btn outline" onClick={addItem}>
                <Plus />
                Thêm
              </button>
            </div>
          )}
          <Checkbox
            label="Tự tính % theo hạng mục đã xong"
            checked={t.autoProg}
            disabled={readOnly}
            onChange={(autoProg) => setItems(t.items, { autoProg })}
          />
        </div>
      )}
      <div className="pgroup">
        <div className="pgroup-h">Chi tiết</div>
        <ImageAttachments
          label="Ảnh đính kèm"
          value={t.images ?? []}
          readOnly={readOnly}
          onChange={(images) => set({ images })}
        >
          <Txt label="Mục tiêu sprint" rows={3} value={t.goal} onCommit={(goal) => set({ goal })} readOnly={readOnly} />
          <Txt
            label="Deliverables"
            rows={3}
            value={t.deliverables}
            onCommit={(deliverables) => set({ deliverables })}
            readOnly={readOnly}
          />
        </ImageAttachments>
        <Txt
          label="Jira"
          value={t.jira}
          placeholder="VD: UPK-12 hoặc liên kết"
          onCommit={(jira) => set({ jira })}
          readOnly={readOnly}
        />
      </div>
      {!readOnly && (
        <div className="pgroup">
          <div className="flex flex-wrap gap-1">
            <IconButton label="Lên trên" onClick={() => ops.move(t.id, -1)}>
              <ArrowUp />
            </IconButton>
            <IconButton label="Xuống dưới" onClick={() => ops.move(t.id, 1)}>
              <ArrowDown />
            </IconButton>
            <span className="flex-1" />
            <IconButton label="Nhân bản" shortcut="Ctrl+D" onClick={onDuplicate}>
              <Copy />
            </IconButton>
            <IconButton label="Xoá" shortcut="Delete" onClick={onDelete} style={{ color: 'var(--danger)' }}>
              <Trash2 />
            </IconButton>
          </div>
        </div>
      )}
    </>
  );
}

function ItemText({ value, onCommit, readOnly }: { value: string; onCommit: (v: string) => void; readOnly: boolean }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <input
      className="field"
      style={{ height: 26 }}
      value={v}
      readOnly={readOnly}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onCommit(v)}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
  );
}
