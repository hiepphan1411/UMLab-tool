// Bảng luồng sự kiện 3 cột "STT | Thực hiện bởi | Hành động" (docs/spec/usecase-spec-template.md mục 2).
// Enter cuối dòng → bước mới (performer xen kẽ); Backspace ở dòng rỗng → xoá bước; kéo ⠿ để đổi thứ tự.
import { GripVertical, MoreHorizontal, Repeat, Workflow } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Interaction, Step } from '@umlab/core';
import { cn } from '@/lib/cn';
import { openMenuAt, promptDialog, type MenuEntry } from '@/ui';

export interface Option {
  value: string;
  label: string;
}

const TARGETS: Option[] = [
  { value: 'ui', label: 'Màn hình (boundary)' },
  { value: 'controller', label: 'Điều khiển (control)' },
  { value: 'entity', label: 'Dữ liệu (entity)' },
  { value: 'external', label: 'Hệ thống ngoài' },
];
const KINDS: Option[] = [
  { value: 'sync', label: 'Đồng bộ' },
  { value: 'async', label: 'Bất đồng bộ' },
  { value: 'create', label: 'Tạo (create)' },
  { value: 'destroy', label: 'Huỷ (destroy)' },
];

const perfValue = (s: Step) => (s.performer.kind === 'system' ? 'system' : 'actor:' + s.performer.actorId);

function StepText({
  value,
  readOnly,
  focus,
  onCommit,
  onEnter,
  onBackspaceEmpty,
  placeholder,
}: {
  value: string;
  readOnly: boolean;
  focus: boolean;
  onCommit: (v: string) => void;
  onEnter: (v: string) => void;
  onBackspaceEmpty: () => void;
  placeholder: string;
}) {
  const [v, setV] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => setV(value), [value]);
  useEffect(() => {
    if (focus) {
      ref.current?.focus();
      const n = ref.current?.value.length ?? 0;
      ref.current?.setSelectionRange(n, n);
    }
  }, [focus]);
  return (
    <textarea
      ref={ref}
      className="spec-cell"
      rows={1}
      value={v}
      readOnly={readOnly}
      placeholder={placeholder}
      aria-label="Hành động"
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onCommit(v)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
          e.preventDefault();
          onEnter(v);
        } else if (e.key === 'Backspace' && !v) {
          e.preventDefault();
          onBackspaceEmpty();
        }
      }}
    />
  );
}

