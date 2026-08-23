import { useEffect, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
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
        'fixed inset-0 z-50 flex items-center justify-center bg-fg/40 p-4 transition-opacity duration-150',
        visible ? 'opacity-100' : 'opacity-0',
      )}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={clsx(
          'w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl transition-all duration-150',
          visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-95 opacity-0',
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-fg">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-fg-subtle hover:bg-surface-2 hover:text-fg"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
