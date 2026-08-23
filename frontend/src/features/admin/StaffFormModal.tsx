import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Button } from '../../components/Button';
import { useCreateStaff, useUpdateStaff } from './hooks';
import type { StaffUser } from '../../lib/types';

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['MANAGER', 'COUNTER']),
});

const editSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.union([z.literal(''), z.string().min(6, 'Password must be at least 6 characters')]).optional(),
  // A Pending account must be explicitly assigned Manager or Counter — the
  // schema intentionally rejects submitting with role still 'PENDING'.
  role: z.enum(['MANAGER', 'COUNTER'], { message: 'Assign a role before saving' }),
});

export function StaffFormModal({
  open,
  onClose,
  staff,
}: {
  open: boolean;
  onClose: () => void;
  staff?: StaffUser;
}) {
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const isEdit = Boolean(staff);
  const schema = isEdit ? editSchema : createSchema;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    values: staff
      ? { name: staff.name, email: staff.email, password: '', role: staff.role as 'MANAGER' | 'COUNTER' }
      : { name: '', email: '', password: '', role: 'COUNTER' },
  });

  async function onSubmit(values: z.infer<typeof schema>) {
    try {
      if (isEdit && staff) {
        const payload = { name: values.name, email: values.email, role: values.role, ...(values.password ? { password: values.password } : {}) };
        await updateStaff.mutateAsync({ id: staff.id, data: payload });
      } else {
        await createStaff.mutateAsync(values as { name: string; email: string; password: string; role: 'MANAGER' | 'COUNTER' });
      }
      reset();
      onClose();
    } catch {
      // toast already shown by the mutation's onError
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit staff account' : 'Create staff account'}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Input label="Full name" error={errors.name?.message} {...register('name')} />
        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <Input
          label={isEdit ? 'New password (optional)' : 'Password'}
          type="password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Select label="Role" error={errors.role?.message} {...register('role')}>
          {staff?.role === 'PENDING' && (
            <option value="PENDING" disabled>
              Pending — choose a role
            </option>
          )}
          <option value="COUNTER">Counter</option>
          <option value="MANAGER">Manager</option>
        </Select>
        <Button type="submit" loading={isSubmitting} className="mt-1 w-full">
          {isEdit ? 'Save changes' : 'Create account'}
        </Button>
      </form>
    </Modal>
  );
}
