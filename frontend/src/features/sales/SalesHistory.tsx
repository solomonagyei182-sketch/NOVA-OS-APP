import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { DataTable, type Column } from '../../components/DataTable';
import { useActiveResellers, useProducts } from '../../lib/queries';
import { useSales, type SalesFilters } from './hooks';
import type { Sale } from '../../lib/types';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function SalesHistory() {
  const [filters, setFilters] = useState<SalesFilters>({ sortBy: 'createdAt', sortDir: 'desc' });
  const { data: products } = useProducts();
  const { data: resellers } = useActiveResellers();
  const salesQuery = useSales(filters);

  function updateFilter<K extends keyof SalesFilters>(key: K, value: SalesFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  }

  const columns: Column<Sale>[] = [
    { key: 'transactionId', header: 'Transaction ID', render: (r) => <span className="font-mono text-xs">{r.transactionId}</span> },
    { key: 'reseller', header: 'Reseller', render: (r) => r.reseller?.fullName ?? '—' },
    { key: 'product', header: 'Product', render: (r) => r.product.name },
    { key: 'quantity', header: 'Qty', render: (r) => r.quantity },
    { key: 'price', header: 'Total', render: (r) => formatMoney(r.price) },
    { key: 'commission', header: 'Reseller Commission', render: (r) => formatMoney(r.commission) },
    { key: 'counterUser', header: 'Recorded by', render: (r) => r.counterUser.name },
    { key: 'createdAt', header: 'Date & time', render: (r) => formatDateTime(r.createdAt) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <input
            placeholder="Search by transaction ID, product, or reseller"
            className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3.5 text-sm text-fg outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            onChange={(e) => updateFilter('search', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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
            aria-label="Sort by"
            onChange={(e) => updateFilter('sortBy', e.target.value as SalesFilters['sortBy'])}
            defaultValue="createdAt"
          >
            <option value="createdAt">Sort: Date</option>
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
      </div>

      <DataTable
        columns={columns}
        rows={salesQuery.data ?? []}
        keyField={(r) => r.id}
        emptyMessage="No sales recorded yet."
      />
    </div>
  );
}
