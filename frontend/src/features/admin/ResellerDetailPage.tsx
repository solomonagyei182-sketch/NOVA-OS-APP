import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, DollarSign, Package, Receipt, Clock, Percent } from 'lucide-react';
import { Badge } from '../../components/Badge';
import { StatCard } from '../../components/StatCard';
import { DataTable, type Column } from '../../components/DataTable';
import { Skeleton } from '../../components/Skeleton';
import { useResellerDetail } from '../resellers/hooks';
import type { Sale } from '../../lib/types';

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateTime(iso: string | null) {
  if (!iso) return 'No purchases yet';
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function ResellerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: reseller, isLoading } = useResellerDetail(id);

  if (isLoading || !reseller) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const salesColumns: Column<Sale>[] = [
    { key: 'transactionId', header: 'Transaction ID', render: (r) => <span className="font-mono text-xs">{r.transactionId}</span> },
    { key: 'product', header: 'Product', render: (r) => r.product.name },
    { key: 'quantity', header: 'Quantity', render: (r) => r.quantity },
    { key: 'unitPrice', header: 'Unit price', render: (r) => (r.unitPrice ? formatMoney(r.unitPrice) : '—') },
    { key: 'price', header: 'Total', render: (r) => formatMoney(r.price) },
    { key: 'commission', header: 'Reseller Commission', render: (r) => formatMoney(r.commission) },
    { key: 'counterUser', header: 'Recorded by', render: (r) => r.counterUser.name },
    { key: 'createdAt', header: 'Date & time', render: (r) => formatDateTime(r.createdAt) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={() => navigate('/admin/resellers')}
        className="flex w-fit items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
      >
        <ArrowLeft size={15} />
        Back to resellers
      </button>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-fg">{reseller.fullName}</h2>
            <Badge tone={reseller.status === 'ACTIVE' ? 'success' : 'neutral'}>
              {reseller.status === 'ACTIVE' ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 text-sm text-fg-muted sm:grid-cols-3">
          {reseller.phone && (
            <div className="flex items-center gap-2">
              <Phone size={14} className="text-fg-subtle" />
              {reseller.phone}
            </div>
          )}
          {reseller.email && (
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-fg-subtle" />
              {reseller.email}
            </div>
          )}
          {reseller.address && (
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-fg-subtle" />
              {reseller.address}
            </div>
          )}
        </div>
        {reseller.notes && <p className="mt-3 text-sm text-fg-subtle">{reseller.notes}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total Transactions" value={reseller.summary.totalTransactions} icon={Receipt} tone="brand" />
        <StatCard label="Quantity Purchased" value={reseller.summary.totalQuantityPurchased} icon={Package} tone="success" />
        <StatCard label="Total Spent" value={formatMoney(reseller.summary.totalAmountSpent)} icon={DollarSign} tone="warning" />
        <StatCard label="Commission Earned" value={formatMoney(reseller.summary.totalCommissionEarned)} icon={Percent} tone="danger" />
        <StatCard label="Last Purchase" value={formatDateTime(reseller.summary.lastPurchaseAt)} icon={Clock} tone="brand" />
      </div>

      <div>
        <h3 className="mb-3 text-base font-semibold text-fg">Transaction history</h3>
        <DataTable
          columns={salesColumns}
          rows={reseller.sales}
          keyField={(r) => r.id}
          emptyMessage="No transactions yet."
        />
      </div>
    </div>
  );
}
