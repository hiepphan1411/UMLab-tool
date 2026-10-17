import {
  ChevronRight,
  FileDown,
  FileJson,
  Folder,
  FolderInput,
  LayoutGrid,
  List,
  MoreHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useRef, useState, type MouseEvent } from 'react';
import {
  DIAGRAM_TYPE_BY_ID,
  DIAGRAM_TYPE_INFO,
  childFolders,
  connsMap,
  diagramsMap,
  folderDiagrams,
  folderPath,
  moveItems,
  viewsMap,
  type DiagramMeta,
  type DiagramType,
} from '@umlab/core';
import type { Peer } from '@shared/api';
import { useAppInfo } from '@/lib/app-info';
import { cn } from '@/lib/cn';
import { dateTime, timeAgo } from '@/lib/format';
import { DIAGRAM_COLORS, DiagramIcon } from '@/lib/icons';
import { Avatar, Button, IconButton, Segmented, openContextMenu, openMenuAt, type MenuEntry } from '@/ui';
import { exportSpecsDocx } from '../editors/usecase-spec/exporters';
import { confirmDeleteDiagrams, exportDiagrams } from './diagram-actions';
import { MoveDialog } from './dialogs';
import { uniquePeers } from './presence';
import { LOCAL, type ProjectSession } from './session';
import { DiagramThumbnail } from './thumbnail';
import type { WorkspacePrefs } from './ui-state';

interface Props {
  session: ProjectSession;
  version: number;
  prefs: WorkspacePrefs;
  setPrefs: (p: Partial<WorkspacePrefs>) => void;
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
  peers: Peer[];
  onOpenDiagram: (id: string) => void;
  onNewDiagram: (type: DiagramType, folderId: string | null) => void;
  menuFor: (d: DiagramMeta) => MenuEntry[];
}

function sizeOf(s: ProjectSession, d: DiagramMeta): string {
  if (d.type === 'gantt' || d.type === 'usecase-spec') return '—';
  const v = viewsMap(s.doc, d.id).size;
  const c = connsMap(s.doc, d.id).size;
  return `${v} hình · ${c} nối`;
}

