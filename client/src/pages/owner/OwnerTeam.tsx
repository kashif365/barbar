import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Pencil, Plus } from 'lucide-react';
import { z } from 'zod';
import { Banner, Button, Card, EmptyState, ErrorState, Field, Modal, PageHeader, Pill, Skeleton, inputCls } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useAction } from '../../hooks/useAction';
import { useFetch } from '../../hooks/useFetch';
import { endpoints, toProblem } from '../../services/api';
import type { Availability, TeamMember } from '../../types';
import { AVAILABILITY_LABEL } from '../../utils/format';

const createSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(10, 'Use at least 10 characters').max(100),
  role: z.enum(['barber', 'staff']),
});
const editSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  password: z.string().max(100).refine((v) => v === '' || v.length >= 10, 'Use at least 10 characters'),
});

function ServicePicker({ all, value, onChange }: { all: { id: string; name: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium">Services this person offers</legend>
      <p className="mb-2 text-xs text-muted">Leave all unticked to allow every service.</p>
      <div className="grid gap-1 sm:grid-cols-2">
        {all.map((s) => (
          <label key={s.id} className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" className="h-5 w-5 accent-[#b9a477]" checked={value.includes(s.id)} onChange={(e) => onChange(e.target.checked ? [...value, s.id] : value.filter((x) => x !== s.id))} />
            {s.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function CreateDialog({ services, onClose, onSaved }: { services: { id: string; name: string }[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [ids, setIds] = useState<string[]>([]);
  const { register, handleSubmit, setError, watch, formState: { errors, isSubmitting } } = useForm<z.infer<typeof createSchema>>({ resolver: zodResolver(createSchema), defaultValues: { role: 'barber', name: '', email: '', password: '' } });
  const role = watch('role');
  const onSubmit = async (v: z.infer<typeof createSchema>) => {
    try {
      await endpoints.createMember({ ...v, serviceIds: v.role === 'barber' ? ids : [] });
      toast.success('Account created.');
      onSaved();
    } catch (e) {
      const p = toProblem(e);
      const f = Object.entries(p.fields);
      if (f.length) f.forEach(([k, m]) => setError(k as keyof z.infer<typeof createSchema>, { message: m }));
      else setError('root', { message: p.message });
    }
  };
  return (
    <Modal open onClose={onClose} title="Add barber or staff" wide>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {errors.root?.message && <Banner tone="bad">{errors.root.message}</Banner>}
        <Field label="Role" htmlFor="tm-role"><select id="tm-role" className={inputCls} {...register('role')}><option value="barber">Barber</option><option value="staff">Reception staff</option></select></Field>
        <Field label="Full name" htmlFor="tm-name" error={errors.name?.message}><input id="tm-name" className={inputCls} {...register('name')} /></Field>
        <Field label="Email (used to sign in)" htmlFor="tm-email" error={errors.email?.message}><input id="tm-email" type="email" autoComplete="off" className={inputCls} {...register('email')} /></Field>
        <Field label="Temporary password" htmlFor="tm-pw" error={errors.password?.message} hint="At least 10 characters. Share it privately.">
          <input id="tm-pw" type="password" autoComplete="new-password" className={inputCls} {...register('password')} />
        </Field>
        {role === 'barber' && <ServicePicker all={services} value={ids} onChange={setIds} />}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>Create account</Button>
        </div>
      </form>
    </Modal>
  );
}

function EditDialog({ member, services, onClose, onSaved }: { member: TeamMember; services: { id: string; name: string }[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [ids, setIds] = useState<string[]>(member.serviceIds);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<z.infer<typeof editSchema>>({ resolver: zodResolver(editSchema), defaultValues: { name: member.name, password: '' } });
  const onSubmit = async (v: z.infer<typeof editSchema>) => {
    try {
      await endpoints.updateMember(member.id, { name: v.name, ...(v.password ? { password: v.password } : {}), ...(member.role === 'barber' ? { serviceIds: ids } : {}) });
      toast.success('Changes saved.');
      onSaved();
    } catch (e) {
      setError('root', { message: toProblem(e).message });
    }
  };
  return (
    <Modal open onClose={onClose} title={`Edit ${member.name}`} wide>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {errors.root?.message && <Banner tone="bad">{errors.root.message}</Banner>}
        <p className="text-sm text-muted">{member.email}</p>
        <Field label="Full name" htmlFor="te-name" error={errors.name?.message}><input id="te-name" className={inputCls} {...register('name')} /></Field>
        <Field label="Reset password (optional)" htmlFor="te-pw" error={errors.password?.message} hint="Leave blank to keep the current password.">
          <input id="te-pw" type="password" autoComplete="new-password" className={inputCls} {...register('password')} />
        </Field>
        {member.role === 'barber' && <ServicePicker all={services} value={ids} onChange={setIds} />}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>Save changes</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function OwnerTeam() {
  const team = useFetch(() => endpoints.team(), []);
  const svc = useFetch(() => endpoints.ownerServices(), []);
  const { busy, run } = useAction();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const services = (svc.data?.items ?? []).filter((s) => s.isActive).map((s) => ({ id: s.id, name: s.name }));
  const items = team.data?.items ?? [];

  const update = async (m: TeamMember, key: string, body: Parameters<typeof endpoints.updateMember>[1], msg: string) => {
    const r = await run(`${key}:${m.id}`, () => endpoints.updateMember(m.id, body), msg);
    if (r) void team.reload(true);
  };

  return (
    <div>
      <PageHeader title="Barbers & staff" subtitle="Deactivating an account signs the person out immediately." actions={<Button variant="primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" aria-hidden /> Add person</Button>} />
      {team.loading && !team.data ? <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
        : team.error && !team.data ? <ErrorState message={team.error.message} onRetry={() => void team.reload()} />
        : !items.length ? <EmptyState title="No barbers or staff yet." hint="Add a barber so customers can be served." />
        : (
          <ul className="space-y-3">
            {items.map((m) => (
              <li key={m.id}>
                <Card className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{m.name}</p>
                      <p className="truncate text-sm text-muted">{m.email}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Pill>{m.role === 'staff' ? 'Reception' : 'Barber'}</Pill>
                      {!m.isActive ? <Pill tone="warn">Deactivated</Pill> : m.role === 'barber' && <Pill tone={m.busy ? 'gold' : m.availability === 'available' ? 'ok' : 'neutral'}>{m.busy ? 'With customer' : AVAILABILITY_LABEL[m.availability]}</Pill>}
                    </div>
                  </div>
                  {m.role === 'barber' && <p className="text-xs text-muted">{m.completedToday} completed today · {m.serviceIds.length ? `${m.serviceIds.length} services` : 'All services'}</p>}
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setEditing(m)}><Pencil className="h-4 w-4" aria-hidden /> Edit</Button>
                    {m.role === 'barber' && m.isActive && (
                      <select aria-label={`Availability for ${m.name}`} className={`${inputCls} !min-h-9 !w-auto !py-1 !text-sm`} value={m.availability} disabled={busy !== null}
                        onChange={(e) => void update(m, 'avail', { availability: e.target.value as Availability }, 'Availability updated.')}>
                        {(Object.keys(AVAILABILITY_LABEL) as Availability[]).map((a) => <option key={a} value={a}>{AVAILABILITY_LABEL[a]}</option>)}
                      </select>
                    )}
                    <Button size="sm" variant={m.isActive ? 'danger' : 'secondary'} loading={busy === `active:${m.id}`} onClick={() => void update(m, 'active', { isActive: !m.isActive }, m.isActive ? 'Account deactivated.' : 'Account reactivated.')}>
                      {m.isActive ? 'Deactivate' : 'Reactivate'}
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      {creating && <CreateDialog services={services} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); void team.reload(true); }} />}
      {editing && <EditDialog member={editing} services={services} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void team.reload(true); }} />}
    </div>
  );
}
