import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Button } from '../../components/Button';
import { useActiveCompanies, useCreateProduct, useUpdateProduct } from '../inventory/hooks';
import type { Product } from '../../lib/types';

const NEW_COMPANY_VALUE = '__new__';

const schema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().optional(),
  category: z.string().optional(),
  companySelection: z.string().optional(),
  newCompanyName: z.string().optional(),
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
  const { data: companies } = useActiveCompanies();
  const isEdit = Boolean(product);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    values: product
      ? {
          name: product.name,
          sku: product.sku ?? '',
          category: product.category ?? '',
          companySelection: product.companyId ?? '',
          newCompanyName: '',
          costPrice: product.costPrice ?? undefined,
          sellingPrice: product.sellingPrice ?? undefined,
          lowStockThreshold: product.lowStockThreshold,
        }
      : { name: '', sku: '', category: '', companySelection: '', newCompanyName: '', lowStockThreshold: 10 },
  });

  const [addingNewCompany, setAddingNewCompany] = useState(false);
  const companySelection = watch('companySelection');

  async function onSubmit(values: FormOutput) {
    const { companySelection: selection, newCompanyName, ...rest } = values;
    const payload = {
      ...rest,
      companyId: selection && selection !== NEW_COMPANY_VALUE ? selection : undefined,
      newCompanyName: selection === NEW_COMPANY_VALUE ? newCompanyName?.trim() : undefined,
    };

    try {
      if (isEdit && product) {
        await updateProduct.mutateAsync({ id: product.id, data: payload });
      } else {
        await createProduct.mutateAsync(payload);
      }
      reset();
      setAddingNewCompany(false);
      onClose();
    } catch {
      // toast already shown by the mutation's onError
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit product' : 'Add product'}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Input label="Product name" error={errors.name?.message} {...register('name')} />

        <Select
          label="Company / Brand (optional)"
          error={errors.companySelection?.message}
          {...register('companySelection', {
            onChange: (e) => setAddingNewCompany(e.target.value === NEW_COMPANY_VALUE),
          })}
        >
          <option value="">No company</option>
          {companies?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value={NEW_COMPANY_VALUE}>+ Add new company…</option>
        </Select>

        {(addingNewCompany || companySelection === NEW_COMPANY_VALUE) && (
          <Input
            label="New company name"
            placeholder="e.g. Lattafa"
            error={errors.newCompanyName?.message}
            {...register('newCompanyName')}
          />
        )}

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
