import { useEffect, useRef, useState } from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';

export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-tint text-xs font-semibold text-brand-tint-fg transition-transform hover:scale-105"
        aria-label="Account menu"
      >
        {user.name.slice(0, 2).toUpperCase()}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-52 rounded-xl border border-border bg-surface py-2 shadow-lg">
          <div className="px-3 pb-2">
            <div className="truncate text-sm font-medium text-fg">{user.name}</div>
            <div className="text-xs capitalize text-fg-subtle">{user.role.toLowerCase()}</div>
          </div>
          <div className="border-t border-border pt-1">
            <button
              onClick={() => logout()}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-fg-muted transition-colors hover:bg-surface-2 hover:text-danger-500"
            >
              <LogOut size={15} />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
