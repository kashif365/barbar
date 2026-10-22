import { useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, ChevronLeft } from 'lucide-react';
import { Banner, Button, Card, ErrorState, Field, Skeleton, cx, inputCls } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { useFetch } from '../hooks/useFetch';
import { endpoints, toProblem } from '../services/api';
import { formatPKR, newKey } from '../utils/format';
import { saveToken } from '../utils/savedTokens';

const detailsSchema = z.object({
  customerName: z.string().trim().min(2, 'Please enter your name').max(80, 'Name is too long'),
  customerPhone: z
    .string()
    .trim()
    .regex(/^(\+?[0-9][0-9 \-]{6,18})?$/, 'Enter a valid phone number')
    .optional(),
});
type Details = z.infer<typeof detailsSchema>;

export default function Book() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const services = useFetch(() => endpoints.services(), []);
  const barbers = useFetch(() => endpoints.barbers(), []);
  const settings = useFetch(() => endpoints.settings(), []);

  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState<string | null>(params.get('service'));
  const [barberId, setBarberId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // One key per booking attempt: a double-click or retry can never create two tokens.
  const idemKey = useRef(newKey());

  const s = settings.data?.settings;
  const service = services.data?.items.find((x) => x.id === serviceId) ?? null;
  const barberList = useMemo(
    () => (barbers.data?.items ?? []).filter((b) => !serviceId || b.serviceIds.length === 0 || b.serviceIds.includes(serviceId)),
    [barbers.data, serviceId],
  );
  const barber = barberList.find((b) => b.id === barberId) ?? null;
  const showBarberStep = !!s?.allowBarberChoice && (barbers.data?.items.length ?? 0) > 0;

  const steps = ['Service', ...(showBarberStep ? ['Barber'] : []), 'Your details', 'Review'];
  const current = steps[step];

  const form = useForm<Details>({ resolver: zodResolver(detailsSchema), defaultValues: { customerName: '', customerPhone: '' } });
  const { register, handleSubmit, formState: { errors }, getValues, setError } = form;

  const phoneRequired = !!s?.phoneRequired;

  const next = () => setStep((n) => Math.min(n + 1, steps.length - 1));
  const back = () => setStep((n) => Math.max(n - 1, 0));

  const onDetails = (v: Details) => {
    if (phoneRequired && !v.customerPhone) {
      setError('customerPhone', { message: 'Phone number is required' });
      return;
    }
    next();
  };

  const confirm = async () => {
    if (!serviceId || submitting) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const v = getValues();
      const r = await endpoints.createOnlineToken(
        { serviceId, barberId, customerName: v.customerName.trim(), customerPhone: v.customerPhone?.trim() || undefined },
        idemKey.current,
      );
      saveToken({ trackingToken: r.token.trackingToken, tokenNumber: r.token.tokenNumber, businessDate: r.token.businessDate });
      toast.success(`Your token is ${r.token.tokenNumber}`);
      navigate(`/token/${encodeURIComponent(r.token.trackingToken)}`, { replace: true });
    } catch (e) {
      const p = toProblem(e);
      setFormError(p.code === 'UNKNOWN' || p.status >= 500 || p.status === 0 ? `We couldn’t create your token. ${p.status === 0 ? p.message : 'Please try again.'}` : p.message);
      if (p.code === 'SERVICE_UNAVAILABLE') {
        setServiceId(null);
        setStep(0);
        void services.reload(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (services.loading || settings.loading) {
    return <div className="mx-auto max-w-xl space-y-4 px-4 py-12"><Skeleton className="h-10" /><Skeleton className="h-64" /></div>;
  }
  if (services.error || settings.error) {
    return <div className="mx-auto max-w-xl px-4 py-12"><ErrorState message={(services.error ?? settings.error)!.message} onRetry={() => { void services.reload(); void settings.reload(); }} /></div>;
  }

  const closed = s && (!s.isOpen || !s.onlineBookingEnabled);

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:py-14">
      <h1 className="text-3xl font-bold tracking-tight">Get your token</h1>
      <p className="mt-1 text-sm text-muted">It takes under a minute. No account needed.</p>

      <ol className="my-6 flex items-center gap-2" aria-label="Progress">
        {steps.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2" aria-current={i === step ? 'step' : undefined}>
            <span className={cx('flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold', i < step ? 'border-gold bg-gold text-ink' : i === step ? 'border-gold text-gold' : 'border-line text-muted')}>
              {i < step ? <Check className="h-4 w-4" aria-label="completed" /> : i + 1}
            </span>
            <span className={cx('hidden text-xs sm:block', i === step ? 'text-white' : 'text-muted')}>{label}</span>
            {i < steps.length - 1 && <span className="h-px flex-1 bg-line" aria-hidden />}
          </li>
        ))}
      </ol>

      {closed && (
        <div className="mb-5">
          <Banner tone="warn">{!s!.onlineBookingEnabled ? 'Online tokens are currently turned off. Please visit the salon.' : 'The salon is currently closed. Please try again during operating hours.'}</Banner>
        </div>
      )}
      {formError && <div className="mb-5"><Banner tone="bad">{formError}</Banner></div>}

      <Card>
        {current === 'Service' && (
          <div>
            <h2 className="mb-4 font-semibold">Choose a service</h2>
            <div role="radiogroup" aria-label="Service" className="space-y-2.5">
              {services.data?.items.map((sv) => (
                <label key={sv.id} className={cx('flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-gold', serviceId === sv.id ? 'border-gold bg-gold/5' : 'border-line hover:border-gold/50')}>
                  <input type="radio" name="service" className="sr-only" checked={serviceId === sv.id} onChange={() => { setServiceId(sv.id); setBarberId(null); }} />
                  <span className="min-w-0">
                    <span className="block font-medium">{sv.name}</span>
                    <span className="block text-xs text-muted">~{sv.durationMinutes} min{sv.isDemoPrice ? ' · Demo price — confirm with salon' : ''}</span>
                  </span>
                  <span className="shrink-0 font-semibold text-gold-strong">{formatPKR(sv.price)}</span>
                </label>
              ))}
            </div>
            <Button variant="primary" size="lg" className="mt-5 w-full" disabled={!serviceId} onClick={next}>Continue</Button>
          </div>
        )}

        {current === 'Barber' && (
          <div>
            <h2 className="mb-4 font-semibold">Choose a barber</h2>
            <div role="radiogroup" aria-label="Barber" className="space-y-2.5">
              {[{ id: null as string | null, name: 'First available', sub: 'Fastest — served by whoever is free next' }, ...barberList.map((b) => ({ id: b.id as string | null, name: b.name, sub: b.availability === 'available' ? 'Available now' : 'Currently unavailable' }))].map((o) => (
                <label key={o.id ?? 'any'} className={cx('flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 focus-within:outline focus-within:outline-2 focus-within:outline-gold', barberId === o.id ? 'border-gold bg-gold/5' : 'border-line hover:border-gold/50')}>
                  <input type="radio" name="barber" className="sr-only" checked={barberId === o.id} onChange={() => setBarberId(o.id)} />
                  <span>
                    <span className="block font-medium">{o.name}</span>
                    <span className="block text-xs text-muted">{o.sub}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-5 flex gap-2">
              <Button onClick={back} aria-label="Back"><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="primary" size="lg" className="flex-1" onClick={next}>Continue</Button>
            </div>
          </div>
        )}

        {current === 'Your details' && (
          <form onSubmit={handleSubmit(onDetails)} noValidate className="space-y-4">
            <h2 className="font-semibold">Your details</h2>
            <Field label="Your name" htmlFor="customerName" error={errors.customerName?.message}>
              <input id="customerName" autoComplete="name" className={inputCls} aria-invalid={!!errors.customerName} aria-describedby={errors.customerName ? 'customerName-error' : undefined} {...register('customerName')} />
            </Field>
            {phoneRequired && (
              <Field label="Phone number" htmlFor="customerPhone" error={errors.customerPhone?.message} hint="Only used by the salon for your token. Never shown publicly.">
                <input id="customerPhone" type="tel" inputMode="tel" autoComplete="tel" placeholder="03XX XXXXXXX" className={inputCls} aria-invalid={!!errors.customerPhone} {...register('customerPhone')} />
              </Field>
            )}
            <div className="flex gap-2 pt-1">
              <Button type="button" onClick={back} aria-label="Back"><ChevronLeft className="h-4 w-4" /></Button>
              <Button type="submit" variant="primary" size="lg" className="flex-1">Review</Button>
            </div>
          </form>
        )}

        {current === 'Review' && service && (
          <div>
            <h2 className="mb-4 font-semibold">Review &amp; confirm</h2>
            <dl className="divide-y divide-line text-sm">
              <Row label="Service" value={service.name} />
              <Row label="Price" value={formatPKR(service.price)} strong />
              <Row label="Estimated duration" value={`~${service.durationMinutes} min`} />
              <Row label="Barber" value={barber ? barber.name : 'First available'} />
              <Row label="Name" value={getValues('customerName')} />
            </dl>
            {service.isDemoPrice && <div className="mt-4"><Banner tone="warn">Demo price — please confirm with the salon.</Banner></div>}
            <ul className="mt-4 space-y-1 text-xs text-muted">
              <li>• Pay at the salon after your service.</li>
              <li>• Your wait is an estimate and may change.</li>
              <li>• Online and walk-in customers are served in the order they arrive.</li>
            </ul>
            <div className="mt-5 flex gap-2">
              <Button onClick={back} disabled={submitting} aria-label="Back"><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="primary" size="lg" className="flex-1" loading={submitting} disabled={!!closed} onClick={() => void confirm()}>
                Confirm &amp; get token
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-muted">{label}</dt>
      <dd className={cx('text-right', strong && 'font-semibold text-gold-strong')}>{value}</dd>
    </div>
  );
}
