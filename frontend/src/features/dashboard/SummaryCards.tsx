import { DollarSign, Receipt, Percent, Store, Warehouse, Users, AlertTriangle } from 'lucide-react';
import { StatCard } from '../../components/StatCard';
import { SkeletonCard } from '../../components/Skeleton';
import { useAuth } from '../auth/AuthContext';
import { useTodaySummary } from '../sales/hooks';
import { useShopStock, useWarehouseStock } from '../inventory/hooks';
import { useCustomers } from '../customers/hooks';
import { useSalesTrend } from './hooks';

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function SummaryCards() {
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';

  const todaySummary = useTodaySummary();
  const shopStock = useShopStock();
  const warehouseStock = useWarehouseStock();
  const customers = useCustomers({ tier: 'ALL', enabled: isManager });
  const trend = useSalesTrend(2);

  const loading = todaySummary.isLoading || shopStock.isLoading || warehouseStock.isLoading;

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: isManager ? 8 : 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  const totalShopStock = shopStock.data?.reduce((sum, p) => sum + p.quantity, 0) ?? 0;
  const totalWarehouseStock = warehouseStock.data?.reduce((sum, p) => sum + p.quantity, 0) ?? 0;
  const lowStockCount = shopStock.data?.filter((p) => p.status !== 'IN_STOCK').length ?? 0;

  let salesTrendPct: number | undefined;
  if (trend.data && trend.data.length === 2) {
    const [yesterday, today] = trend.data;
    if (yesterday.totalSales > 0) {
      salesTrendPct = ((today.totalSales - yesterday.totalSales) / yesterday.totalSales) * 100;
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <StatCard
        label="Today's Sales"
        value={formatMoney(todaySummary.data?.totalSales ?? 0)}
        icon={DollarSign}
        tone="brand"
        trend={salesTrendPct}
      />
      <StatCard label="Transactions Today" value={todaySummary.data?.transactionCount ?? 0} icon={Receipt} tone="success" />
      <StatCard label="Today's Commission" value={formatMoney(todaySummary.data?.totalCommission ?? 0)} icon={Percent} tone="warning" />
      <StatCard label="Current Shop Stock" value={totalShopStock} icon={Store} tone="success" />
      <StatCard label="Warehouse Stock" value={totalWarehouseStock} icon={Warehouse} tone="brand" />
      <StatCard label="Low Stock Items" value={lowStockCount} icon={AlertTriangle} tone={lowStockCount > 0 ? 'danger' : 'success'} />
      {isManager && (
        <StatCard label="Total Customers" value={customers.data?.length ?? 0} icon={Users} tone="brand" />
      )}
    </div>
  );
}
