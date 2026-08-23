import { useState } from 'react';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Pencil, Eye } from 'lucide-react';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { DataTable, type Column } from '../../components/DataTable';
import { useResellers, useUpdateReseller } from '../resellers/hooks';
import { ResellerFormModal } from './ResellerFormModal';
import type { ResellerListItem, ResellerStatus } from '../../lib/types';

const statusPills: { value: ResellerStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All resellers' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export function AdminResellersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ResellerStatus | 'ALL'>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editingReseller, setEditingReseller] = useState<ResellerListItem | undefined>(undefined);

  const { data: resellers } = useResellers({ search, status });
  const updateReseller = useUpdateReseller();

  function openAdd() {
    setEditingReseller(undefined);
    setFormOpen(true);
  }

  function openEdit(reseller: ResellerListItem) {
    setEditingReseller(reseller);
    setFormOpen(true);
  }

  function toggleStatus(reseller: ResellerListItem) {
    updateReseller.mutate({
      id: reseller.id,
      data: { status: reseller.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' },
    });
  }

  const columns: Column<ResellerListItem>[] = [
    { key: 'fullName', header: 'Reseller', render: (r) => <span className="font-medium text-fg">{r.fullName}</span> },
    { key: 'phone', header: 'Phone', render: (r) => r.phone ?? '—' },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <Badge tone={r.status === 'ACTIVE' ? 'success' : 'neutral'}>{r.status === 'ACTIVE' ? 'Active' : 'Inactive'}</Badge>,
    },
    { key: 'transactionCount', header: 'Transactions', render: (r) => r.transactionCount },
    { key: 'totalPurchases', header: 'Total purchases', render: (r) => formatMoney(r.totalPurchases) },
    { key: 'totalCommission', header: 'Commission earned', render: (r) => formatMoney(r.totalCommission) },
    { key: 'lastPurchaseAt', header: 'Last purchase', render: (r) => formatDate(r.lastPurchaseAt) },
    { key: 'createdAt', header: 'Date added', render: (r) => formatDate(r.createdAt) },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/admin/resellers/${r.id}`)}
            className="rounded-lg p-1.5 text-fg-subtle hover:bg-surface-2 hover:text-fg"
            aria-label={`View ${r.fullName}`}
          >
            <Eye size={15} />
          </button>
          <button
            onClick={() => openEdit(r)}
            className="rounded-lg p-1.5 text-fg-subtle hover:bg-surface-2 hover:text-fg"
            aria-label={`Edit ${r.fullName}`}
          >
            <Pencil size={15} />
          </button>
          <Button variant="ghost" className="!px-2.5 !py-1 text-xs" onClick={() => toggleStatus(r)}>
            {r.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-fg">Resellers</h2>
          <p className="text-sm text-fg-muted">External buyers who purchase products to resell.</p>
        </div>
        <Button onClick={openAdd}>
          <Plus size={16} />
          Add reseller
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative max-w-md">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <input
            placeholder="Search by name, email, or phone"
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

      <DataTable columns={columns} rows={resellers ?? []} keyField={(r) => r.id} emptyMessage="No resellers found." />

      <ResellerFormModal open={formOpen} onClose={() => setFormOpen(false)} reseller={editingReseller} />
    </div>
  );
}
