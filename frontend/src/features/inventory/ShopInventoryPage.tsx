import { useState } from 'react';
import clsx from 'clsx';
import { AlertTriangle, PackagePlus } from 'lucide-react';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { DataTable, type Column } from '../../components/DataTable';
import { useMyStockRequests, usePendingStockTransfers, useShopStock } from './hooks';
import { RequestStockModal } from './RequestStockModal';
import { AcceptStockModal } from './AcceptStockModal';
import type { ShopStockItem, StockRequest, StockRequestStatus, StockStatus, StockTransfer } from '../../lib/types';

const statusTone: Record<StockStatus, 'success' | 'warning' | 'danger'> = {
  IN_STOCK: 'success',
  LOW_STOCK: 'warning',
  OUT_OF_STOCK: 'danger',
};

const statusLabel: Record<StockStatus, string> = {
  IN_STOCK: 'In stock',
  LOW_STOCK: 'Low stock',
  OUT_OF_STOCK: 'Out of stock',
};

const requestStatusTone: Record<StockRequestStatus, 'success' | 'warning' | 'danger'> = {
  PENDING: 'warning',
  FULFILLED: 'success',
  CANCELLED: 'danger',
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

type Tab = 'shop' | 'requests' | 'receiving';

// This page is only ever rendered for a Counter (see InventoryPage.tsx).
// There is no warehouse tab, no warehouse data fetched, and no warehouse
// mutation available anywhere here — the workflow is strictly
// REQUEST → RECEIVE → SELL, matching what the backend actually permits a
// Counter to do.
export function ShopInventoryPage() {
  const [tab, setTab] = useState<Tab>('shop');
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestProductId, setRequestProductId] = useState<string | undefined>(undefined);
  const [accepting, setAccepting] = useState<StockTransfer | null>(null);

  const shopQuery = useShopStock();
  const myRequestsQuery = useMyStockRequests();
  const pendingQuery = usePendingStockTransfers();

  const outOfStock = (shopQuery.data ?? []).filter((item) => item.status === 'OUT_OF_STOCK');
  const pendingRequestCount = (myRequestsQuery.data ?? []).filter((r) => r.status === 'PENDING').length;
  const receivingCount = pendingQuery.data?.length ?? 0;

  function openRequestFor(productId?: string) {
    setRequestProductId(productId);
    setRequestOpen(true);
  }

  const shopColumns: Column<ShopStockItem>[] = [
    { key: 'name', header: 'Product', render: (r) => <span className="font-medium text-fg">{r.name}</span> },
    { key: 'sku', header: 'SKU', render: (r) => r.sku ?? '—' },
    { key: 'quantity', header: 'Quantity', render: (r) => r.quantity },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <Badge tone={statusTone[r.status]}>{statusLabel[r.status]}</Badge>,
    },
    { key: 'updatedAt', header: 'Last updated', render: (r) => formatDateTime(r.updatedAt) },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) =>
        r.status !== 'IN_STOCK' ? (
          <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => openRequestFor(r.id)}>
            Request stock
          </Button>
        ) : null,
    },
  ];

  const requestColumns: Column<StockRequest>[] = [
    { key: 'requestId', header: 'Reference', render: (r) => <span className="font-mono text-xs">{r.requestId}</span> },
    { key: 'product', header: 'Product', render: (r) => <span className="font-medium text-fg">{r.product.name}</span> },
    { key: 'quantity', header: 'Quantity', render: (r) => r.quantity },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <Badge tone={requestStatusTone[r.status]}>{r.status}</Badge>,
    },
    { key: 'createdAt', header: 'Requested', render: (r) => formatDateTime(r.createdAt) },
  ];

  const incomingColumns: Column<StockTransfer>[] = [
    { key: 'transferId', header: 'Reference', render: (r) => <span className="font-mono text-xs">{r.transferId}</span> },
    { key: 'product', header: 'Product', render: (r) => <span className="font-medium text-fg">{r.product.name}</span> },
    { key: 'quantity', header: 'Quantity', render: (r) => r.quantity },
    { key: 'dispatchedBy', header: 'Dispatched by', render: (r) => r.dispatchedBy.name },
    { key: 'createdAt', header: 'Dispatched', render: (r) => formatDateTime(r.createdAt) },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <Button className="!px-3 !py-1.5 text-xs" onClick={() => setAccepting(r)}>
          Accept stock
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Inventory</h1>
          <p className="text-sm text-fg-muted">Your shop's stock, requests, and incoming deliveries.</p>
        </div>
        <Button onClick={() => openRequestFor(undefined)}>
          <PackagePlus size={16} />
          Request stock
        </Button>
      </div>

      {outOfStock.length > 0 && (
        <div className="flex flex-col gap-2 rounded-2xl border border-danger-tint bg-danger-tint p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-danger-tint-fg">
            <AlertTriangle size={16} />
            Stock alert
          </div>
          {outOfStock.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-sm text-danger-tint-fg">
              <span>{item.name} is out of stock in your shop.</span>
              <Button variant="secondary" className="!px-3 !py-1 text-xs" onClick={() => openRequestFor(item.id)}>
                Request stock
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="scroll-fade-x flex w-fit gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-1">
        {(
          [
            ['shop', 'Stocks in Shop'],
            ['requests', 'Stock Requests'],
            ['receiving', 'Receiving'],
          ] as [Tab, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={clsx(
              'flex items-center gap-1.5 whitespace-nowrap rounded-md px-3.5 py-2 text-sm font-medium transition-colors',
              tab === value ? 'bg-brand-tint text-brand-tint-fg' : 'text-fg-muted hover:bg-surface-2',
            )}
          >
            {label}
            {value === 'requests' && pendingRequestCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-warning-tint px-1 text-xs font-semibold text-warning-tint-fg">
                {pendingRequestCount}
              </span>
            )}
            {value === 'receiving' && receivingCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-warning-tint px-1 text-xs font-semibold text-warning-tint-fg">
                {receivingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'shop' && (
        <DataTable
          columns={shopColumns}
          rows={shopQuery.data ?? []}
          keyField={(r) => r.id}
          emptyMessage="No products yet."
        />
      )}
      {tab === 'requests' && (
        <DataTable
          columns={requestColumns}
          rows={myRequestsQuery.data ?? []}
          keyField={(r) => r.id}
          emptyMessage="You haven't requested any stock yet."
        />
      )}
      {tab === 'receiving' && (
        <DataTable
          columns={incomingColumns}
          rows={pendingQuery.data ?? []}
          keyField={(r) => r.id}
          emptyMessage="No incoming stock awaiting acceptance."
        />
      )}

      <RequestStockModal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        initialProductId={requestProductId}
      />
      <AcceptStockModal transfer={accepting} onClose={() => setAccepting(null)} />
    </div>
  );
}
