import {
  forwardRef,
  useEffect,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/cn';

export function Field({
  label,
  error,
  hint,
  children,
  className,
}: {
  label?: ReactNode;
  error?: string | null;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && <span className="lbl">{label}</span>}
      {children}
      {error ? (
        <p className="mt-1 text-[11.5px] text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[11.5px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; size2?: 'md' | 'lg' }
>(function Input({ className, invalid, size2, ...rest }, ref) {
  return <input ref={ref} className={cn('field', size2 === 'lg' && 'lg', invalid && 'invalid', className)} {...rest} />;
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ className, invalid, rows = 3, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} className={cn('field', invalid && 'invalid', className)} {...rest} />;
});

export function Select({
  className,
  options,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[] }) {
  return (
    <select className={cn('field', className)} {...rest}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={cn('chk', disabled && 'opacity-50')}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  className,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: ReactNode; title?: string; disabled?: boolean }[];
  onChange: (v: T) => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div className={cn('seg', className)} role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          title={o.title}
          disabled={o.disabled}
          className={cn(o.value === value && 'on', o.disabled && 'opacity-40')}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const HEX = /^#[0-9a-f]{6}$/i;

/** Ô màu: bảng chọn + ô hex (như .color của tool cũ). */
export function ColorField({
  value,
  onChange,
  onCommit,
  ariaLabel,
  allowNone,
}: {
  value: string;
  onChange: (v: string) => void;
  onCommit?: () => void;
  ariaLabel?: string;
  allowNone?: boolean;
}) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <div className="color">
      <input
        type="color"
        aria-label={ariaLabel}
        value={HEX.test(value) ? value : '#ffffff'}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
      />
      <input
        type="text"
        aria-label={(ariaLabel ?? 'Màu') + ' (hex)'}
        value={text}
        onChange={(e) => {
          const v = e.target.value.trim();
          setText(v);
          if (/^#[0-9a-f]{3,8}$/i.test(v) || (allowNone && (v === 'none' || v === 'transparent'))) onChange(v);
        }}
        onBlur={() => {
          setText(value);
          onCommit?.();
        }}
      />
    </div>
  );
}

/** Ô số: chỉ báo giá trị khi hợp lệ; Enter/blur để chốt. */
export function NumberField({
  value,
  onChange,
  step = 1,
  min,
  max,
  ariaLabel,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  ariaLabel?: string;
  className?: string;
}) {
  const [text, setText] = useState(String(round(value)));
  useEffect(() => setText(String(round(value))), [value]);
  const commit = () => {
    const v = parseFloat(text.replace(',', '.'));
    if (Number.isFinite(v)) {
      const c = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v));
      if (c !== value) onChange(c);
      setText(String(round(c)));
    } else setText(String(round(value)));
  };
  return (
    <input
      className={cn('field', className)}
      type="number"
      step={step}
      min={min}
      max={max}
      aria-label={ariaLabel}
      value={text}
      style={{ fontVariantNumeric: 'tabular-nums' }}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
      }}
    />
  );
}

const round = (v: number) => Math.round(v * 100) / 100;
