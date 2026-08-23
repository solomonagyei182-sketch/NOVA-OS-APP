import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import clsx from 'clsx';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useCreateCustomer, useUpdateCustomer } from './hooks';
import type { Customer, CustomerTier } from '../../lib/types';

const schema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.union([z.literal(''), z.string().email('Enter a valid email address')]).optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
  tier: z.enum(['TIER_1', 'TIER_2', 'TIER_3']),
});

type FormValues = z.infer<typeof schema>;

const tiers: { value: CustomerTier; label: string }[] = [
  { value: 'TIER_1', label: 'Tier 1' },
  { value: 'TIER_2', label: 'Tier 2' },
  { value: 'TIER_3', label: 'Tier 3' },
];

export function CustomerFormModal({
  open,
  onClose,
  customer,
}: {
  open: boolean;
  onClose: () => void;
  customer?: Customer;
}) {
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const isEdit = Boolean(customer);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: customer
      ? {
          fullName: customer.fullName,
          email: customer.email ?? '',
          phone: customer.phone ?? '',
          notes: customer.notes ?? '',
          tier: customer.tier,
        }
      : { fullName: '', email: '', phone: '', notes: '', tier: 'TIER_1' },
  });

  const selectedTier = watch('tier');

  async function onSubmit(values: FormValues) {
    try {
      const payload = { ...values, email: values.email || undefined };
      if (isEdit && customer) {
        await updateCustomer.mutateAsync({ id: customer.id, data: payload });
      } else {
        await createCustomer.mutateAsync(payload);
      }
      reset();
      onClose();
    } catch {
      // toast already shown by the mutation's onError
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit customer' : 'Add customer'}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Input label="Full name" error={errors.fullName?.message} {...register('fullName')} />
        <Input label="Email (optional)" type="email" error={errors.email?.message} {...register('email')} />
        <Input label="Phone (optional)" error={errors.phone?.message} {...register('phone')} />
        <Input label="Notes (optional)" error={errors.notes?.message} {...register('notes')} />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-fg-muted">Customer tier</label>
          <div className="flex gap-2">
            {tiers.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setValue('tier', t.value)}
                className={clsx(
                  'flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
                  selectedTier === t.value
                    ? 'border-brand-500 bg-brand-tint text-brand-tint-fg'
                    : 'border-border text-fg-muted hover:bg-surface-2',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <Button type="submit" loading={isSubmitting} className="mt-1 w-full">
          {isEdit ? 'Save changes' : 'Add customer'}
        </Button>
      </form>
    </Modal>
  );
}
