import type { ReactNode } from 'react';
import { initials } from '@/lib/format';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/cn';

export function Logo({
  variant = 'full',
  height = 28,
  className,
}: {
  variant?: 'full' | 'icon';
  height?: number;
  className?: string;
}) {
  const dark = useTheme((s) => s.dark);
  const src =
    variant === 'icon' ? './brand/umlab-icon.svg' : dark ? './brand/umlab-logo-dark.svg' : './brand/umlab-logo.svg';
  return (
    <img
      src={src}
      alt="UMLab"
      height={height}
      style={{ height }}
      className={cn('select-none', className)}
      draggable={false}
    />
  );
}

export function Avatar({
  name,
  color,
  size = 28,
  title,
  ring,
}: {
  name: string;
  color: string;
  size?: number;
  title?: string;
  ring?: string;
}) {
  return (
    <span
      title={title ?? name}
      className="inline-grid flex-none place-items-center rounded-full font-semibold text-white select-none"
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: Math.round(size * 0.42),
        boxShadow: ring ? `0 0 0 2px ${ring}` : undefined,
      }}
    >
      {initials(name)}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <span className="kbd">{children}</span>;
}

export function EmptyState({
  icon,
  title,
  text,
  children,
}: {
  icon?: ReactNode;
  title: string;
  text?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="grid place-items-center px-6 py-14 text-center">
      {icon && <div className="mb-4 text-muted">{icon}</div>}
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {text && (
        <p className="mt-1.5 max-w-[440px] text-muted" style={{ lineHeight: 1.6 }}>
          {text}
        </p>
      )}
      {children && <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{children}</div>}
    </div>
  );
}

export function Tabs<T extends string>({
  value,
  onChange,
  items,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: ReactNode }[];
  className?: string;
}) {
  return (
    <div className={cn('tabs', className)} role="tablist">
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={it.value === value}
          className={cn('tab', it.value === value && 'on')}
          onClick={() => onChange(it.value)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
