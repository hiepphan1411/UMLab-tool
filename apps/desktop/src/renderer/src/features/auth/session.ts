import { create } from 'zustand';
import type { PublicUser } from '@shared/api';
import { umlab } from '@/lib/api';

interface SessionState {
  user: PublicUser | null;
  /** Đã hỏi main process xong phiên hiện tại chưa. */
  ready: boolean;
  /** Lý do bị đăng xuất từ xa (đổi mật khẩu ở máy khác…). */
  endedReason: string | null;
  refresh(): Promise<PublicUser | null>;
  setUser(u: PublicUser | null): void;
  logout(): Promise<void>;
  init(): () => void;
}

export const useSession = create<SessionState>((set, get) => ({
  user: null,
  ready: false,
  endedReason: null,
  async refresh() {
    const user = umlab ? await umlab.auth.session() : null;
    set({ user, ready: true });
    return user;
  },
  setUser(user) {
    set({ user, endedReason: null });
  },
  async logout() {
    await umlab.auth.logout();
    set({ user: null });
  },
  init() {
    void get().refresh();
    if (!umlab) return () => {};
    const off1 = umlab.auth.onSessionEnded((reason) => set({ user: null, endedReason: reason }));
    // Mạng có lại → hỏi lại phiên (lần mở app đầu tiên có thể đang offline).
    const off2 = umlab.conn.onStatus((s) => {
      if (s.state === 'online' && !get().user) void get().refresh();
    });
    return () => {
      off1();
      off2();
    };
  },
}));
