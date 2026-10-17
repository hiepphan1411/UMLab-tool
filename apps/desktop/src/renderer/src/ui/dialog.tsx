import { X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { create } from 'zustand';
import { Button } from './button';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  width?: number;
  /** Không đóng khi bấm nền (form dài). */
  modalOnly?: boolean;
  bodyClassName?: string;
}

/** Hộp thoại theo style .modal của tool cũ. Esc / bấm nền để đóng. */
export function Dialog({ open, onClose, title, children, footer, width = 520, modalOnly, bodyClassName }: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => {
      const el = ref.current?.querySelector<HTMLElement>(
        '[data-autofocus], input:not([type=hidden]):not([disabled]), textarea, select, button.primary',
      );
      el?.focus();
    }, 20);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
      if (e.key === 'Tab' && ref.current) {
        const f = [
          ...ref.current.querySelectorAll<HTMLElement>(
            'button, input, textarea, select, [tabindex]:not([tabindex="-1"])',
          ),
        ].filter((x) => !x.hasAttribute('disabled') && x.offsetParent !== null);
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey, true);
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div
      className="modal-bg"
      onMouseDown={(e) => {
        if (!modalOnly && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ width: `min(${width}px, 100%)` }}
      >
        <div className="modal-h">
          <span id={titleId} className="min-w-0 truncate">
            {title}
          </span>
          <button className="ibtn" onClick={onClose} aria-label="Đóng">
            <X />
          </button>
        </div>
        <div className={'modal-b ' + (bodyClassName ?? '')}>{children}</div>
        {footer && <div className="modal-f">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

// ---------------- hộp thoại dạng hàm (thay window.confirm/prompt) ----------------
type Pending =
  | {
      kind: 'confirm';
      id: number;
      title: string;
      text: ReactNode;
      confirmLabel: string;
      danger: boolean;
      requireText?: string;
      resolve: (v: boolean) => void;
    }
  | {
      kind: 'prompt';
      id: number;
      title: string;
      label: string;
      initial: string;
      placeholder?: string;
      confirmLabel: string;
      multiline?: boolean;
      validate?: (v: string) => string | null;
      resolve: (v: string | null) => void;
    }
  | {
      kind: 'choice';
      id: number;
      title: string;
      text: ReactNode;
      options: { value: string; label: string; variant?: 'primary' | 'outline' | 'danger' }[];
      resolve: (v: string | null) => void;
    }
  | {
      kind: 'custom';
      id: number;
      render: (done: (v: unknown) => void) => ReactNode;
      resolve: (v: unknown) => void;
    };

const useDialogs = create<{ queue: Pending[] }>(() => ({ queue: [] }));
let dseq = 0;

const push = (p: Pending) => useDialogs.setState((s) => ({ queue: [...s.queue, p] }));
const pop = (id: number) => useDialogs.setState((s) => ({ queue: s.queue.filter((x) => x.id !== id) }));

export function confirmDialog(o: {
  title: string;
  text: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  requireText?: string;
}): Promise<boolean> {
  return new Promise((resolve) =>
    push({
      kind: 'confirm',
      id: ++dseq,
      title: o.title,
      text: o.text,
      confirmLabel: o.confirmLabel ?? 'Đồng ý',
      danger: !!o.danger,
      requireText: o.requireText,
      resolve,
    }),
  );
}

export function promptDialog(o: {
  title: string;
  label: string;
  initial?: string;
  placeholder?: string;
  confirmLabel?: string;
  multiline?: boolean;
  validate?: (v: string) => string | null;
}): Promise<string | null> {
  return new Promise((resolve) =>
    push({
      kind: 'prompt',
      id: ++dseq,
      title: o.title,
      label: o.label,
      initial: o.initial ?? '',
      placeholder: o.placeholder,
      confirmLabel: o.confirmLabel ?? 'Lưu',
      multiline: o.multiline,
      validate: o.validate,
      resolve,
    }),
  );
}

export function choiceDialog<T extends string>(o: {
  title: string;
  text: ReactNode;
  options: { value: T; label: string; variant?: 'primary' | 'outline' | 'danger' }[];
}): Promise<T | null> {
  return new Promise((resolve) =>
    push({
      kind: 'choice',
      id: ++dseq,
      title: o.title,
      text: o.text,
      options: o.options,
      resolve: resolve as (v: string | null) => void,
    }),
  );
}

/**
 * Hộp thoại tuỳ biến dạng lệnh: `render(done)` trả về một <Dialog>; gọi done(giá trị) hoặc done(null) để đóng.
 * Dùng cho hộp cắt ảnh, dán bảng Excel… (không dùng window.prompt).
 */
export function openDialog<T>(render: (done: (v: T | null) => void) => ReactNode): Promise<T | null> {
  return new Promise((resolve) => {
    const id = ++dseq;
    push({
      kind: 'custom',
      id,
      render: render as (done: (v: unknown) => void) => ReactNode,
      resolve: resolve as (v: unknown) => void,
    });
  });
}

function CustomView({ p }: { p: Extract<Pending, { kind: 'custom' }> }) {
  const done = (v: unknown) => {
    pop(p.id);
    p.resolve(v);
  };
  return <>{p.render(done)}</>;
}

function ConfirmView({ p }: { p: Extract<Pending, { kind: 'confirm' }> }) {
  const [typed, setTyped] = useState('');
  const done = (v: boolean) => {
    pop(p.id);
    p.resolve(v);
  };
  const blocked = !!p.requireText && typed.trim() !== p.requireText.trim();
  return (
    <Dialog
      open
      onClose={() => done(false)}
      title={p.title}
      width={460}
      footer={
        <>
          <Button variant="outline" onClick={() => done(false)}>
            Huỷ
          </Button>
          <Button
            variant={p.danger ? 'danger' : 'primary'}
            disabled={blocked}
            onClick={() => done(true)}
            data-autofocus={p.requireText ? undefined : true}
          >
            {p.confirmLabel}
          </Button>
        </>
      }
    >
      <div style={{ lineHeight: 1.6 }}>{p.text}</div>
      {p.requireText && (
        <form
          className="mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!blocked) done(true);
          }}
        >
          <label className="lbl">
            Gõ lại <b className="text-ink">{p.requireText}</b> để xác nhận
          </label>
          <input className="field" value={typed} onChange={(e) => setTyped(e.target.value)} data-autofocus />
        </form>
      )}
    </Dialog>
  );
}

