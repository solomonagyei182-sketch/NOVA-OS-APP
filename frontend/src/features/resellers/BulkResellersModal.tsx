import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, ArrowLeft, Users } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useBulkRows } from '../../lib/useBulkRows';
import { useBulkDraft } from '../../lib/useBulkDraft';
import { useCreateResellersBulk } from './hooks';

type BulkResellerRow = { fullName: string; phone: string; email: string; address: string };

function makeEmptyRow(): BulkResellerRow {
  return { fullName: '', phone: '', email: '', address: '' };
}

export function BulkResellersModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createBulk = useCreateResellersBulk();
  const { rows, addRow, removeRow, updateRow, resetRows, setRows } = useBulkRows(makeEmptyRow);
  const draft = useBulkDraft<BulkResellerRow>('resellers');
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
      if (!row.fullName.trim()) {
        errors[i] = 'Name is required.';
        return;
      }
      if (row.email && !/^\S+@\S+\.\S+$/.test(row.email)) {
        errors[i] = 'Enter a valid email address.';
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
          fullName: r.fullName.trim(),
          phone: r.phone.trim() || undefined,
          email: r.email.trim() || undefined,
          address: r.address.trim() || undefined,
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
    <Modal open={open} onClose={onClose} title={step === 'edit' ? 'Bulk Entry — Resellers' : 'Review Bulk Entry'} size="xl">
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
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-4">
                  <Input aria-label="Full name" placeholder="Full name" value={row.fullName} onChange={(e) => updateRow(index, { fullName: e.target.value })} />
                  <Input aria-label="Phone" placeholder="Phone (optional)" value={row.phone} onChange={(e) => updateRow(index, { phone: e.target.value })} />
                  <Input aria-label="Email" type="email" placeholder="Email (optional)" value={row.email} onChange={(e) => updateRow(index, { email: e.target.value })} />
                  <Input aria-label="Location" placeholder="Location (optional)" value={row.address} onChange={(e) => updateRow(index, { address: e.target.value })} />
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
              <Users size={13} /> Resellers to add
            </div>
            <div className="mt-1 text-lg font-semibold text-fg">{rows.length}</div>
          </div>

          <div className="max-h-80 overflow-y-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 border-b border-border bg-surface-2 text-left text-xs font-medium uppercase tracking-wide text-fg-subtle">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {rows.map((row, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-fg-subtle">{i + 1}</td>
                    <td className="px-3 py-2 text-fg">{row.fullName}</td>
                    <td className="px-3 py-2 text-fg">{row.phone || '—'}</td>
                    <td className="px-3 py-2 text-fg">{row.email || '—'}</td>
                    <td className="px-3 py-2 text-fg">{row.address || '—'}</td>
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
