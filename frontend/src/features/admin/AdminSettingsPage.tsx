import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Skeleton } from '../../components/Skeleton';
import { useSettings, useUpdateSettings } from './hooks';

const schema = z.object({
  businessName: z.string().optional(),
  currencySymbol: z.string().min(1, 'Currency symbol is required'),
  defaultLowStockThreshold: z.coerce.number().int().min(0),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

export function AdminSettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    values: settings
      ? {
          businessName: settings.businessName ?? '',
          currencySymbol: settings.currencySymbol,
          defaultLowStockThreshold: settings.defaultLowStockThreshold,
        }
      : undefined,
  });

  async function onSubmit(values: FormOutput) {
    await updateSettings.mutateAsync(values);
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-fg">Settings</h2>
        <p className="text-sm text-fg-muted">Basic business configuration.</p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex max-w-md flex-col gap-4 rounded-2xl border border-border bg-surface p-5"
      >
        <Input label="Business name" error={errors.businessName?.message} {...register('businessName')} />
        <Input label="Currency symbol" error={errors.currencySymbol?.message} {...register('currencySymbol')} />
        <Input
          label="Default low-stock threshold"
          type="number"
          error={errors.defaultLowStockThreshold?.message}
          {...register('defaultLowStockThreshold')}
        />
        <Button type="submit" loading={isSubmitting} className="mt-1 w-full sm:w-auto">
          Save settings
        </Button>
      </form>
    </div>
  );
}
