import {
  ChevronRight,
  Copy,
  FileJson,
  FileUp,
  FolderOpen,
  Grid3x3,
  Pencil,
  Search,
  Share2,
  Trash2,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  diagramsMap,
  duplicateDiagram,
  folderPath,
  renameDiagram,
  type DiagramMeta,
  type DiagramType,
} from '@umlab/core';
import { DiagramIcon, projectIcon } from '@/lib/icons';
import { Button, EmptyState, FullScreenSpinner, Logo, openMenuAt, promptDialog, type MenuEntry } from '@/ui';
import { AccountMenu } from '../auth/account-menu';
import { useSession } from '../auth/session';
import { ShareDialog } from '../projects/share-dialog';
import { ConnectionBadge } from '../shell/connection-badge';
import { ThemeButton } from '../shell/theme-button';
import { Spacer, TopBar } from '../shell/top-bar';
import { DashboardMain } from './dashboard-main';
import { confirmDeleteDiagrams, exportDiagrams, importIntoProject } from './diagram-actions';
import { NewDiagramDialog } from './dialogs';
import { PresenceAvatars } from './presence';
import { SearchDialog, useSearchShortcut } from './search-dialog';
import { LOCAL, useProjectSession, useSessionState, useYVersion, type ProjectSession } from './session';
import { ProjectSidebar } from './sidebar';
import { TraceMatrix } from './trace-matrix';
import { useWorkspacePrefs } from './ui-state';
import '../editors/register-all';

export function ProjectError({ error, code }: { error: string; code?: string }) {
  return (
    <div className="flex h-full flex-col">
      <TopBar>
        <Link to="/projects" className="no-drag">
          <Logo height={26} />
        </Link>
        <Spacer />
        <ThemeButton />
        <AccountMenu />
      </TopBar>
      <EmptyState
        title={
          code === 'FORBIDDEN'
            ? 'Bạn không có quyền mở project này'
            : code === 'NOT_FOUND'
              ? 'Project không tồn tại'
              : 'Không mở được project'
        }
        text={error}
      >
        <Link to="/projects" className="btn primary">
          Về trang chủ
        </Link>
      </EmptyState>
    </div>
  );
}

export function WorkspacePage() {
  const { projectId } = useParams();
  const { session, error, code } = useProjectSession(projectId);
  if (error) return <ProjectError error={error} code={code} />;
  if (!session) return <FullScreenSpinner label="Đang mở project…" />;
  return <Workspace session={session} />;
}

