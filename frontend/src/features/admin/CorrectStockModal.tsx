import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useCorrectStock } from '../inventory/hooks';
import type { Product } from '../../lib/types';

const schema = z.object({
  warehouseQty: z.coerce.number().int('Must be a whole number').min(0, 'Cannot be negative'),
  shopQty: z.coerce.number().int('Must be a whole number').min(0, 'Cannot be negative'),
  reason: z.string().trim().min(3, 'Explain the correction in a few words'),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

export function CorrectStockModal({
  open,
  onClose,
  product,
}: {
  open: boolean;
  onClose: () => void;
  product?: Product;
}) {
  const correctStock = useCorrectStock();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    values: product ? { warehouseQty: product.warehouseQty ?? 0, shopQty: product.shopQty, reason: '' } : undefined,
  });

  async function onSubmit(values: FormOutput) {
    if (!product) return;
    try {
      await correctStock.mutateAsync({ id: product.id, data: values });
      reset();
      onClose();
    } catch {
      // toast already shown by the mutation's onError
    }
  }

  if (!product) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Correct stock — ${product.name}`}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <p className="text-xs text-fg-subtle">
          This overwrites the current figures directly — use it to fix an incorrectly entered quantity, not to record
          a routine stock-in or transfer.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Warehouse quantity"
            type="number"
            error={errors.warehouseQty?.message}
            {...register('warehouseQty')}
          />
          <Input label="Shop quantity" type="number" error={errors.shopQty?.message} {...register('shopQty')} />
        </div>

        <Input
          label="Reason for correction"
          placeholder="e.g. Incorrect quantity entered"
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
