import { useMemo, useState } from 'react';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DataTable, type Column } from '../../components/DataTable';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import type { BusinessDay } from '../../lib/types';
import { useBusinessDays, useReopenDay } from './hooks';

type StatusFilter = 'CLOSED' | 'OPEN' | 'ALL';

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function BusinessDaysCard() {
  const { data: days } = useBusinessDays();
  const reopenDay = useReopenDay();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('CLOSED');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedDay, setSelectedDay] = useState<BusinessDay | null>(null);

  const filtered = useMemo(() => {
    if (!days) return [];
    return days.filter((d) => {
      if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;
      if (dateFilter && d.date !== dateFilter) return false;
      return true;
    });
  }, [days, statusFilter, dateFilter]);

  const columns: Column<BusinessDay>[] = [
    { key: 'date', header: 'Date', render: (d) => formatDate(d.date) },
    {
      key: 'status',
      header: 'Status',
      render: (d) => <Badge tone={d.status === 'CLOSED' ? 'danger' : 'success'}>{d.status === 'CLOSED' ? 'Closed' : 'Open'}</Badge>,
    },
    {
      key: 'closed',
      header: 'Closed',
      render: (d) => (d.closedAt ? `${formatDateTime(d.closedAt)}${d.closedBy ? ` by ${d.closedBy.name}` : ''}` : '—'),
    },
    {
      key: 'reopened',
      header: 'Reopened',
      render: (d) => (d.reopenedAt ? `${formatDateTime(d.reopenedAt)}${d.reopenedBy ? ` by ${d.reopenedBy.name}` : ''}` : '—'),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (d) =>
        d.status === 'CLOSED' ? (
          <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => setSelectedDay(d)}>
            Reopen
          </Button>
        ) : (
          <span className="text-fg-subtle">—</span>
        ),
    },
  ];

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="mb-1 text-base font-semibold text-fg">Business days</h2>
      <p className="mb-4 text-sm text-fg-muted">
        Find a closed day and reopen it so its transactions can be edited or deleted again.
      </p>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
          <option value="CLOSED">Closed only</option>
          <option value="OPEN">Open only</option>
          <option value="ALL">All</option>
        </Select>
        <Input label="Find a date" type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        keyField={(d) => d.id}
        emptyMessage={dateFilter || statusFilter !== 'ALL' ? 'No days match this filter.' : 'No business days yet.'}
      />

      <ConfirmDialog
        open={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        onConfirm={async () => {
          if (!selectedDay) return;
          await reopenDay.mutateAsync(selectedDay.id);
          setSelectedDay(null);
        }}
        title={selectedDay ? `Reopen ${formatDate(selectedDay.date)}?` : 'Reopen this day?'}
        message="This will allow transactions on this date to be edited or deleted again. The reopening action is recorded in the audit log."
        confirmLabel="Reopen day"
        loading={reopenDay.isPending}
      />
    </div>
  );
}
