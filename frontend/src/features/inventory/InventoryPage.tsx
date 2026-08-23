import { useState } from 'react';
import clsx from 'clsx';
import { Plus, ArrowRightLeft } from 'lucide-react';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { DataTable, type Column } from '../../components/DataTable';
import { useMovements, useShopStock, useWarehouseStock } from './hooks';
import { AddWarehouseStockModal } from './AddWarehouseStockModal';
import { TransferToShopModal } from './TransferToShopModal';
import type { ShopStockItem, StockMovement, StockStatus, WarehouseStockItem } from '../../lib/types';

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

type Tab = 'shop' | 'warehouse' | 'movements';

export function InventoryPage() {
  const [tab, setTab] = useState<Tab>('shop');
  const [addStockOpen, setAddStockOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const shopQuery = useShopStock();
  const warehouseQuery = useWarehouseStock();
  const movementsQuery = useMovements();

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
          <Button onClick={() => setTransferOpen(true)}>
            <ArrowRightLeft size={16} />
            Transfer to shop
          </Button>
        </div>
      </div>

      <div className="flex gap-1 rounded-lg border border-border bg-surface p-1 w-fit">
        {(
          [
            ['shop', 'Stocks in Shop'],
            ['warehouse', 'Warehouse'],
            ['movements', 'Stock In History'],
          ] as [Tab, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={clsx(
              'rounded-md px-3.5 py-2 text-sm font-medium transition-colors',
              tab === value ? 'bg-brand-tint text-brand-tint-fg' : 'text-fg-muted hover:bg-surface-2',
            )}
          >
            {label}
          </button>
        ))}
      </div>

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
    </div>
  );
}
