import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useCreateProduct, useUpdateProduct } from '../inventory/hooks';
import type { Product } from '../../lib/types';

const schema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().optional(),
  category: z.string().optional(),
  costPrice: z.coerce.number().min(0).optional(),
  sellingPrice: z.coerce.number().min(0).optional(),
  lowStockThreshold: z.coerce.number().int().min(0).optional(),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

export function ProductFormModal({
  open,
  onClose,
  product,
}: {
  open: boolean;
  onClose: () => void;
  product?: Product;
}) {
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const isEdit = Boolean(product);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    values: product
      ? {
          name: product.name,
          sku: product.sku ?? '',
          category: product.category ?? '',
          costPrice: product.costPrice ?? undefined,
          sellingPrice: product.sellingPrice ?? undefined,
          lowStockThreshold: product.lowStockThreshold,
        }
      : { name: '', sku: '', category: '', lowStockThreshold: 10 },
  });

  async function onSubmit(values: FormOutput) {
    try {
      if (isEdit && product) {
        await updateProduct.mutateAsync({ id: product.id, data: values });
      } else {
        await createProduct.mutateAsync(values);
      }
      reset();
      onClose();
    } catch {
      // toast already shown by the mutation's onError
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit product' : 'Add product'}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Input label="Product name" error={errors.name?.message} {...register('name')} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="SKU (optional)" error={errors.sku?.message} {...register('sku')} />
          <Input label="Category (optional)" error={errors.category?.message} {...register('category')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Cost price (optional)"
            type="number"
            step="0.01"
            error={errors.costPrice?.message}
            {...register('costPrice')}
          />
          <Input
            label="Selling price (optional)"
            type="number"
            step="0.01"
            error={errors.sellingPrice?.message}
            {...register('sellingPrice')}
          />
        </div>
        <Input
          label="Low-stock threshold"
          type="number"
          error={errors.lowStockThreshold?.message}
          {...register('lowStockThreshold')}
        />
        <Button type="submit" loading={isSubmitting} className="mt-1 w-full">
          {isEdit ? 'Save changes' : 'Add product'}
        </Button>
      </form>
    </Modal>
  );
}
