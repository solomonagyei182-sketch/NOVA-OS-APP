import clsx from 'clsx';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const toneClasses: Record<Tone, string> = {
  success: 'bg-success-tint text-success-tint-fg',
  warning: 'bg-warning-tint text-warning-tint-fg',
  danger: 'bg-danger-tint text-danger-tint-fg',
  info: 'bg-info-tint text-info-tint-fg',
  neutral: 'bg-surface-2 text-fg-muted',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}
