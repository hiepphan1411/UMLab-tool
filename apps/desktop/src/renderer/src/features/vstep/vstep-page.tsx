// Mục "Ôn thi VSTEP": thanh trên có tab kiểu Chrome, cột điều hướng, các trang con được giữ sống theo tab.
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Ear,
  GitFork,
  Home,
  Languages,
  Library,
  Maximize2,
  Mic,
  Minimize2,
  PenLine,
  SpellCheck,
  SquarePen,
} from 'lucide-react';
import { Component, useEffect, useMemo, type ErrorInfo, type MouseEvent, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { localDateKey } from '@umlab/core';
import { FEATURE_VSTEP, hasFeature } from '@shared/api';
import { IS_VSTEP_APP } from '@shared/app-mode';
import { cn } from '@/lib/cn';
import { Button, EmptyState, FullScreenSpinner } from '@/ui';
import { AccountMenu } from '../auth/account-menu';
import { useSession } from '../auth/session';
import { ThemeButton } from '../shell/theme-button';
import { Spacer, TopBar } from '../shell/top-bar';
import { useAnnots } from './annots';
import { SaveBadge, SpeechButton, type Area } from './common';
import { DocsHome, PdfDocView, useDocs } from './docs-view';
import { HomeView } from './home-view';
import { TabActiveContext, useFocusMode } from './layout';
import { LibraryView } from './library-view';
import { SelectionLookup } from './lookup';
import { MindmapView } from './mindmap-view';
import { PlanView } from './plan-view';
import { QuizView } from './quiz-view';
import { SkillView, allSets } from './skill-view';
import { useVstep } from './store';
import { TabBar, useTabs, type VTab } from './tabs';
import './vstep.css';
import './vstep-2.css';

const NAV: { to: string; label: string; icon: ReactNode }[] = [
  { to: '/vstep', label: 'Tổng quan', icon: <Home /> },
  { to: '/vstep/plan', label: 'Lịch học', icon: <CalendarDays /> },
  { to: '/vstep/listening', label: 'Nghe', icon: <Ear /> },
  { to: '/vstep/reading', label: 'Đọc', icon: <BookOpen /> },
  { to: '/vstep/writing', label: 'Viết', icon: <PenLine /> },
  { to: '/vstep/speaking', label: 'Nói', icon: <Mic /> },
  { to: '/vstep/grammar', label: 'Ngữ pháp', icon: <SpellCheck /> },
  { to: '/vstep/vocab', label: 'Từ vựng', icon: <Languages /> },
  { to: '/vstep/docs', label: 'Tài liệu của tôi', icon: <SquarePen /> },
  { to: '/vstep/mindmap', label: 'Sơ đồ tư duy', icon: <GitFork /> },
  { to: '/vstep/library', label: 'Kho đề', icon: <Library /> },
];

const AREAS = new Set<Area>(['listening', 'reading', 'writing', 'speaking', 'grammar', 'vocab']);

function AreaRoute() {
  const { area = '' } = useParams();
  return AREAS.has(area as Area) ? <SkillView area={area as Area} key={area} /> : <Navigate to="/vstep" replace />;
}

/** Lỗi trong một trang → hiện thông báo trong tab đó thay vì trắng cả màn hình. */
class PaneBoundary extends Component<{ children: ReactNode; resetKey: string }, { error: Error | null }> {
  override state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[vstep]', error, info.componentStack);
  }
  override componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  override render() {
    if (this.state.error)
      return (
        <EmptyState title="Trang này gặp lỗi" text={this.state.error.message}>
          <Button variant="outline" onClick={() => this.setState({ error: null })}>
            Thử lại
          </Button>
        </EmptyState>
      );
    return this.props.children;
  }
}

function PaneRoutes({ path }: { path: string }) {
  const location = useMemo(() => {
    const [pathname, search = ''] = path.split('?');
    return { pathname, search: search ? '?' + search : '', hash: '', state: null, key: path };
  }, [path]);
  return (
    <PaneBoundary resetKey={path}>
      <Routes location={location}>
        <Route index element={<HomeView />} />
        <Route path="plan" element={<PlanView />} />
        <Route path="mindmap" element={<MindmapView />} />
        <Route path="library" element={<LibraryView />} />
        <Route path="docs" element={<DocsHome />} />
        <Route path="docs/:docId" element={<PdfDocView />} />
        <Route path="quiz/:setId" element={<QuizView />} />
        <Route path=":area" element={<AreaRoute />} />
        <Route path="*" element={<Navigate to="/vstep" replace />} />
      </Routes>
    </PaneBoundary>
  );
}

