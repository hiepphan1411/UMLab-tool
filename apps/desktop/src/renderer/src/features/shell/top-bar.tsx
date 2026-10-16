import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Thanh trên 48px — đồng thời là vùng kéo cửa sổ (nút thu nhỏ/phóng to/đóng của Windows nằm bên phải). */
export function TopBar({ children, className }: { children: ReactNode; className?: string }) {
  return <header className={cn('topbar', className)}>{children}</header>;
}

export const Spacer = () => <div className="min-w-2 flex-1 self-stretch" />;
