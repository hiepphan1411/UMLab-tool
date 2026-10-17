import { AlertCircle, AlertTriangle, Eye, EyeOff, Info, Lock, LockOpen, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { DIAGRAM_TYPE_INFO, folderPath } from '@umlab/core';
import { DiagramIcon } from '@/lib/icons';
import { cn } from '@/lib/cn';
import type { Engine } from './engine';
import { toggleFlag } from './ops';
import { UmlIcon } from './palette';
import { getRules, getShape, type Issue } from './registry';
import { viewName } from './render';

/** Tab Lớp: danh sách hình theo thứ tự vẽ (trên cùng ở đầu), ẩn/khoá, chọn. */
export function LayersPanel({ engine }: { engine: Engine }) {
  const order = useStore(engine.store, (s) => s.order);
  const sel = useStore(engine.store, (s) => s.sel);
  const conns = useStore(engine.store, (s) => s.conns);
  useStore(engine.store, (s) => s.version);
  const rows = [...order].reverse();
  const depth = (id: string) => {
    let d = 0;
    let v = engine.lookup.view(id);
    while (v?.parentId && d < 12) {
      d++;
      v = engine.lookup.view(v.parentId);
    }
    return d;
  };
  return (
    <div className="scroll px-1.5 pb-4">
      <div className="sec-h px-1.5 pt-3">
        <span>
          {order.length} lớp · {conns.size} liên kết
        </span>
      </div>
      {!rows.length && <p className="px-2 text-muted">Chưa có đối tượng.</p>}
      {rows.map((v) => {
        const def = getShape(v.shape);
        return (
          <div
            key={v.id}
            className={cn('layer', sel.has(v.id) && 'on')}
            style={{ paddingLeft: 8 + depth(v.id) * 12 }}
            onClick={(e) => {
              if (e.shiftKey) {
                const n = new Set(sel);
                if (n.has(v.id)) n.delete(v.id);
                else n.add(v.id);
                engine.select(n);
              } else engine.select([v.id]);
            }}
          >
            <UmlIcon name={def?.icon ?? 'missing'} size={14} />
            <span className="nm min-w-0 flex-1 truncate" style={{ opacity: v.hidden ? 0.45 : 1 }}>
              {viewName(v, engine.lookup)}
            </span>
            {!engine.readOnly && (
              <>
                <button
                  className="ibtn sm"
                  style={{ opacity: v.hidden ? 1 : 0.55 }}
                  aria-label={v.hidden ? 'Hiện' : 'Ẩn'}
                  onClick={(e) => (e.stopPropagation(), toggleFlag(engine, 'hidden', [v.id]))}
                >
                  {v.hidden ? <EyeOff /> : <Eye />}
                </button>
                <button
                  className="ibtn sm"
                  style={{ opacity: v.locked ? 1 : 0.55 }}
                  aria-label={v.locked ? 'Mở khoá' : 'Khoá'}
                  onClick={(e) => (e.stopPropagation(), toggleFlag(engine, 'locked', [v.id]))}
                >
                  {v.locked ? <Lock /> : <LockOpen />}
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Tab Sơ đồ: chuyển nhanh sang sơ đồ khác trong project. */
export function DiagramsPanel({ engine, onOpen }: { engine: Engine; onOpen: (id: string) => void }) {
  const [q, setQ] = useState('');
  const list = engine.lookup.diagrams();
  const k = q.trim().toLowerCase();
  return (
    <div className="scroll px-1.5 pb-4">
      <div className="p-1.5">
        <input
          className="field"
          placeholder="Lọc sơ đồ…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Lọc sơ đồ"
        />
      </div>
      {DIAGRAM_TYPE_INFO.map((t) => {
        const items = list
          .filter((d) => d.type === t.type && (!k || d.name.toLowerCase().includes(k)))
          .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
        if (!items.length) return null;
        return (
          <div key={t.type} className="mt-1">
            <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold text-muted">
              <DiagramIcon type={t.type} size={13} colored />
              {t.label}
            </div>
            {items.map((d) => (
              <button
                key={d.id}
                className={cn('layer w-full text-left', d.id === engine.diagramId && 'on')}
                onClick={() => onOpen(d.id)}
                title={folderPath(engine.doc, d.folderId)
                  .map((f) => f.name)
                  .join(' / ')}
              >
                <span className="nm">{d.name}</span>
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/** Kiểm tra mô hình: chạy luật của loại sơ đồ; bấm một dòng để nhảy tới hình. */
export function useIssues(engine: Engine): Issue[] {
  const version = useStore(engine.store, (s) => s.version);
  return useMemo(() => {
    const ctx = {
      lookup: engine.lookup,
      views: engine.state.order,
      conns: [...engine.state.conns.values()],
      shape: getShape,
    };
    const out: Issue[] = [];
    for (const r of getRules(engine.diagramType)) {
      try {
        out.push(...r(ctx));
      } catch (e) {
        console.warn('[rule]', e);
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, version]);
}

const LEVEL_ICON = { error: AlertCircle, warning: AlertTriangle, info: Info };
const LEVEL_COLOR = { error: 'var(--danger)', warning: 'var(--warn)', info: 'var(--accent)' };

export function IssuesPanel({
  engine,
  issues,
  onClose,
  focus,
}: {
  engine: Engine;
  issues: Issue[];
  onClose: () => void;
  focus: (id: string) => void;
}) {
  return (
    <div
      className="absolute top-3 left-3 z-20 flex max-h-[60%] w-[360px] flex-col rounded-xl border border-line bg-panel shadow-lg"
      role="dialog"
      aria-label="Kiểm tra mô hình"
    >
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <AlertTriangle size={15} className="text-warn" />
        <span className="flex-1 font-semibold">Kiểm tra mô hình</span>
        <span className="text-muted">{issues.length} mục</span>
        <button className="ibtn sm" aria-label="Đóng" onClick={onClose}>
          <X />
        </button>
      </div>
      <div className="scroll p-1.5">
        {!issues.length && <p className="px-2 py-4 text-center text-muted">Không phát hiện vấn đề nào.</p>}
        {issues.map((it, i) => {
          const I = LEVEL_ICON[it.level];
          return (
            <div key={i} className="layer items-start" onClick={() => it.targetId && focus(it.targetId)}>
              <I size={14} className="mt-0.5 flex-none" style={{ color: LEVEL_COLOR[it.level] }} />
              <span className="flex-1" style={{ lineHeight: 1.45 }}>
                {it.message}
              </span>
              {it.fix && !engine.readOnly && (
                <button
                  className="btn outline sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    engine.apply(it.fix!.run);
                  }}
                >
                  {it.fix.label}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Tìm trong sơ đồ (Ctrl+F): gõ tên, Enter để nhảy lần lượt tới các hình khớp. */
export function FindPanel({
  engine,
  onClose,
  focus,
}: {
  engine: Engine;
  onClose: () => void;
  focus: (id: string) => void;
}) {
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const hits = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return [];
    return engine.state.order.filter((v) => viewName(v, engine.lookup).toLowerCase().includes(k));
  }, [q, engine]);
  return (
    <div
      className="absolute top-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-line bg-panel px-2 py-1.5 shadow-lg"
      role="search"
    >
      <Search size={15} className="text-muted" />
      <input
        ref={ref}
        className="field"
        style={{ width: 240 }}
        placeholder="Tìm hình theo tên…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setI(0);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
          if (e.key === 'Enter' && hits.length) {
            const n = (i + (e.shiftKey ? hits.length - 1 : 1)) % hits.length;
            const idx = q && i === 0 && !e.shiftKey ? 0 : n;
            focus(hits[idx].id);
            setI(idx + 1);
          }
        }}
      />
      <span className="w-14 text-right text-muted tabular-nums">{q ? `${hits.length} kết quả` : ''}</span>
      <button className="ibtn sm" aria-label="Đóng tìm kiếm" onClick={onClose}>
        <X />
      </button>
    </div>
  );
}
