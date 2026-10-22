import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Banner, Button, Eyebrow, Field, inputCls } from '../components/ui';
import { Logo } from '../components/Logo';
import { BackdropMedia } from '../components/Media';
import { MEDIA } from '../config/media';
import { homeFor, useAuth } from '../context/AuthContext';
import { toProblem } from '../services/api';

const schema = z.object({
  email: z.string().trim().min(1, 'Enter your email').email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});
type Values = z.infer<typeof schema>;

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [problem, setProblem] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) });

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const onSubmit = async (v: Values) => {
    setProblem(null);
    try {
      const u = await login(v.email, v.password);
      const from = (loc.state as { from?: string } | null)?.from;
      navigate(from && from.startsWith(`/${homeFor(u.role).split('/')[1]}`) ? from : homeFor(u.role), { replace: true });
    } catch (e) {
      setProblem(toProblem(e).message);
    }
  };

  return (
    <div className="grid min-h-[calc(100dvh-4rem)] lg:grid-cols-2">
      {/* Brand panel */}
      <div className="grain relative hidden overflow-hidden border-r border-line lg:block">
        <BackdropMedia poster={MEDIA.heroPoster} />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/40" />
        <div className="relative flex h-full flex-col justify-end p-12">
          <Logo size={96} className="ring-1 ring-gold/40" />
          <p className="mt-8 font-display text-5xl font-semibold leading-tight text-cream">
            Run the shop, <span className="text-gold-gradient italic">not the queue.</span>
          </p>
          <p className="mt-4 max-w-md text-muted">Call customers, manage your team and see today’s numbers — all live.</p>
        </div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center px-4 py-14 sm:px-6">
        <div className="rise w-full max-w-md">
          <div className="mb-8 lg:hidden"><Logo size={72} className="ring-1 ring-gold/40" /></div>
          <Eyebrow>Staff area</Eyebrow>
          <h1 className="font-display text-4xl font-semibold text-cream">Welcome back</h1>
          <p className="mt-2 text-sm text-muted">For the owner, barbers and reception. Customers don’t need an account.</p>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-5">
            {problem && <Banner tone="bad">{problem}</Banner>}
            <Field label="Email" htmlFor="email" error={errors.email?.message}>
              <input id="email" type="email" autoComplete="username" inputMode="email" className={inputCls} aria-invalid={!!errors.email} {...register('email')} />
            </Field>
            <Field label="Password" htmlFor="password" error={errors.password?.message}>
              <input id="password" type="password" autoComplete="current-password" className={inputCls} aria-invalid={!!errors.password} {...register('password')} />
            </Field>
            <Button type="submit" variant="primary" size="lg" loading={isSubmitting} className="w-full">Sign in</Button>
          </form>
          <p className="mt-8 text-center text-sm text-muted">
            Here for a haircut? <Link to="/book" className="font-semibold text-gold-strong hover:text-gold">Get your token</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
