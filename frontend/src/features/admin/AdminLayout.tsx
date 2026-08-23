import { NavLink, Outlet } from 'react-router-dom';
import clsx from 'clsx';

const adminNavItems = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/resellers', label: 'Resellers' },
  { to: '/admin/staff', label: 'Staff / Users' },
  { to: '/admin/sessions', label: 'Active Sessions' },
  { to: '/admin/activity', label: 'Activity Log' },
  { to: '/admin/settings', label: 'Settings' },
];

export function AdminLayout() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-fg">Admin Dashboard</h1>
        <p className="text-sm text-fg-muted">Manage products, resellers, staff, and system configuration.</p>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-1">
        {adminNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              clsx(
                'whitespace-nowrap rounded-md px-3.5 py-2 text-sm font-medium transition-colors',
                isActive ? 'bg-brand-tint text-brand-tint-fg' : 'text-fg-muted hover:bg-surface-2',
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>

      <Outlet />
    </div>
  );
}
