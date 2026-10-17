// Ma trận truy vết (docs/phases/P12-model-explorer.md mục 4): Use Case × (Đặc tả, Activity, Sequence, Class liên quan),
// ô ✓ / –, bấm ô để mở sơ đồ (nhiều sơ đồ → chọn trong menu).
import { ArrowLeft, Check } from 'lucide-react';
import { useMemo } from 'react';
import { modelUsages, traceMatrix, type DiagramMeta, type ModelElement } from '@umlab/core';
import { Button, EmptyState, openMenuAt } from '@/ui';
import { useSelectRequest } from '../editors/engine/select-request';
import type { ProjectSession } from './session';

function DiagramCell({ list, label, onOpen }: { list: DiagramMeta[]; label: string; onOpen: (id: string) => void }) {
  if (!list.length)
    return (
      <span className="text-muted" aria-label={`${label}: chưa có`}>
        –
      </span>
    );
  return (
    <button
      type="button"
      className="trace-ok"
      aria-label={`${label}: ${list.map((d) => d.name).join(', ')}`}
      title={list.map((d) => d.name).join('\n')}
      onClick={(e) =>
        list.length === 1
          ? onOpen(list[0].id)
          : openMenuAt(
              e.currentTarget,
              list.map((d) => ({ label: d.name, onSelect: () => onOpen(d.id) })),
            )
      }
    >
      <Check size={15} />
      {list.length > 1 && <span>{list.length}</span>}
    </button>
  );
}

export function TraceMatrix({
  session,
  version,
  onOpen,
  onClose,
}: {
  session: ProjectSession;
  version: number;
  onOpen: (diagramId: string) => void;
  onClose: () => void;
}) {
  const rows = useMemo(() => traceMatrix(session.doc), [session, version]); // eslint-disable-line react-hooks/exhaustive-deps
  const openClass = (c: ModelElement) => {
    const u =
      modelUsages(session.doc, c.id).find((x) => x.diagram.type === 'class') ?? modelUsages(session.doc, c.id)[0];
    if (!u) return;
    useSelectRequest.getState().set({ diagramId: u.diagram.id, viewIds: u.viewIds, connIds: u.connIds });
    onOpen(u.diagram.id);
  };
  const done = (k: 'specs' | 'activities' | 'sequences') => rows.filter((r) => r[k].length).length;
  return (
    <main className="scroll min-w-0 flex-1 p-6" aria-label="Ma trận truy vết">
      <div className="mb-4 flex items-center gap-2">
        <Button variant="outline" icon={<ArrowLeft />} onClick={onClose}>
          Tổng quan
        </Button>
        <h1 className="text-[18px] font-semibold">Ma trận truy vết</h1>
        <span className="text-muted">
          {rows.length} use case · đặc tả {done('specs')}/{rows.length} · Activity {done('activities')}/{rows.length} ·
          Sequence {done('sequences')}/{rows.length}
        </span>
      </div>
      {!rows.length ? (
        <EmptyState
          title="Chưa có use case nào"
          text="Vẽ Use Case Diagram rồi tạo đặc tả, sinh Activity / Sequence để theo dõi mức độ hoàn thiện ở đây."
        />
      ) : (
        <table className="trace-table">
          <thead>
            <tr>
              <th>Use case</th>
              <th>Đặc tả</th>
              <th>Activity</th>
              <th>Sequence</th>
              <th>Class liên quan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.useCase.id} data-usecase={r.useCase.id}>
                <td>
                  <b>{r.code}</b> {r.useCase.name}
                </td>
                <td>
                  <DiagramCell list={r.specs} label="Đặc tả" onOpen={onOpen} />
                </td>
                <td>
                  <DiagramCell list={r.activities} label="Activity" onOpen={onOpen} />
                </td>
                <td>
                  <DiagramCell list={r.sequences} label="Sequence" onOpen={onOpen} />
                </td>
                <td>
                  {r.classes.length ? (
                    <div className="flex flex-wrap gap-1">
                      {r.classes.map((c) => (
                        <button key={c.id} type="button" className="chip" onClick={() => openClass(c)}>
                          {c.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted">–</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
