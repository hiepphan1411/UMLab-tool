import { AccountMenu } from '../auth/account-menu';
import { ConnectionBadge } from '../shell/connection-badge';
import { ThemeButton } from '../shell/theme-button';
import { Spacer, TopBar } from '../shell/top-bar';
import { Logo } from '@/ui';

export function ProjectsPage() {
  return (
    <div className="flex h-full flex-col">
      <TopBar>
        <Logo height={26} />
        <Spacer />
        <ConnectionBadge />
        <ThemeButton />
        <AccountMenu />
      </TopBar>
      <div className="grid flex-1 place-items-center text-muted">Trang chủ</div>
    </div>
  );
}