function PromptView({ p }: { p: Extract<Pending, { kind: 'prompt' }> }) {
  const [v, setV] = useState(p.initial);
  const [err, setErr] = useState<string | null>(null);
  const done = (val: string | null) => {
    pop(p.id);
    p.resolve(val);
  };
  const submit = () => {
    const e = p.validate?.(v) ?? (v.trim() ? null : 'Không được để trống');
    if (e) return setErr(e);
    done(v.trim());
  };
  return (
    <Dialog
      open
      onClose={() => done(null)}
      title={p.title}
      width={440}
      footer={
        <>
          <Button variant="outline" onClick={() => done(null)}>
            Huỷ
          </Button>
          <Button variant="primary" onClick={submit}>
            {p.confirmLabel}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="lbl">{p.label}</label>
        {p.multiline ? (
          <textarea
            className="field"
            rows={4}
            value={v}
            onChange={(e) => setV(e.target.value)}
            placeholder={p.placeholder}
            data-autofocus
          />
        ) : (
          <input
            className={'field lg' + (err ? ' invalid' : '')}
            value={v}
            onChange={(e) => {
              setV(e.target.value);
              setErr(null);
            }}
            placeholder={p.placeholder}
            data-autofocus
            onFocus={(e) => e.currentTarget.select()}
          />
        )}
        {err && <p className="mt-1.5 text-danger">{err}</p>}
      </form>
    </Dialog>
  );
}

function ChoiceView({ p }: { p: Extract<Pending, { kind: 'choice' }> }) {
  const done = (v: string | null) => {
    pop(p.id);
    p.resolve(v);
  };
  return (
    <Dialog
      open
      onClose={() => done(null)}
      title={p.title}
      width={500}
      footer={
        <>
          <Button variant="outline" onClick={() => done(null)}>
            Huỷ
          </Button>
          {p.options.map((o) => (
            <Button key={o.value} variant={o.variant ?? 'outline'} onClick={() => done(o.value)}>
              {o.label}
            </Button>
          ))}
        </>
      }
    >
      <div style={{ lineHeight: 1.6 }}>{p.text}</div>
    </Dialog>
  );
}

export function DialogHost() {
  const queue = useDialogs((s) => s.queue);
  const p = queue[0];
  if (!p) return null;
  if (p.kind === 'confirm') return <ConfirmView key={p.id} p={p} />;
  if (p.kind === 'prompt') return <PromptView key={p.id} p={p} />;
  if (p.kind === 'custom') return <CustomView key={p.id} p={p} />;
  return <ChoiceView key={p.id} p={p} />;
}
