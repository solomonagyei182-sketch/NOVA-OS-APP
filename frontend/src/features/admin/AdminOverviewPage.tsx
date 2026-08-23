import { Boxes, CheckCircle2, XCircle, Users, UserCheck, Receipt, DollarSign } from 'lucide-react';
import { StatCard } from '../../components/StatCard';
import { DataTable, type Column } from '../../components/DataTable';
import { SkeletonCard } from '../../components/Skeleton';
import { useAdminOverview } from './hooks';
import type { Product, Reseller, Sale } from '../../lib/types';

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export function AdminOverviewPage() {
  const { data, isLoading } = useAdminOverview();

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  const transactionColumns: Column<Sale>[] = [
    { key: 'transactionId', header: 'Transaction', render: (r) => <span className="font-mono text-xs">{r.transactionId}</span> },
    { key: 'product', header: 'Product', render: (r) => r.product.name },
    { key: 'reseller', header: 'Reseller', render: (r) => r.reseller?.fullName ?? '—' },
    { key: 'price', header: 'Total', render: (r) => formatMoney(r.price) },
  ];

  const productColumns: Column<Product>[] = [
    { key: 'name', header: 'Product', render: (r) => r.name },
    { key: 'createdAt', header: 'Added', render: (r) => formatDate(r.createdAt) },
  ];

  const resellerColumns: Column<Reseller>[] = [
    { key: 'fullName', header: 'Reseller', render: (r) => r.fullName },
    { key: 'createdAt', header: 'Added', render: (r) => formatDate(r.createdAt) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Total Products" value={data.totalProducts} icon={Boxes} tone="brand" />
        <StatCard label="Active Products" value={data.activeProducts} icon={CheckCircle2} tone="success" />
        <StatCard label="Inactive Products" value={data.inactiveProducts} icon={XCircle} tone="danger" />
        <StatCard label="Total Resellers" value={data.totalResellers} icon={Users} tone="brand" />
        <StatCard label="Active Resellers" value={data.activeResellers} icon={UserCheck} tone="success" />
        <StatCard label="Total Sales" value={data.totalSales} icon={Receipt} tone="success" />
        <StatCard label="Total Sales Value" value={formatMoney(data.totalSalesValue)} icon={DollarSign} tone="brand" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <h2 className="mb-3 text-base font-semibold text-fg">Recent transactions</h2>
          <DataTable
            columns={transactionColumns}
            rows={data.recentTransactions}
            keyField={(r) => r.id}
            emptyMessage="No transactions yet."
          />
        </div>
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="mb-3 text-base font-semibold text-fg">Recently added products</h2>
            <DataTable
              columns={productColumns}
              rows={data.recentlyAddedProducts}
              keyField={(r) => r.id}
              emptyMessage="No products yet."
            />
          </div>
          <div>
            <h2 className="mb-3 text-base font-semibold text-fg">Recently added resellers</h2>
            <DataTable
              columns={resellerColumns}
              rows={data.recentlyAddedResellers}
              keyField={(r) => r.id}
              emptyMessage="No resellers yet."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
