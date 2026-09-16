import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Button } from '../../components/Button';
import { useBulkRows } from '../../lib/useBulkRows';
import { useCreateStaffBulk } from './hooks';

type BulkStaffRow = { name: string; email: string; password: string; role: 'MANAGER' | 'COUNTER' };

function makeEmptyRow(): BulkStaffRow {
  return { name: '', email: '', password: '', role: 'COUNTER' };
}

// No draft persistence here on purpose — a draft would mean plaintext
// passwords sitting in localStorage between sessions, which is exactly the
// kind of insecure workaround the brief asked us not to introduce.
export function BulkStaffModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createBulk = useCreateStaffBulk();
  const { rows, addRow, removeRow, updateRow, resetRows } = useBulkRows(makeEmptyRow);
  const [step, setStep] = useState<'edit' | 'review'>('edit');

  useEffect(() => {
    if (open) setStep('edit');
  }, [open]);

  const rowErrors = useMemo(() => {
    const errors: Record<number, string> = {};
    const seenEmails = new Set<string>();
    rows.forEach((row, i) => {
      if (!row.name.trim()) {
        errors[i] = 'Name is required.';
        return;
      }
      if (!/^\S+@\S+\.\S+$/.test(row.email.trim())) {
        errors[i] = 'Enter a valid email address.';
        return;
      }
      const email = row.email.trim().toLowerCase();
      if (seenEmails.has(email)) {
        errors[i] = 'Duplicate email within this batch.';
        return;
      }
      seenEmails.add(email);
      if (row.password.length < 6) {
        errors[i] = 'Password must be at least 6 characters.';
      }
    });
    return errors;
  }, [rows]);
  const hasErrors = Object.keys(rowErrors).length > 0;

  async function recordAll() {
    try {
      await createBulk.mutateAsync(
        rows.map((r) => ({ name: r.name.trim(), email: r.email.trim(), password: r.password, role: r.role })),
      );
      resetRows();
      setStep('edit');
      onClose();
    } catch {
      setStep('edit');
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={step === 'edit' ? 'Bulk Entry — Staff accounts' : 'Review Bulk Entry'} size="xl">
      {step === 'edit' && (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-fg-subtle">
            Each account is created with the same security as a single account — hashed password, unique email required.
            Passwords are never stored or shown again after this screen, so make sure whoever will use each account has theirs.
          </p>

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
                  <Input aria-label="Full name" placeholder="Full name" value={row.name} onChange={(e) => updateRow(index, { name: e.target.value })} />
                  <Input aria-label="Email" type="email" placeholder="Email" value={row.email} onChange={(e) => updateRow(index, { email: e.target.value })} />
                  <Input aria-label="Password" type="password" placeholder="Password" value={row.password} onChange={(e) => updateRow(index, { password: e.target.value })} />
                  <Select aria-label="Role" value={row.role} onChange={(e) => updateRow(index, { role: e.target.value as 'MANAGER' | 'COUNTER' })}>
                    <option value="COUNTER">Counter</option>
                    <option value="MANAGER">Manager</option>
                  </Select>
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
            <Button onClick={() => setStep('review')} disabled={hasErrors}>
              Review batch
            </Button>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-surface-2 p-3">
            <div className="flex items-center gap-1.5 text-xs text-fg-subtle">
              <ShieldCheck size={13} /> Accounts to create
            </div>
            <div className="mt-1 text-lg font-semibold text-fg">{rows.length}</div>
          </div>

          <div className="max-h-80 overflow-y-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 border-b border-border bg-surface-2 text-left text-xs font-medium uppercase tracking-wide text-fg-subtle">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {rows.map((row, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-fg-subtle">{i + 1}</td>
                    <td className="px-3 py-2 text-fg">{row.name}</td>
                    <td className="px-3 py-2 text-fg">{row.email}</td>
                    <td className="px-3 py-2 text-fg">{row.role === 'MANAGER' ? 'Manager' : 'Counter'}</td>
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