function Details({ s, readOnly, onEdit }: { s: Step; readOnly: boolean; onEdit: (p: Partial<Step>) => void }) {
  const it: Interaction = s.interaction ?? { target: 'controller' };
  const set = (p: Partial<Interaction>) => onEdit({ interaction: { ...it, ...p } });
  const field = (k: 'targetName' | 'message' | 'returns', label: string, ph: string) => (
    <label className="grid gap-1">
      <span className="lbl" style={{ margin: 0 }}>
        {label}
      </span>
      <input
        className="field"
        style={{ height: 26 }}
        defaultValue={it[k] ?? ''}
        readOnly={readOnly}
        placeholder={ph}
        aria-label={label}
        onBlur={(e) => e.target.value !== (it[k] ?? '') && set({ [k]: e.target.value || undefined })}
      />
    </label>
  );
  return (
    <div className="spec-details">
      <label className="grid gap-1">
        <span className="lbl" style={{ margin: 0 }}>
          Đối tượng nhận
        </span>
        <select
          className="field"
          style={{ height: 26 }}
          value={it.target}
          disabled={readOnly}
          onChange={(e) => set({ target: e.target.value as Interaction['target'] })}
        >
          {TARGETS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {field('targetName', 'Tên', 'Màn hình cổng vào / PhienGuiXe…')}
      {field('message', 'Message', 'quetThe(maThe)')}
      <label className="grid gap-1">
        <span className="lbl" style={{ margin: 0 }}>
          Kiểu
        </span>
        <select
          className="field"
          style={{ height: 26 }}
          value={it.kind ?? 'sync'}
          disabled={readOnly}
          onChange={(e) => set({ kind: e.target.value as Interaction['kind'] })}
        >
          {KINDS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {field('returns', 'Trả về', 'thongTinXe')}
      {!readOnly && (
        <button className="btn sm ghost-danger self-end" onClick={() => onEdit({ interaction: undefined })}>
          Bỏ chi tiết
        </button>
      )}
    </div>
  );
}

export function FlowTable({
  steps,
  prefix = '',
  performers,
  useCases,
  readOnly,
  focusId,
  onEdit,
  onInsert,
  onRemove,
  onMove,
  onBranch,
  stepMenu,
  label,
}: {
  steps: Step[];
  prefix?: string;
  performers: Option[];
  useCases: Option[];
  readOnly: boolean;
  focusId: string | null;
  onEdit: (id: string, patch: Partial<Step>) => void;
  /** Chèn bước mới tại index (0-based), có thể kèm chữ đã gõ của dòng hiện tại. */
  onInsert: (index: number) => void;
  onRemove: (id: string, focusPrev: boolean) => void;
  onMove: (from: number, to: number) => void;
  onBranch?: (stepNo: number, kind: 'alternativeFlows' | 'exceptionFlows') => void;
  /** Mục thêm vào menu ⋯ của bước (Xem trên Activity / Sequence…). */
  stepMenu?: (s: Step) => MenuEntry[];
  label: string;
}) {
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const toggle = (id: string) =>
    setOpen((o) => {
      const n = new Set(o);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const menu = (el: Element, s: Step, i: number) => {
    const items: MenuEntry[] = [
      { label: open.has(s.id) ? 'Ẩn chi tiết tương tác' : 'Chi tiết tương tác', onSelect: () => toggle(s.id) },
      s.loop
        ? { label: 'Bỏ đánh dấu lặp', onSelect: () => onEdit(s.id, { loop: undefined }) }
        : {
            label: 'Đánh dấu lặp…',
            icon: <Repeat />,
            onSelect: () =>
              void promptDialog({
                title: 'Bước lặp',
                label: 'Lặp lại cho đến khi',
                placeholder: 'đủ số lượng / người dùng dừng',
              }).then((until) => until?.trim() && onEdit(s.id, { loop: { until: until.trim() } })),
          },
      {
        label: 'Gọi use case khác',
        children: [
          ...(s.includeUseCaseId
            ? [{ label: 'Bỏ gọi use case', onSelect: () => onEdit(s.id, { includeUseCaseId: undefined }) }]
            : []),
          ...useCases.map((u) => ({ label: u.label, onSelect: () => onEdit(s.id, { includeUseCaseId: u.value }) })),
          ...(useCases.length ? [] : [{ label: 'Chưa có use case khác', disabled: true }]),
        ] as MenuEntry[],
      },
    ];
    if (onBranch)
      items.push(
        { type: 'sep' },
        {
          label: 'Tạo luồng thay thế từ bước này',
          icon: <Workflow />,
          onSelect: () => onBranch(s.no, 'alternativeFlows'),
        },
        { label: 'Tạo luồng ngoại lệ từ bước này', onSelect: () => onBranch(s.no, 'exceptionFlows') },
      );
    const extra = stepMenu?.(s) ?? [];
    if (extra.length) items.push({ type: 'sep' }, ...extra);
    items.push(
      { type: 'sep' },
      { label: 'Chèn bước phía trên', onSelect: () => onInsert(i) },
      { label: 'Chèn bước phía dưới', onSelect: () => onInsert(i + 1) },
      { label: 'Xoá bước', danger: true, onSelect: () => onRemove(s.id, false) },
    );
    openMenuAt(el, items, 'end');
  };
  return (
    <table className="spec-table" aria-label={label}>
      <thead>
        <tr>
          <th style={{ width: 22 }} aria-hidden />
          <th style={{ width: 58 }}>STT</th>
          <th style={{ width: 170 }}>Thực hiện bởi</th>
          <th>Hành động</th>
          <th style={{ width: 34 }} aria-hidden />
        </tr>
      </thead>
      <tbody>
        {steps.map((s, i) => (
          <FragmentRow key={s.id}>
            <tr
              data-step={s.id}
              className={cn(
                over === i && dragFrom !== null && dragFrom !== i && 'drop-before',
                dragFrom === i && 'dragging',
              )}
              onDragOver={(e) => {
                if (dragFrom === null) return;
                e.preventDefault();
                setOver(i);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragFrom !== null && dragFrom !== i) onMove(dragFrom, dragFrom < i ? i - 1 : i);
                setDragFrom(null);
                setOver(null);
              }}
            >
              <td
                className="spec-grip"
                draggable={!readOnly}
                title="Kéo để đổi thứ tự"
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', s.id);
                  setDragFrom(i);
                }}
                onDragEnd={() => {
                  setDragFrom(null);
                  setOver(null);
                }}
              >
                {!readOnly && <GripVertical size={14} />}
              </td>
              <td className="spec-no">
                {prefix}
                {s.no}
              </td>
              <td>
                <select
                  className="spec-cell"
                  value={perfValue(s)}
                  disabled={readOnly}
                  aria-label="Thực hiện bởi"
                  onChange={(e) =>
                    onEdit(s.id, {
                      performer:
                        e.target.value === 'system'
                          ? { kind: 'system' }
                          : { kind: 'actor', actorId: e.target.value.slice(6) },
                    })
                  }
                >
                  {performers.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                  {!performers.some((o) => o.value === perfValue(s)) && (
                    <option value={perfValue(s)}>(actor không thuộc use case)</option>
                  )}
                </select>
              </td>
              <td>
                <StepText
                  value={s.text}
                  readOnly={readOnly}
                  focus={focusId === s.id}
                  placeholder={i === 0 ? 'VD: Sinh viên quét thẻ RFID tại cổng vào' : 'Hành động…'}
                  onCommit={(text) => onEdit(s.id, { text })}
                  onEnter={(text) => {
                    if (text !== s.text) onEdit(s.id, { text });
                    onInsert(i + 1);
                  }}
                  onBackspaceEmpty={() => steps.length > 1 && onRemove(s.id, true)}
                />
                {(s.loop || s.includeUseCaseId || s.interaction) && (
                  <div className="spec-tags">
                    {s.interaction && (
                      <button className="pill" title="Chi tiết tương tác" onClick={() => toggle(s.id)}>
                        →{' '}
                        {[s.interaction.targetName, s.interaction.message].filter(Boolean).join('.') ||
                          TARGETS.find((t) => t.value === s.interaction!.target)?.label}
                        {s.interaction.returns ? ` : ${s.interaction.returns}` : ''}
                      </button>
                    )}
                    {s.loop && <span className="pill">↻ lặp đến khi {s.loop.until}</span>}
                    {s.includeUseCaseId && (
                      <span className="pill">
                        ↳ {useCases.find((u) => u.value === s.includeUseCaseId)?.label ?? 'use case đã xoá'}
                      </span>
                    )}
                  </div>
                )}
              </td>
              <td>
                <button
                  className="ibtn sm"
                  aria-label={`Thao tác bước ${prefix}${s.no}`}
                  onClick={(e) => menu(e.currentTarget, s, i)}
                >
                  <MoreHorizontal />
                </button>
              </td>
            </tr>
            {open.has(s.id) && (
              <tr className="spec-details-row">
                <td />
                <td colSpan={4}>
                  <Details s={s} readOnly={readOnly} onEdit={(p) => onEdit(s.id, p)} />
                </td>
              </tr>
            )}
          </FragmentRow>
        ))}
        {!steps.length && (
          <tr>
            <td colSpan={5} className="py-3 text-center text-muted">
              Chưa có bước nào.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

const FragmentRow = ({ children }: { children: React.ReactNode }) => <>{children}</>;
