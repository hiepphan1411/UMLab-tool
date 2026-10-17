import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpDown,
  Copy,
  FileJson,
  FolderInput,
  FolderOpen,
  LayoutGrid,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Share2,
  Trash2,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DIAGRAM_TYPE_INFO, ImportError, type DiagramType } from '@umlab/core';
import type { ProjectSummary } from '@shared/api';
import { call, errorText, umlab } from '@/lib/api';
import { cn } from '@/lib/cn';
import { dateTime, timeAgo } from '@/lib/format';
import { DiagramIcon, projectIcon } from '@/lib/icons';
import {
  Avatar,
  Button,
  EmptyState,
  FullScreenSpinner,
  IconButton,
  Logo,
  Segmented,
  confirmDialog,
  openContextMenu,
  openMenuAt,
  promptDialog,
  toast,
  useTooltip,
  type MenuEntry,
} from '@/ui';
import { AccountMenu } from '../auth/account-menu';
import { ConnectionBadge } from '../shell/connection-badge';
import { ThemeButton } from '../shell/theme-button';
import { Spacer, TopBar } from '../shell/top-bar';
import { createProject, duplicateProject, exportProject, importProjectFromFile } from './actions';
import { ProjectDialog } from './project-dialog';
import { ShareDialog } from './share-dialog';

type Sort = 'updated' | 'name';
type ViewMode = 'grid' | 'list';
const PREF = 'umlab.projects.view';

function readPref(): { sort: Sort; view: ViewMode } {
  try {
    const v = JSON.parse(localStorage.getItem(PREF) || '{}');
    return { sort: v.sort === 'name' ? 'name' : 'updated', view: v.view === 'list' ? 'list' : 'grid' };
  } catch {
    return { sort: 'updated', view: 'grid' };
  }
}

export function useProjects() {
  const qc = useQueryClient();
  useEffect(() => umlab.projects.onChanged(() => void qc.invalidateQueries({ queryKey: ['projects'] })), [qc]);
  return useQuery({ queryKey: ['projects'], queryFn: () => call(umlab.projects.list()) });
}

/** Ô icon project: nền chuyển sắc theo màu project, icon trắng, viền sáng mảnh + bóng cùng tông. */
function ProjectBadge({ p, size }: { p: ProjectSummary; size: number }) {
  const Icon = projectIcon(p.icon);
  return (
    <span
      className="project-badge"
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.28), ['--pc' as string]: p.color }}
    >
      <Icon size={Math.round(size * 0.48)} strokeWidth={2} />
    </span>
  );
}

/** Thống kê sơ đồ theo loại: mỗi loại một ô (icon + tên + số), tổng ở đầu. */
function TypeStats({ p, compact }: { p: ProjectSummary; compact?: boolean }) {
  const entries = DIAGRAM_TYPE_INFO.filter((t) => p.stats.diagramCountByType?.[t.type]);
  if (!entries.length) return compact ? <span className="text-muted">Chưa có sơ đồ</span> : null;
  return (
    <div className="type-stats" data-compact={compact || undefined}>
      {entries.map((t) => (
        <TypeChip key={t.type} type={t.type} label={t.short} n={p.stats.diagramCountByType[t.type]} compact={compact} />
      ))}
    </div>
  );
}

function TypeChip({ type, label, n, compact }: { type: DiagramType; label: string; n: number; compact?: boolean }) {
  const tip = useTooltip(compact ? `${n} ${label}` : '');
  return (
    <span className="type-stat" data-type={type} {...(compact ? tip : {})}>
      <DiagramIcon type={type} size={14} colored />
      {!compact && <span className="type-stat-label">{label}</span>}
      <b className="pill">{n}</b>
    </span>
  );
}

function Members({ p }: { p: ProjectSummary }) {
  if (p.members.length < 2) return null;
  return (
    <span className="flex items-center" title={p.members.map((m) => m.name).join(', ')}>
      {p.members.slice(0, 4).map((m, i) => (
        <span key={m.userId} style={{ marginLeft: i ? -6 : 0 }}>
          <Avatar name={m.name} color={m.color} size={20} ring="var(--panel)" />
        </span>
      ))}
      {p.members.length > 4 && <span className="ml-1 text-muted">+{p.members.length - 4}</span>}
    </span>
  );
}

