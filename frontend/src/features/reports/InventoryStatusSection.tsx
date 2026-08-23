import { Boxes, Warehouse, Store, AlertTriangle, XCircle } from 'lucide-react';
import { StatCard } from '../../components/StatCard';
import { Badge } from '../../components/Badge';
import { DataTable, type Column } from '../../components/DataTable';
import { useInventoryStatusReport } from './hooks';
import type { StockMovement } from '../../lib/types';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function InventoryStatusSection() {
  const { data } = useInventoryStatusReport();
  if (!data) return null;

  const movementColumns: Column<StockMovement>[] = [
    { key: 'product', header: 'Product', render: (r) => r.product.name },
    {
      key: 'type',
      header: 'Movement',
      render: (r) => (
        <Badge tone={r.type === 'WAREHOUSE_IN' ? 'info' : 'success'}>
          {r.type === 'WAREHOUSE_IN' ? 'Warehouse stock-in' : 'Transferred to shop'}
        </Badge>
      ),
    },
    { key: 'quantity', header: 'Qty', render: (r) => r.quantity },
    { key: 'performedBy', header: 'By', render: (r) => r.performedBy.name },
    { key: 'createdAt', header: 'Date & time', render: (r) => formatDateTime(r.createdAt) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-fg">Inventory status</h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Total products" value={data.totalProducts} icon={Boxes} tone="brand" />
        <StatCard label="Warehouse stock" value={data.totalWarehouseStock} icon={Warehouse} tone="success" />
        <StatCard label="Shop stock" value={data.totalShopStock} icon={Store} tone="success" />
        <StatCard label="Low stock" value={data.lowStockProducts.length} icon={AlertTriangle} tone="warning" />
        <StatCard label="Out of stock" value={data.outOfStockProducts.length} icon={XCircle} tone="danger" />
      </div>

      {(data.lowStockProducts.length > 0 || data.outOfStockProducts.length > 0) && (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="mb-3 text-sm font-semibold text-fg">Needs attention</h3>
          <div className="flex flex-wrap gap-2">
            {data.lowStockProducts.map((p) => (
              <Badge key={p.id} tone="warning">
                {p.name} — {p.quantity} left
              </Badge>
            ))}
            {data.outOfStockProducts.map((p) => (
              <Badge key={p.id} tone="danger">
                {p.name} — out of stock
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="mb-3 text-sm font-semibold text-fg">Recent stock movements</h3>
        <DataTable
          columns={movementColumns}
          rows={data.recentMovements}
          keyField={(r) => r.id}
          emptyMessage="No stock movements yet."
        />
      </div>
    </div>
  );
}
