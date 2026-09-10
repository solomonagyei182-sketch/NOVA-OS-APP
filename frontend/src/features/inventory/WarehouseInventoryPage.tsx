import { useState } from 'react';
import clsx from 'clsx';
import { Plus, ArrowRightLeft, Truck } from 'lucide-react';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { DataTable, type Column } from '../../components/DataTable';
import {
  useMovements,
  usePendingStockRequests,
  useShopStock,
  useWarehouseStock,
} from './hooks';
import { AddWarehouseStockModal } from './AddWarehouseStockModal';
import { TransferToShopModal } from './TransferToShopModal';
import { DispatchStockModal } from './DispatchStockModal';
import { FulfillStockRequestModal } from './FulfillStockRequestModal';
import type { ShopStockItem, StockMovement, StockRequest, StockStatus, WarehouseStockItem } from '../../lib/types';

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

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

type Tab = 'warehouse' | 'shop' | 'requests' | 'movements';

// This page is only ever rendered for a Manager (see InventoryPage.tsx) —
// warehouse stock, warehouse stock-in, and direct shop transfers are
// Manager-only both here and, more importantly, on the backend endpoints
// themselves, so a Counter can never reach this view or its data.
export function WarehouseInventoryPage() {
  const [tab, setTab] = useState<Tab>('warehouse');
  const [addStockOpen, setAddStockOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [fulfilling, setFulfilling] = useState<StockRequest | null>(null);

  const shopQuery = useShopStock();
  const warehouseQuery = useWarehouseStock();
  const movementsQuery = useMovements();
  const pendingRequestsQuery = usePendingStockRequests();

  const pendingCount = pendingRequestsQuery.data?.length ?? 0;

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
  ];

  const warehouseColumns: Column<WarehouseStockItem>[] = [
    { key: 'name', header: 'Product', render: (r) => <span className="font-medium text-fg">{r.name}</span> },
    { key: 'sku', header: 'SKU', render: (r) => r.sku ?? '—' },
    { key: 'quantity', header: 'Quantity', render: (r) => r.quantity },
    { key: 'updatedAt', header: 'Last updated', render: (r) => formatDateTime(r.updatedAt) },
  ];

  const movementColumns: Column<StockMovement>[] = [
    { key: 'product', header: 'Product', render: (r) => <span className="font-medium text-fg">{r.product.name}</span> },
    {
      key: 'type',
      header: 'Movement',
      render: (r) => (
        <Badge tone={r.type === 'WAREHOUSE_IN' ? 'info' : 'success'}>
          {r.type === 'WAREHOUSE_IN' ? 'Warehouse stock-in' : 'Transferred to shop'}
        </Badge>
      ),
    },
    { key: 'quantity', header: 'Quantity', render: (r) => r.quantity },
    { key: 'performedBy', header: 'Performed by', render: (r) => r.performedBy.name },
    { key: 'createdAt', header: 'Date & time', render: (r) => formatDateTime(r.createdAt) },
  ];

  const requestColumns: Column<StockRequest>[] = [
    { key: 'requestId', header: 'Reference', render: (r) => <span className="font-mono text-xs">{r.requestId}</span> },
    { key: 'product', header: 'Product', render: (r) => <span className="font-medium text-fg">{r.product.name}</span> },
    { key: 'quantity', header: 'Quantity', render: (r) => r.quantity },
    { key: 'requestedBy', header: 'Requested by', render: (r) => r.requestedBy.name },
    { key: 'createdAt', header: 'Requested', render: (r) => formatDateTime(r.createdAt) },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <Button className="!px-3 !py-1.5 text-xs" onClick={() => setFulfilling(r)}>
          Fulfill
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Inventory</h1>
          <p className="text-sm text-fg-muted">Warehouse and shop stock, transfers, and requests.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setAddStockOpen(true)}>
            <Plus size={16} />
            Warehouse stock-in
          </Button>
          <Button variant="secondary" onClick={() => setTransferOpen(true)}>
            <ArrowRightLeft size={16} />
            Transfer to shop
          </Button>
          <Button onClick={() => setDispatchOpen(true)}>
            <Truck size={16} />
            Dispatch to Counter
          </Button>
        </div>
      </div>

      <div className="scroll-fade-x flex w-fit gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-1">
        {(
          [
            ['warehouse', 'Warehouse'],
            ['shop', 'Stocks in Shop'],
            ['requests', 'Stock Requests'],
            ['movements', 'Stock In History'],
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
            {value === 'requests' && pendingCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-warning-tint px-1 text-xs font-semibold text-warning-tint-fg">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'warehouse' && (
        <DataTable
          columns={warehouseColumns}
          rows={warehouseQuery.data ?? []}
          keyField={(r) => r.id}
          emptyMessage="No products yet. Add products from Admin Dashboard → Products."
        />
      )}
      {tab === 'shop' && (
        <DataTable
          columns={shopColumns}
          rows={shopQuery.data ?? []}
          keyField={(r) => r.id}
          emptyMessage="No products yet. Add products from Admin Dashboard → Products."
        />
      )}
      {tab === 'requests' && (
        <DataTable
          columns={requestColumns}
          rows={pendingRequestsQuery.data ?? []}
          keyField={(r) => r.id}
          emptyMessage="No stock requests awaiting a decision."
        />
      )}
      {tab === 'movements' && (
        <DataTable
          columns={movementColumns}
          rows={movementsQuery.data ?? []}
          keyField={(r) => r.id}
          emptyMessage="No stock movements recorded yet."
        />
      )}

      <AddWarehouseStockModal open={addStockOpen} onClose={() => setAddStockOpen(false)} />
      <TransferToShopModal open={transferOpen} onClose={() => setTransferOpen(false)} />
      <DispatchStockModal open={dispatchOpen} onClose={() => setDispatchOpen(false)} />
      <FulfillStockRequestModal request={fulfilling} onClose={() => setFulfilling(null)} />
    </div>
  );
}
