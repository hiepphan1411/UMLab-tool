import { Copy, FileJson, Folder, FolderOpen, FolderPlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState, type MouseEvent } from 'react';
import {
  DIAGRAM_TYPE_INFO,
  childFolders,
  createFolder,
  diagramsMap,
  duplicateDiagram,
  folderDiagrams,
  folderPath,
  foldersMap,
  moveItems,
  renameDiagram,
  renameFolder,
  type DiagramType,
} from '@umlab/core';
import type { Peer } from '@shared/api';
import { timeAgo } from '@/lib/format';
import { DiagramIcon } from '@/lib/icons';
import { IconButton, Segmented, Tree, openContextMenu, toast, type MenuEntry, type TreeNode } from '@/ui';
import { confirmDeleteDiagrams, confirmDeleteFolder, exportDiagrams } from './diagram-actions';
import { LOCAL, type ProjectSession } from './session';
import { readRecent, type WorkspacePrefs } from './ui-state';

interface Props {
  session: ProjectSession;
  version: number;
  prefs: WorkspacePrefs;
  setPrefs: (p: Partial<WorkspacePrefs> | ((p: WorkspacePrefs) => Partial<WorkspacePrefs>)) => void;
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
  peers: Peer[];
  userId: string;
  onOpenDiagram: (id: string) => void;
  onNewDiagram: (type: DiagramType, folderId: string | null) => void;
}

