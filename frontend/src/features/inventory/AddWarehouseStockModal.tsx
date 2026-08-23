import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Button } from '../../components/Button';
import { useAddWarehouseStock, useProducts } from './hooks';

const schema = z.object({
  productId: z.string().min(1, 'Select a product'),
  quantity: z.coerce.number().int().min(1, 'Enter a quantity of at least 1'),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

export function AddWarehouseStockModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: products } = useProducts();
  const addStock = useAddWarehouseStock();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormOutput) {
    try {
      await addStock.mutateAsync(values);
      reset();
      onClose();
    } catch {
      // toast already shown by the mutation's onError
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add warehouse stock">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Select label="Product" error={errors.productId?.message} {...register('productId')}>
          <option value="">Select a product</option>
          {products?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Input
          label="Quantity received"
          type="number"
          error={errors.quantity?.message}
          {...register('quantity')}
        />
        <Button type="submit" loading={isSubmitting} className="mt-1 w-full">
          Add to warehouse
        </Button>
      </form>
    </Modal>
  );
}
