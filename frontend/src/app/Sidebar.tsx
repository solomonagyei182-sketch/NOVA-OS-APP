import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { LogOut, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { navItems } from './navConfig';
import novaLogoWhite from '../assets/nova-logo-white-256.png';

export function SidebarContent({
  onNavigate,
  collapsed = false,
  onToggleCollapse,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-full flex-col">
      <div className={clsx('flex items-center gap-2.5 px-5 py-6', collapsed && 'justify-center px-3')}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600">
          <img src={novaLogoWhite} alt="" className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-fg">NOVA OS</div>
            <div className="truncate text-xs text-fg-subtle">Business Management</div>
          </div>
        )}
      </div>

      <nav className={clsx('flex-1 space-y-1', collapsed ? 'px-2' : 'px-3')}>
        {navItems
          .filter((item) => !user || item.roles.includes(user.role))
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors',
                  collapsed ? 'justify-center px-2.5' : 'px-3',
                  isActive
                    ? 'bg-brand-tint text-brand-tint-fg'
                    : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
                )
              }
            >
              <item.icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
      </nav>

      <div className={clsx('border-t border-border', collapsed ? 'p-2' : 'p-3')}>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={clsx(
              'mb-1 flex w-full items-center gap-3 rounded-lg py-2.5 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg',
              collapsed ? 'justify-center px-2.5' : 'px-3',
            )}
          >
            {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
            {!collapsed && <span>Collapse</span>}
          </button>
        )}

        <div className={clsx('mb-2 flex items-center gap-3 rounded-lg py-2', collapsed ? 'justify-center px-0' : 'px-3')}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-fg-muted">
            {user?.name.slice(0, 2).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-fg">{user?.name}</div>
              <div className="truncate text-xs capitalize text-fg-subtle">{user?.role.toLowerCase()}</div>
            </div>
          )}
        </div>
        <button
          onClick={() => logout()}
          title={collapsed ? 'Log out' : undefined}
          className={clsx(
            'flex w-full items-center gap-3 rounded-lg py-2.5 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-danger-500',
            collapsed ? 'justify-center px-2.5' : 'px-3',
          )}
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && 'Log out'}
        </button>
      </div>
    </div>
  );
}
