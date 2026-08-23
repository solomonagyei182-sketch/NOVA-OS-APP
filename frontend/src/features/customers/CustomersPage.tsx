import { useState } from 'react';
import clsx from 'clsx';
import { Plus, Search } from 'lucide-react';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { useCustomers } from './hooks';
import { CustomerCard } from './CustomerCard';
import { CustomerFormModal } from './CustomerFormModal';
import type { Customer, CustomerTier } from '../../lib/types';

const tierPills: { value: CustomerTier | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All customers' },
  { value: 'TIER_1', label: 'Tier 1' },
  { value: 'TIER_2', label: 'Tier 2' },
  { value: 'TIER_3', label: 'Tier 3' },
];

export function CustomersPage() {
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState<CustomerTier | 'ALL'>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>(undefined);

  const { data: customers } = useCustomers({ search, tier });

  function openAdd() {
    setEditingCustomer(undefined);
    setFormOpen(true);
  }

  function openEdit(customer: Customer) {
    setEditingCustomer(customer);
    setFormOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Customers</h1>
          <p className="text-sm text-fg-muted">Customer profiles, tiers, and search.</p>
        </div>
        <Button onClick={openAdd}>
          <Plus size={16} />
          Add customer
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
          {tierPills.map((p) => (
            <button
              key={p.value}
              onClick={() => setTier(p.value)}
              className={clsx(
                'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                tier === p.value ? 'bg-brand-600 text-white' : 'bg-surface text-fg-muted border border-border hover:bg-surface-2',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {customers && customers.length === 0 && <EmptyState message="No customers found." />}

      {customers && customers.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {customers.map((c) => (
            <CustomerCard key={c.id} customer={c} onEdit={() => openEdit(c)} />
          ))}
        </div>
      )}

      <CustomerFormModal open={formOpen} onClose={() => setFormOpen(false)} customer={editingCustomer} />
    </div>
  );
}
