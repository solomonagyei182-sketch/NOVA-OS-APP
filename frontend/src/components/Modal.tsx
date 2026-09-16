import { useEffect, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** 'md' (default) fits a normal form; 'xl' is for wide content like a bulk-entry table. */
  size?: 'md' | 'xl';
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className={clsx(
        'fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-fg/40 p-4 py-8 transition-opacity duration-150 sm:items-center',
        visible ? 'opacity-100' : 'opacity-0',
      )}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={clsx(
          'flex max-h-[calc(100dvh-4rem)] w-full flex-col rounded-2xl bg-surface shadow-xl transition-all duration-150',
          size === 'xl' ? 'max-w-4xl' : 'max-w-md',
          visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-95 opacity-0',
        )}
      >
        <div className="flex shrink-0 items-center justify-between p-6 pb-4">
          <h2 className="text-lg font-semibold text-fg">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-fg-subtle hover:bg-surface-2 hover:text-fg"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-6 pb-6">{children}</div>
      </div>
    </div>
  );
}
