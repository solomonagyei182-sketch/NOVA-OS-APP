import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Button } from '../../components/Button';
import { useActiveResellers, useProducts } from '../../lib/queries';
import { useCorrectSale } from './hooks';
import type { Sale } from '../../lib/types';

const schema = z.object({
  resellerId: z.string().min(1, 'Select a reseller'),
  productId: z.string().min(1, 'Select a product'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  unitPrice: z.coerce.number().min(0.01, 'Enter the unit price'),
  commission: z.coerce.number().min(0, 'Enter the commission amount'),
  reason: z.string().trim().min(3, 'Explain the correction in a few words'),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function CorrectSaleModal({ sale, onClose }: { sale: Sale | null; onClose: () => void }) {
  const { data: products } = useProducts();
  // The active-only list (open to Counter too, unlike the full Manager-only
  // /resellers list) — if the sale's own reseller has since gone inactive,
  // it's added back in so the field never falls back to blank.
  const { data: activeResellers } = useActiveResellers();
  const resellers =
    sale && sale.resellerId && !activeResellers?.some((r) => r.id === sale.resellerId)
      ? [...(activeResellers ?? []), { id: sale.resellerId, fullName: sale.reseller?.fullName ?? 'Current reseller' }]
      : activeResellers;
  const correctSale = useCorrectSale();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    values: sale
      ? {
          resellerId: sale.resellerId ?? '',
          productId: sale.productId,
          quantity: sale.quantity,
          unitPrice: sale.unitPrice ?? sale.price / sale.quantity,
          commission: sale.commission,
          reason: '',
        }
      : undefined,
  });

  const quantity = Number(watch('quantity')) || 0;
  const unitPrice = Number(watch('unitPrice')) || 0;

  async function onSubmit(values: FormOutput) {
    if (!sale) return;
    try {
      await correctSale.mutateAsync({ id: sale.id, data: values });
      reset();
      onClose();
    } catch {
      // toast already shown by the mutation's onError
    }
  }

  if (!sale) return null;

  return (
    <Modal open={Boolean(sale)} onClose={onClose} title={`Correct sale — ${sale.transactionId}`}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <p className="text-xs text-fg-subtle">
          This updates the original transaction in place — inventory, calculations, reports, and commission all
          recalculate automatically. No duplicate transaction is created.
        </p>

        <Select label="Reseller" error={errors.resellerId?.message} {...register('resellerId')}>
          <option value="">Select reseller</option>
          {resellers?.map((r) => (
            <option key={r.id} value={r.id}>
              {r.fullName}
            </option>
          ))}
        </Select>

        <Select label="Product" error={errors.productId?.message} {...register('productId')}>
          <option value="">Select product</option>
          {products?.map((p) => (
            <option key={p.id} value={p.id} disabled={p.status !== 'ACTIVE' && p.id !== sale.productId}>
              {p.name}
              {p.status !== 'ACTIVE' ? ' (inactive)' : ''}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Quantity" type="number" error={errors.quantity?.message} {...register('quantity')} />
          <Input
            label="Unit price"
            type="number"
            step="0.01"
            error={errors.unitPrice?.message}
            {...register('unitPrice')}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Reseller commission"
            type="number"
            step="0.01"
            error={errors.commission?.message}
            {...register('commission')}
          />
          <div className="flex flex-col justify-end gap-1.5">
            <span className="text-sm font-medium text-fg-muted">New total</span>
            <div className="rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm font-semibold text-fg">
              {formatMoney(quantity * unitPrice)}
            </div>
          </div>
        </div>

        <Input
          label="Reason for correction"
          placeholder="e.g. Wrong quantity entered"
          error={errors.reason?.message}
          {...register('reason')}
        />

        <Button type="submit" loading={isSubmitting} className="mt-1 w-full">
          Save correction
        </Button>
      </form>
    </Modal>
  );
}
