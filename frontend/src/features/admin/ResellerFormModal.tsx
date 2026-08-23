import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useCreateReseller, useUpdateReseller } from '../resellers/hooks';
import type { ResellerListItem } from '../../lib/types';

const schema = z.object({
  fullName: z.string().min(1, 'Name / business name is required'),
  phone: z.string().optional(),
  email: z.union([z.literal(''), z.string().email('Enter a valid email address')]).optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function ResellerFormModal({
  open,
  onClose,
  reseller,
}: {
  open: boolean;
  onClose: () => void;
  reseller?: ResellerListItem;
}) {
  const createReseller = useCreateReseller();
  const updateReseller = useUpdateReseller();
  const isEdit = Boolean(reseller);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: reseller
      ? {
          fullName: reseller.fullName,
          phone: reseller.phone ?? '',
          email: reseller.email ?? '',
          address: reseller.address ?? '',
          notes: reseller.notes ?? '',
        }
      : { fullName: '', phone: '', email: '', address: '', notes: '' },
  });

  async function onSubmit(values: FormValues) {
    try {
      const payload = { ...values, email: values.email || undefined };
      if (isEdit && reseller) {
        await updateReseller.mutateAsync({ id: reseller.id, data: payload });
      } else {
        await createReseller.mutateAsync(payload);
      }
      reset();
      onClose();
    } catch {
      // toast already shown by the mutation's onError
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit reseller' : 'Add reseller'}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Input label="Name / business name" error={errors.fullName?.message} {...register('fullName')} />
        <Input label="Phone (optional)" error={errors.phone?.message} {...register('phone')} />
        <Input label="Email (optional)" type="email" error={errors.email?.message} {...register('email')} />
        <Input label="Address (optional)" error={errors.address?.message} {...register('address')} />
        <Input label="Notes (optional)" error={errors.notes?.message} {...register('notes')} />
        <Button type="submit" loading={isSubmitting} className="mt-1 w-full">
          {isEdit ? 'Save changes' : 'Add reseller'}
        </Button>
      </form>
    </Modal>
  );
}
