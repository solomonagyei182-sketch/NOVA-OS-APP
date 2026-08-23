import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import clsx from 'clsx';

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'brand',
  trend,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  tone?: 'brand' | 'success' | 'warning' | 'danger';
  /** Optional day-over-day percentage change, e.g. 12.5 or -4.2 */
  trend?: number;
}) {
  const toneClasses = {
    brand: 'bg-brand-tint text-brand-tint-fg',
    success: 'bg-success-tint text-success-tint-fg',
    warning: 'bg-warning-tint text-warning-tint-fg',
    danger: 'bg-danger-tint text-danger-tint-fg',
  }[tone];

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors">
      {Icon && (
        <div className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', toneClasses)}>
          <Icon size={18} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-xs text-fg-subtle">{label}</div>
        <div className="flex items-baseline gap-2">
          <div className="truncate text-lg font-semibold text-fg">{value}</div>
          {trend !== undefined && Number.isFinite(trend) && (
            <span
              className={clsx(
                'flex shrink-0 items-center gap-0.5 text-xs font-medium',
                trend >= 0 ? 'text-success-tint-fg' : 'text-danger-tint-fg',
              )}
            >
              {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(trend).toFixed(0)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