export function ProjectSidebar(p: Props) {
  const { session: s, version, prefs, setPrefs, selected, setSelected } = p;
  const [renaming, setRenaming] = useState<string | null>(null);
  const canEdit = s.canEdit;
  const doc = s.doc;

  const viewers = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const peer of p.peers)
      if (peer.diagramId) m.set(peer.diagramId, [...(m.get(peer.diagramId) ?? []), peer.name]);
    return m;
  }, [p.peers]);

  const nodes = useMemo<TreeNode[]>(() => {
    const build = (parent: string | null): TreeNode[] => [
      ...childFolders(doc, parent).map((f) => ({
        id: f.id,
        label: f.name,
        isFolder: true,
        icon: <Folder size={15} />,
        children: build(f.id),
        draggable: canEdit,
      })),
      ...folderDiagrams(doc, parent).map((d) => ({
        id: d.id,
        label: d.name,
        icon: <DiagramIcon type={d.type} size={15} colored />,
        hint: viewers.get(d.id)?.length ? '● ' + viewers.get(d.id)!.join(', ') : undefined,
        draggable: canEdit,
      })),
    ];
    return build(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, version, viewers, canEdit]);

  const isFolder = (id: string) => foldersMap(doc).has(id);

  const newDiagramMenu = (folderId: string | null): MenuEntry => ({
    label: 'Sơ đồ mới',
    icon: <Plus />,
    disabled: !canEdit,
    children: DIAGRAM_TYPE_INFO.map((t) => ({
      label: t.label,
      icon: <DiagramIcon type={t.type} />,
      onSelect: () => p.onNewDiagram(t.type, folderId),
    })),
  });

  const newFolder = (parent: string | null) => {
    const id = createFolder(doc, 'Thư mục mới', parent, LOCAL);
    if (parent) setPrefs((x) => ({ expanded: [...new Set([...x.expanded, parent])] }));
    setSelected(new Set([id]));
    setRenaming(id);
  };

  const menuFor = (id: string | null): MenuEntry[] => {
    if (!id)
      return [
        newDiagramMenu(null),
        { label: 'Thư mục mới', icon: <FolderPlus />, disabled: !canEdit, onSelect: () => newFolder(null) },
      ];
    const ids = selected.has(id) ? [...selected] : [id];
    if (isFolder(id))
      return [
        newDiagramMenu(id),
        { label: 'Thư mục mới', icon: <FolderPlus />, disabled: !canEdit, onSelect: () => newFolder(id) },
        { type: 'sep' },
        { label: 'Mở', icon: <FolderOpen />, onSelect: () => setPrefs({ folder: id }) },
        { label: 'Đổi tên', icon: <Pencil />, shortcut: 'F2', disabled: !canEdit, onSelect: () => setRenaming(id) },
        {
          label: 'Xoá',
          icon: <Trash2 />,
          danger: true,
          disabled: !canEdit,
          onSelect: () => void confirmDeleteFolder(s, id),
        },
      ];
    const diagramIds = ids.filter((x) => !isFolder(x));
    return [
      { label: 'Mở', icon: <FolderOpen />, shortcut: 'Enter', onSelect: () => p.onOpenDiagram(id) },
      { label: 'Đổi tên', icon: <Pencil />, shortcut: 'F2', disabled: !canEdit, onSelect: () => setRenaming(id) },
      {
        label: 'Nhân bản',
        icon: <Copy />,
        disabled: !canEdit,
        onSelect: () => {
          const nid = duplicateDiagram(doc, id, LOCAL);
          if (nid) setSelected(new Set([nid]));
        },
      },
      {
        label: diagramIds.length > 1 ? `Xuất JSON (${diagramIds.length} sơ đồ)` : 'Xuất JSON',
        icon: <FileJson />,
        onSelect: () => void exportDiagrams(s, diagramIds),
      },
      { type: 'sep' },
      {
        label: diagramIds.length > 1 ? `Xoá ${diagramIds.length} sơ đồ` : 'Xoá',
        icon: <Trash2 />,
        danger: true,
        disabled: !canEdit,
        onSelect: () => void confirmDeleteDiagrams(s, diagramIds),
      },
    ];
  };

  const recent = useMemo(
    () =>
      readRecent(p.userId, s.projectId)
        .map((r) => ({ ...r, d: diagramsMap(doc).get(r.id) }))
        .filter((r) => r.d),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doc, version, p.userId, s.projectId],
  );

  return (
    <aside className="flex min-h-0 flex-col border-r border-line bg-panel" style={{ width: prefs.sideWidth }}>
      <div className="flex items-center gap-1 px-2.5 pt-2.5 pb-2">
        <Segmented
          className="flex-1"
          value={prefs.side}
          onChange={(side) => setPrefs({ side })}
          options={[
            { value: 'tree', label: 'Cây thư mục' },
            { value: 'type', label: 'Theo loại' },
            { value: 'recent', label: 'Gần đây' },
          ]}
        />
      </div>
      {prefs.side === 'tree' && (
        <>
          <div className="flex items-center gap-1 px-2.5 pb-1">
            <span className="sec-h mb-0 flex-1">Thư mục & sơ đồ</span>
            <IconButton label="Thư mục mới" size="sm" disabled={!canEdit} onClick={() => newFolder(null)}>
              <FolderPlus />
            </IconButton>
            <IconButton
              label="Sơ đồ mới"
              size="sm"
              disabled={!canEdit}
              onClick={(e) => openContextMenu(e, [newDiagramMenu(prefs.folder)])}
            >
              <Plus />
            </IconButton>
          </div>
          <div
            className="scroll px-1.5"
            onContextMenu={(e) => e.target === e.currentTarget && openContextMenu(e, menuFor(null))}
          >
            <Tree
              ariaLabel="Cây thư mục project"
              nodes={nodes}
              expanded={new Set(prefs.expanded)}
              onToggle={(id, open) =>
                setPrefs((x) => ({
                  expanded: open ? [...new Set([...x.expanded, id])] : x.expanded.filter((e) => e !== id),
                }))
              }
              selected={selected}
              onSelect={(ids, focus) => {
                setSelected(ids);
                if (ids.size === 1 && isFolder(focus)) setPrefs({ folder: focus });
              }}
              onOpen={(id) => (isFolder(id) ? setPrefs({ folder: id }) : p.onOpenDiagram(id))}
              onContextMenu={(e: MouseEvent, id) => openContextMenu(e, menuFor(id))}
              onMove={
                canEdit
                  ? (ids, target, pos) => {
                      if (!moveItems(doc, ids, target, pos, LOCAL))
                        toast('Không thể chuyển thư mục vào chính nó', { error: true });
                      else if (target && pos === 'inside')
                        setPrefs((x) => ({ expanded: [...new Set([...x.expanded, target])] }));
                    }
                  : undefined
              }
              renamingId={renaming}
              onRequestRename={(id) => canEdit && setRenaming(id)}
              onRename={(id, name) =>
                isFolder(id) ? renameFolder(doc, id, name, LOCAL) : renameDiagram(doc, id, name, LOCAL)
              }
              onRenameEnd={() => setRenaming(null)}
              onDelete={(ids) => {
                if (!canEdit) return;
                const folders = ids.filter(isFolder);
                if (folders.length) void confirmDeleteFolder(s, folders[0]);
                else void confirmDeleteDiagrams(s, ids);
              }}
              emptyText={
                <p className="px-3 py-6 text-center text-muted">Chưa có thư mục hay sơ đồ. Chuột phải để tạo.</p>
              }
            />
          </div>
        </>
      )}
      {prefs.side === 'type' && (
        <div className="scroll px-1.5 pb-4">
          {DIAGRAM_TYPE_INFO.map((t) => {
            const list = [...diagramsMap(doc).values()]
              .filter((d) => d.type === t.type)
              .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
            return (
              <div key={t.type} className="mt-2" data-type-group={t.type}>
                <div className="flex items-center gap-2 px-2 py-1 font-semibold">
                  <DiagramIcon type={t.type} colored />
                  <span className="flex-1">{t.label}</span>
                  <span className="pill" style={{ background: 'var(--panel-2)', color: 'var(--muted)' }}>
                    {list.length}
                  </span>
                </div>
                {list.map((d) => (
                  <div
                    key={d.id}
                    className={'tree-row' + (selected.has(d.id) ? ' on' : '')}
                    style={{ paddingLeft: 28 }}
                    onClick={() => setSelected(new Set([d.id]))}
                    onDoubleClick={() => p.onOpenDiagram(d.id)}
                    onContextMenu={(e) => {
                      setSelected(new Set([d.id]));
                      openContextMenu(e, menuFor(d.id));
                    }}
                  >
                    <span className="nm">{d.name}</span>
                    <span className="ml-1 max-w-[45%] truncate text-[11px] text-muted">
                      {folderPath(doc, d.folderId)
                        .map((f) => f.name)
                        .join(' / ') || 'Gốc'}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
      {prefs.side === 'recent' && (
        <div className="scroll px-1.5 pb-4">
          {!recent.length && <p className="px-3 py-6 text-center text-muted">Chưa mở sơ đồ nào trên máy này.</p>}
          {recent.map((r) => (
            <div
              key={r.id}
              className="tree-row"
              onDoubleClick={() => p.onOpenDiagram(r.id)}
              onClick={() => p.onOpenDiagram(r.id)}
            >
              <span className="tree-twist" />
              <DiagramIcon type={r.d!.type} size={15} colored />
              <span className="nm">{r.d!.name}</span>
              <span className="text-[11px] text-muted">{timeAgo(r.at)}</span>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
