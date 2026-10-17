// Tìm kiếm toàn project (Ctrl+K — dashboard và editor): sơ đồ, phần tử mô hình, bước đặc tả; kết quả nhóm theo loại.
import { FileText, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { modelKindLabel, modelUsages, searchProject, type SearchResult } from '@umlab/core';
import { DiagramIcon } from '@/lib/icons';
import { cn } from '@/lib/cn';
import { Dialog, Kbd, toast } from '@/ui';
import { useSelectRequest } from '../editors/engine/select-request';
import { UmlIcon } from '../editors/engine/palette';
import { useFocusRequest } from '../editors/generated';
import { modelIcon } from '../editors/model-explorer';
import type { ProjectSession } from './session';

interface Item {
  key: string;
  group: string;
  icon: ReactNode;
  label: string;
  sub: string;
  run: () => void;
}

/** Ctrl+K mở hộp tìm kiếm (kể cả khi đang gõ trong ô nhập). */
export function useSearchShortcut(open: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
}

export function SearchDialog({ session, onClose }: { session: ProjectSession; onClose: () => void }) {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [cur, setCur] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  const go = (diagramId: string) => nav(`/p/${session.projectId}/d/${diagramId}`);

  const items = useMemo((): Item[] => {
    const r: SearchResult = searchProject(session.doc, q, 12);
    return [
      ...r.model.map((m): Item => ({
        key: 'm' + m.id,
        group: 'Phần tử mô hình',
        icon: <UmlIcon name={modelIcon(m.kind)} size={16} />,
        label: `${typeof m.data.code === 'string' && m.data.code ? m.data.code + ' ' : ''}${m.name}`,
        sub: modelKindLabel(m.kind),
        run: () => {
          const u = modelUsages(session.doc, m.id)[0];
          if (!u) return toast(`“${m.name}” chưa có trên sơ đồ nào`);
          useSelectRequest.getState().set({ diagramId: u.diagram.id, viewIds: u.viewIds, connIds: u.connIds });
          go(u.diagram.id);
        },
      })),
      ...r.diagrams.map((d): Item => ({
        key: 'd' + d.id,
        group: 'Sơ đồ',
        icon: <DiagramIcon type={d.type} colored />,
        label: d.name,
        sub: d.generatedFrom ? 'sinh từ đặc tả' : '',
        run: () => go(d.id),
      })),
      ...r.steps.map((s): Item => ({
        key: 's' + s.stepId,
        group: 'Bước đặc tả',
        icon: <FileText size={16} />,
        label: s.text,
        sub: s.label,
        run: () => {
          useFocusRequest.getState().set({ diagramId: s.diagram.id, stepId: s.stepId });
          go(s.diagram.id);
        },
      })),
    ];
  }, [q, session]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setCur(0), [q]);
  const pick = (i: number) => {
    const it = items[i];
    if (!it) return;
    onClose();
    it.run();
  };

  let lastGroup = '';
  return (
    <Dialog open onClose={onClose} title="Tìm trong project" width={620}>
      <div className="relative mb-2">
        <Search size={15} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted" />
        <input
          ref={input}
          className="field"
          style={{ paddingLeft: 30, height: 36 }}
          placeholder="Tìm sơ đồ, use case, class, bước đặc tả…"
          aria-label="Tìm trong project"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setCur((c) => Math.min(items.length - 1, c + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setCur((c) => Math.max(0, c - 1));
            } else if (e.key === 'Enter') pick(cur);
          }}
        />
      </div>
      <div className="grid max-h-[420px] gap-0.5 overflow-auto" role="listbox" aria-label="Kết quả tìm kiếm">
        {!q.trim() && (
          <p className="px-1 text-[12.5px] text-muted">
            Gõ để tìm. <Kbd>↑</Kbd> <Kbd>↓</Kbd> chọn, <Kbd>Enter</Kbd> mở. Không phân biệt dấu.
          </p>
        )}
        {q.trim() && !items.length && <p className="px-1 text-muted">Không tìm thấy “{q}”.</p>}
        {items.map((it, i) => {
          const head = it.group !== lastGroup;
          lastGroup = it.group;
          return (
            <div key={it.key}>
              {head && (
                <div className="px-1 pt-2 pb-0.5 text-[10.5px] font-semibold tracking-wider text-muted uppercase">
                  {it.group}
                </div>
              )}
              <button
                type="button"
                role="option"
                aria-selected={i === cur}
                data-group={it.group}
                className={cn('tree-row w-full px-2 text-left', i === cur && 'on')}
                onMouseEnter={() => setCur(i)}
                onClick={() => pick(i)}
              >
                {it.icon}
                <span className="nm">{it.label}</span>
                {it.sub && <span className="text-[11px] text-muted">{it.sub}</span>}
              </button>
            </div>
          );
        })}
      </div>
    </Dialog>
  );
}
