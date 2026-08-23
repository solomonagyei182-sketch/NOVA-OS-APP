import { ShoppingCart, Package, UserPlus } from 'lucide-react';
import { EmptyState } from '../../components/EmptyState';
import { SkeletonRow } from '../../components/Skeleton';
import { useAuth } from '../auth/AuthContext';
import { useSales } from '../sales/hooks';
import { useMovements } from '../inventory/hooks';
import { useCustomers } from '../customers/hooks';

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function ActivityRow({ icon: Icon, title, subtitle, time }: { icon: typeof ShoppingCart; title: string; subtitle: string; time: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand-tint-fg">
        <Icon size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-fg">{title}</div>
        <div className="truncate text-xs text-fg-subtle">{subtitle}</div>
      </div>
      <div className="shrink-0 text-xs text-fg-subtle">{time}</div>
    </div>
  );
}

function ActivitySection({
  title,
  loading,
  children,
}: {
  title: string;
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-fg">{title}</h3>
      <div className="flex flex-col gap-2">
        {loading && Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}
        {!loading && children}
      </div>
    </div>
  );
}

export function RecentActivity() {
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';

  const sales = useSales({ sortBy: 'createdAt', sortDir: 'desc' });
  const movements = useMovements();
  const customers = useCustomers({ tier: 'ALL', enabled: isManager });

  const recentSales = sales.data?.slice(0, 3) ?? [];
  const recentMovements = movements.data?.slice(0, 3) ?? [];
  const recentCustomers = [...(customers.data ?? [])]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  const loading = sales.isLoading || movements.isLoading;

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-base font-semibold text-fg">Recent activity</h2>

      <ActivitySection title="Recent sales" loading={loading}>
        {recentSales.length === 0 ? (
          <EmptyState message="No sales yet." />
        ) : (
          recentSales.map((s) => (
            <ActivityRow
              key={s.id}
              icon={ShoppingCart}
              title={`${s.product.name} × ${s.quantity}`}
              subtitle={`${s.reseller?.fullName ?? 'Walk-in'} — ${s.transactionId}`}
              time={timeAgo(s.createdAt)}
            />
          ))
        )}
      </ActivitySection>

      <ActivitySection title="Recent inventory movements" loading={loading}>
        {recentMovements.length === 0 ? (
          <EmptyState message="No stock movements yet." />
        ) : (
          recentMovements.map((m) => (
            <ActivityRow
              key={m.id}
              icon={Package}
              title={`${m.product.name} × ${m.quantity}`}
              subtitle={m.type === 'WAREHOUSE_IN' ? 'Warehouse stock-in' : 'Transferred to shop'}
              time={timeAgo(m.createdAt)}
            />
          ))
        )}
      </ActivitySection>

      {isManager && (
        <ActivitySection title="Recent customers" loading={customers.isLoading}>
          {recentCustomers.length === 0 ? (
            <EmptyState message="No customers yet." />
          ) : (
            recentCustomers.map((c) => (
              <ActivityRow
                key={c.id}
                icon={UserPlus}
                title={c.fullName}
                subtitle={c.tier.replace('_', ' ')}
                time={timeAgo(c.createdAt)}
              />
            ))
          )}
        </ActivitySection>
      )}
    </div>
  );
}
