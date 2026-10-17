// Đăng ký editor theo loại sơ đồ — nạp theo nhu cầu (code splitting): engine + nhóm hình chung + Model Explorer nạp
// ngay; mỗi loại sơ đồ là một chunk riêng, nạp khi mở sơ đồ / chọn loại khi tạo / dựng ảnh thu nhỏ.
import { useEffect, useState } from 'react';
import './engine';
import './shapes/common';
import './model-explorer';

const LOADERS: Record<string, () => Promise<unknown>> = {
  playground: () => import('./playground'),
  architecture: () => import('./architecture'),
  gantt: () => import('./gantt'),
  usecase: () => import('./usecase'),
  'usecase-spec': () => import('./usecase-spec'),
  class: () => import('./class'),
  erd: () => import('./erd'),
  activity: () => import('./activity'),
  sequence: () => import('./sequence'),
};

const loading = new Map<string, Promise<void>>();
const done = new Set<string>();
const listeners = new Set<() => void>();

export const isEditorLoaded = (type: string) => done.has(type) || !LOADERS[type];

/** Nạp module editor của loại sơ đồ (một lần). */
export function ensureEditor(type: string): Promise<void> {
  const load = LOADERS[type];
  if (!load) return Promise.resolve();
  let p = loading.get(type);
  if (!p) {
    p = load().then(() => {
      done.add(type);
      listeners.forEach((f) => f());
    });
    loading.set(type, p);
  }
  return p;
}

/** true khi editor của `type` đã nạp (tự nạp nếu chưa). */
export function useEditorReady(type: string | null | undefined): boolean {
  const [, bump] = useState(0);
  useEffect(() => {
    if (!type || isEditorLoaded(type)) return;
    let alive = true;
    void ensureEditor(type).then(() => alive && bump((x) => x + 1));
    return () => {
      alive = false;
    };
  }, [type]);
  return !type || isEditorLoaded(type);
}

/** Nạp editor của nhiều loại (ảnh thu nhỏ dashboard); trả về số loại đã nạp để làm khoá vẽ lại. */
export function useEditorsLoaded(types: string[]): number {
  const [n, setN] = useState(() => types.filter(isEditorLoaded).length);
  const key = [...new Set(types)].sort().join('|');
  useEffect(() => {
    const update = () => setN(key.split('|').filter((t) => t && isEditorLoaded(t)).length);
    listeners.add(update);
    for (const t of key.split('|')) if (t) void ensureEditor(t);
    update();
    return () => {
      listeners.delete(update);
    };
  }, [key]);
  return n;
}
