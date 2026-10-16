import { create } from 'zustand';

interface ToastItem {
  id: number;
  text: string;
  tone: 'default' | 'error';
  action?: { label: string; run: () => void };
}

interface ToastState {
  items: ToastItem[];
  push(t: Omit<ToastItem, 'id'>, ms?: number): void;
  dismiss(id: number): void;
}

let seq = 0;
const useToasts = create<ToastState>((set, get) => ({
  items: [],
  push(t, ms = 2600) {
    const id = ++seq;
    set({ items: [...get().items.slice(-3), { ...t, id }] });
    setTimeout(() => get().dismiss(id), ms);
  },
  dismiss(id) {
    set({ items: get().items.filter((x) => x.id !== id) });
  },
}));

/** Thông báo ngắn ở đáy màn hình (như tool cũ). */
export function toast(
  text: string,
  opts?: { error?: boolean; action?: { label: string; run: () => void }; ms?: number },
) {
  useToasts
    .getState()
    .push(
      { text, tone: opts?.error ? 'error' : 'default', action: opts?.action },
      opts?.ms ?? (opts?.error ? 4200 : 2600),
    );
}

export function ToastHost() {
  const items = useToasts((s) => s.items);
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={'toast' + (t.tone === 'error' ? ' error' : '')}>
          <span>{t.text}</span>
          {t.action && (
            <button
              onClick={() => {
                t.action!.run();
                useToasts.getState().dismiss(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
