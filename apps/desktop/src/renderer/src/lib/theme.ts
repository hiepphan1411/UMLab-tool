import { create } from 'zustand';
import { umlab } from './api';

export type ThemeMode = 'auto' | 'light' | 'dark';
const KEY = 'umlab.theme';
const media = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;

function read(): ThemeMode {
  try {
    const m = localStorage.getItem(KEY);
    return m === 'light' || m === 'dark' ? m : 'auto';
  } catch {
    return 'auto';
  }
}

export const isDarkNow = (mode: ThemeMode) => mode === 'dark' || (mode === 'auto' && !!media?.matches);

function apply(mode: ThemeMode): void {
  const root = document.documentElement;
  if (mode === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', mode);
  const dark = isDarkNow(mode);
  umlab?.app.setTitleBarTheme(
    dark ? { color: '#1D2027', symbolColor: '#E5E8EF' } : { color: '#FFFFFF', symbolColor: '#1B2130' },
  );
}

interface ThemeState {
  mode: ThemeMode;
  dark: boolean;
  set(mode: ThemeMode): void;
  cycle(): ThemeMode;
}

export const THEME_LABEL: Record<ThemeMode, string> = { auto: 'Theo hệ thống', light: 'Sáng', dark: 'Tối' };

export const useTheme = create<ThemeState>((set, get) => ({
  mode: read(),
  dark: isDarkNow(read()),
  set(mode) {
    try {
      localStorage.setItem(KEY, mode);
    } catch {}
    apply(mode);
    set({ mode, dark: isDarkNow(mode) });
  },
  cycle() {
    const order: ThemeMode[] = ['auto', 'light', 'dark'];
    const next = order[(order.indexOf(get().mode) + 1) % order.length];
    get().set(next);
    return next;
  },
}));

export function initTheme(): void {
  apply(useTheme.getState().mode);
  media?.addEventListener('change', () => {
    const { mode } = useTheme.getState();
    apply(mode);
    useTheme.setState({ dark: isDarkNow(mode) });
  });
}
