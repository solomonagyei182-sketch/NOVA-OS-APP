import { useState } from 'react';
import clsx from 'clsx';
import { Plus, Search, Pencil } from 'lucide-react';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { DataTable, type Column } from '../../components/DataTable';
import { useProducts } from '../../lib/queries';
import { useUpdateProduct } from '../inventory/hooks';
import { ProductFormModal } from './ProductFormModal';
import type { Product, ProductStatus } from '../../lib/types';

const statusPills: { value: ProductStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All products' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

function formatMoney(n: number | null) {
  if (n === null) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function AdminProductsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'ALL'>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);

  const { data: products } = useProducts(search);
  const updateProduct = useUpdateProduct();

  const filtered = (products ?? []).filter((p) => statusFilter === 'ALL' || p.status === statusFilter);

  function openAdd() {
    setEditingProduct(undefined);
    setFormOpen(true);
  }

  function openEdit(product: Product) {
    setEditingProduct(product);
    setFormOpen(true);
  }

  function toggleStatus(product: Product) {
    updateProduct.mutate({
      id: product.id,
      data: { status: product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' },
    });
  }

  const columns: Column<Product>[] = [
    { key: 'name', header: 'Product', render: (r) => <span className="font-medium text-fg">{r.name}</span> },
    { key: 'category', header: 'Category', render: (r) => r.category ?? '—' },
    { key: 'sellingPrice', header: 'Selling price', render: (r) => formatMoney(r.sellingPrice) },
    { key: 'shopQty', header: 'Shop stock', render: (r) => r.shopQty },
    { key: 'warehouseQty', header: 'Warehouse stock', render: (r) => r.warehouseQty },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <Badge tone={r.status === 'ACTIVE' ? 'success' : 'neutral'}>{r.status === 'ACTIVE' ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div className="flex gap-2">
          <button
            onClick={() => openEdit(r)}
            className="rounded-lg p-1.5 text-fg-subtle hover:bg-surface-2 hover:text-fg"
            aria-label={`Edit ${r.name}`}
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
          <h2 className="text-lg font-semibold text-fg">Products</h2>
          <p className="text-sm text-fg-muted">Add, edit, and manage which products are available for sale.</p>
        </div>
        <Button onClick={openAdd}>
          <Plus size={16} />
          Add product
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative max-w-md">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <input
            placeholder="Search products"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3.5 text-sm text-fg outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {statusPills.map((p) => (
            <button
              key={p.value}
              onClick={() => setStatusFilter(p.value)}
              className={clsx(
                'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                statusFilter === p.value
                  ? 'bg-brand-600 text-white'
                  : 'bg-surface text-fg-muted border border-border hover:bg-surface-2',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <DataTable columns={columns} rows={filtered} keyField={(r) => r.id} emptyMessage="No products found." />

      <ProductFormModal open={formOpen} onClose={() => setFormOpen(false)} product={editingProduct} />
    </div>
  );
}
