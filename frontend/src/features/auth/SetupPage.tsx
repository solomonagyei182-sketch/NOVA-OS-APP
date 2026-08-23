import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { ApiError } from '../../lib/api';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { ThemeToggle } from '../theme/ThemeToggle';
import novaLogoWhite from '../../assets/nova-logo-white-256.png';

const setupSchema = z
  .object({
    businessName: z.string().optional(),
    name: z.string().min(1, 'Your full name is required'),
    email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SetupFormValues = z.infer<typeof setupSchema>;

export function SetupPage() {
  const { completeSetup } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetupFormValues>({ resolver: zodResolver(setupSchema) });

  async function onSubmit(values: SetupFormValues) {
    setFormError(null);
    try {
      await completeSetup(values);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Unable to complete setup. Please try again.');
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600">
            <img src={novaLogoWhite} alt="" className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-semibold text-fg">Welcome to NOVA OS</h1>
          <p className="mt-1 text-sm text-fg-muted">
            This workspace hasn't been set up yet. Create the first Manager account to get started.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Input
            label="Business Name (optional)"
            error={errors.businessName?.message}
            {...register('businessName')}
          />
          <Input label="Your Full Name" error={errors.name?.message} {...register('name')} />
          <Input
            label="Email Address"
            type="email"
            autoComplete="username"
            error={errors.email?.message}
            {...register('email')}
          />

          <div className="relative">
            <Input
              label="Create Password"
              type={showPassword ? 'text' : 'password'}
              error={errors.password?.message}
              className="pr-10"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-9 text-fg-subtle hover:text-fg-muted"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <Input
            label="Confirm Password"
            type={showPassword ? 'text' : 'password'}
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          {formError && (
            <div className="rounded-lg border border-danger-tint bg-danger-tint px-3.5 py-2.5 text-sm text-danger-tint-fg">
              {formError}
            </div>
          )}

          <p className="text-xs text-fg-subtle">
            This account will have full Manager access. You can invite Counter and additional Manager accounts
            afterward from the Admin Dashboard.
          </p>

          <Button type="submit" loading={isSubmitting} className="mt-1 w-full">
            <Sparkles size={16} />
            Create workspace
          </Button>
        </form>
      </div>
    </div>
  );
}
