import { useCallback, useEffect, useState } from 'react';

/** Trạng thái giao diện nhớ theo project trên máy này (mở thư mục nào, chế độ xem…). */
export interface WorkspacePrefs {
  expanded: string[];
  /** Thư mục đang chọn ở nội dung chính; null = gốc. */
  folder: string | null;
  side: 'tree' | 'type' | 'recent';
  view: 'grid' | 'list';
  sideWidth: number;
}

const DEFAULT: WorkspacePrefs = { expanded: [], folder: null, side: 'tree', view: 'grid', sideWidth: 260 };
const key = (pid: string) => `umlab.ws.${pid}`;

function read(pid: string): WorkspacePrefs {
  try {
    return { ...DEFAULT, ...JSON.parse(localStorage.getItem(key(pid)) || '{}') };
  } catch {
    return DEFAULT;
  }
}

export function useWorkspacePrefs(pid: string) {
  const [prefs, setPrefs] = useState<WorkspacePrefs>(() => read(pid));
  useEffect(() => setPrefs(read(pid)), [pid]);
  const update = useCallback(
    (patch: Partial<WorkspacePrefs> | ((p: WorkspacePrefs) => Partial<WorkspacePrefs>)) => {
      // ghi đĩa ngay (đồng bộ) — component có thể bị huỷ trước khi React chạy updater (vd. mở editor liền sau)
      const cur = read(pid);
      const n = { ...cur, ...(typeof patch === 'function' ? patch(cur) : patch) };
      try {
        localStorage.setItem(key(pid), JSON.stringify(n));
      } catch {}
      setPrefs(n);
    },
    [pid],
  );
  return [prefs, update] as const;
}

// ---------------- sơ đồ mở gần đây (20 mục) ----------------
const rkey = (uid: string, pid: string) => `umlab.recent.${uid}.${pid}`;

export function readRecent(uid: string, pid: string): { id: string; at: number }[] {
  try {
    const v = JSON.parse(localStorage.getItem(rkey(uid, pid)) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function pushRecent(uid: string, pid: string, diagramId: string): void {
  const list = [{ id: diagramId, at: Date.now() }, ...readRecent(uid, pid).filter((x) => x.id !== diagramId)].slice(
    0,
    20,
  );
  try {
    localStorage.setItem(rkey(uid, pid), JSON.stringify(list));
  } catch {}
}
