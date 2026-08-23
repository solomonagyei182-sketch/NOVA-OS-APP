import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import clsx from 'clsx';
import { Menu } from 'lucide-react';
import { SidebarContent } from './Sidebar';
import { Header } from './Header';

const COLLAPSE_KEY = 'nova-sidebar-collapsed';

function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className={clsx(
        'fixed inset-0 z-40 bg-fg/40 transition-opacity duration-200 lg:hidden',
        visible ? 'opacity-100' : 'opacity-0',
      )}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-72 bg-surface shadow-xl transition-transform duration-200',
          visible ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <SidebarContent onNavigate={onClose} />
      </aside>
    </div>
  );
}

export function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(COLLAPSE_KEY) === 'true';
  });

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, String(collapsed));
  }, [collapsed]);

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside
        className={clsx(
          'hidden shrink-0 border-r border-border bg-surface transition-[width] duration-200 lg:block',
          collapsed ? 'w-20' : 'w-64',
        )}
      >
        <SidebarContent collapsed={collapsed} onToggleCollapse={() => setCollapsed((v) => !v)} />
      </aside>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header />

        <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 lg:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            className="rounded-lg p-2 text-fg-muted hover:bg-surface-2"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-xs font-bold text-white">
              N
            </div>
            <span className="text-sm font-semibold text-fg">NOVA OS</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
