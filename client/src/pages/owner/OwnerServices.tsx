import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Pencil, Plus } from 'lucide-react';
import { z } from 'zod';
import { Banner, Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, Modal, PageHeader, Pill, Skeleton, inputCls } from '../../components/ui';
import { ServiceCard } from '../../components/ServiceCard';
import { useToast } from '../../context/ToastContext';
import { useAction } from '../../hooks/useAction';
import { useFetch } from '../../hooks/useFetch';
import { endpoints, toProblem } from '../../services/api';
import type { AdminService } from '../../types';
import { formatPKR } from '../../utils/format';

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  description: z.string().trim().max(500),
  price: z.coerce.number({ invalid_type_error: 'Enter a price' }).min(0, 'Price cannot be negative').max(1_000_000),
  durationMinutes: z.coerce.number({ invalid_type_error: 'Enter minutes' }).int('Whole minutes only').min(1, 'At least 1 minute').max(480),
  isActive: z.boolean(),
  isDemoPrice: z.boolean(),
});
type Values = z.infer<typeof schema>;

function ServiceForm({ service, onClose, onSaved }: { service: AdminService | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const { register, handleSubmit, setError, watch, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: service
      ? { name: service.name, description: service.description, price: service.price, durationMinutes: service.durationMinutes, isActive: service.isActive, isDemoPrice: service.isDemoPrice }
      : { name: '', description: '', price: 0, durationMinutes: 30, isActive: true, isDemoPrice: false },
  });
  const demo = watch('isDemoPrice');

  const onSubmit = async (v: Values) => {
    try {
      if (service) await endpoints.updateService(service.id, v);
      else await endpoints.createService({ ...v, sortOrder: 0 });
      toast.success(service ? 'Service updated.' : 'Service added.');
      onSaved();
    } catch (e) {
      const p = toProblem(e);
      const f = Object.entries(p.fields);
      if (f.length) f.forEach(([k, m]) => setError(k as keyof Values, { message: m }));
      else setError('root', { message: p.message });
    }
  };

  return (
    <Modal open onClose={onClose} title={service ? 'Edit service' : 'Add service'}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {errors.root?.message && <Banner tone="bad">{errors.root.message}</Banner>}
        <Field label="Name" htmlFor="sv-name" error={errors.name?.message}><input id="sv-name" className={inputCls} {...register('name')} /></Field>
        <Field label="Description" htmlFor="sv-desc" error={errors.description?.message}><textarea id="sv-desc" rows={3} className={`${inputCls} py-2`} {...register('description')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price (PKR)" htmlFor="sv-price" error={errors.price?.message}><input id="sv-price" type="number" inputMode="decimal" min={0} step="1" className={inputCls} {...register('price')} /></Field>
          <Field label="Duration (min)" htmlFor="sv-dur" error={errors.durationMinutes?.message} hint="Initial estimate"><input id="sv-dur" type="number" inputMode="numeric" min={1} className={inputCls} {...register('durationMinutes')} /></Field>
        </div>
        <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5 accent-[#b9a477]" {...register('isDemoPrice')} /> Price is a demo price (not yet confirmed)</label>
        {demo && <Banner tone="warn">Customers will see “Demo Price — Confirm with salon”. Untick once the price is confirmed.</Banner>}
        <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5 accent-[#b9a477]" {...register('isActive')} /> Visible to customers and bookable</label>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>Save</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function OwnerServices() {
  const { data, error, loading, reload } = useFetch(() => endpoints.ownerServices(), []);
  const { busy, run } = useAction();
  const [editing, setEditing] = useState<AdminService | 'new' | null>(null);
  const [toToggle, setToToggle] = useState<AdminService | null>(null);
  const [preview, setPreview] = useState(false);

  const toggle = async () => {
    if (!toToggle) return;
    const next = !toToggle.isActive;
    const r = await run('toggle', () => endpoints.updateService(toToggle.id, { isActive: next }), next ? 'Service activated.' : 'Service deactivated.');
    if (r) { setToToggle(null); void reload(true); }
  };

  const items = data?.items ?? [];
  return (
    <div>
      <PageHeader
        title="Services"
        subtitle="Prices are in PKR. Past tokens keep the price they were booked at."
        actions={<><Button onClick={() => setPreview((v) => !v)}>{preview ? 'Back to list' : 'Public preview'}</Button><Button variant="primary" onClick={() => setEditing('new')}><Plus className="h-4 w-4" aria-hidden /> Add service</Button></>}
      />
      {loading && !data ? <div className="space-y-3"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
        : error && !data ? <ErrorState message={error.message} onRetry={() => void reload()} />
        : !items.length ? <EmptyState title="No services yet." />
        : preview ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.filter((s) => s.isActive).map((s) => <ServiceCard key={s.id} service={s} showAction={false} />)}
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((s) => (
              <li key={s.id}>
                <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold">{s.name}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted">
                      {formatPKR(s.price)} · ~{s.durationMinutes} min
                      {s.isDemoPrice ? <Pill tone="warn">Demo price</Pill> : <Pill tone="ok">Confirmed</Pill>}
                      {!s.isActive && <Pill>Inactive</Pill>}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setEditing(s)}><Pencil className="h-4 w-4" aria-hidden /> Edit</Button>
                    <Button size="sm" variant={s.isActive ? 'danger' : 'secondary'} onClick={() => setToToggle(s)}>{s.isActive ? 'Deactivate' : 'Activate'}</Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      {editing && <ServiceForm service={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void reload(true); }} />}
      <ConfirmDialog
        open={!!toToggle}
        title={toToggle?.isActive ? 'Deactivate service?' : 'Activate service?'}
        message={toToggle?.isActive ? `${toToggle.name} will be hidden and customers can no longer book it. Existing tokens are unaffected.` : `${toToggle?.name ?? ''} will appear on the public site again.`}
        confirmLabel={toToggle?.isActive ? 'Deactivate' : 'Activate'}
        danger={!!toToggle?.isActive}
        loading={busy === 'toggle'}
        onConfirm={() => void toggle()}
        onClose={() => setToToggle(null)}
      />
    </div>
  );
}
