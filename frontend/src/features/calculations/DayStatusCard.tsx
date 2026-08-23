import { useState } from 'react';
import { Lock, LockOpen } from 'lucide-react';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useAuth } from '../auth/AuthContext';
import { useCloseDay, useReopenDay, useTodayBusinessDay } from './hooks';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function DayStatusCard() {
  const { user } = useAuth();
  const { data: day } = useTodayBusinessDay();
  const closeDay = useCloseDay();
  const reopenDay = useReopenDay();
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmReopen, setConfirmReopen] = useState(false);

  if (!day) return null;

  const isClosed = day.status === 'CLOSED';

  return (
    <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${isClosed ? 'bg-danger-tint text-danger-tint-fg' : 'bg-success-tint text-success-tint-fg'}`}
        >
          {isClosed ? <Lock size={18} /> : <LockOpen size={18} />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-fg">Today's transactions</span>
            <Badge tone={isClosed ? 'danger' : 'success'}>{isClosed ? 'Closed' : 'Open'}</Badge>
          </div>
          <p className="text-xs text-fg-subtle">
            {isClosed && day.closedAt
              ? `Closed ${formatDateTime(day.closedAt)}`
              : 'New sales are being recorded normally.'}
          </p>
        </div>
      </div>

      {!isClosed && (
        <Button variant="secondary" onClick={() => setConfirmClose(true)}>
          Close transactions for the day
        </Button>
      )}
      {isClosed && user?.role === 'MANAGER' && (
        <Button variant="secondary" onClick={() => setConfirmReopen(true)}>
          Reopen day
        </Button>
      )}

      <ConfirmDialog
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={async () => {
          await closeDay.mutateAsync();
          setConfirmClose(false);
        }}
        title="Close today's transactions?"
        message="Are you sure you want to close today's transactions? Sales will be locked from accidental changes until a manager reopens the day. Historical data is never deleted."
        confirmLabel="Close transactions"
        loading={closeDay.isPending}
      />

      <ConfirmDialog
        open={confirmReopen}
        onClose={() => setConfirmReopen(false)}
        onConfirm={async () => {
          await reopenDay.mutateAsync(day.id);
          setConfirmReopen(false);
        }}
        title="Reopen this day?"
        message="This will allow new sales to be recorded again for this date. The reopening action is recorded in the audit log."
        confirmLabel="Reopen day"
        loading={reopenDay.isPending}
      />
    </div>
  );
}
