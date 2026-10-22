import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Banner, Button, Card, Field, inputCls } from '../components/ui';
import { Logo } from '../components/Logo';
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
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo size={88} />
        <h1 className="mt-4 text-2xl font-bold">Staff sign in</h1>
        <p className="mt-1 text-sm text-muted">For the owner, barbers and reception. Customers don’t need an account.</p>
      </div>
      <Card>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {problem && <Banner tone="bad">{problem}</Banner>}
          <Field label="Email" htmlFor="email" error={errors.email?.message}>
            <input id="email" type="email" autoComplete="username" inputMode="email" className={inputCls} aria-invalid={!!errors.email} {...register('email')} />
          </Field>
          <Field label="Password" htmlFor="password" error={errors.password?.message}>
            <input id="password" type="password" autoComplete="current-password" className={inputCls} aria-invalid={!!errors.password} {...register('password')} />
          </Field>
          <Button type="submit" variant="primary" size="lg" loading={isSubmitting} className="w-full">Sign in</Button>
        </form>
      </Card>
      <p className="mt-5 text-center text-sm text-muted">Here for a haircut? <Link to="/book" className="text-gold-strong underline">Get your token</Link></p>
    </div>
  );
}
