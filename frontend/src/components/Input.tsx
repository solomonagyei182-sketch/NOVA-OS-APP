import { forwardRef, type InputHTMLAttributes } from 'react';
import clsx from 'clsx';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-fg-muted">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'w-full rounded-lg border bg-surface px-3.5 py-2.5 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle',
            'focus:border-brand-500 focus:ring-2 focus:ring-brand-100',
            error ? 'border-danger-500' : 'border-border',
            className,
          )}
          {...props}
        />
        {error && <span className="text-xs text-danger-500">{error}</span>}
      </div>
    );
  },
);
Input.displayName = 'Input';
