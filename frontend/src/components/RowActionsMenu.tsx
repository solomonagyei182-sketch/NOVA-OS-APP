import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import clsx from 'clsx';

export type RowAction = {
  label: string;
  icon?: typeof MoreVertical;
  onClick: () => void;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  /** Shown as a title tooltip when disabled, explaining why. */
  disabledReason?: string;
  hidden?: boolean;
};

export function RowActionsMenu({ actions, label = 'Row actions' }: { actions: RowAction[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // A row near the bottom of the screen (very common on mobile, where a card
  // list fills the viewport) would otherwise open the menu straight off the
  // bottom edge — flip it upward whenever there isn't room below.
  useLayoutEffect(() => {
    if (!open || !containerRef.current || !menuRef.current) return;
    const triggerRect = containerRef.current.getBoundingClientRect();
    const menuHeight = menuRef.current.offsetHeight;
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    setOpenUpward(spaceBelow < menuHeight + 12 && triggerRect.top > menuHeight);
  }, [open]);

  const visible = actions.filter((a) => !a.hidden);
  if (visible.length === 0) return null;

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg p-1.5 text-fg-subtle hover:bg-surface-2 hover:text-fg"
        aria-label={label}
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <div
          ref={menuRef}
          className={clsx(
            'absolute right-0 z-30 w-52 rounded-xl border border-border bg-surface py-1.5 shadow-lg',
            openUpward ? 'bottom-full mb-1' : 'top-full mt-1',
          )}
        >
          {visible.map((action) => (
            <button
              key={action.label}
              disabled={action.disabled}
              title={action.disabled ? action.disabledReason : undefined}
              onClick={() => {
                setOpen(false);
                action.onClick();
              }}
              className={clsx(
                'flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                action.tone === 'danger'
                  ? 'text-danger-500 hover:bg-danger-tint'
                  : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
              )}
            >
              {action.icon && <action.icon size={15} className="shrink-0" />}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
