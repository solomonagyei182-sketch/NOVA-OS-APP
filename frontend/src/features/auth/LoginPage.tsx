import { useState } from 'react';
import { useForm, type UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import clsx from 'clsx';
import { Eye, EyeOff, ArrowLeft, ShieldCheck, Users } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { ApiError } from '../../lib/api';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { ThemeToggle } from '../theme/ThemeToggle';
import type { LoginableRole } from '../../lib/types';
import novaLogoWhite from '../../assets/nova-logo-white-256.png';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const signupSchema = z
  .object({
    name: z.string().min(1, 'Full name is required'),
    email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

const ROLE_LABELS: Record<LoginableRole, string> = { MANAGER: 'Manager', COUNTER: 'Counter' };

function PasswordInput({
  label,
  error,
  register,
}: {
  label: string;
  error?: string;
  register: UseFormRegisterReturn;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input label={label} type={visible ? 'text' : 'password'} error={error} className="pr-10" {...register} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-9 text-fg-subtle hover:text-fg-muted"
        aria-label={visible ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

function RoleSelect({ onSelect }: { onSelect: (role: LoginableRole) => void }) {
  const options: { role: LoginableRole; icon: typeof ShieldCheck; description: string }[] = [
    { role: 'MANAGER', icon: ShieldCheck, description: 'Full access & Admin Dashboard' },
    { role: 'COUNTER', icon: Users, description: 'Sales, calculations & inventory' },
  ];

  return (
    <div className="flex flex-col gap-3">
      <p className="text-center text-sm font-medium text-fg-muted">Sign In As</p>
      {options.map(({ role, icon: Icon, description }) => (
        <button
          key={role}
          type="button"
          onClick={() => onSelect(role)}
          className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3.5 text-left transition-colors hover:border-brand-500 hover:bg-surface-2"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand-tint-fg">
            <Icon size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-fg">{ROLE_LABELS[role]}</div>
            <div className="truncate text-xs text-fg-subtle">{description}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

function SignInForm({ role, onBack }: { role: LoginableRole; onBack: () => void }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginFormValues) {
    setFormError(null);
    try {
      await login(values.email, values.password, role);
      const redirectTo = (location.state as { from?: string } | null)?.from ?? '/dashboard';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Unable to log in. Please try again.');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
      >
        <ArrowLeft size={15} />
        Back
      </button>

      <p className="text-center text-sm font-semibold text-fg">{ROLE_LABELS[role]} Sign In</p>

      <Input
        label="Email"
        type="email"
        autoComplete="username"
        error={errors.email?.message}
        {...register('email')}
      />

      <PasswordInput label="Password" error={errors.password?.message} register={register('password')} />

      {formError && (
        <div className="rounded-lg border border-danger-tint bg-danger-tint px-3.5 py-2.5 text-sm text-danger-tint-fg">
          {formError}
        </div>
      )}

      <Button type="submit" loading={isSubmitting} className="mt-2 w-full">
        Sign In
      </Button>
    </form>
  );
}

function SignUpForm({ onSuccess }: { onSuccess: (email: string) => void }) {
  const { register: registerAccount } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({ resolver: zodResolver(signupSchema) });

  async function onSubmit(values: SignupFormValues) {
    setFormError(null);
    try {
      await registerAccount(values);
      onSuccess(values.email);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Unable to create your account. Please try again.');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <Input label="Full Name" autoComplete="name" error={errors.name?.message} {...register('name')} />
      <Input
        label="Email Address"
        type="email"
        autoComplete="username"
        error={errors.email?.message}
        {...register('email')}
      />
      <PasswordInput label="Create Password" error={errors.password?.message} register={register('password')} />
      <PasswordInput
        label="Confirm Password"
        error={errors.confirmPassword?.message}
        register={register('confirmPassword')}
      />

      {formError && (
        <div className="rounded-lg border border-danger-tint bg-danger-tint px-3.5 py-2.5 text-sm text-danger-tint-fg">
          {formError}
        </div>
      )}

      <p className="text-xs text-fg-subtle">
        New accounts are created without an access role. A Manager must assign Manager or Counter access from the
        Admin Dashboard before you can sign in.
      </p>

      <Button type="submit" loading={isSubmitting} className="mt-1 w-full">
        Create account
      </Button>
    </form>
  );
}

export function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [roleChoice, setRoleChoice] = useState<LoginableRole | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionMessage, clearSessionMessage } = useAuth();
  const notice = (location.state as { notice?: string } | null)?.notice ?? null;

  function switchMode(next: 'signin' | 'signup') {
    setMode(next);
    setRoleChoice(null);
    if (sessionMessage) clearSessionMessage();
  }

  function handleSignupSuccess() {
    clearSessionMessage();
    setMode('signin');
    setRoleChoice(null);
    navigate('.', { replace: true, state: { notice: 'Account created successfully. You can now sign in.' } });
  }

  function handleSelectRole(role: LoginableRole) {
    if (sessionMessage) clearSessionMessage();
    setRoleChoice(role);
  }

  const banner = sessionMessage ?? (mode === 'signin' && roleChoice === null ? notice : null);
  const bannerTone = sessionMessage ? 'danger' : 'success';

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
          <h1 className="text-xl font-semibold text-fg">NOVA OS</h1>
          <p className="mt-1 text-sm text-fg-muted">
            {mode === 'signup' ? 'Create your workspace account' : 'Sign in to your workspace'}
          </p>
        </div>

        <div className="mb-6 flex gap-1 rounded-lg border border-border bg-canvas p-1">
          <button
            type="button"
            onClick={() => switchMode('signin')}
            className={clsx(
              'flex-1 rounded-md px-3.5 py-2 text-sm font-medium transition-colors',
              mode === 'signin' ? 'bg-brand-tint text-brand-tint-fg' : 'text-fg-muted hover:bg-surface-2',
            )}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
            className={clsx(
              'flex-1 rounded-md px-3.5 py-2 text-sm font-medium transition-colors',
              mode === 'signup' ? 'bg-brand-tint text-brand-tint-fg' : 'text-fg-muted hover:bg-surface-2',
            )}
          >
            Sign Up
          </button>
        </div>

        {banner && (
          <div
            className={clsx(
              'mb-4 rounded-lg border px-3.5 py-2.5 text-sm',
              bannerTone === 'danger'
                ? 'border-danger-tint bg-danger-tint text-danger-tint-fg'
                : 'border-success-tint bg-success-tint text-success-tint-fg',
            )}
          >
            {banner}
          </div>
        )}

        {mode === 'signup' ? (
          <SignUpForm onSuccess={handleSignupSuccess} />
        ) : roleChoice === null ? (
          <RoleSelect onSelect={handleSelectRole} />
        ) : (
          <SignInForm role={roleChoice} onBack={() => setRoleChoice(null)} />
        )}
      </div>
    </div>
  );
}