/** Ô tìm sơ đồ trên thanh trên: gõ để lọc, Enter/bấm để mở. */
function DiagramSearch({
  session,
  version,
  onOpen,
}: {
  session: ProjectSession;
  version: number;
  onOpen: (id: string) => void;
}) {
  const [q, setQ] = useState('');
  const results = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return [];
    return [...diagramsMap(session.doc).values()].filter((d) => d.name.toLowerCase().includes(k)).slice(0, 8);
  }, [q, session, version]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="no-drag relative w-[min(320px,30vw)]">
      <Search size={15} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted" />
      <input
        className="field"
        style={{ paddingLeft: 30, height: 32 }}
        placeholder="Tìm sơ đồ…"
        aria-label="Tìm sơ đồ"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && results[0]) onOpen(results[0].id);
          if (e.key === 'Escape') setQ('');
        }}
      />
      {results.length > 0 && (
        <div className="menu" style={{ position: 'absolute', top: 36, left: 0, right: 0, maxWidth: 'none' }}>
          {results.map((d) => (
            <button
              key={d.id}
              className="menu-item"
              onMouseDown={(e) => {
                e.preventDefault();
                onOpen(d.id);
              }}
            >
              <DiagramIcon type={d.type} colored />
              <span className="truncate">{d.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Workspace({ session: s }: { session: ProjectSession }) {
  const nav = useNavigate();
  const user = useSession((x) => x.user);
  const { project, peers } = useSessionState(s);
  const version = useYVersion(
    s.doc,
    (n) => n === 'folders' || n === 'diagrams' || n.startsWith('views:') || n.startsWith('conns:'),
  );
  const [prefs, setPrefs] = useWorkspacePrefs(s.projectId);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newDiagram, setNewDiagram] = useState<{ type: DiagramType; folder: string | null } | null>(null);
  const [share, setShare] = useState(false);
  const [page, setPage] = useState<'home' | 'trace'>('home');
  const [search, setSearch] = useState(false);
  useSearchShortcut(useCallback(() => setSearch(true), []));
  const Icon = projectIcon(project.icon);

  const open = (id: string) => nav(`/p/${s.projectId}/d/${id}`);

  const menuFor = (d: DiagramMeta): MenuEntry[] => {
    const ids =
      selected.has(d.id) && selected.size > 1 ? [...selected].filter((x) => diagramsMap(s.doc).has(x)) : [d.id];
    return [
      { label: 'Mở', icon: <FolderOpen />, onSelect: () => open(d.id) },
      {
        label: 'Đổi tên',
        icon: <Pencil />,
        disabled: !s.canEdit,
        onSelect: async () => {
          const name = await promptDialog({ title: 'Đổi tên sơ đồ', label: 'Tên mới', initial: d.name });
          if (name) renameDiagram(s.doc, d.id, name, LOCAL);
        },
      },
      { label: 'Nhân bản', icon: <Copy />, disabled: !s.canEdit, onSelect: () => duplicateDiagram(s.doc, d.id, LOCAL) },
      {
        label: ids.length > 1 ? `Xuất JSON (${ids.length})` : 'Xuất JSON',
        icon: <FileJson />,
        onSelect: () => void exportDiagrams(s, ids),
      },
      { type: 'sep' },
      {
        label: ids.length > 1 ? `Xoá ${ids.length} sơ đồ` : 'Xoá',
        icon: <Trash2 />,
        danger: true,
        disabled: !s.canEdit,
        onSelect: () => void confirmDeleteDiagrams(s, ids),
      },
    ];
  };

  return (
    <div className="flex h-full flex-col">
      <TopBar>
        <Link to="/projects" className="no-drag" aria-label="Về trang chủ">
          <Logo variant="icon" height={26} />
        </Link>
        <nav className="flex min-w-0 items-center gap-1.5 font-medium" aria-label="Đường dẫn">
          <Link to="/projects" className="no-drag text-muted hover:text-ink">
            Projects
          </Link>
          <ChevronRight size={14} className="text-muted" />
          <span
            className="grid h-5 w-5 flex-none place-items-center rounded text-white"
            style={{ background: project.color }}
          >
            <Icon size={12} />
          </span>
          <button
            className="no-drag max-w-[260px] truncate font-semibold"
            onClick={(e) =>
              openMenuAt(e.currentTarget, [{ label: 'Chia sẻ', icon: <Share2 />, onSelect: () => setShare(true) }])
            }
          >
            {project.name}
          </button>
          {project.role === 'viewer' && (
            <span className="pill" style={{ background: 'var(--panel-2)', color: 'var(--muted)' }}>
              Chỉ xem
            </span>
          )}
        </nav>
        <Spacer />
        <DiagramSearch session={s} version={version} onOpen={open} />
        <Button
          variant="outline"
          icon={<Search />}
          onClick={() => setSearch(true)}
          title="Tìm trong cả project (Ctrl+K)"
        >
          Ctrl+K
        </Button>
        <Button
          variant={page === 'trace' ? 'primary' : 'outline'}
          icon={<Grid3x3 />}
          onClick={() => setPage(page === 'trace' ? 'home' : 'trace')}
        >
          Truy vết
        </Button>
        <PresenceAvatars session={s} peers={peers} />
        {s.canEdit && (
          <Button
            variant="outline"
            icon={<FileUp />}
            onClick={() => void importIntoProject(s, prefs.folder).then((id) => id && setSelected(new Set([id])))}
          >
            Nhập JSON
          </Button>
        )}
        <Button variant="outline" icon={<Share2 />} onClick={() => setShare(true)}>
          Chia sẻ
        </Button>
        <span className="sep" />
        <ConnectionBadge compact />
        <ThemeButton />
        <AccountMenu />
      </TopBar>
      <div className="flex min-h-0 flex-1">
        <ProjectSidebar
          session={s}
          version={version}
          prefs={prefs}
          setPrefs={setPrefs}
          selected={selected}
          setSelected={setSelected}
          peers={peers}
          userId={user?.id ?? ''}
          onOpenDiagram={open}
          onNewDiagram={(type, folder) => setNewDiagram({ type, folder })}
        />
        <div
          className="w-1 flex-none cursor-col-resize hover:bg-[var(--accent-soft)]"
          role="separator"
          aria-label="Đổi độ rộng cột trái"
          onPointerDown={(e) => {
            const start = e.clientX;
            const w0 = prefs.sideWidth;
            const move = (ev: PointerEvent) =>
              setPrefs({ sideWidth: Math.max(200, Math.min(520, w0 + ev.clientX - start)) });
            const up = () => {
              window.removeEventListener('pointermove', move);
              window.removeEventListener('pointerup', up);
            };
            window.addEventListener('pointermove', move);
            window.addEventListener('pointerup', up);
          }}
        />
        {page === 'trace' ? (
          <TraceMatrix session={s} version={version} onOpen={open} onClose={() => setPage('home')} />
        ) : (
          <DashboardMain
            session={s}
            version={version}
            prefs={prefs}
            setPrefs={setPrefs}
            selected={selected}
            setSelected={setSelected}
            peers={peers}
            onOpenDiagram={open}
            onNewDiagram={(type, folder) => setNewDiagram({ type, folder })}
            menuFor={menuFor}
          />
        )}
      </div>
      <NewDiagramDialog
        session={s}
        type={newDiagram?.type ?? null}
        folderId={newDiagram?.folder ?? null}
        version={version}
        onClose={() => setNewDiagram(null)}
        onCreated={(id) => {
          setNewDiagram(null);
          // mở sẵn đường dẫn thư mục chứa sơ đồ mới để khi quay lại thấy ngay trong cây
          const ids = folderPath(s.doc, diagramsMap(s.doc).get(id)?.folderId ?? null).map((f) => f.id);
          if (ids.length) setPrefs((x) => ({ expanded: [...new Set([...x.expanded, ...ids])] }));
          open(id);
        }}
      />
      {share && <ShareDialog project={project} onClose={() => setShare(false)} onChanged={() => {}} />}
      {search && <SearchDialog session={s} onClose={() => setSearch(false)} />}
    </div>
  );
}