export function VstepPage() {
  const user = useSession((s) => s.user);
  const nav = useNavigate();
  const loc = useLocation();
  const { state, error, load } = useVstep();
  const allowed = hasFeature(user, FEATURE_VSTEP);
  const { tabs, active } = useTabs();
  const focus = useFocusMode((s) => s.focus);
  const docs = useDocs((s) => s.docs);
  const here = loc.pathname + loc.search;

  useEffect(() => {
    if (allowed && !state) void load();
    if (allowed) {
      void useAnnots.getState().load();
      void useDocs.getState().refresh();
    }
  }, [allowed, state, load]);

  // lần đầu dùng: lịch bắt đầu từ hôm nay
  useEffect(() => {
    if (state && state.updatedAt === 0) useVstep.getState().update((s) => void (s.startDate = localDateKey()));
  }, [state]);

  // đường dẫn thật (thanh địa chỉ) ↔ tab đang mở
  useEffect(() => {
    const T = useTabs.getState();
    const cur = T.tabs.find((t) => t.id === T.active);
    if (cur?.path === here) return;
    const same = T.tabs.find((t) => t.path === here);
    if (same) T.activate(same.id);
    else if (cur) T.setPath(cur.id, here);
  }, [here]);

  // lần đầu vào /vstep từ trang project: mở lại tab đang mở lần trước
  useEffect(() => {
    const T = useTabs.getState();
    const cur = T.tabs.find((t) => t.id === T.active);
    if (cur && here === '/vstep' && cur.path !== '/vstep') nav(cur.path, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        useFocusMode.getState().toggle();
      } else if (e.ctrlKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        go(useTabs.getState().open('/vstep', { newTab: true }));
      } else if (e.ctrlKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        const T = useTabs.getState();
        const t = T.close(T.active);
        if (t) go(t);
      } else if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        const T = useTabs.getState();
        const i = T.tabs.findIndex((t) => t.id === T.active);
        const t = T.tabs[(i + (e.shiftKey ? -1 : 1) + T.tabs.length) % T.tabs.length];
        if (t) go(useTabs.getState().activate(t.id)!);
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  const go = (t: VTab) => nav(t.path);

  const names = (kind: 'set' | 'doc', id: string) =>
    kind === 'doc'
      ? docs.find((d) => d.id === id)?.name
      : state
        ? allSets(state).find((s) => s.id === id)?.title
        : undefined;

  const navClick = (e: MouseEvent, to: string) => {
    e.preventDefault();
    const newTab = e.ctrlKey || e.metaKey || e.button === 1;
    go(useTabs.getState().open(to, { newTab }));
  };

  if (!allowed)
    return (
      <EmptyState
        title="Bạn chưa có quyền dùng mục Ôn thi VSTEP"
        text="Nhờ quản trị bật quyền “Ôn thi VSTEP” cho tài khoản trong trang quản trị."
      >
        {IS_VSTEP_APP ? (
          <Button
            variant="primary"
            onClick={async () => {
              await useSession.getState().logout();
              nav('/login', { replace: true });
            }}
          >
            Đăng nhập tài khoản khác
          </Button>
        ) : (
          <Button variant="primary" onClick={() => nav('/projects')}>
            Về danh sách project
          </Button>
        )}
      </EmptyState>
    );

  const activePath = loc.pathname;

  return (
    <div className={cn('flex h-full flex-col', focus && 'vs-focus')}>
      <TopBar className="vs-topbar">
        {IS_VSTEP_APP ? (
          <span className="vs-brand">VSTEP</span>
        ) : (
          <button
            className="ibtn"
            aria-label="Về danh sách project"
            title="Về danh sách project"
            onClick={() => nav('/projects')}
          >
            <ArrowLeft size={16} />
          </button>
        )}
        <TabBar names={names} onActivate={go} onNew={() => go(useTabs.getState().open('/vstep', { newTab: true }))} />
        <Spacer />
        <SaveBadge />
        <SpeechButton />
        <button
          className="ibtn"
          aria-label={focus ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
          title={focus ? 'Thoát toàn màn hình (F11)' : 'Toàn màn hình, ẩn menu (F11)'}
          onClick={() => useFocusMode.getState().toggle()}
        >
          {focus ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
        <span className="sep" />
        <ThemeButton />
        <AccountMenu />
      </TopBar>
      <div className="vs-shell">
        <nav className="vs-nav" aria-label="Mục ôn thi">
          {NAV.map((n) => {
            const on = n.to === '/vstep' ? activePath === '/vstep' : activePath.startsWith(n.to);
            return (
              <a
                key={n.to}
                href={'#' + n.to}
                className={cn('vs-nav-item', on && 'on')}
                onClick={(e) => navClick(e, n.to)}
                onAuxClick={(e) => e.button === 1 && navClick(e, n.to)}
                title={`${n.label} (Ctrl+bấm: mở tab mới)`}
              >
                {n.icon}
                <span>{n.label}</span>
              </a>
            );
          })}
        </nav>
        <main className="vs-main">
          {error ? (
            <EmptyState title="Không tải được dữ liệu ôn thi" text={error}>
              <Button variant="outline" onClick={() => void load()}>
                Thử lại
              </Button>
            </EmptyState>
          ) : !state ? (
            <FullScreenSpinner label="Đang tải…" />
          ) : (
            tabs.map((t) => (
              <TabActiveContext.Provider key={t.id} value={t.id === active}>
                <div className="vs-tabpane" hidden={t.id !== active}>
                  <PaneRoutes path={t.id === active ? here : t.path} />
                </div>
              </TabActiveContext.Provider>
            ))
          )}
        </main>
      </div>
      {focus && (
        <button
          className="vs-focus-exit"
          onClick={() => useFocusMode.getState().toggle(false)}
          title="Thoát toàn màn hình (F11 / Esc)"
        >
          <Minimize2 size={15} /> Thoát toàn màn hình
        </button>
      )}
      <SelectionLookup />
    </div>
  );
}
