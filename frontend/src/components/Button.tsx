import { forwardRef, type ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const variantClasses: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-300',
  secondary:
    'bg-surface text-fg border border-border hover:bg-surface-2 active:bg-surface-2 disabled:text-fg-subtle',
  ghost: 'bg-transparent text-fg-muted hover:bg-surface-2 active:bg-surface-2 disabled:text-fg-subtle',
  danger: 'bg-danger-500 text-white hover:bg-red-700 active:bg-red-800 disabled:bg-red-300',
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', loading, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed',
          variantClasses[variant],
          className,
        )}
        {...props}
      >
        {loading && (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
