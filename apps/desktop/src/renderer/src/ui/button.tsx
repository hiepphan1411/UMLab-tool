import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './spinner';
import { useTooltip } from './tooltip';

type Variant = 'default' | 'primary' | 'outline' | 'ghost' | 'danger' | 'ghost-danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'default', size = 'md', icon, loading, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'btn',
        variant === 'primary' && 'primary',
        variant === 'outline' && 'outline',
        variant === 'danger' && 'danger',
        variant === 'ghost-danger' && 'ghost-danger',
        size === 'sm' && 'sm',
        size === 'lg' && 'lg',
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner size={14} /> : icon}
      {children}
    </button>
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Nhãn cho trình đọc màn hình + tooltip. */
  label: string;
  shortcut?: string;
  active?: boolean;
  size?: 'sm' | 'md';
  tooltip?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, shortcut, active, size = 'md', tooltip = true, className, children, type = 'button', ...rest },
  ref,
) {
  const tip = useTooltip(tooltip ? (shortcut ? `${label} (${shortcut})` : label) : null);
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      aria-pressed={active}
      className={cn('ibtn', active && 'on', size === 'sm' && 'sm', className)}
      {...tip}
      {...rest}
    >
      {children}
    </button>
  );
});
