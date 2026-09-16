import { FilePlus2, ListPlus } from 'lucide-react';
import { Modal } from './Modal';

export function EntryModeModal({
  open,
  onClose,
  onChooseSingle,
  onChooseBulk,
  title = 'Choose entry method',
}: {
  open: boolean;
  onClose: () => void;
  onChooseSingle: () => void;
  onChooseBulk: () => void;
  title?: string;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-3">
        <button
          onClick={onChooseSingle}
          className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-brand-500 hover:bg-surface-2"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand-tint-fg">
            <FilePlus2 size={18} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-fg">Single Entry</span>
            <span className="block text-xs text-fg-muted">Enter one record at a time.</span>
          </span>
        </button>

        <button
          onClick={onChooseBulk}
          className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-brand-500 hover:bg-surface-2"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand-tint-fg">
            <ListPlus size={18} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-fg">Bulk Entry</span>
            <span className="block text-xs text-fg-muted">Enter multiple records at once.</span>
          </span>
        </button>
      </div>
    </Modal>
  );
}
