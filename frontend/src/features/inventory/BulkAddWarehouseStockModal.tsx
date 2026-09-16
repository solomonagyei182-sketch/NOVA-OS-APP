import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, ArrowLeft, Boxes } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Button } from '../../components/Button';
import { useBulkRows } from '../../lib/useBulkRows';
import { useBulkDraft } from '../../lib/useBulkDraft';
import { useAddWarehouseStockBulk, useProducts } from './hooks';

type BulkStockRow = { productId: string; quantity: string };

function makeEmptyRow(): BulkStockRow {
  return { productId: '', quantity: '' };
}

export function BulkAddWarehouseStockModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: products } = useProducts();
  const addBulk = useAddWarehouseStockBulk();
  const { rows, addRow, removeRow, updateRow, resetRows, setRows } = useBulkRows(makeEmptyRow);
  const draft = useBulkDraft<BulkStockRow>('warehouse-stock-in');
  const [step, setStep] = useState<'edit' | 'review'>('edit');
  const [draftBanner, setDraftBanner] = useState(false);

  useEffect(() => {
    if (open) {
      setStep('edit');
      if (draft.loadDraft()) setDraftBanner(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const rowErrors = useMemo(() => {
    const errors: Record<number, string> = {};
    rows.forEach((row, i) => {
      if (!row.productId) {
        errors[i] = 'Product is required.';
        return;
      }
      const quantity = Number(row.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        errors[i] = 'Quantity must be a whole number greater than zero.';
      }
    });
    return errors;
  }, [rows]);
  const hasErrors = Object.keys(rowErrors).length > 0;

  const summary = useMemo(() => {
    const totalQuantity = rows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
    return { count: rows.length, totalQuantity };
  }, [rows]);

  function restoreDraft() {
    const d = draft.loadDraft();
    if (d) setRows(d.rows);
    setDraftBanner(false);
  }

  async function recordAll() {
    try {
      await addBulk.mutateAsync(rows.map((r) => ({ productId: r.productId, quantity: Number(r.quantity) })));
      draft.clearDraft();
      resetRows();
      setStep('edit');
      onClose();
    } catch {
      setStep('edit');
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={step === 'edit' ? 'Bulk Entry — Warehouse stock-in' : 'Review Bulk Entry'} size="xl">
      {step === 'edit' && (
        <div className="flex flex-col gap-4">
          {draftBanner && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-500/30 bg-brand-tint p-3 text-sm text-brand-tint-fg">
              <span>You have a saved draft.</span>
              <div className="flex gap-2">
                <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => { draft.clearDraft(); setDraftBanner(false); }}>
                  Discard
                </Button>
                <Button className="!px-3 !py-1.5 text-xs" onClick={restoreDraft}>
                  Restore
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            {rows.map((row, index) => (
              <div
                key={index}
                className={`flex flex-col gap-2.5 rounded-xl border p-3 sm:flex-row sm:items-center ${rowErrors[index] ? 'border-danger-500/40 bg-danger-tint/30' : 'border-border bg-surface'}`}
              >
                <span className="text-xs text-fg-subtle sm:w-6">{index + 1}</span>
                <div className="flex-1">
                  <Select
                    aria-label="Product"
                    value={row.productId}
                    onChange={(e) => updateRow(index, { productId: e.target.value })}
                  >
                    <option value="">Select product</option>
                    {products?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="sm:w-40">
                  <Input
                    aria-label="Quantity"
                    type="number"
                    min={1}
                    placeholder="Quantity"
                    value={row.quantity}
                    onChange={(e) => updateRow(index, { quantity: e.target.value })}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  disabled={rows.length <= 1}
                  className="self-end rounded-lg p-2 text-fg-subtle hover:bg-danger-tint hover:text-danger-500 disabled:cursor-not-allowed disabled:opacity-40 sm:self-center"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {Object.entries(rowErrors).length > 0 && (
            <div className="rounded-xl border border-danger-500/30 bg-danger-tint p-3 text-sm text-danger-500">
              {Object.entries(rowErrors)
                .slice(0, 5)
                .map(([i, msg]) => (
                  <div key={i}>
                    Row {Number(i) + 1} — {msg}
                  </div>
                ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="secondary" onClick={addRow}>
              <Plus size={16} />
              Add row
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => { draft.saveDraft(rows); setDraftBanner(false); }}>
                Save Draft
              </Button>
              <Button onClick={() => setStep('review')} disabled={hasErrors}>
                Review batch
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-surface-2 p-3">
              <div className="flex items-center gap-1.5 text-xs text-fg-subtle">
                <Boxes size={13} /> Products
              </div>
              <div className="mt-1 text-lg font-semibold text-fg">{summary.count}</div>
            </div>
            <div className="rounded-xl border border-border bg-surface-2 p-3">
              <div className="text-xs text-fg-subtle">Total quantity</div>
              <div className="mt-1 text-lg font-semibold text-fg">{summary.totalQuantity}</div>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 border-b border-border bg-surface-2 text-left text-xs font-medium uppercase tracking-wide text-fg-subtle">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {rows.map((row, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-fg-subtle">{i + 1}</td>
                    <td className="px-3 py-2 text-fg">{products?.find((p) => p.id === row.productId)?.name ?? '—'}</td>
                    <td className="px-3 py-2 text-fg">{row.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="secondary" onClick={() => setStep('edit')}>
              <ArrowLeft size={16} />
              Back &amp; Edit
            </Button>
            <Button onClick={recordAll} loading={addBulk.isPending}>
              Record All
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
