import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Badge } from '../components/Badge';
import { useShopStock } from '../features/inventory/hooks';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { data: shopStock } = useShopStock();

  const alerts = (shopStock ?? []).filter((p) => p.status !== 'IN_STOCK');

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Stock alerts"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
      >
        <Bell size={18} />
        {alerts.length > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-semibold text-white">
            {alerts.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-xl border border-border bg-surface py-2 shadow-lg">
          <div className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-fg-subtle">Stock alerts</div>
          {alerts.length === 0 && (
            <div className="px-3 py-4 text-center text-sm text-fg-subtle">All products are well stocked.</div>
          )}
          {alerts.slice(0, 8).map((p) => (
            <button
              key={p.id}
              onClick={() => {
                navigate('/inventory');
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-surface-2"
            >
              <span className="truncate text-fg">{p.name}</span>
              <Badge tone={p.status === 'OUT_OF_STOCK' ? 'danger' : 'warning'}>
                {p.status === 'OUT_OF_STOCK' ? 'Out of stock' : `${p.quantity} left`}
              </Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
