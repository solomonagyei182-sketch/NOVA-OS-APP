import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Button } from '../../components/Button';
import { useActiveProducts, useActiveResellers } from '../../lib/queries';
import { useCreateSale } from './hooks';

function todayInput() {
  return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local time
}

const schema = z
  .object({
    resellerId: z.string().min(1, 'Select a reseller'),
    productId: z.string().min(1, 'Select a product'),
    quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
    unitPrice: z.coerce.number().min(0.01, 'Enter the unit price'),
    commission: z.coerce.number().min(0, 'Enter the commission amount'),
    transactionDate: z.string().min(1, 'Select the transaction date'),
    reason: z.string().trim().optional(),
  })
  .refine((v) => v.transactionDate <= todayInput(), {
    message: 'Transaction date cannot be in the future',
    path: ['transactionDate'],
  })
  .refine((v) => v.transactionDate === todayInput() || (v.reason && v.reason.length >= 3), {
    message: 'Explain why this past-dated transaction is being added',
    path: ['reason'],
  });

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function AddHistoricalTransactionModal({
  open,
  onClose,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  defaultDate: string;
}) {
  const { data: resellers } = useActiveResellers();
  const { data: products } = useActiveProducts();
  const createSale = useCreateSale();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    values: open
      ? {
          resellerId: '',
          productId: '',
          quantity: 1,
          unitPrice: 0,
          commission: 0,
          transactionDate: defaultDate,
          reason: '',
        }
      : undefined,
  });

  const selectedProductId = watch('productId');
  const selectedProduct = products?.find((p) => p.id === selectedProductId);
  const quantity = Number(watch('quantity')) || 0;
  const unitPrice = Number(watch('unitPrice')) || 0;
  const transactionDate = watch('transactionDate');
  const isHistorical = transactionDate !== todayInput();

  useEffect(() => {
    if (selectedProduct?.sellingPrice) {
      setValue('unitPrice', selectedProduct.sellingPrice);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductId]);

  async function onSubmit(values: FormOutput) {
    try {
      await createSale.mutateAsync(values);
      reset();
      onClose();
    } catch {
      // toast already shown by the mutation's onError
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add historical transaction">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <p className="text-xs text-fg-subtle">
          Use this to record a sale that actually happened but was never entered — for example, a transaction
          missed on a previous date. It uses the same sale record as a normal sale, just backdated.
        </p>

        <Input
          label="Transaction date"
          type="date"
          max={todayInput()}
          error={errors.transactionDate?.message}
          {...register('transactionDate')}
        />

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
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Quantity" type="number" error={errors.quantity?.message} {...register('quantity')} />
          <Input
            label="Unit price"
            type="number"
            step="0.01"
            placeholder="0.00"
            error={errors.unitPrice?.message}
            {...register('unitPrice')}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Reseller commission"
            type="number"
            step="0.01"
            placeholder="0.00"
            error={errors.commission?.message}
            {...register('commission')}
          />
          <div className="flex flex-col justify-end gap-1.5">
            <span className="text-sm font-medium text-fg-muted">Total</span>
            <div className="rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm font-semibold text-fg">
              {formatMoney(quantity * unitPrice)}
            </div>
          </div>
        </div>

        {isHistorical && (
          <Input
            label="Reason for adding this historical transaction"
            placeholder="e.g. Missed sale from this date"
            error={errors.reason?.message}
            {...register('reason')}
          />
        )}

        <Button type="submit" loading={isSubmitting} className="mt-1 w-full">
          {isHistorical ? 'Add historical transaction' : 'Add transaction'}
        </Button>
      </form>
    </Modal>
  );
}
