import { useAuth } from '../features/auth/AuthContext';
import { HeaderSearch } from './HeaderSearch';
import { NotificationBell } from './NotificationBell';
import { UserMenu } from './UserMenu';
import { ThemeToggle } from '../features/theme/ThemeToggle';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function Header() {
  const { user } = useAuth();
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="hidden items-center gap-4 border-b border-border bg-surface px-8 py-4 lg:flex">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold text-fg">
          {greeting()}, {user?.name.split(' ')[0]}
        </h1>
        <p className="text-xs text-fg-subtle">{today}</p>
      </div>

      <div className="ml-6 flex-1">
        <HeaderSearch />
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <ThemeToggle />
        <NotificationBell />
        <div className="mx-1 h-6 w-px bg-border" />
        <UserMenu />
      </div>
    </header>
  );
}
