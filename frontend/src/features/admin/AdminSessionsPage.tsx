import { useState } from 'react';
import { Shield, Users as UsersIcon, Layers } from 'lucide-react';
import { StatCard } from '../../components/StatCard';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useActiveSessions, useDropSession } from './hooks';
import type { ActiveSession, SessionCapacity } from '../../lib/types';

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function formatCapacity({ active, max }: SessionCapacity) {
  return max === null ? `${active} (unlimited)` : `${active} / ${max}`;
}

function isAtCapacity({ active, max }: SessionCapacity) {
  return max !== null && active >= max;
}

function SessionGroup({
  title,
  sessions,
  onDrop,
}: {
  title: string;
  sessions: ActiveSession[];
  onDrop: (session: ActiveSession) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="mb-3 text-sm font-semibold text-fg">{title}</h3>
      {sessions.length === 0 ? (
        <p className="text-sm text-fg-subtle">No active sessions.</p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {sessions.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-fg">{s.name}</div>
                <div className="truncate text-xs text-fg-subtle">
                  {s.email} · Signed in {formatTime(s.createdAt)}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge tone="success">Active</Badge>
                <Button variant="danger" className="!px-2.5 !py-1 text-xs" onClick={() => onDrop(s)}>
                  Drop Session
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminSessionsPage() {
  const { data, isLoading } = useActiveSessions();
  const dropSession = useDropSession();
  const [target, setTarget] = useState<ActiveSession | null>(null);

  if (isLoading || !data) {
    return <div className="text-sm text-fg-muted">Loading active sessions…</div>;
  }

  const managers = data.sessions.filter((s) => s.role === 'MANAGER');
  const counters = data.sessions.filter((s) => s.role === 'COUNTER');

  async function confirmDrop() {
    if (!target) return;
    await dropSession.mutateAsync(target.id);
    setTarget(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-fg">Active Sessions</h2>
        <p className="text-sm text-fg-muted">
          Manager and Counter accounts both have no concurrent-session limit — any number of Manager or Counter
          accounts can be signed in at once, across any number of locations.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Manager"
          value={formatCapacity(data.capacity.manager)}
          icon={Shield}
          tone={isAtCapacity(data.capacity.manager) ? 'danger' : 'brand'}
        />
        <StatCard label="Counter" value={formatCapacity(data.capacity.counter)} icon={UsersIcon} tone="brand" />
        <StatCard label="Total Active" value={formatCapacity(data.capacity.total)} icon={Layers} tone="success" />
      </div>

      <SessionGroup
        title={`Manager (${formatCapacity({ active: managers.length, max: data.capacity.manager.max })})`}
        sessions={managers}
        onDrop={setTarget}
      />
      <SessionGroup
        title={`Counter (${formatCapacity({ active: counters.length, max: data.capacity.counter.max })})`}
        sessions={counters}
        onDrop={setTarget}
      />

      <ConfirmDialog
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        onConfirm={confirmDrop}
        title="Drop this session?"
        message={`This will immediately sign ${target?.name ?? 'this user'} out of Nova OS.`}
        confirmLabel="Drop Session"
        loading={dropSession.isPending}
        danger
      />
    </div>
  );
}
