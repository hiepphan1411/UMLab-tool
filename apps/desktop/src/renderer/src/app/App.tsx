import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { LoginPage } from '@/features/auth/login-page';
import { RegisterPage } from '@/features/auth/register-page';
import { useSession } from '@/features/auth/session';
import { ProjectsPage } from '@/features/projects/projects-page';
import { WorkspacePage } from '@/features/workspace/workspace-page';
import { EditorPage } from '@/features/workspace/editor-page';
import { useConn } from '@/lib/conn';
import { UiKitPage } from '@/pages/ui-kit-page';
import { HelpPage, useHelpShortcut } from '@/pages/help-page';
import { DialogHost, FullScreenSpinner, MenuHost, ToastHost, TooltipHost } from '@/ui';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 10_000 } },
});

/** Chưa đăng nhập → /login?next=… */
function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useSession();
  const loc = useLocation();
  if (!ready) return <FullScreenSpinner label="Đang mở UMLab…" />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  return <>{children}</>;
}

function Boot() {
  useHelpShortcut();
  useEffect(() => {
    const a = useConn.getState().init();
    const b = useSession.getState().init();
    return () => {
      a();
      b();
    };
  }, []);
  return null;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <Boot />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/help" element={<HelpPage />} />
          {import.meta.env.DEV && <Route path="/_ui" element={<UiKitPage />} />}
          <Route
            path="/projects"
            element={
              <RequireAuth>
                <ProjectsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/p/:projectId"
            element={
              <RequireAuth>
                <WorkspacePage />
              </RequireAuth>
            }
          />
          <Route
            path="/p/:projectId/d/:diagramId"
            element={
              <RequireAuth>
                <EditorPage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/projects" replace />} />
        </Routes>
        <DialogHost />
        <MenuHost />
        <ToastHost />
        <TooltipHost />
      </HashRouter>
    </QueryClientProvider>
  );
}
