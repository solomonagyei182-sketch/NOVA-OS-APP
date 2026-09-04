import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { Search, Eye, MapPin } from 'lucide-react';
import { Badge } from '../../components/Badge';
import { DataTable, type Column } from '../../components/DataTable';
import { useCounters } from './hooks';
import type { CounterOverview } from '../../lib/types';

const statusPills: { value: 'ALL' | 'ACTIVE' | 'INACTIVE'; label: string }[] = [
  { value: 'ALL', label: 'All Counters' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string | null) {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function AdminCountersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const { data: counters, isLoading } = useCounters({ search, status });

  const columns: Column<CounterOverview>[] = [
    { key: 'name', header: 'Counter', render: (r) => <span className="font-medium text-fg">{r.name}</span> },
    { key: 'email', header: 'Email', render: (r) => r.email },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <Badge tone={r.isActive ? 'success' : 'danger'}>{r.isActive ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'location',
      header: 'Last known location',
      render: (r) =>
        r.lastKnownLocation ? (
          <span className="flex items-center gap-1 text-xs">
            <MapPin size={12} className="text-fg-subtle" />
            {r.lastKnownLocation.address ?? `${r.lastKnownLocation.latitude.toFixed(4)}, ${r.lastKnownLocation.longitude.toFixed(4)}`}
          </span>
        ) : (
          '—'
        ),
    },
    { key: 'totalTransactions', header: 'Transactions', render: (r) => r.totalTransactions },
    { key: 'totalSales', header: 'Total sales', render: (r) => formatMoney(r.totalSales) },
    {
      key: 'stock',
      header: 'Stock (pending / received)',
      render: (r) => `${r.pendingStockCount} / ${r.acceptedStockCount}`,
    },
    { key: 'lastLoginAt', header: 'Last active', render: (r) => formatDate(r.lastLoginAt) },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <button
          onClick={() => navigate(`/admin/counters/${r.id}`)}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-600 hover:bg-surface-2"
          aria-label={`View ${r.name}`}
        >
          <Eye size={14} />
          View profile
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-fg">Counters</h2>
        <p className="text-sm text-fg-muted">
          Every Counter account, their activity, and a complete audit trail from stock receipt to sale.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative max-w-md">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <input
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3.5 text-sm text-fg outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {statusPills.map((p) => (
            <button
              key={p.value}
              onClick={() => setStatus(p.value)}
              className={clsx(
                'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                status === p.value
                  ? 'bg-brand-600 text-white'
                  : 'bg-surface text-fg-muted border border-border hover:bg-surface-2',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-fg-muted">Loading Counters…</p>
      ) : (
        <DataTable columns={columns} rows={counters ?? []} keyField={(r) => r.id} emptyMessage="No Counter accounts found." />
      )}
    </div>
  );
}