export function DashboardMain(p: Props) {
  const { session: s, version, prefs, setPrefs, selected, setSelected } = p;
  const doc = s.doc;
  const folder = prefs.folder && doc.getMap('folders').has(prefs.folder) ? prefs.folder : null;
  const anchor = useRef<string | null>(null);
  const [moving, setMoving] = useState(false);
  const info = useAppInfo();

  const subfolders = useMemo(() => childFolders(doc, folder), [doc, folder, version]); // eslint-disable-line react-hooks/exhaustive-deps
  const diagrams = useMemo(() => folderDiagrams(doc, folder), [doc, folder, version]); // eslint-disable-line react-hooks/exhaustive-deps
  const path = useMemo(() => folderPath(doc, folder), [doc, folder, version]); // eslint-disable-line react-hooks/exhaustive-deps
  const counts = useMemo(() => {
    const c: Partial<Record<DiagramType, number>> = {};
    for (const d of diagramsMap(doc).values()) c[d.type] = (c[d.type] ?? 0) + 1;
    return c;
  }, [doc, version]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);
  const selectedDiagrams = diagrams.filter((d) => selected.has(d.id)).map((d) => d.id);
  const viewersOf = (id: string) => uniquePeers(p.peers.filter((x) => x.diagramId === id));

  const click = (e: MouseEvent, id: string) => {
    if (e.shiftKey && anchor.current) {
      const ids = diagrams.map((d) => d.id);
      const a = ids.indexOf(anchor.current);
      const b = ids.indexOf(id);
      if (a >= 0 && b >= 0) return setSelected(new Set(ids.slice(Math.min(a, b), Math.max(a, b) + 1)));
    }
    anchor.current = id;
    if (e.ctrlKey || e.metaKey) {
      const n = new Set(selected);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      setSelected(n);
    } else setSelected(new Set([id]));
  };

  return (
    <main className="scroll min-w-0 flex-1" onClick={(e) => e.target === e.currentTarget && setSelected(new Set())}>
      <div className="mx-auto w-full max-w-[1280px] px-6 py-5">
        {s.canEdit && (
          <section className="mb-6">
            <div className="sec-h">Tạo sơ đồ mới</div>
            <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
              {DIAGRAM_TYPE_INFO.map((t) => (
                <button
                  key={t.type}
                  data-new-diagram={t.type}
                  className="card flex items-center gap-3 p-3 text-left transition-colors hover:border-[var(--accent)]"
                  onClick={() => p.onNewDiagram(t.type, folder)}
                >
                  <span
                    className="grid h-10 w-10 flex-none place-items-center rounded-[10px]"
                    style={{ background: DIAGRAM_COLORS[t.type] + '1A' }}
                  >
                    <DiagramIcon type={t.type} size={20} colored />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{t.label}</span>
                    <span className="block truncate text-[11.5px] text-muted">{t.description}</span>
                  </span>
                </button>
              ))}
              {info?.isDev && (
                <button
                  data-new-diagram="playground"
                  className="card flex items-center gap-3 border-dashed p-3 text-left text-muted hover:border-[var(--accent)]"
                  onClick={() => p.onNewDiagram('playground' as DiagramType, folder)}
                >
                  <span className="grid h-10 w-10 flex-none place-items-center rounded-[10px] bg-[var(--panel-2)]">
                    ⚙
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-ink">Playground (dev)</span>
                    <span className="block truncate text-[11.5px]">Thử engine: hộp, tròn, khung chứa</span>
                  </span>
                </button>
              )}
            </div>
          </section>
        )}

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <nav className="flex min-w-0 items-center gap-1 text-[15px] font-semibold" aria-label="Thư mục">
            <button
              className={cn('rounded px-1 hover:bg-[var(--panel-2)]', !folder && 'text-ink')}
              onClick={() => setPrefs({ folder: null })}
            >
              Tất cả thư mục
            </button>
            {path.map((f) => (
              <span key={f.id} className="flex min-w-0 items-center gap-1">
                <ChevronRight size={14} className="flex-none text-muted" />
                <button
                  className="truncate rounded px-1 hover:bg-[var(--panel-2)]"
                  onClick={() => setPrefs({ folder: f.id })}
                >
                  {f.name}
                </button>
              </span>
            ))}
          </nav>
          <span className="text-muted">{diagrams.length} sơ đồ</span>
          <div className="flex-1" />
          {selectedDiagrams.length > 0 && (
            <div
              className="flex items-center gap-1 rounded-lg border border-line bg-panel px-1.5 py-1"
              role="toolbar"
              aria-label="Thao tác với sơ đồ đã chọn"
            >
              <span className="px-1.5 font-medium">Đã chọn {selectedDiagrams.length}</span>
              {s.canEdit && (
                <Button size="sm" icon={<FolderInput />} onClick={() => setMoving(true)}>
                  Chuyển thư mục
                </Button>
              )}
              <Button size="sm" icon={<FileJson />} onClick={() => void exportDiagrams(s, selectedDiagrams)}>
                Xuất JSON
              </Button>
              {selectedDiagrams.some((id) => diagramsMap(s.doc).get(id)?.type === 'usecase-spec') && (
                <Button size="sm" icon={<FileDown />} onClick={() => void exportSpecsDocx(s.doc, selectedDiagrams)}>
                  Xuất DOCX
                </Button>
              )}
              {s.canEdit && (
                <Button
                  size="sm"
                  variant="ghost-danger"
                  icon={<Trash2 />}
                  onClick={() =>
                    void confirmDeleteDiagrams(s, selectedDiagrams).then((ok) => ok && setSelected(new Set()))
                  }
                >
                  Xoá
                </Button>
              )}
              <IconButton label="Bỏ chọn" size="sm" onClick={() => setSelected(new Set())}>
                <X />
              </IconButton>
            </div>
          )}
          <Segmented
            value={prefs.view}
            onChange={(view) => setPrefs({ view })}
            ariaLabel="Chế độ xem"
            options={[
              { value: 'grid', label: <LayoutGrid />, title: 'Lưới' },
              { value: 'list', label: <List />, title: 'Danh sách' },
            ]}
          />
        </div>

        {subfolders.length > 0 && (
          <div className="mb-4 grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            {subfolders.map((f) => (
              <button
                key={f.id}
                className="card flex items-center gap-2.5 px-3 py-2.5 text-left hover:border-[var(--accent)]"
                onDoubleClick={() => setPrefs({ folder: f.id })}
                onClick={() => setPrefs({ folder: f.id })}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const ids = e.dataTransfer.getData('text/x-umlab-diagrams');
                  if (ids && s.canEdit) moveItems(doc, ids.split(','), f.id, 'inside', LOCAL);
                }}
              >
                <Folder size={18} className="flex-none text-muted" />
                <span className="truncate font-medium">{f.name}</span>
                <span className="ml-auto text-muted">{folderDiagrams(doc, f.id).length}</span>
              </button>
            ))}
          </div>
        )}

        {!diagrams.length ? (
          <div className="card grid place-items-center px-6 py-12 text-center text-muted">
            {folder ? 'Thư mục này chưa có sơ đồ.' : 'Chưa có sơ đồ ở gốc project.'}{' '}
            {s.canEdit && 'Chọn một loại ở “Tạo sơ đồ mới” phía trên.'}
          </div>
        ) : prefs.view === 'grid' ? (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
            {diagrams.map((d) => {
              const viewers = viewersOf(d.id);
              return (
                <div
                  key={d.id}
                  data-diagram={d.name}
                  draggable={s.canEdit}
                  onDragStart={(e) =>
                    e.dataTransfer.setData(
                      'text/x-umlab-diagrams',
                      (selected.has(d.id) ? selectedDiagrams : [d.id]).join(','),
                    )
                  }
                  className={cn(
                    'card group cursor-pointer overflow-hidden transition-colors hover:border-[var(--accent)]',
                    selected.has(d.id) && 'border-[var(--accent)] ring-2 ring-[var(--accent-soft)]',
                  )}
                  onClick={(e) => click(e, d.id)}
                  onDoubleClick={() => p.onOpenDiagram(d.id)}
                  onContextMenu={(e) => {
                    if (!selected.has(d.id)) setSelected(new Set([d.id]));
                    openContextMenu(e, p.menuFor(d));
                  }}
                >
                  <div className="relative border-b border-line" style={{ background: 'var(--canvas)', height: 150 }}>
                    <DiagramThumbnail session={s} diagram={d} version={version} />
                    {viewers.length > 0 && (
                      <span className="absolute top-2 right-2 flex">
                        {viewers.slice(0, 3).map((v, i) => (
                          <span key={v.userId} style={{ marginLeft: i ? -5 : 0 }}>
                            <Avatar
                              name={v.name}
                              color={v.color}
                              size={20}
                              ring="var(--panel)"
                              title={`${v.name} đang xem`}
                            />
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <DiagramIcon type={d.type} colored />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{d.name}</div>
                      <div className="truncate text-[11.5px] text-muted" title={dateTime(d.updatedAt)}>
                        {DIAGRAM_TYPE_BY_ID[d.type]?.short ?? d.type} · {timeAgo(d.updatedAt)}
                      </div>
                    </div>
                    <IconButton
                      label="Tuỳ chọn"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        openMenuAt(e.currentTarget, p.menuFor(d), 'end');
                      }}
                    >
                      <MoreHorizontal />
                    </IconButton>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr
                  className="text-left text-[11px] tracking-wider text-muted uppercase"
                  style={{ background: 'var(--panel-2)' }}
                >
                  <th className="px-4 py-2 font-semibold">Tên</th>
                  <th className="px-2 py-2 font-semibold">Loại</th>
                  <th className="px-2 py-2 font-semibold">Cập nhật</th>
                  <th className="px-2 py-2 font-semibold">Kích thước</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {diagrams.map((d) => (
                  <tr
                    key={d.id}
                    data-diagram={d.name}
                    className={cn(
                      'cursor-pointer border-t border-line hover:bg-[var(--panel-2)]',
                      selected.has(d.id) && 'bg-[var(--accent-soft)]',
                    )}
                    onClick={(e) => click(e, d.id)}
                    onDoubleClick={() => p.onOpenDiagram(d.id)}
                    onContextMenu={(e) => {
                      if (!selected.has(d.id)) setSelected(new Set([d.id]));
                      openContextMenu(e, p.menuFor(d));
                    }}
                  >
                    <td className="px-4 py-2">
                      <span className="flex items-center gap-2">
                        <DiagramIcon type={d.type} colored />
                        <span className="truncate font-medium">{d.name}</span>
                      </span>
                    </td>
                    <td className="px-2 text-muted">{DIAGRAM_TYPE_BY_ID[d.type]?.label ?? d.type}</td>
                    <td className="px-2 whitespace-nowrap text-muted" title={dateTime(d.updatedAt)}>
                      {timeAgo(d.updatedAt)}
                    </td>
                    <td className="px-2 whitespace-nowrap text-muted">{sizeOf(s, d)}</td>
                    <td className="pr-2">
                      <IconButton
                        label="Tuỳ chọn"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openMenuAt(e.currentTarget, p.menuFor(d), 'end');
                        }}
                      >
                        <MoreHorizontal />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <section className="mt-6">
          <div className="sec-h">Thống kê project · {total} sơ đồ</div>
          <div className="flex flex-wrap gap-2">
            {DIAGRAM_TYPE_INFO.map((t) => (
              <div key={t.type} className="card flex items-center gap-2.5 px-3 py-2" data-stat={t.type}>
                <span className="h-7 w-1.5 rounded" style={{ background: DIAGRAM_COLORS[t.type] }} />
                <div>
                  <div className="text-[17px] leading-tight font-semibold tabular-nums">{counts[t.type] ?? 0}</div>
                  <div className="text-[11px] text-muted">{t.short}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      {moving && (
        <MoveDialog
          session={s}
          count={selectedDiagrams.length}
          version={version}
          onClose={() => setMoving(false)}
          onMove={(fid) => {
            moveItems(doc, selectedDiagrams, fid, 'inside', LOCAL);
            setMoving(false);
          }}
        />
      )}
    </main>
  );
}
