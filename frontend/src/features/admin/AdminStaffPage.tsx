import { useState } from 'react';
import clsx from 'clsx';
import { Plus, Search, Pencil } from 'lucide-react';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { DataTable, type Column } from '../../components/DataTable';
import { useAuth } from '../auth/AuthContext';
import { useStaffList, useUpdateStaff } from './hooks';
import { StaffFormModal } from './StaffFormModal';
import type { Role, StaffUser } from '../../lib/types';

const rolePills: { value: Role | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All staff' },
  { value: 'MANAGER', label: 'Managers' },
  { value: 'COUNTER', label: 'Counter' },
  { value: 'PENDING', label: 'Pending' },
];

const roleBadge: Record<Role, { tone: 'info' | 'neutral' | 'warning'; label: string }> = {
  MANAGER: { tone: 'info', label: 'Manager' },
  COUNTER: { tone: 'neutral', label: 'Counter' },
  PENDING: { tone: 'warning', label: 'Pending' },
};

function formatDateTime(iso: string | null) {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function AdminStaffPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<Role | 'ALL'>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | undefined>(undefined);

  const { data: staff } = useStaffList({ search, role });
  const updateStaff = useUpdateStaff();

  function openAdd() {
    setEditingStaff(undefined);
    setFormOpen(true);
  }

  function openEdit(member: StaffUser) {
    setEditingStaff(member);
    setFormOpen(true);
  }

  function toggleStatus(member: StaffUser) {
    updateStaff.mutate({ id: member.id, data: { isActive: !member.isActive } });
  }

  const columns: Column<StaffUser>[] = [
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium text-fg">{r.name}</span> },
    { key: 'email', header: 'Email', render: (r) => r.email },
    { key: 'role', header: 'Role', render: (r) => <Badge tone={roleBadge[r.role].tone}>{roleBadge[r.role].label}</Badge> },
    { key: 'isActive', header: 'Status', render: (r) => <Badge tone={r.isActive ? 'success' : 'danger'}>{r.isActive ? 'Active' : 'Inactive'}</Badge> },
    { key: 'lastLoginAt', header: 'Last active', render: (r) => formatDateTime(r.lastLoginAt) },
    { key: 'createdAt', header: 'Date added', render: (r) => formatDateTime(r.createdAt) },
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
          <Button
            variant="ghost"
            className="!px-2.5 !py-1 text-xs"
            disabled={r.id === user?.id}
            onClick={() => toggleStatus(r)}
          >
            {r.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-fg">Staff / Users</h2>
          <p className="text-sm text-fg-muted">Manage Manager and Counter accounts.</p>
        </div>
        <Button onClick={openAdd}>
          <Plus size={16} />
          Add staff
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative max-w-md">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <input
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3.5 text-sm text-fg outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {rolePills.map((p) => (
            <button
              key={p.value}
              onClick={() => setRole(p.value)}
              className={clsx(
                'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                role === p.value
                  ? 'bg-brand-600 text-white'
                  : 'bg-surface text-fg-muted border border-border hover:bg-surface-2',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <DataTable columns={columns} rows={staff ?? []} keyField={(r) => r.id} emptyMessage="No staff accounts found." />

      <StaffFormModal open={formOpen} onClose={() => setFormOpen(false)} staff={editingStaff} />
    </div>
  );
}
