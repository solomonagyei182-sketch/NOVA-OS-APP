import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, RotateCcw, ArrowLeft, Receipt } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Button } from '../../components/Button';
import { useActiveProducts, useActiveResellers } from '../../lib/queries';
import { useBulkRows } from '../../lib/useBulkRows';
import { useBulkDraft } from '../../lib/useBulkDraft';
import { useCreateSalesBulk } from './hooks';

type BulkSaleRow = {
  resellerId: string;
  productId: string;
  quantity: string;
  unitPrice: string;
  commission: string;
  transactionDate: string;
  reason: string;
};

function todayInput() {
  return new Date().toLocaleDateString('en-CA');
}

function makeEmptyRow(): BulkSaleRow {
  return { resellerId: '', productId: '', quantity: '1', unitPrice: '', commission: '0', transactionDate: todayInput(), reason: '' };
}

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function BulkSalesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: products } = useActiveProducts();
  const { data: resellers } = useActiveResellers();
  const createBulk = useCreateSalesBulk();
  const { rows, addRow, removeRow, updateRow, clearRow, resetRows, setRows } = useBulkRows(makeEmptyRow);
  const draft = useBulkDraft<BulkSaleRow>('sales');
  const [step, setStep] = useState<'edit' | 'review'>('edit');
  const [draftBanner, setDraftBanner] = useState(false);
  const today = todayInput();

  useEffect(() => {
    if (open) {
      setStep('edit');
      if (draft.loadDraft()) setDraftBanner(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function restoreDraft() {
    const d = draft.loadDraft();
    if (d) setRows(d.rows);
    setDraftBanner(false);
  }

  function discardDraft() {
    draft.clearDraft();
    setDraftBanner(false);
  }

  function saveDraftNow() {
    draft.saveDraft(rows);
    setDraftBanner(false);
  }

  // Row-level validation — the same rules the server enforces (server has the
  // final say, especially on stock, since it's checked atomically there).
  const rowErrors = useMemo(() => {
    const errors: Record<number, string> = {};
    const cumulativeQtyByProduct: Record<string, number> = {};

    rows.forEach((row, i) => {
      if (!row.productId) {
        errors[i] = 'Product is required.';
        return;
      }
      if (!row.resellerId) {
        errors[i] = 'Reseller is required.';
        return;
      }
      const quantity = Number(row.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        errors[i] = 'Quantity must be a whole number greater than zero.';
        return;
      }
      const unitPrice = Number(row.unitPrice);
      if (!row.unitPrice || !(unitPrice > 0)) {
        errors[i] = 'Unit price is required.';
        return;
      }
      const commission = Number(row.commission);
      if (row.commission !== '' && (Number.isNaN(commission) || commission < 0)) {
        errors[i] = 'Commission cannot be negative.';
        return;
      }
      if (!row.transactionDate) {
        errors[i] = 'Transaction date is required.';
        return;
      }
      if (row.transactionDate > today) {
        errors[i] = 'Transaction date cannot be in the future.';
        return;
      }
      if (row.transactionDate !== today && row.reason.trim().length < 3) {
        errors[i] = 'A reason (min 3 characters) is required for a past date.';
        return;
      }

      const product = products?.find((p) => p.id === row.productId);
      if (product) {
        cumulativeQtyByProduct[row.productId] = (cumulativeQtyByProduct[row.productId] ?? 0) + quantity;
        if (cumulativeQtyByProduct[row.productId] > product.shopQty) {
          errors[i] = `Quantity exceeds available stock (${product.shopQty} in shop, across these rows).`;
        }
      }
    });

    return errors;
  }, [rows, products, today]);

  const hasErrors = Object.keys(rowErrors).length > 0;

  const summary = useMemo(() => {
    const totalQuantity = rows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
    const totalSales = rows.reduce((sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0), 0);
    const totalCommission = rows.reduce((sum, r) => sum + (Number(r.commission) || 0), 0);
    return { count: rows.length, totalQuantity, totalSales, totalCommission };
  }, [rows]);

  function goToReview() {
    if (hasErrors) return;
    setStep('review');
  }

  async function recordAll() {
    try {
      await createBulk.mutateAsync(
        rows.map((r) => ({
          productId: r.productId,
          resellerId: r.resellerId,
          quantity: Number(r.quantity),
          unitPrice: Number(r.unitPrice),
          commission: Number(r.commission) || 0,
          transactionDate: r.transactionDate,
          reason: r.transactionDate !== today ? r.reason.trim() : undefined,
        })),
      );
      draft.clearDraft();
      resetRows();
      setStep('edit');
      onClose();
    } catch {
      // toast already shown by the mutation's onError; stay on review so the user can see what to fix
      setStep('edit');
    }
  }

  function handleClose() {
    onClose();
  }

  function productOptions() {
    return products?.map((p) => (
      <option key={p.id} value={p.id} disabled={p.shopQty <= 0}>
        {p.name} ({p.shopQty} in shop{p.shopQty <= 0 ? ' — out of stock' : ''})
      </option>
    ));
  }

  function rowFields(row: BulkSaleRow, index: number) {
    return {
      reseller: (
        <Select
          aria-label="Reseller"
          value={row.resellerId}
          onChange={(e) => updateRow(index, { resellerId: e.target.value })}
        >
          <option value="">Select reseller</option>
          {resellers?.map((r) => (
            <option key={r.id} value={r.id}>
              {r.fullName}
            </option>
          ))}
        </Select>
      ),
      product: (
        <Select
          aria-label="Product"
          value={row.productId}
          onChange={(e) => {
            const p = products?.find((x) => x.id === e.target.value);
            updateRow(index, { productId: e.target.value, unitPrice: p?.sellingPrice ? String(p.sellingPrice) : row.unitPrice });
          }}
        >
          <option value="">Select product</option>
          {productOptions()}
        </Select>
      ),
      quantity: (
        <Input
          aria-label="Quantity"
          type="number"
          min={1}
          value={row.quantity}
          onChange={(e) => updateRow(index, { quantity: e.target.value })}
        />
      ),
      unitPrice: (
        <Input
          aria-label="Unit price"
          type="number"
          step="0.01"
          placeholder="0.00"
          value={row.unitPrice}
          onChange={(e) => updateRow(index, { unitPrice: e.target.value })}
        />
      ),
      commission: (
        <Input
          aria-label="Commission"
          type="number"
          step="0.01"
          placeholder="0.00"
          value={row.commission}
          onChange={(e) => updateRow(index, { commission: e.target.value })}
        />
      ),
      date: (
        <Input
          aria-label="Transaction date"
          type="date"
          max={today}
          value={row.transactionDate}
          onChange={(e) => updateRow(index, { transactionDate: e.target.value })}
        />
      ),
      reason:
        row.transactionDate !== today ? (
          <Input
            aria-label="Reason for backdating"
            placeholder="Reason for past date"
            value={row.reason}
            onChange={(e) => updateRow(index, { reason: e.target.value })}
          />
        ) : null,
      total: formatMoney((Number(row.quantity) || 0) * (Number(row.unitPrice) || 0)),
    };
  }

  return (
    <Modal open={open} onClose={handleClose} title={step === 'edit' ? 'Bulk Entry — Sales' : 'Review Bulk Entry'} size="xl">
      {step === 'edit' && (
        <div className="flex flex-col gap-4">
          {draftBanner && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-500/30 bg-brand-tint p-3 text-sm text-brand-tint-fg">
              <span>You have a saved draft for Bulk Sales.</span>
              <div className="flex gap-2">
                <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={discardDraft}>
                  Discard
                </Button>
                <Button className="!px-3 !py-1.5 text-xs" onClick={restoreDraft}>
                  Restore
                </Button>
              </div>
            </div>
          )}

          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border border-border sm:block">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface-2 text-left text-xs font-medium uppercase tracking-wide text-fg-subtle">
                <tr>
                  <th className="px-3 py-2.5">#</th>
                  <th className="px-3 py-2.5">Product</th>
                  <th className="px-3 py-2.5">Reseller</th>
                  <th className="px-3 py-2.5">Qty</th>
                  <th className="px-3 py-2.5">Unit price</th>
                  <th className="px-3 py-2.5">Commission</th>
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5">Reason</th>
                  <th className="px-3 py-2.5">Total</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {rows.map((row, index) => {
                  const f = rowFields(row, index);
                  return (
                    <tr key={index} className={rowErrors[index] ? 'bg-danger-tint/40' : undefined}>
                      <td className="px-3 py-2 align-top text-fg-subtle">{index + 1}</td>
                      <td className="min-w-[10rem] px-3 py-2 align-top">{f.product}</td>
                      <td className="min-w-[9rem] px-3 py-2 align-top">{f.reseller}</td>
                      <td className="min-w-[5rem] px-3 py-2 align-top">{f.quantity}</td>
                      <td className="min-w-[6.5rem] px-3 py-2 align-top">{f.unitPrice}</td>
                      <td className="min-w-[6.5rem] px-3 py-2 align-top">{f.commission}</td>
                      <td className="min-w-[9rem] px-3 py-2 align-top">{f.date}</td>
                      <td className="min-w-[9rem] px-3 py-2 align-top">{f.reason}</td>
                      <td className="whitespace-nowrap px-3 py-2 align-top font-medium text-fg">{f.total}</td>
                      <td className="px-3 py-2 align-top">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => clearRow(index)}
                            title="Clear row"
                            className="rounded-lg p-1.5 text-fg-subtle hover:bg-surface-2 hover:text-fg"
                          >
                            <RotateCcw size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeRow(index)}
                            disabled={rows.length <= 1}
                            title="Remove row"
                            className="rounded-lg p-1.5 text-fg-subtle hover:bg-danger-tint hover:text-danger-500 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile stacked cards */}
          <div className="flex flex-col gap-3 sm:hidden">
            {rows.map((row, index) => {
              const f = rowFields(row, index);
              return (
                <div
                  key={index}
                  className={`rounded-xl border p-4 ${rowErrors[index] ? 'border-danger-500/40 bg-danger-tint/30' : 'border-border bg-surface'}`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-fg">Row {index + 1}</span>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => clearRow(index)} className="rounded-lg p-1.5 text-fg-subtle hover:bg-surface-2">
                        <RotateCcw size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        disabled={rows.length <= 1}
                        className="rounded-lg p-1.5 text-fg-subtle hover:bg-danger-tint hover:text-danger-500 disabled:opacity-40"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {f.product}
                    {f.reseller}
                    <div className="grid grid-cols-2 gap-2.5">
                      {f.quantity}
                      {f.unitPrice}
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {f.commission}
                      {f.date}
                    </div>
                    {f.reason}
                    <div className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-sm">
                      <span className="text-fg-subtle">Total</span>
                      <span className="font-semibold text-fg">{f.total}</span>
                    </div>
                  </div>
                </div>
              );
            })}
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
              {Object.keys(rowErrors).length > 5 && <div>…and {Object.keys(rowErrors).length - 5} more.</div>}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="secondary" onClick={addRow}>
              <Plus size={16} />
              Add row
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={saveDraftNow}>
                Save Draft
              </Button>
              <Button onClick={goToReview} disabled={hasErrors}>
                Review batch
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-surface-2 p-3">
              <div className="flex items-center gap-1.5 text-xs text-fg-subtle">
                <Receipt size={13} /> Total transactions
              </div>
              <div className="mt-1 text-lg font-semibold text-fg">{summary.count}</div>
            </div>
            <div className="rounded-xl border border-border bg-surface-2 p-3">
              <div className="text-xs text-fg-subtle">Total quantity</div>
              <div className="mt-1 text-lg font-semibold text-fg">{summary.totalQuantity}</div>
            </div>
            <div className="rounded-xl border border-border bg-surface-2 p-3">
              <div className="text-xs text-fg-subtle">Total sales</div>
              <div className="mt-1 text-lg font-semibold text-fg">{formatMoney(summary.totalSales)}</div>
            </div>
            <div className="rounded-xl border border-border bg-surface-2 p-3">
              <div className="text-xs text-fg-subtle">Commission total</div>
              <div className="mt-1 text-lg font-semibold text-fg">{formatMoney(summary.totalCommission)}</div>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 border-b border-border bg-surface-2 text-left text-xs font-medium uppercase tracking-wide text-fg-subtle">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Reseller</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Unit price</th>
                  <th className="px-3 py-2">Commission</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {rows.map((row, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-fg-subtle">{i + 1}</td>
                    <td className="px-3 py-2 text-fg">{products?.find((p) => p.id === row.productId)?.name ?? '—'}</td>
                    <td className="px-3 py-2 text-fg">{resellers?.find((r) => r.id === row.resellerId)?.fullName ?? '—'}</td>
                    <td className="px-3 py-2 text-fg">{row.quantity}</td>
                    <td className="px-3 py-2 text-fg">{formatMoney(Number(row.unitPrice) || 0)}</td>
                    <td className="px-3 py-2 text-fg">{formatMoney(Number(row.commission) || 0)}</td>
                    <td className="px-3 py-2 text-fg">{row.transactionDate}</td>
                    <td className="px-3 py-2 font-medium text-fg">
                      {formatMoney((Number(row.quantity) || 0) * (Number(row.unitPrice) || 0))}
                    </td>
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
            <Button onClick={recordAll} loading={createBulk.isPending}>
              Record All
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
