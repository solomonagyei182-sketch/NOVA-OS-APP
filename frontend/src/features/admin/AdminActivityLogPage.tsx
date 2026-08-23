import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../components/Button';
import { DataTable, type Column } from '../../components/DataTable';
import { useAuditLogs } from './hooks';
import type { AuditLogEntry } from '../../lib/types';

const PAGE_SIZE = 20;

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function actionLabel(action: string) {
  return action
    .toLowerCase()
    .split('_')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

export function AdminActivityLogPage() {
  const [page, setPage] = useState(0);
  const { data } = useAuditLogs(PAGE_SIZE, page * PAGE_SIZE);

  const columns: Column<AuditLogEntry>[] = [
    { key: 'action', header: 'Action', render: (r) => <span className="font-medium text-fg">{actionLabel(r.action)}</span> },
    { key: 'user', header: 'User', render: (r) => r.user.name },
    { key: 'entityType', header: 'Related item', render: (r) => r.entityType },
    { key: 'createdAt', header: 'Date & time', render: (r) => formatDateTime(r.createdAt) },
  ];

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-fg">Activity log</h2>
        <p className="text-sm text-fg-muted">A record of important administrative and system actions.</p>
      </div>

      <DataTable
        columns={columns}
        rows={data?.logs ?? []}
        keyField={(r) => r.id}
        emptyMessage="No activity recorded yet."
      />

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-fg-subtle">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft size={16} />
              Previous
            </Button>
            <Button variant="secondary" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
