import { zodResolver } from '@hookform/resolvers/zod';
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Field, Modal, inputCls } from './ui';
import { useFetch } from '../hooks/useFetch';
import { endpoints, toProblem } from '../services/api';
import { formatPKR, newKey } from '../utils/format';

const schema = z.object({
  serviceId: z.string().min(1, 'Choose a service'),
  barberId: z.string().optional(),
  customerName: z.string().trim().min(1, 'Enter the customer’s name').max(80, 'Name is too long'),
  customerPhone: z.string().trim().regex(/^(\+?[0-9][0-9 -]{6,18})?$/, 'Enter a valid phone number').optional(),
});
type Values = z.infer<typeof schema>;

/** Walk-in tokens go through the same server-side creation path as online ones. */
export function WalkInForm({ onClose, onCreated }: { onClose: () => void; onCreated: (tokenNumber: string) => void }) {
  const services = useFetch(() => endpoints.services(), []);
  const barbers = useFetch(() => endpoints.barbers(), []);
  // One idempotency key per open dialog: a double submit returns the same token.
  const key = useRef(newKey());
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { serviceId: '', barberId: '', customerName: '', customerPhone: '' },
  });

  const onSubmit = async (v: Values) => {
    try {
      const r = await endpoints.walkIn(
        { serviceId: v.serviceId, barberId: v.barberId || null, customerName: v.customerName, customerPhone: v.customerPhone || undefined },
        key.current,
      );
      onCreated(r.token.tokenNumber);
    } catch (e) {
      const p = toProblem(e);
      const entries = Object.entries(p.fields);
      if (entries.length) entries.forEach(([k, m]) => setError(k as keyof Values, { message: m }));
      else setError('root', { message: p.message });
    }
  };

  return (
    <Modal open onClose={onClose} title="New walk-in token">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {errors.root?.message && <p role="alert" className="rounded-xl border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">{errors.root.message}</p>}
        <Field label="Service" htmlFor="wi-service" error={errors.serviceId?.message}>
          <select id="wi-service" className={inputCls} {...register('serviceId')} disabled={services.loading}>
            <option value="">{services.loading ? 'Loading…' : 'Select a service'}</option>
            {services.data?.items.map((s) => (
              <option key={s.id} value={s.id}>{s.name} · {formatPKR(s.price)}{s.isDemoPrice ? ' (demo price)' : ''}</option>
            ))}
          </select>
        </Field>
        {!!barbers.data?.items.length && (
          <Field label="Barber" htmlFor="wi-barber">
            <select id="wi-barber" className={inputCls} {...register('barberId')}>
              <option value="">First available</option>
              {barbers.data.items.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Customer name" htmlFor="wi-name" error={errors.customerName?.message}>
          <input id="wi-name" className={inputCls} autoComplete="off" {...register('customerName')} />
        </Field>
        <Field label="Phone (optional)" htmlFor="wi-phone" error={errors.customerPhone?.message}>
          <input id="wi-phone" type="tel" inputMode="tel" className={inputCls} autoComplete="off" {...register('customerPhone')} />
        </Field>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>Create token</Button>
        </div>
      </form>
    </Modal>
  );
}
