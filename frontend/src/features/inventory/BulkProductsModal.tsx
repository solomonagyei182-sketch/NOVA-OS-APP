import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, ArrowLeft, Package } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useBulkRows } from '../../lib/useBulkRows';
import { useBulkDraft } from '../../lib/useBulkDraft';
import { useCreateProductsBulk } from './hooks';

type BulkProductRow = {
  name: string;
  newCompanyName: string;
  category: string;
  costPrice: string;
  sellingPrice: string;
  lowStockThreshold: string;
};

function makeEmptyRow(): BulkProductRow {
  return { name: '', newCompanyName: '', category: '', costPrice: '', sellingPrice: '', lowStockThreshold: '10' };
}

export function BulkProductsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createBulk = useCreateProductsBulk();
  const { rows, addRow, removeRow, updateRow, resetRows, setRows } = useBulkRows(makeEmptyRow);
  const draft = useBulkDraft<BulkProductRow>('products');
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
      if (!row.name.trim()) {
        errors[i] = 'Product name is required.';
        return;
      }
      if (row.costPrice && Number(row.costPrice) < 0) {
        errors[i] = 'Cost price cannot be negative.';
        return;
      }
      if (row.sellingPrice && Number(row.sellingPrice) < 0) {
        errors[i] = 'Selling price cannot be negative.';
      }
    });
    return errors;
  }, [rows]);
  const hasErrors = Object.keys(rowErrors).length > 0;

  function restoreDraft() {
    const d = draft.loadDraft();
    if (d) setRows(d.rows);
    setDraftBanner(false);
  }

  async function recordAll() {
    try {
      await createBulk.mutateAsync(
        rows.map((r) => ({
          name: r.name.trim(),
          newCompanyName: r.newCompanyName.trim() || undefined,
          category: r.category.trim() || undefined,
          costPrice: r.costPrice ? Number(r.costPrice) : undefined,
          sellingPrice: r.sellingPrice ? Number(r.sellingPrice) : undefined,
          lowStockThreshold: r.lowStockThreshold ? Number(r.lowStockThreshold) : undefined,
        })),
      );
      draft.clearDraft();
      resetRows();
      setStep('edit');
      onClose();
    } catch {
      setStep('edit');
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={step === 'edit' ? 'Bulk Entry — Products' : 'Review Bulk Entry'} size="xl">
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

          <div className="flex flex-col gap-3">
            {rows.map((row, index) => (
              <div
                key={index}
                className={`rounded-xl border p-3 ${rowErrors[index] ? 'border-danger-500/40 bg-danger-tint/30' : 'border-border bg-surface'}`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-fg-subtle">Row {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    disabled={rows.length <= 1}
                    className="rounded-lg p-1.5 text-fg-subtle hover:bg-danger-tint hover:text-danger-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  <Input aria-label="Product name" placeholder="Product name" value={row.name} onChange={(e) => updateRow(index, { name: e.target.value })} />
                  <Input aria-label="Company" placeholder="Company (optional)" value={row.newCompanyName} onChange={(e) => updateRow(index, { newCompanyName: e.target.value })} />
                  <Input aria-label="Category" placeholder="Category (optional)" value={row.category} onChange={(e) => updateRow(index, { category: e.target.value })} />
                  <Input aria-label="Cost price" type="number" step="0.01" placeholder="Cost price" value={row.costPrice} onChange={(e) => updateRow(index, { costPrice: e.target.value })} />
                  <Input aria-label="Selling price" type="number" step="0.01" placeholder="Selling price" value={row.sellingPrice} onChange={(e) => updateRow(index, { sellingPrice: e.target.value })} />
                  <Input aria-label="Low-stock threshold" type="number" placeholder="Low-stock threshold" value={row.lowStockThreshold} onChange={(e) => updateRow(index, { lowStockThreshold: e.target.value })} />
                </div>
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
          <div className="rounded-xl border border-border bg-surface-2 p-3">
            <div className="flex items-center gap-1.5 text-xs text-fg-subtle">
              <Package size={13} /> Products to add
            </div>
            <div className="mt-1 text-lg font-semibold text-fg">{rows.length}</div>
          </div>

          <div className="max-h-80 overflow-y-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 border-b border-border bg-surface-2 text-left text-xs font-medium uppercase tracking-wide text-fg-subtle">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Company</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Cost</th>
                  <th className="px-3 py-2">Selling</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {rows.map((row, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-fg-subtle">{i + 1}</td>
                    <td className="px-3 py-2 text-fg">{row.name}</td>
                    <td className="px-3 py-2 text-fg">{row.newCompanyName || '—'}</td>
                    <td className="px-3 py-2 text-fg">{row.category || '—'}</td>
                    <td className="px-3 py-2 text-fg">{row.costPrice || '—'}</td>
                    <td className="px-3 py-2 text-fg">{row.sellingPrice || '—'}</td>
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
