import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useFulfillStockRequest } from './hooks';
import type { StockRequest } from '../../lib/types';

const schema = z.object({
  quantity: z.coerce.number().int().min(1, 'Enter a quantity of at least 1'),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

export function FulfillStockRequestModal({
  request,
  onClose,
}: {
  request: StockRequest | null;
  onClose: () => void;
}) {
  const fulfill = useFulfillStockRequest();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    values: request ? { quantity: request.quantity } : undefined,
  });

  async function onSubmit(values: FormOutput) {
    if (!request) return;
    try {
      await fulfill.mutateAsync({ id: request.id, quantity: values.quantity });
      reset();
      onClose();
    } catch {
      // toast already shown by the mutation's onError
    }
  }

  return (
    <Modal open={Boolean(request)} onClose={onClose} title="Fulfill stock request">
      {request && (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div className="rounded-lg bg-surface-2 p-3 text-sm">
            <div className="font-medium text-fg">{request.product.name}</div>
            <div className="text-fg-subtle">
              Requested by {request.requestedBy.name} — {request.quantity} unit(s)
              {request.note ? ` · "${request.note}"` : ''}
            </div>
          </div>

          <Input
            label="Quantity to dispatch"
            type="number"
            error={errors.quantity?.message}
            {...register('quantity')}
          />

          <p className="text-xs text-fg-subtle">
            This dispatches the quantity from the warehouse to {request.requestedBy.name}, exactly like a normal
            dispatch — it won't count as shop stock until they accept it.
          </p>

          <Button type="submit" loading={isSubmitting} className="mt-1 w-full">
            Fulfill and dispatch
          </Button>
        </form>
      )}
    </Modal>
  );
}
