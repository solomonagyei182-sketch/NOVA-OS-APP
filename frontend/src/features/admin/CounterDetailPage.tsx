import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { ArrowLeft, DollarSign, Receipt, Package, Truck, MapPin, Clock } from 'lucide-react';
import { Badge } from '../../components/Badge';
import { StatCard } from '../../components/StatCard';
import { DataTable, type Column } from '../../components/DataTable';
import { Skeleton } from '../../components/Skeleton';
import { useCounterProfile } from './hooks';
import { useSales } from '../sales/hooks';
import { useAllStockTransfers } from '../inventory/hooks';
import type { Sale, StockTransfer } from '../../lib/types';

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateTime(iso: string | null) {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

type Preset = 'all' | 'today' | 'week' | 'month' | 'custom';

function presetToRange(preset: Preset): { dateFrom?: string; dateTo?: string } {
  const now = new Date();
  const toISODate = (d: Date) => d.toISOString().slice(0, 10);

  if (preset === 'today') {
    return { dateFrom: toISODate(now), dateTo: toISODate(now) };
  }
  if (preset === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    return { dateFrom: toISODate(start), dateTo: toISODate(now) };
  }
  if (preset === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { dateFrom: toISODate(start), dateTo: toISODate(now) };
  }
  return {};
}

export function CounterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [preset, setPreset] = useState<Preset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const range = preset === 'custom' ? { dateFrom: customFrom || undefined, dateTo: customTo || undefined } : presetToRange(preset);

  const { data: profile, isLoading } = useCounterProfile(id, range);
  const { data: sales } = useSales({ counterUserId: id, dateFrom: range.dateFrom, dateTo: range.dateTo });
  const { data: stockActivity } = useAllStockTransfers({ assignedToId: id });

  if (isLoading || !profile) {
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
    { key: 'reseller', header: 'Reseller', render: (r) => r.reseller?.fullName ?? '—' },
    { key: 'quantity', header: 'Qty', render: (r) => r.quantity },
    { key: 'price', header: 'Total', render: (r) => formatMoney(r.price) },
    { key: 'commission', header: 'Reseller Commission', render: (r) => formatMoney(r.commission) },
    { key: 'createdAt', header: 'Date & time', render: (r) => formatDateTime(r.createdAt) },
  ];

  const stockColumns: Column<StockTransfer>[] = [
    { key: 'transferId', header: 'Reference', render: (r) => <span className="font-mono text-xs">{r.transferId}</span> },
    { key: 'product', header: 'Product', render: (r) => r.product.name },
    { key: 'quantity', header: 'Qty', render: (r) => r.quantity },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <Badge tone={r.status === 'ACCEPTED' ? 'success' : 'warning'}>{r.status === 'ACCEPTED' ? 'Accepted' : 'Pending'}</Badge>,
    },
    { key: 'dispatchedBy', header: 'Dispatched by', render: (r) => r.dispatchedBy.name },
    {
      key: 'acceptedAt',
      header: 'Accepted',
      render: (r) => (r.acceptance ? formatDateTime(r.acceptance.acceptedAt) : '—'),
    },
    {
      key: 'location',
      header: 'Acceptance location',
      render: (r) =>
        r.acceptance ? (
          <span className="flex items-center gap-1 text-xs">
            <MapPin size={12} className="text-fg-subtle" />
            {r.acceptance.address ?? `${r.acceptance.latitude.toFixed(4)}, ${r.acceptance.longitude.toFixed(4)}`}
          </span>
        ) : (
          '—'
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={() => navigate('/admin/counters')}
        className="flex w-fit items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
      >
        <ArrowLeft size={15} />
        Back to Counters
      </button>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-fg">{profile.counter.name}</h2>
            <p className="text-sm text-fg-muted">{profile.counter.email}</p>
          </div>
          <Badge tone={profile.counter.isActive ? 'success' : 'danger'}>
            {profile.counter.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <div className="grid grid-cols-1 gap-2 text-sm text-fg-muted sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-fg-subtle" />
            Added {formatDateTime(profile.counter.createdAt)}
          </div>
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-fg-subtle" />
            Last active {formatDateTime(profile.counter.lastLoginAt)}
          </div>
          {profile.lastKnownLocation && (
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-fg-subtle" />
              Last accepted stock at{' '}
              {profile.lastKnownLocation.address ??
                `${profile.lastKnownLocation.latitude.toFixed(4)}, ${profile.lastKnownLocation.longitude.toFixed(4)}`}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['all', 'All time'],
            ['today', 'Today'],
            ['week', 'This week'],
            ['month', 'This month'],
            ['custom', 'Custom range'],
          ] as [Preset, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setPreset(value)}
            className={clsx(
              'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              preset === value ? 'bg-brand-600 text-white' : 'bg-surface text-fg-muted border border-border hover:bg-surface-2',
            )}
          >
            {label}
          </button>
        ))}
        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              aria-label="From date"
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-fg outline-none focus:border-brand-500"
            />
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              aria-label="To date"
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-fg outline-none focus:border-brand-500"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total Sales" value={formatMoney(profile.summary.totalSales)} icon={DollarSign} tone="success" />
        <StatCard label="Transactions" value={profile.summary.totalTransactions} icon={Receipt} tone="brand" />
        <StatCard label="Products Sold" value={profile.summary.totalProductsSold} icon={Package} tone="brand" />
        <StatCard label="Pending Stock" value={profile.summary.pendingStockTransfers} icon={Truck} tone="warning" />
        <StatCard label="Stock Received" value={profile.summary.acceptedStockTransfers} icon={Truck} tone="success" />
        <StatCard label="Units Received" value={profile.summary.acceptedStockQuantity} icon={Package} tone="brand" />
      </div>

      <div>
        <h3 className="mb-3 text-base font-semibold text-fg">Transaction history</h3>
        <DataTable columns={salesColumns} rows={sales ?? []} keyField={(r) => r.id} emptyMessage="No sales in this period." />
      </div>

      <div>
        <h3 className="mb-3 text-base font-semibold text-fg">Stock activity</h3>
        <DataTable
          columns={stockColumns}
          rows={stockActivity ?? []}
          keyField={(r) => r.id}
          emptyMessage="No stock transfers recorded for this Counter."
        />
      </div>
    </div>
  );
}
