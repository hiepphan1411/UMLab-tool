// Mục "Ôn thi VSTEP": khung trang (thanh trên + cột điều hướng) và các trang con.
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Ear,
  GitFork,
  Home,
  Languages,
  Library,
  Mic,
  PenLine,
  SpellCheck,
} from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { NavLink, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { localDateKey } from '@umlab/core';
import { FEATURE_VSTEP, hasFeature } from '@shared/api';
import { Button, EmptyState, FullScreenSpinner } from '@/ui';
import { AccountMenu } from '../auth/account-menu';
import { useSession } from '../auth/session';
import { ThemeButton } from '../shell/theme-button';
import { Spacer, TopBar } from '../shell/top-bar';
import { SaveBadge, SpeechButton, type Area } from './common';
import { HomeView } from './home-view';
import { LibraryView } from './library-view';
import { MindmapView } from './mindmap-view';
import { PlanView } from './plan-view';
import { QuizView } from './quiz-view';
import { SkillView } from './skill-view';
import { useVstep } from './store';
import './vstep.css';

const NAV: { to: string; label: string; icon: ReactNode; end?: boolean }[] = [
  { to: '/vstep', label: 'Tổng quan', icon: <Home />, end: true },
  { to: '/vstep/plan', label: 'Lịch học', icon: <CalendarDays /> },
  { to: '/vstep/listening', label: 'Nghe', icon: <Ear /> },
  { to: '/vstep/reading', label: 'Đọc', icon: <BookOpen /> },
  { to: '/vstep/writing', label: 'Viết', icon: <PenLine /> },
  { to: '/vstep/speaking', label: 'Nói', icon: <Mic /> },
  { to: '/vstep/grammar', label: 'Ngữ pháp', icon: <SpellCheck /> },
  { to: '/vstep/vocab', label: 'Từ vựng', icon: <Languages /> },
  { to: '/vstep/mindmap', label: 'Sơ đồ tư duy', icon: <GitFork /> },
  { to: '/vstep/library', label: 'Kho đề', icon: <Library /> },
];

const AREAS = new Set<Area>(['listening', 'reading', 'writing', 'speaking', 'grammar', 'vocab']);

function AreaRoute() {
  const { area = '' } = useParams();
  return AREAS.has(area as Area) ? <SkillView area={area as Area} key={area} /> : <Navigate to="/vstep" replace />;
}

export function VstepPage() {
  const user = useSession((s) => s.user);
  const nav = useNavigate();
  const { state, error, load } = useVstep();
  const allowed = hasFeature(user, FEATURE_VSTEP);

  useEffect(() => {
    if (allowed && !state) void load();
  }, [allowed, state, load]);

  // lần đầu dùng: lịch bắt đầu từ hôm nay
  useEffect(() => {
    if (state && state.updatedAt === 0) useVstep.getState().update((s) => void (s.startDate = localDateKey()));
  }, [state]);

  if (!allowed)
    return (
      <EmptyState
        title="Bạn chưa có quyền dùng mục Ôn thi VSTEP"
        text="Nhờ quản trị bật quyền “Ôn thi VSTEP” cho tài khoản trong trang quản trị."
      >
        <Button variant="primary" onClick={() => nav('/projects')}>
          Về danh sách project
        </Button>
      </EmptyState>
    );

  return (
    <div className="flex h-full flex-col">
      <TopBar>
        <button
          className="ibtn"
          aria-label="Về danh sách project"
          title="Về danh sách project"
          onClick={() => nav('/projects')}
        >
          <ArrowLeft size={16} />
        </button>
        <span className="vs-brand">Ôn thi VSTEP</span>
        <SaveBadge />
        <Spacer />
        <SpeechButton />
        <span className="sep" />
        <ThemeButton />
        <AccountMenu />
      </TopBar>
      <div className="vs-shell">
        <nav className="vs-nav" aria-label="Mục ôn thi">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => 'vs-nav-item' + (isActive ? ' on' : '')}
            >
              {n.icon}
              <span>{n.label}</span>
            </NavLink>
          ))}
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
            <Routes>
              <Route index element={<HomeView />} />
              <Route path="plan" element={<PlanView />} />
              <Route path="mindmap" element={<MindmapView />} />
              <Route path="library" element={<LibraryView />} />
              <Route path="quiz/:setId" element={<QuizView />} />
              <Route path=":area" element={<AreaRoute />} />
              <Route path="*" element={<Navigate to="/vstep" replace />} />
            </Routes>
          )}
        </main>
      </div>
    </div>
  );
}
