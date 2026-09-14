import { Modal } from './Modal';
import { EmptyState } from './EmptyState';
import { useRecordHistory } from '../features/admin/hooks';
import type { AuditLogEntry } from '../lib/types';

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

function humanizeKey(key: string) {
  const spaced = key.replace(/([A-Z])/g, ' $1').toLowerCase();
  return spaced[0].toUpperCase() + spaced.slice(1);
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return value.toLocaleString();
  return String(value);
}

function AuditDetails({ details }: { details: string | null }) {
  if (!details) return null;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(details);
  } catch {
    return <p className="mt-1.5 text-xs text-fg-subtle">{details}</p>;
  }

  const { reason, previous, new: next, changes, ...rest } = parsed as Record<string, unknown> & {
    reason?: string;
    previous?: Record<string, unknown>;
    new?: Record<string, unknown>;
    changes?: Record<string, { previous: unknown; new: unknown }>;
  };

  const comparisons: { key: string; previous: unknown; next: unknown }[] = [];
  if (previous && next && typeof previous === 'object' && typeof next === 'object') {
    for (const key of Object.keys(next)) {
      const p = previous[key];
      const n = next[key];
      if (JSON.stringify(p) !== JSON.stringify(n)) comparisons.push({ key, previous: p, next: n });
    }
  }
  if (changes && typeof changes === 'object') {
    for (const [key, diff] of Object.entries(changes)) {
      comparisons.push({ key, previous: diff.previous, next: diff.new });
    }
  }

  const restEntries = Object.entries(rest).filter(([, v]) => v !== undefined && v !== null && v !== '');

  if (!reason && comparisons.length === 0 && restEntries.length === 0) return null;

  return (
    <div className="mt-2 flex flex-col gap-2 text-xs">
      {typeof reason === 'string' && (
        <div className="rounded-lg bg-warning-tint px-2.5 py-1.5 text-warning-tint-fg">
          <span className="font-medium">Reason: </span>
          {reason}
        </div>
      )}
      {comparisons.length > 0 && (
        <div className="flex flex-col gap-1 rounded-lg bg-surface-2 p-2.5">
          {comparisons.map(({ key, previous: p, next: n }) => (
            <div key={key} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
              <span className="text-fg-subtle">{humanizeKey(key)}</span>
              <span>
                <span className="text-fg-subtle line-through">{formatValue(p)}</span>{' '}
                <span className="font-medium text-success-tint-fg">→ {formatValue(n)}</span>
              </span>
            </div>
          ))}
        </div>
      )}
      {restEntries.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-fg-subtle">
          {restEntries.map(([k, v]) => (
            <span key={k}>
              {humanizeKey(k)}: <span className="text-fg">{formatValue(v)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryRow({ entry }: { entry: AuditLogEntry }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-fg">{actionLabel(entry.action)}</span>
        <span className="text-xs text-fg-subtle">{formatDateTime(entry.createdAt)}</span>
      </div>
      <p className="mt-0.5 text-xs text-fg-subtle">By {entry.user.name}</p>
      <AuditDetails details={entry.details} />
    </div>
  );
}

export function RecordHistoryModal({
  open,
  onClose,
  title,
  entityType,
  entityId,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  entityType: string;
  entityId: string | undefined;
}) {
  const { data, isLoading } = useRecordHistory(entityType, entityId, open);
  const logs = data?.logs ?? [];

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-3">
        {isLoading && <p className="text-sm text-fg-subtle">Loading history…</p>}
        {!isLoading && logs.length === 0 && <EmptyState message="No recorded changes yet." />}
        {logs.map((entry) => (
          <HistoryRow key={entry.id} entry={entry} />
        ))}
      </div>
    </Modal>
  );
}
