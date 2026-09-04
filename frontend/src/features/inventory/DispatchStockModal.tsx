import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Button } from '../../components/Button';
import { useStaffList } from '../admin/hooks';
import { useDispatchStock, useProducts } from './hooks';

const schema = z.object({
  productId: z.string().min(1, 'Select a product'),
  quantity: z.coerce.number().int().min(1, 'Enter a quantity of at least 1'),
  assignedToId: z.string().min(1, 'Select the Counter to dispatch to'),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

export function DispatchStockModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: products } = useProducts();
  const { data: counters } = useStaffList({ role: 'COUNTER' });
  const dispatch = useDispatchStock();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({ resolver: zodResolver(schema) });

  const selectedProduct = products?.find((p) => p.id === watch('productId'));
  const activeCounters = counters?.filter((c) => c.isActive);

  async function onSubmit(values: FormOutput) {
    try {
      await dispatch.mutateAsync(values);
      reset();
      onClose();
    } catch {
      // toast already shown by the mutation's onError
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Dispatch stock to a Counter">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Select label="Product" error={errors.productId?.message} {...register('productId')}>
          <option value="">Select a product</option>
          {products?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.warehouseQty} in warehouse)
            </option>
          ))}
        </Select>
        {selectedProduct && (
          <p className="-mt-2 text-xs text-fg-subtle">
            {selectedProduct.warehouseQty} unit(s) currently in the warehouse.
          </p>
        )}

        <Select label="Dispatch to Counter" error={errors.assignedToId?.message} {...register('assignedToId')}>
          <option value="">Select a Counter</option>
          {activeCounters?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

        <Input
          label="Quantity to dispatch"
          type="number"
          error={errors.quantity?.message}
          {...register('quantity')}
        />

        <p className="text-xs text-fg-subtle">
          The quantity leaves the warehouse immediately. It won't count toward shop stock until the Counter
          formally accepts it and their live location is captured.
        </p>

        <Button type="submit" loading={isSubmitting} className="mt-1 w-full">
          Dispatch stock
        </Button>
      </form>
    </Modal>
  );
}