export function ProjectsPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useProjects();
  const [q, setQ] = useState('');
  const [pref, setPref] = useState(readPref);
  const [dialog, setDialog] = useState<{ mode: 'create' } | { mode: 'edit'; p: ProjectSummary } | null>(null);
  const [share, setShare] = useState<ProjectSummary | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(PREF, JSON.stringify(pref));
    } catch {}
  }, [pref]);

  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    const arr = (data ?? []).filter(
      (p) => !k || p.name.toLowerCase().includes(k) || p.description.toLowerCase().includes(k),
    );
    return pref.sort === 'name' ? [...arr].sort((a, b) => a.name.localeCompare(b.name, 'vi')) : arr;
  }, [data, q, pref.sort]);

  const refresh = () => void qc.invalidateQueries({ queryKey: ['projects'] });

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      if (e instanceof ImportError) toast([e.message, ...e.details].join(' · '), { error: true, ms: 8000 });
      else toast(label + ': ' + errorText(e), { error: true });
    } finally {
      setBusy(false);
    }
  };

  const doImport = () =>
    run('Không nhập được', async () => {
      const p = await importProjectFromFile();
      if (!p) return;
      refresh();
      toast(`Đã nhập project “${p.name}”`);
      nav(`/p/${p.id}`);
    });

  const menu = (p: ProjectSummary): MenuEntry[] => [
    { label: 'Mở', icon: <FolderOpen />, onSelect: () => nav(`/p/${p.id}`) },
    {
      label: 'Đổi tên',
      icon: <Pencil />,
      disabled: p.role === 'viewer',
      onSelect: async () => {
        const name = await promptDialog({ title: 'Đổi tên project', label: 'Tên mới', initial: p.name });
        if (name && name !== p.name)
          await run('Không đổi tên được', async () => (await call(umlab.projects.update(p.id, { name })), refresh()));
      },
    },
    {
      label: 'Sửa thông tin',
      icon: <Pencil />,
      disabled: p.role === 'viewer',
      onSelect: () => setDialog({ mode: 'edit', p }),
    },
    { label: 'Chia sẻ', icon: <Share2 />, onSelect: () => setShare(p) },
    {
      label: 'Nhân bản',
      icon: <Copy />,
      onSelect: () =>
        run('Không nhân bản được', async () => {
          const np = await duplicateProject(p);
          refresh();
          toast(`Đã tạo “${np.name}”`);
        }),
    },
    {
      label: 'Xuất JSON',
      icon: <FileJson />,
      onSelect: () =>
        run('Không xuất được', async () => {
          const path = await exportProject(p);
          if (path) toast('Đã lưu ' + path.split(/[\\/]/).pop());
        }),
    },
    { type: 'sep' },
    {
      label: 'Xoá',
      icon: <Trash2 />,
      danger: true,
      disabled: p.role !== 'owner',
      onSelect: async () => {
        const ok = await confirmDialog({
          title: 'Xoá project?',
          text: (
            <>
              Toàn bộ thư mục, sơ đồ và lịch sử của <b>{p.name}</b> sẽ bị xoá vĩnh viễn với mọi thành viên. Không hoàn
              tác được.
            </>
          ),
          confirmLabel: 'Xoá vĩnh viễn',
          danger: true,
          requireText: p.name,
        });
        if (ok)
          await run(
            'Không xoá được',
            async () => (await call(umlab.projects.remove(p.id)), refresh(), toast('Đã xoá project')),
          );
      },
    },
  ];

  const sortTip = useTooltip('Sắp xếp');

  return (
    <div className="flex h-full flex-col">
      <TopBar>
        <Logo height={26} />
        <div className="relative ml-4 w-[min(380px,40vw)]">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted" />
          <input
            className="field"
            style={{ paddingLeft: 30, height: 32 }}
            placeholder="Tìm project…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Tìm project"
          />
        </div>
        <Spacer />
        <Button variant="outline" icon={<FolderInput />} onClick={doImport} disabled={busy}>
          Nhập project
        </Button>
        <Button variant="primary" icon={<Plus />} onClick={() => setDialog({ mode: 'create' })}>
          Tạo project
        </Button>
        <span className="sep" />
        <ConnectionBadge compact />
        <ThemeButton />
        <AccountMenu />
      </TopBar>

      <main className="scroll">
        <div className="mx-auto w-full max-w-[1280px] px-6 py-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h1 className="text-[19px] font-semibold tracking-tight">Project của bạn</h1>
            {data && <span className="text-muted">{data.length} project</span>}
            <Spacer />
            <button
              className="btn outline sm"
              {...sortTip}
              onClick={(e) =>
                openMenuAt(
                  e.currentTarget,
                  [
                    {
                      label: 'Mới cập nhật',
                      checked: pref.sort === 'updated',
                      onSelect: () => setPref({ ...pref, sort: 'updated' }),
                    },
                    {
                      label: 'Tên A–Z',
                      checked: pref.sort === 'name',
                      onSelect: () => setPref({ ...pref, sort: 'name' }),
                    },
                  ],
                  'end',
                )
              }
            >
              <ArrowUpDown />
              {pref.sort === 'name' ? 'Tên A–Z' : 'Mới cập nhật'}
            </button>
            <Segmented
              value={pref.view}
              onChange={(view) => setPref({ ...pref, view })}
              ariaLabel="Chế độ xem"
              options={[
                { value: 'grid', label: <LayoutGrid />, title: 'Lưới' },
                { value: 'list', label: <List />, title: 'Danh sách' },
              ]}
            />
          </div>

          {isLoading ? (
            <FullScreenSpinner label="Đang tải project…" />
          ) : error ? (
            <EmptyState title="Không tải được danh sách project" text={errorText(error)}>
              <Button variant="outline" onClick={() => void refetch()}>
                Thử lại
              </Button>
            </EmptyState>
          ) : !data?.length ? (
            <div className="card">
              <EmptyState
                icon={<Logo variant="icon" height={72} />}
                title="Chưa có project nào"
                text="Project gom các sơ đồ Use Case, đặc tả, Activity, Sequence, Class, ERD, kiến trúc và Gantt của một hệ thống."
              >
                <Button variant="primary" size="lg" icon={<Plus />} onClick={() => setDialog({ mode: 'create' })}>
                  Tạo project đầu tiên
                </Button>
                <Button variant="outline" size="lg" icon={<FolderInput />} onClick={doImport}>
                  Hoặc nhập từ tệp JSON
                </Button>
              </EmptyState>
            </div>
          ) : !list.length ? (
            <EmptyState title="Không có project khớp" text={`Không tìm thấy project nào chứa “${q}”.`} />
          ) : pref.view === 'grid' ? (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))' }}>
              {list.map((p) => {
                return (
                  <div
                    key={p.id}
                    role="link"
                    tabIndex={0}
                    data-project={p.name}
                    className="card group flex cursor-pointer flex-col gap-3 p-4 transition-colors hover:border-[var(--accent)]"
                    onClick={() => nav(`/p/${p.id}`)}
                    onKeyDown={(e) => e.key === 'Enter' && nav(`/p/${p.id}`)}
                    onContextMenu={(e) => openContextMenu(e, menu(p))}
                  >
                    <div className="flex items-start gap-3">
                      <ProjectBadge p={p} size={42} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-semibold">{p.name}</div>
                        <div className="mt-0.5 text-[11.5px] text-muted" title={dateTime(p.updatedAt)}>
                          Cập nhật {timeAgo(p.updatedAt)}
                          {p.role !== 'owner' && ` · ${p.role === 'editor' ? 'được chia sẻ' : 'chỉ xem'}`}
                          {p.local?.pendingCreate && (
                            <span
                              className="ml-1 font-medium"
                              style={{ color: 'var(--warn)' }}
                              title="Tạo khi mất mạng — sẽ tự đồng bộ lên MongoDB"
                            >
                              · chưa đồng bộ
                            </span>
                          )}
                        </div>
                      </div>
                      <IconButton
                        label="Tuỳ chọn"
                        size="sm"
                        className="opacity-60 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          openMenuAt(e.currentTarget, menu(p), 'end');
                        }}
                      >
                        <MoreHorizontal />
                      </IconButton>
                    </div>
                    <p className="line-clamp-2 min-h-[2.9em] text-muted" style={{ lineHeight: 1.45 }}>
                      {p.description || 'Không có mô tả'}
                    </p>
                    <div className="mt-auto grid gap-2 border-t border-line pt-3">
                      <div className="flex items-center gap-2 text-[11.5px] text-muted">
                        <span className="font-medium">
                          {p.stats.diagramCount ? `${p.stats.diagramCount} sơ đồ` : 'Chưa có sơ đồ'}
                        </span>
                        <Spacer />
                        <Members p={p} />
                      </div>
                      <TypeStats p={p} />
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
                    <th className="px-2 py-2 font-semibold">Sơ đồ</th>
                    <th className="px-2 py-2 font-semibold">Thành viên</th>
                    <th className="px-2 py-2 font-semibold">Cập nhật</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => {
                    return (
                      <tr
                        key={p.id}
                        data-project={p.name}
                        className={cn('cursor-pointer border-t border-line hover:bg-[var(--panel-2)]')}
                        onClick={() => nav(`/p/${p.id}`)}
                        onContextMenu={(e) => openContextMenu(e, menu(p))}
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <ProjectBadge p={p} size={30} />
                            <div className="min-w-0">
                              <div className="truncate font-semibold">{p.name}</div>
                              <div className="truncate text-muted">{p.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2">
                          <TypeStats p={p} compact />
                        </td>
                        <td className="px-2">
                          <span className="flex items-center gap-1.5 text-muted">
                            <Users size={14} />
                            {p.members.length}
                          </span>
                        </td>
                        <td className="px-2 whitespace-nowrap text-muted" title={dateTime(p.updatedAt)}>
                          {timeAgo(p.updatedAt)}
                        </td>
                        <td className="pr-2">
                          <IconButton
                            label="Tuỳ chọn"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openMenuAt(e.currentTarget, menu(p), 'end');
                            }}
                          >
                            <MoreHorizontal />
                          </IconButton>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <ProjectDialog
        open={!!dialog}
        onClose={() => setDialog(null)}
        initial={dialog?.mode === 'edit' ? dialog.p : null}
        onSubmit={async (f) => {
          if (dialog?.mode === 'edit') {
            await call(
              umlab.projects.update(dialog.p.id, {
                name: f.name,
                description: f.description,
                color: f.color,
                icon: f.icon,
              }),
            );
            refresh();
            setDialog(null);
            toast('Đã lưu thông tin project');
          } else {
            const p = await createProject(f);
            refresh();
            setDialog(null);
            nav(`/p/${p.id}`);
          }
        }}
      />
      {share && <ShareDialog project={share} onClose={() => setShare(null)} onChanged={() => refresh()} />}
    </div>
  );
}
