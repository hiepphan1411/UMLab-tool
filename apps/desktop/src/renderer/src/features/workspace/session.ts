import { useEffect, useState, useSyncExternalStore } from 'react';
import * as Y from 'yjs';
import { computeStats, diagramsMap } from '@umlab/core';
import type { Peer, PresenceState, ProjectSummary } from '@shared/api';
import { call, umlab } from '@/lib/api';

/** Origin của bản cập nhật đến từ máy khác (không gửi lại, không đưa vào undo). */
export const REMOTE = Symbol('remote');
/** Origin mặc định cho thao tác của chính người dùng (UndoManager theo dõi origin này). */
export const LOCAL = 'local';

export type SaveState = 'saved' | 'saving' | 'pending' | 'error';

interface SessionSnapshot {
  save: SaveState;
  lastSavedAt: number | null;
  error: string | null;
  peers: Peer[];
  project: ProjectSummary;
}

const FLUSH_MS = 250;
const STATS_MS = 2500;

/**
 * Một project đang mở: Y.Doc + đồng bộ với main process (MongoDB) + presence.
 * Dùng chung giữa dashboard và editor của cùng project (đếm tham chiếu), đóng khi rời project.
 */
export class ProjectSession {
  readonly doc = new Y.Doc();
  private snap: SessionSnapshot;
  private listeners = new Set<() => void>();
  private queue: Uint8Array[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private statsTimer: ReturnType<typeof setTimeout> | null = null;
  private inflight = 0;
  private offs: (() => void)[] = [];
  private presenceState: PresenceState = { diagramId: null, cursor: null, selection: [], dragging: null };
  private presenceTimer: ReturnType<typeof setTimeout> | null = null;
  refs = 0;
  closeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    readonly projectId: string,
    project: ProjectSummary,
    readonly clientId: string,
    updates: Uint8Array[],
  ) {
    this.snap = { save: 'saved', lastSavedAt: null, error: null, peers: [], project };
    this.doc.transact(() => {
      for (const u of updates) Y.applyUpdate(this.doc, u);
    }, REMOTE);
    this.doc.on('update', this.onLocalUpdate);
    this.offs.push(
      umlab.sync.onUpdate((pid, u) => {
        if (pid === projectId) Y.applyUpdate(this.doc, u, REMOTE);
      }),
      umlab.sync.onResync((pid, list) => {
        if (pid !== projectId) return;
        this.doc.transact(() => list.forEach((u) => Y.applyUpdate(this.doc, u)), REMOTE);
        // gửi lại những gì máy này có mà DB chưa có (sau khi mất kết nối lâu)
        this.queue.push(Y.encodeStateAsUpdate(this.doc));
        this.scheduleFlush();
      }),
      umlab.presence.onPeers((pid, peers) => {
        if (pid === projectId) this.set({ peers });
      }),
      umlab.projects.onChanged(() => {
        void umlab.projects.get(projectId).then((r) => {
          if (r.ok) this.set({ project: r.data });
        });
      }),
    );
    diagramsMap(this.doc).observe(() => this.scheduleStats());
    window.addEventListener('beforeunload', this.flushNow);
  }

  get canEdit(): boolean {
    return this.snap.project.role !== 'viewer';
  }

  // ---------- trạng thái cho React ----------
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getSnapshot = () => this.snap;
  private set(patch: Partial<SessionSnapshot>) {
    this.snap = { ...this.snap, ...patch };
    this.listeners.forEach((l) => l());
  }

  // ---------- gửi cập nhật ----------
  private onLocalUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === REMOTE) return;
    if (!this.canEdit) return;
    this.queue.push(update);
    this.set({ save: 'pending' });
    this.scheduleFlush();
  };

  private scheduleFlush() {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => void this.flush(), FLUSH_MS);
  }

  private flushNow = () => {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = null;
    void this.flush();
  };

  private async flush(): Promise<void> {
    this.flushTimer = null;
    if (!this.queue.length) return;
    const batch = this.queue.length === 1 ? this.queue[0] : Y.mergeUpdates(this.queue);
    this.queue = [];
    this.inflight++;
    this.set({ save: 'saving' });
    try {
      await call(umlab.sync.push(this.projectId, batch));
      this.inflight--;
      if (!this.inflight && !this.queue.length) this.set({ save: 'saved', lastSavedAt: Date.now(), error: null });
    } catch (e) {
      this.inflight--;
      const msg = e instanceof Error ? e.message : String(e);
      this.set({ save: 'error', error: msg });
    }
  }

  private scheduleStats() {
    if (!this.canEdit) return;
    if (this.statsTimer) clearTimeout(this.statsTimer);
    this.statsTimer = setTimeout(() => void umlab.projects.setStats(this.projectId, computeStats(this.doc)), STATS_MS);
  }

  // ---------- presence ----------
  setPresence(patch: Partial<PresenceState>): void {
    this.presenceState = { ...this.presenceState, ...patch };
    if (this.presenceTimer) return;
    this.presenceTimer = setTimeout(() => {
      this.presenceTimer = null;
      umlab.presence.update(this.projectId, this.presenceState);
    }, 80);
  }

  get presence(): PresenceState {
    return this.presenceState;
  }

  private closed = false;

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    if (this.closeTimer) clearTimeout(this.closeTimer);
    this.flushNow();
    window.removeEventListener('beforeunload', this.flushNow);
    this.offs.forEach((f) => f());
    this.doc.off('update', this.onLocalUpdate);
    // thống kê đang chờ gửi (vừa thêm / xoá sơ đồ rồi rời project) → gửi ngay, không bỏ
    if (this.statsTimer) {
      clearTimeout(this.statsTimer);
      this.statsTimer = null;
      void umlab.projects.setStats(this.projectId, computeStats(this.doc)).catch(() => {});
    }
    // để lần flush cuối kịp gửi trước khi huỷ doc
    setTimeout(() => this.doc.destroy(), 1000);
    await umlab.sync.close(this.projectId);
  }
}

