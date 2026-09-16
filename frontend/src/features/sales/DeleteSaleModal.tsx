import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useDeleteSale } from './hooks';
import type { Sale } from '../../lib/types';

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function DeleteSaleModal({ sale, onClose }: { sale: Sale | null; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const deleteSale = useDeleteSale();
  const trimmed = reason.trim();
  const valid = trimmed.length >= 3;

  async function handleDelete() {
    if (!sale || !valid) return;
    try {
      await deleteSale.mutateAsync({ id: sale.id, reason: trimmed });
      setReason('');
      onClose();
    } catch {
      // toast already shown by the mutation's onError
    }
  }

  function handleClose() {
    setReason('');
    onClose();
  }

  if (!sale) return null;

  return (
    <Modal open={Boolean(sale)} onClose={handleClose} title="Delete transaction?">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-xl bg-danger-tint p-3.5">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-danger-tint-fg" />
          <p className="text-sm text-danger-tint-fg">
            You are about to remove this transaction from the active transaction records. It will remain in the
            audit history but will no longer count toward sales, inventory, or commission totals.
          </p>
        </div>

        <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface-2 p-3.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-fg-subtle">Transaction</span>
            <span className="font-mono font-medium text-fg">{sale.transactionId}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-fg-subtle">Product</span>
            <span className="text-fg">{sale.product.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-fg-subtle">Amount</span>
            <span className="font-semibold text-fg">{formatMoney(sale.price)}</span>
          </div>
        </div>

        <Input
          label="Reason for deletion"
          placeholder="e.g. Duplicate transaction"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="danger" disabled={!valid} loading={deleteSale.isPending} onClick={handleDelete}>
            Delete Transaction
          </Button>
        </div>
      </div>
    </Modal>
  );
}
