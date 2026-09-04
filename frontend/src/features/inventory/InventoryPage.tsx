import { useState } from 'react';
import clsx from 'clsx';
import { Plus, ArrowRightLeft, Truck } from 'lucide-react';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { DataTable, type Column } from '../../components/DataTable';
import { useAuth } from '../auth/AuthContext';
import {
  useMovements,
  usePendingStockTransfers,
  useShopStock,
  useWarehouseStock,
} from './hooks';
import { AddWarehouseStockModal } from './AddWarehouseStockModal';
import { TransferToShopModal } from './TransferToShopModal';
import { DispatchStockModal } from './DispatchStockModal';
import { AcceptStockModal } from './AcceptStockModal';
import type { ShopStockItem, StockMovement, StockStatus, StockTransfer, WarehouseStockItem } from '../../lib/types';

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

type Tab = 'incoming' | 'shop' | 'warehouse' | 'movements';

export function InventoryPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('shop');
  const [addStockOpen, setAddStockOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [accepting, setAccepting] = useState<StockTransfer | null>(null);

  const shopQuery = useShopStock();
  const warehouseQuery = useWarehouseStock();
  const movementsQuery = useMovements();
  const pendingQuery = usePendingStockTransfers();

  const isManager = user?.role === 'MANAGER';
  const pendingCount = pendingQuery.data?.length ?? 0;

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
          <p className="text-sm text-fg-muted">Warehouse and shop stock, transfers, and alerts.</p>
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
          {isManager && (
            <Button onClick={() => setDispatchOpen(true)}>
              <Truck size={16} />
              Dispatch to Counter
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-1 w-fit">
        {(
          [
            ['incoming', 'Incoming Stock'],
            ['shop', 'Stocks in Shop'],
            ['warehouse', 'Warehouse'],
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
            {value === 'incoming' && pendingCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-warning-tint px-1 text-xs font-semibold text-warning-tint-fg">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'incoming' && (
        <DataTable
          columns={incomingColumns}
          rows={pendingQuery.data ?? []}
          keyField={(r) => r.id}
          emptyMessage="No incoming stock awaiting acceptance."
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
      {tab === 'warehouse' && (
        <DataTable
          columns={warehouseColumns}
          rows={warehouseQuery.data ?? []}
          keyField={(r) => r.id}
          emptyMessage="No products yet. Add products from Admin Dashboard → Products."
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
      {isManager && <DispatchStockModal open={dispatchOpen} onClose={() => setDispatchOpen(false)} />}
      <AcceptStockModal transfer={accepting} onClose={() => setAccepting(null)} />
    </div>
  );
}