// ---------------- vòng đời dùng chung (dashboard ↔ editor) ----------------
const sessions = new Map<string, Promise<ProjectSession>>();
/** Người dùng đang đăng nhập — phiên project gắn với người dùng, đổi tài khoản thì mở lại. */
let currentUser = '';

export function setSessionUser(userId: string | null): void {
  if ((userId ?? '') === currentUser) return;
  currentUser = userId ?? '';
  closeAllSessions();
}

/** Đóng ngay mọi project đang mở (đăng xuất, bị thu hồi phiên). */
export function closeAllSessions(): void {
  for (const [key, p] of [...sessions]) {
    sessions.delete(key);
    void p.then((s) => s.close()).catch(() => {});
  }
}

async function openSession(projectId: string): Promise<ProjectSession> {
  const opened = await call(umlab.sync.open(projectId));
  return new ProjectSession(projectId, opened.project, opened.clientId, opened.updates);
}

const keyOf = (projectId: string) => `${currentUser}:${projectId}`;

export function acquireSession(projectId: string): Promise<ProjectSession> {
  const key = keyOf(projectId);
  let p = sessions.get(key);
  if (!p) {
    p = openSession(projectId);
    sessions.set(key, p);
    p.catch(() => sessions.delete(key));
  }
  return p.then((s) => {
    s.refs++;
    if (s.closeTimer) clearTimeout(s.closeTimer);
    s.closeTimer = null;
    return s;
  });
}

export function releaseSession(s: ProjectSession): void {
  s.refs--;
  if (s.refs > 0) return;
  // trễ một chút: chuyển dashboard → editor cùng project không phải mở lại
  const key = keyOf(s.projectId);
  s.closeTimer = setTimeout(() => {
    if (s.refs > 0) return;
    sessions.delete(key);
    void s.close();
  }, 1500);
}

/** Mở (hoặc dùng lại) phiên project cho component hiện tại. */
export function useProjectSession(projectId: string | undefined) {
  const [state, setState] = useState<{ session: ProjectSession | null; error: string | null; code?: string }>({
    session: null,
    error: null,
  });
  useEffect(() => {
    if (!projectId) return;
    let alive = true;
    let got: ProjectSession | null = null;
    setState({ session: null, error: null });
    acquireSession(projectId).then(
      (s) => {
        if (!alive) return releaseSession(s);
        got = s;
        setState({ session: s, error: null });
      },
      (e: Error & { code?: string }) => alive && setState({ session: null, error: e.message, code: e.code }),
    );
    return () => {
      alive = false;
      if (got) releaseSession(got);
    };
  }, [projectId]);
  return state;
}

/** Trạng thái lưu / người đang online / thông tin project của phiên. */
export function useSessionState(s: ProjectSession): SessionSnapshot {
  return useSyncExternalStore(s.subscribe, s.getSnapshot);
}

/** Đăng ký lắng nghe thay đổi sâu của các Y type; trả về số phiên bản tăng dần để dùng làm dependency. */
export function useYVersion(doc: Y.Doc, names: string[] | ((name: string) => boolean)): number {
  const [v, setV] = useState(0);
  const key = Array.isArray(names) ? names.join('|') : 'fn';
  useEffect(() => {
    let raf = 0;
    const bump = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setV((x) => x + 1);
      });
    };
    const handler = (tr: Y.Transaction) => {
      for (const t of tr.changed.keys()) {
        const name = typeName(doc, t as Y.AbstractType<unknown>);
        if (name && (Array.isArray(names) ? names.includes(name) : names(name))) return bump();
      }
    };
    doc.on('afterTransaction', handler);
    return () => {
      cancelAnimationFrame(raf);
      doc.off('afterTransaction', handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, key]);
  return v;
}

const nameCache = new WeakMap<Y.AbstractType<unknown>, string>();
function typeName(doc: Y.Doc, t: Y.AbstractType<unknown>): string | null {
  const c = nameCache.get(t);
  if (c) return c;
  for (const [k, v] of doc.share) {
    if (v === t) {
      nameCache.set(t, k);
      return k;
    }
  }
  return null;
}
