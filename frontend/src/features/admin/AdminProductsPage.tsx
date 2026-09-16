import { useState } from 'react';
import clsx from 'clsx';
import { Plus, Search, Pencil, ClipboardList, Archive, ArchiveRestore, Trash2, History } from 'lucide-react';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Select } from '../../components/Select';
import { DataTable, type Column } from '../../components/DataTable';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { RowActionsMenu } from '../../components/RowActionsMenu';
import { RecordHistoryModal } from '../../components/RecordHistoryModal';
import { EntryModeModal } from '../../components/EntryModeModal';
import { useProducts } from '../../lib/queries';
import { useActiveCompanies, useDeleteProduct, useUpdateProduct } from '../inventory/hooks';
import { ProductFormModal } from './ProductFormModal';
import { BulkProductsModal } from '../inventory/BulkProductsModal';
import { CorrectStockModal } from './CorrectStockModal';
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
  const [companyFilter, setCompanyFilter] = useState('ALL');
  const [entryModeOpen, setEntryModeOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const [correctingProduct, setCorrectingProduct] = useState<Product | undefined>(undefined);
  const [archiveTarget, setArchiveTarget] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [historyProduct, setHistoryProduct] = useState<Product | undefined>(undefined);

  const { data: products } = useProducts(search);
  const { data: companies } = useActiveCompanies();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const filtered = (products ?? []).filter(
    (p) =>
      (statusFilter === 'ALL' || p.status === statusFilter) &&
      (companyFilter === 'ALL' || p.companyId === companyFilter),
  );

  function openAdd() {
    setEditingProduct(undefined);
    setEntryModeOpen(true);
  }

  function openEdit(product: Product) {
    setEditingProduct(product);
    setFormOpen(true);
  }

  async function confirmToggleStatus() {
    if (!archiveTarget) return;
    await updateProduct.mutateAsync({
      id: archiveTarget.id,
      data: { status: archiveTarget.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' },
    });
    setArchiveTarget(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await deleteProduct.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  const columns: Column<Product>[] = [
    { key: 'name', header: 'Product', render: (r) => <span className="font-medium text-fg">{r.name}</span> },
    { key: 'company', header: 'Company', render: (r) => r.company?.name ?? '—' },
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
      render: (r) => {
        const historyCount = r._count
          ? r._count.sales + r._count.stockTransfers + r._count.stockMovements + r._count.stockRequests
          : 0;
        const hasHistory = r._count ? historyCount > 0 : true; // unknown _count → assume history, safest default
        return (
          <RowActionsMenu
            label={`Actions for ${r.name}`}
            actions={[
              { label: 'Edit details', icon: Pencil, onClick: () => openEdit(r) },
              { label: 'Correct stock', icon: ClipboardList, onClick: () => setCorrectingProduct(r) },
              {
                label: r.status === 'ACTIVE' ? 'Archive (stop selling)' : 'Reactivate',
                icon: r.status === 'ACTIVE' ? Archive : ArchiveRestore,
                onClick: () => setArchiveTarget(r),
              },
              { label: 'History', icon: History, onClick: () => setHistoryProduct(r) },
              {
                label: 'Delete permanently',
                icon: Trash2,
                tone: 'danger',
                onClick: () => setDeleteTarget(r),
                disabled: hasHistory,
                disabledReason: 'This product has transaction history — archive it instead to preserve those records.',
              },
            ]}
          />
        );
      },
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

        <div className="flex flex-wrap items-center gap-2">
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
          <Select
            aria-label="Filter by company"
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="!w-auto"
          >
            <option value="ALL">All companies</option>
            {companies?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <DataTable columns={columns} rows={filtered} keyField={(r) => r.id} emptyMessage="No products found." />

      <EntryModeModal
        open={entryModeOpen}
        onClose={() => setEntryModeOpen(false)}
        title="Add product — choose entry method"
        onChooseSingle={() => {
          setEntryModeOpen(false);
          setFormOpen(true);
        }}
        onChooseBulk={() => {
          setEntryModeOpen(false);
          setBulkOpen(true);
        }}
      />
      <ProductFormModal open={formOpen} onClose={() => setFormOpen(false)} product={editingProduct} />
      <BulkProductsModal open={bulkOpen} onClose={() => setBulkOpen(false)} />
      <CorrectStockModal
        open={Boolean(correctingProduct)}
        onClose={() => setCorrectingProduct(undefined)}
        product={correctingProduct}
      />
      <RecordHistoryModal
        open={Boolean(historyProduct)}
        onClose={() => setHistoryProduct(undefined)}
        title={`History — ${historyProduct?.name ?? ''}`}
        entityType="Product"
        entityId={historyProduct?.id}
      />

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={confirmToggleStatus}
        title={archiveTarget?.status === 'ACTIVE' ? 'Archive product?' : 'Reactivate product?'}
        message={
          archiveTarget?.status === 'ACTIVE'
            ? `"${archiveTarget?.name}" will no longer be available for new sales, but its previous transaction history will remain.`
            : `"${archiveTarget?.name}" will become available for sale again.`
        }
        confirmLabel={archiveTarget?.status === 'ACTIVE' ? 'Archive' : 'Reactivate'}
        loading={updateProduct.isPending}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete product?"
        message={`Are you sure you want to permanently delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete Product"
        loading={deleteProduct.isPending}
        danger
      />
    </div>
  );
}
