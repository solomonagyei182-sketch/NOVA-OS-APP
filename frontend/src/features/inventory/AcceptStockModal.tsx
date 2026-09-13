import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { useAcceptStock } from './hooks';
import type { StockTransfer } from '../../lib/types';

export function AcceptStockModal({
  transfer,
  onClose,
}: {
  transfer: StockTransfer | null;
  onClose: () => void;
}) {
  const acceptStock = useAcceptStock();

  async function confirmAcceptance() {
    if (!transfer) return;
    try {
      await acceptStock.mutateAsync({ id: transfer.id });
      onClose();
    } catch {
      // toast already shown by the mutation's onError
    }
  }

  return (
    <Modal open={Boolean(transfer)} onClose={onClose} title="Accept incoming stock">
      {transfer && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-surface-2 p-4 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-fg-subtle">{transfer.transferId}</span>
            </div>
            <div className="mt-1 text-base font-semibold text-fg">{transfer.product.name}</div>
            <div className="mt-0.5 text-fg-muted">
              Quantity: <span className="font-medium text-fg">{transfer.quantity}</span>
            </div>
            <div className="mt-0.5 text-xs text-fg-subtle">Dispatched by {transfer.dispatchedBy.name}</div>
          </div>

          <Button
            type="button"
            onClick={confirmAcceptance}
            loading={acceptStock.isPending}
            className="w-full"
          >
            Confirm acceptance
          </Button>
        </div>
      )}
    </Modal>
  );
}
