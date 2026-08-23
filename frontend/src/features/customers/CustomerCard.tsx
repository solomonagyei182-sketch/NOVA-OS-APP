import { Mail, Phone, Pencil } from 'lucide-react';
import { Badge } from '../../components/Badge';
import type { Customer } from '../../lib/types';

const tierLabel = { TIER_1: 'Tier 1', TIER_2: 'Tier 2', TIER_3: 'Tier 3' } as const;
const tierTone = { TIER_1: 'neutral', TIER_2: 'info', TIER_3: 'success' } as const;

function formatDate(iso: string | null) {
  if (!iso) return 'No interactions yet';
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export function CustomerCard({ customer, onEdit }: { customer: Customer; onEdit: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold text-fg-muted">
            {customer.fullName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-fg">{customer.fullName}</div>
            <Badge tone={tierTone[customer.tier]}>{tierLabel[customer.tier]}</Badge>
          </div>
        </div>
        <button
          onClick={onEdit}
          className="rounded-lg p-1.5 text-fg-subtle hover:bg-surface-2 hover:text-fg"
          aria-label={`Edit ${customer.fullName}`}
        >
          <Pencil size={16} />
        </button>
      </div>

      <div className="flex flex-col gap-1.5 text-sm text-fg-muted">
        {customer.email && (
          <div className="flex items-center gap-2">
            <Mail size={14} className="text-fg-subtle" />
            {customer.email}
          </div>
        )}
        {customer.phone && (
          <div className="flex items-center gap-2">
            <Phone size={14} className="text-fg-subtle" />
            {customer.phone}
          </div>
        )}
        {customer.notes && <p className="text-xs text-fg-subtle">{customer.notes}</p>}
      </div>

      <div className="border-t border-border pt-3 text-xs text-fg-subtle">
        Last interaction: {formatDate(customer.lastInteractionAt)}
      </div>
    </div>
  );
}
