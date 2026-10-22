import { zodResolver } from '@hookform/resolvers/zod';
import { forwardRef, useEffect, useRef } from 'react';
import { useForm, type UseFormRegisterReturn } from 'react-hook-form';
import { z } from 'zod';
import { Banner, Button, Card, ErrorState, Field, PageHeader, Skeleton, inputCls } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { endpoints, toProblem } from '../../services/api';

const hhmm = z.string().regex(/^(([01]\d|2[0-3]):[0-5]\d)?$/, 'Use HH:mm, e.g. 09:30');
const schema = z.object({
  salonName: z.string().trim().min(1, 'Salon name is required').max(80),
  address: z.string().trim().max(200),
  phone: z.string().trim().max(30),
  instagramUrl: z.string().trim().max(200).refine((v) => v === '' || /^https?:\/\//.test(v), 'Enter a full URL starting with https://'),
  openTime: hhmm,
  closeTime: hhmm,
  enforceHours: z.boolean(),
  phoneRequired: z.boolean(),
  allowBarberChoice: z.boolean(),
  onlineBookingEnabled: z.boolean(),
});
type Values = z.infer<typeof schema>;

/**
 * react-hook-form's register() returns a `ref` that MUST reach the <input>. A plain function component never
 * receives `ref`, which silently left these checkboxes unregistered (changes were neither detected nor saved),
 * so the ref is forwarded explicitly.
 */
const Check = forwardRef<HTMLInputElement, { id: keyof Values; label: string; hint?: string } & Omit<UseFormRegisterReturn, 'ref'>>(
  ({ id, label, hint, ...rest }, ref) => (
    <label className="flex items-start gap-3 py-1.5 text-sm">
      <input type="checkbox" id={id} ref={ref} className="mt-0.5 h-5 w-5 shrink-0 accent-[#b9a477]" {...rest} />
      <span><span className="block font-medium">{label}</span>{hint && <span className="text-xs text-muted">{hint}</span>}</span>
    </label>
  ),
);
Check.displayName = 'Check';

export default function OwnerSettings() {
  const toast = useToast();
  const { data, error, loading, reload } = useFetch(() => endpoints.ownerSettings(), []);
  const { register, handleSubmit, reset, setError, clearErrors, watch, formState: { errors, isSubmitting, isDirty } } = useForm<Values>({ resolver: zodResolver(schema) });
  const saving = useRef(false); // synchronous guard: Enter-key resubmits can fire before `isSubmitting` re-renders
  const enforce = watch('enforceHours');

  useEffect(() => {
    const s = data?.settings;
    if (s) reset({
      salonName: s.salonName, address: s.address ?? '', phone: s.phone ?? '', instagramUrl: s.instagramUrl ?? '',
      openTime: s.openTime ?? '', closeTime: s.closeTime ?? '', enforceHours: s.enforceHours,
      phoneRequired: s.phoneRequired, allowBarberChoice: s.allowBarberChoice, onlineBookingEnabled: s.onlineBookingEnabled,
    });
  }, [data, reset]);

  const onSubmit = async (v: Values) => {
    if (saving.current) return;
    saving.current = true;
    clearErrors('root');
    try {
      await endpoints.updateSettings({
        ...v,
        address: v.address || null, phone: v.phone || null, instagramUrl: v.instagramUrl || null,
        openTime: v.openTime || null, closeTime: v.closeTime || null,
      });
      toast.success('Settings saved.');
      await reload(true);
    } catch (e) {
      const p = toProblem(e);
      const f = Object.entries(p.fields);
      if (f.length) f.forEach(([k, m]) => setError(k as keyof Values, { message: m }));
      setError('root', { message: p.message });
      toast.error(`Settings were not saved. ${p.message}`);
    } finally {
      saving.current = false;
    }
  };

  return (
    <div>
      <PageHeader title="Salon settings" subtitle="Contact details and hours are shown on the public site only if you fill them in." />
      {loading && !data ? <div className="space-y-3"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
        : error && !data ? <ErrorState message={error.message} onRetry={() => void reload()} />
        : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-2xl space-y-5">
            {errors.root?.message && <Banner tone="bad">Settings were not saved. {errors.root.message}</Banner>}
            <Card className="space-y-4">
              <h2 className="font-display text-xl text-cream">Salon details</h2>
              <Field label="Salon name" htmlFor="salonName" error={errors.salonName?.message}><input id="salonName" className={inputCls} {...register('salonName')} /></Field>
              <Field label="Address" htmlFor="address" error={errors.address?.message}><input id="address" className={inputCls} {...register('address')} /></Field>
              <Field label="Phone" htmlFor="phone" error={errors.phone?.message}><input id="phone" type="tel" className={inputCls} {...register('phone')} /></Field>
              <Field label="Instagram URL" htmlFor="instagramUrl" error={errors.instagramUrl?.message}><input id="instagramUrl" inputMode="url" className={inputCls} {...register('instagramUrl')} /></Field>
            </Card>
            <Card className="space-y-4">
              <h2 className="font-display text-xl text-cream">Opening hours (Asia/Karachi)</h2>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Opens" htmlFor="openTime" error={errors.openTime?.message}><input id="openTime" type="time" className={inputCls} {...register('openTime')} /></Field>
                <Field label="Closes" htmlFor="closeTime" error={errors.closeTime?.message}><input id="closeTime" type="time" className={inputCls} {...register('closeTime')} /></Field>
              </div>
              <Check id="enforceHours" label="Block online tokens outside these hours" {...register('enforceHours')} />
              {enforce && <Banner tone="warn">Make sure both times are set, otherwise customers may be unable to book.</Banner>}
            </Card>
            <Card>
              <h2 className="mb-2 font-semibold">Booking rules</h2>
              <Check id="onlineBookingEnabled" label="Accept online tokens" {...register('onlineBookingEnabled')} />
              <Check id="allowBarberChoice" label="Let customers choose a barber" hint="Otherwise everyone joins as First available." {...register('allowBarberChoice')} />
              <Check id="phoneRequired" label="Require a phone number for online tokens" hint="Collect only what you need." {...register('phoneRequired')} />
            </Card>
            <Button type="submit" variant="primary" size="lg" loading={isSubmitting} disabled={!isDirty} className="w-full sm:w-auto">Save settings</Button>
          </form>
        )}
    </div>
  );
}
