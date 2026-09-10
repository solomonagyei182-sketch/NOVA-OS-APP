import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Button } from '../../components/Button';
import { useActiveProducts } from '../../lib/queries';
import { useCreateStockRequest } from './hooks';

const schema = z.object({
  productId: z.string().min(1, 'Select a product'),
  quantity: z.coerce.number().int().min(1, 'Enter a quantity of at least 1'),
  note: z.string().max(500).optional(),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

export function RequestStockModal({
  open,
  onClose,
  initialProductId,
}: {
  open: boolean;
  onClose: () => void;
  initialProductId?: string;
}) {
  const { data: products } = useActiveProducts();
  const createRequest = useCreateStockRequest();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open && initialProductId) setValue('productId', initialProductId);
  }, [open, initialProductId, setValue]);

  async function onSubmit(values: FormOutput) {
    try {
      await createRequest.mutateAsync(values);
      reset();
      onClose();
    } catch {
      // toast already shown by the mutation's onError
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Request stock from warehouse">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Select label="Product" error={errors.productId?.message} {...register('productId')}>
          <option value="">Select a product</option>
          {products?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.shopQty} currently in shop)
            </option>
          ))}
        </Select>

        <Input label="Quantity needed" type="number" error={errors.quantity?.message} {...register('quantity')} />

        <Input label="Note (optional)" error={errors.note?.message} {...register('note')} />

        <p className="text-xs text-fg-subtle">
          Your Manager will see this request and dispatch stock to you. You'll be notified when it's on its way so
          you can confirm receipt.
        </p>

        <Button type="submit" loading={isSubmitting} className="mt-1 w-full">
          Send request
        </Button>
      </form>
    </Modal>
  );
}
