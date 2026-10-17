// Hộp duyệt thư mục kiểu "Save As" của Windows: thanh đường dẫn, cây thư mục bên trái, nội dung thư mục đang
// chọn bên phải (nhấp đúp để vào), nút Thư mục mới. Dùng cho Tạo sơ đồ mới và Chuyển sơ đồ.
import { ArrowUp, ChevronRight, Folder, FolderOpen, FolderPlus, House } from 'lucide-react';
import { useMemo, useState } from 'react';
import { childFolders, createFolder, folderDiagrams, folderPath, foldersMap } from '@umlab/core';
import { cn } from '@/lib/cn';
import { DiagramIcon } from '@/lib/icons';
import { IconButton, promptDialog, Tree, type TreeNode } from '@/ui';
import { LOCAL, type ProjectSession } from './session';

const ROOT = '__root';

export function FolderBrowser({
  session,
  version,
  value,
  onChange,
  canCreate = true,
}: {
  session: ProjectSession;
  version: number;
  value: string | null;
  onChange: (folderId: string | null) => void;
  canCreate?: boolean;
}) {
  const doc = session.doc;
  const [bump, setBump] = useState(0);
  // mở sẵn các thư mục cha của thư mục đang chọn
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set([ROOT, ...folderPath(doc, value).map((f) => f.id)]),
  );
  const nodes = useMemo<TreeNode[]>(() => {
    const build = (parent: string | null): TreeNode[] =>
      childFolders(doc, parent).map((f) => ({
        id: f.id,
        label: f.name,
        isFolder: true,
        icon: expanded.has(f.id) ? <FolderOpen size={15} /> : <Folder size={15} />,
        children: build(f.id),
      }));
    return [
      {
        id: ROOT,
        label: session.getSnapshot?.().project?.name || 'Gốc project',
        isFolder: true,
        icon: <House size={15} />,
        children: build(null),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, version, bump, expanded]);
  const path = folderPath(doc, value);
  const sub = childFolders(doc, value);
  const diagrams = folderDiagrams(doc, value);
  const go = (id: string | null) => {
    onChange(id);
    if (id) setExpanded((s) => new Set([...s, ROOT, ...folderPath(doc, id).map((f) => f.id)]));
  };
  const newFolder = async () => {
    const name = await promptDialog({
      title: 'Thư mục mới',
      label: 'Tên thư mục',
      initial: 'Thư mục mới',
      confirmLabel: 'Tạo',
    });
    if (!name?.trim()) return;
    const id = createFolder(doc, name.trim(), value, LOCAL);
    setBump((x) => x + 1);
    go(id);
  };
  return (
    <div className="fb" data-testid="folder-browser">
      <div className="fb-bar">
        <IconButton
          label="Lên một cấp"
          disabled={!value}
          onClick={() => go(foldersMap(doc).get(value ?? '')?.parentId ?? null)}
        >
          <ArrowUp />
        </IconButton>
        <nav className="fb-path" aria-label="Đường dẫn thư mục">
          <button type="button" className={cn('fb-crumb', !value && 'on')} onClick={() => go(null)}>
            <House size={13} />
            {nodes[0].label}
          </button>
          {path.map((f) => (
            <span key={f.id} className="contents">
              <ChevronRight size={13} className="text-muted" />
              <button type="button" className={cn('fb-crumb', f.id === value && 'on')} onClick={() => go(f.id)}>
                {f.name}
              </button>
            </span>
          ))}
        </nav>
        {canCreate && (
          <IconButton label="Thư mục mới" onClick={() => void newFolder()}>
            <FolderPlus />
          </IconButton>
        )}
      </div>
      <div className="fb-body">
        <div className="fb-tree">
          <Tree
            ariaLabel="Chọn thư mục"
            nodes={nodes}
            expanded={expanded}
            onToggle={(id, open) =>
              setExpanded((s) => {
                const n = new Set(s);
                if (open) n.add(id);
                else n.delete(id);
                return n;
              })
            }
            selected={new Set([value ?? ROOT])}
            onSelect={(_ids, focus) => go(focus === ROOT ? null : focus)}
          />
        </div>
        <div className="fb-list" role="listbox" aria-label="Nội dung thư mục">
          {sub.map((f) => (
            <button
              key={f.id}
              type="button"
              role="option"
              aria-selected={false}
              className="fb-item"
              title="Nhấp đúp để mở"
              onDoubleClick={() => go(f.id)}
            >
              <Folder size={15} className="text-[var(--warn)]" />
              <span className="truncate">{f.name}</span>
            </button>
          ))}
          {diagrams.map((d) => (
            <div key={d.id} className="fb-item muted" role="option" aria-selected={false}>
              <DiagramIcon type={d.type} size={15} colored />
              <span className="truncate">{d.name}</span>
            </div>
          ))}
          {!sub.length && !diagrams.length && <div className="fb-empty">Thư mục trống</div>}
        </div>
      </div>
    </div>
  );
}
