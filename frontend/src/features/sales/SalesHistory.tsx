import { useMemo, useState } from 'react';
import { Search, Pencil, History, Trash2, Plus, Receipt } from 'lucide-react';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { DataTable, type Column } from '../../components/DataTable';
import { RowActionsMenu } from '../../components/RowActionsMenu';
import { RecordHistoryModal } from '../../components/RecordHistoryModal';
import { useActiveResellers, useProducts } from '../../lib/queries';
import { useAuth } from '../auth/AuthContext';
import { useSales, type SalesFilters } from './hooks';
import { CorrectSaleModal } from './CorrectSaleModal';
import { DeleteSaleModal } from './DeleteSaleModal';
import { AddHistoricalTransactionModal } from './AddHistoricalTransactionModal';
import type { Sale } from '../../lib/types';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function todayInput() {
  return new Date().toLocaleDateString('en-CA');
}

export function SalesHistory() {
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';
  const [filters, setFilters] = useState<SalesFilters>({ sortBy: 'transactionDate', sortDir: 'desc' });
  const { data: products } = useProducts();
  const { data: resellers } = useActiveResellers();
  const salesQuery = useSales(filters);
  const [correcting, setCorrecting] = useState<Sale | null>(null);
  const [deleting, setDeleting] = useState<Sale | null>(null);
  const [historySale, setHistorySale] = useState<Sale | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  function updateFilter<K extends keyof SalesFilters>(key: K, value: SalesFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  }

  function canModify(sale: Sale) {
    if (sale.status === 'DELETED') return false;
    if (sale.day.status === 'CLOSED') return false;
    return isManager || sale.counterUserId === user?.id;
  }

  function disabledReason(sale: Sale) {
    if (sale.status === 'DELETED') return 'This transaction has already been deleted.';
    if (sale.day.status === 'CLOSED') return 'This day is closed. Ask a manager to reopen it first.';
    return 'You can only modify your own transactions.';
  }

  const isSingleDateSelected = Boolean(filters.dateFrom && filters.dateFrom === filters.dateTo);
  const rows = salesQuery.data ?? [];
  const summary = useMemo(() => {
    const active = rows.filter((r) => r.status === 'ACTIVE');
    return { count: active.length, total: active.reduce((sum, r) => sum + r.price, 0) };
  }, [rows]);

  const columns: Column<Sale>[] = [
    { key: 'transactionId', header: 'Transaction ID', render: (r) => <span className="font-mono text-xs">{r.transactionId}</span> },
    { key: 'reseller', header: 'Reseller', render: (r) => r.reseller?.fullName ?? '—' },
    { key: 'product', header: 'Product', render: (r) => r.product.name },
    { key: 'quantity', header: 'Qty', render: (r) => r.quantity },
    { key: 'price', header: 'Total', render: (r) => formatMoney(r.price) },
    { key: 'commission', header: 'Reseller Commission', render: (r) => formatMoney(r.commission) },
    { key: 'counterUser', header: 'Recorded by', render: (r) => r.counterUser.name },
    { key: 'transactionDate', header: 'Transaction date', render: (r) => formatDate(r.transactionDate) },
    { key: 'createdAt', header: 'Entered', render: (r) => formatDateTime(r.createdAt) },
    {
      key: 'status',
      header: 'Status',
      render: (r) =>
        r.status === 'DELETED' ? (
          <Badge tone="danger">Deleted</Badge>
        ) : (
          <Badge tone="success">Active</Badge>
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <RowActionsMenu
          label={`Actions for ${r.transactionId}`}
          actions={[
            {
              label: 'Correct transaction',
              icon: Pencil,
              onClick: () => setCorrecting(r),
              disabled: !canModify(r),
              disabledReason: disabledReason(r),
            },
            {
              label: 'Delete transaction',
              icon: Trash2,
              tone: 'danger',
              onClick: () => setDeleting(r),
              disabled: !canModify(r),
              disabledReason: disabledReason(r),
            },
            {
              label: 'History',
              icon: History,
              onClick: () => setHistorySale(r),
              hidden: !isManager && r.counterUserId !== user?.id,
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-fg">Transaction History</h2>
          <p className="text-sm text-fg-muted">
            Find past transactions, add a missed sale to an earlier date, or correct/delete an existing one.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus size={16} />
          Add historical transaction
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <input
            placeholder="Search by transaction ID, product, or reseller"
            className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3.5 text-sm text-fg outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            onChange={(e) => updateFilter('search', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          <Select
            aria-label="Filter by product"
            onChange={(e) => updateFilter('productId', e.target.value)}
            defaultValue=""
          >
            <option value="">All products</option>
            {products?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>

          <Select
            aria-label="Filter by reseller"
            onChange={(e) => updateFilter('resellerId', e.target.value)}
            defaultValue=""
          >
            <option value="">All resellers</option>
            {resellers?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.fullName}
              </option>
            ))}
          </Select>

          <Input type="date" aria-label="From date" onChange={(e) => updateFilter('dateFrom', e.target.value)} />
          <Input type="date" aria-label="To date" onChange={(e) => updateFilter('dateTo', e.target.value)} />

          <Select
            aria-label="Status"
            onChange={(e) => updateFilter('status', e.target.value as SalesFilters['status'])}
            defaultValue=""
          >
            <option value="">Active only</option>
            <option value="DELETED">Deleted only</option>
            <option value="ALL">All (active + deleted)</option>
          </Select>

          <Select
            aria-label="Sort by"
            onChange={(e) => updateFilter('sortBy', e.target.value as SalesFilters['sortBy'])}
            defaultValue="transactionDate"
          >
            <option value="transactionDate">Sort: Transaction date</option>
            <option value="price">Sort: Price</option>
            <option value="commission">Sort: Commission</option>
          </Select>

          <Select
            aria-label="Sort direction"
            onChange={(e) => updateFilter('sortDir', e.target.value as SalesFilters['sortDir'])}
            defaultValue="desc"
          >
            <option value="desc">Newest / highest first</option>
            <option value="asc">Oldest / lowest first</option>
          </Select>
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-brand-tint px-4 py-3">
          <Receipt size={18} className="shrink-0 text-brand-tint-fg" />
          <div className="text-sm text-brand-tint-fg">
            {isSingleDateSelected ? (
              <>
                <span className="font-semibold">{formatDate(`${filters.dateFrom}T00:00:00`)}</span> — {summary.count}{' '}
                transaction{summary.count === 1 ? '' : 's'} · Total Sales: {formatMoney(summary.total)}
              </>
            ) : (
              <>
                {summary.count} transaction{summary.count === 1 ? '' : 's'} shown · Total Sales:{' '}
                {formatMoney(summary.total)}
              </>
            )}
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        keyField={(r) => r.id}
        emptyMessage="No transactions found for these filters."
      />

      <AddHistoricalTransactionModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        defaultDate={isSingleDateSelected && filters.dateFrom ? filters.dateFrom : todayInput()}
      />
      <CorrectSaleModal sale={correcting} onClose={() => setCorrecting(null)} />
      <DeleteSaleModal sale={deleting} onClose={() => setDeleting(null)} />
      <RecordHistoryModal
        open={Boolean(historySale)}
        onClose={() => setHistorySale(null)}
        title={`History — ${historySale?.transactionId ?? ''}`}
        entityType="Sale"
        entityId={historySale?.id}
      />
    </div>
  );
}
