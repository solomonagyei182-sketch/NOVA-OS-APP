import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Clock } from 'lucide-react';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Button } from '../../components/Button';
import { useActiveProducts, useActiveResellers } from '../../lib/queries';
import { useCreateSale } from './hooks';

const schema = z.object({
  resellerId: z.string().min(1, 'Select a reseller'),
  productId: z.string().min(1, 'Select a product'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  unitPrice: z.coerce.number().min(0.01, 'Enter the unit price'),
  commission: z.coerce.number().min(0, 'Enter the commission amount'),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function SalesForm() {
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
    defaultValues: { quantity: 1 },
  });

  const selectedProductId = watch('productId');
  const selectedProduct = products?.find((p) => p.id === selectedProductId);
  const quantity = Number(watch('quantity')) || 0;
  const unitPrice = Number(watch('unitPrice')) || 0;
  const now = new Date();

  useEffect(() => {
    if (selectedProduct?.sellingPrice) {
      setValue('unitPrice', selectedProduct.sellingPrice);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductId]);

  async function onSubmit(values: FormOutput) {
    try {
      await createSale.mutateAsync(values);
      reset({ quantity: 1, resellerId: values.resellerId });
    } catch {
      // toast already shown by the mutation's onError
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-fg">Record a sale</h2>
        <div className="flex items-center gap-1.5 text-xs text-fg-subtle">
          <Clock size={14} />
          {now.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            <option key={p.id} value={p.id} disabled={p.shopQty <= 0}>
              {p.name} ({p.shopQty} in shop{p.shopQty <= 0 ? ' — out of stock' : ''})
            </option>
          ))}
        </Select>

        <Input
          label="Quantity"
          type="number"
          error={errors.quantity?.message}
          {...register('quantity')}
        />

        <Input
          label="Unit Price"
          type="number"
          step="0.01"
          placeholder="0.00"
          error={errors.unitPrice?.message}
          {...register('unitPrice')}
        />

        <Input
          label="Reseller Commission"
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

        {selectedProduct && (
          <p className="col-span-full -mt-1 text-xs text-fg-subtle">
            {selectedProduct.shopQty} unit(s) currently in the shop.
          </p>
        )}

        <div className="col-span-full">
          <Button type="submit" loading={isSubmitting} className="w-full sm:w-auto">
            Record sale
          </Button>
        </div>
      </form>
    </div>
  );
}
