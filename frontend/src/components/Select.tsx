import { forwardRef, type SelectHTMLAttributes } from 'react';
import clsx from 'clsx';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className, id, children, ...props }, ref) => {
    const selectId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-fg-muted">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={clsx(
            'w-full rounded-lg border bg-surface px-3.5 py-2.5 text-sm text-fg outline-none transition-colors',
            'focus:border-brand-500 focus:ring-2 focus:ring-brand-100',
            error ? 'border-danger-500' : 'border-border',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        {error && <span className="text-xs text-danger-500">{error}</span>}
      </div>
    );
  },
);
Select.displayName = 'Select';
