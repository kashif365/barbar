import { useState } from 'react';
import { Check, Play, Plus, RotateCcw, SkipForward, X } from 'lucide-react';
import { Button, ConfirmDialog, EmptyState, ErrorState, LiveDot, PageHeader, Skeleton, inputCls } from '../../components/ui';
import { TokenCard } from '../../components/TokenCard';
import { WalkInForm } from '../../components/WalkInForm';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useAction } from '../../hooks/useAction';
import { useFetch } from '../../hooks/useFetch';
import { useLiveQueue } from '../../hooks/useLiveQueue';
import { endpoints } from '../../services/api';
import type { StaffToken } from '../../types';
import { waitText } from '../../utils/format';

type Pending = { kind: 'cancel' | 'skip' | 'recover'; token: StaffToken };

const COPY: Record<Pending['kind'], { title: string; confirm: string; message: (t: StaffToken) => string; done: string }> = {
  cancel: { title: 'Cancel this token?', confirm: 'Cancel token', message: (t) => `${t.tokenNumber} (${t.customerName}) will leave the queue and cannot be restored.`, done: 'Token cancelled.' },
  skip: { title: 'Skip this customer?', confirm: 'Skip customer', message: (t) => `${t.tokenNumber} (${t.customerName}) will be marked skipped. They can be re-queued to the back of the line.`, done: 'Customer skipped.' },
  recover: { title: 'Return to the queue?', confirm: 'Return to queue', message: (t) => `${t.tokenNumber} is in service. Use this only if the barber cannot finish (e.g. device problem). The customer goes to the back of the queue.`, done: 'Token returned to the queue.' },
};

/** Owner "Live queue" and reception desk. Barbers use BarberDesk instead. */
export default function QueueDesk() {
  const { user } = useAuth();
  const toast = useToast();
  const isOwner = user?.role === 'owner';
  const { data, error, loading, reload } = useFetch(() => endpoints.staffQueue(), []);
  const connected = useLiveQueue(() => void reload(true));
  const { busy, run } = useAction();
  const [walkIn, setWalkIn] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);

  const act = async (key: string, fn: () => Promise<unknown>, msg?: string) => {
    const r = await run(key, fn, msg);
    if (r !== undefined) await reload(true);
    return r !== undefined;
  };

  const confirmPending = async () => {
    if (!pending) return;
    const { kind, token } = pending;
    const fn = kind === 'cancel' ? () => endpoints.cancelToken(token.id) : kind === 'skip' ? () => endpoints.skipToken(token.id, 'skipped') : () => endpoints.requeueToken(token.id);
    if (await act(`${kind}:${token.id}`, fn, COPY[kind].done)) setPending(null);
  };

  const barberOptions = data?.barbers ?? [];

  return (
    <div>
      <PageHeader
        title={isOwner ? 'Live queue' : 'Queue desk'}
        subtitle={data ? `New token wait: ${waitText(data.estimatedWaitForNewTokenMinutes)}` : undefined}
        actions={
          <>
            <span className="self-center"><LiveDot connected={connected} /></span>
            <Button variant="primary" onClick={() => setWalkIn(true)}><Plus className="h-4 w-4" aria-hidden /> Walk-in token</Button>
          </>
        }
      />

      {loading && !data ? (
        <div className="space-y-3"><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
      ) : error && !data ? (
        <ErrorState message={error.message} onRetry={() => void reload()} />
      ) : data ? (
        <div className="space-y-8">
          <section aria-labelledby="h-serving">
            <h2 id="h-serving" className="mb-4 font-display text-xl text-cream">In service ({data.inService.length})</h2>
            {data.inService.length ? (
              <ul className="grid gap-3 md:grid-cols-2">
                {data.inService.map((t) => (
                  <TokenCard key={t.id} t={t} highlight showWait={false} actions={isOwner && (
                    <>
                      <Button size="sm" variant="primary" loading={busy === `complete:${t.id}`} onClick={() => void act(`complete:${t.id}`, () => endpoints.completeToken(t.id), `${t.tokenNumber} completed.`)}>
                        <Check className="h-4 w-4" aria-hidden /> Complete service
                      </Button>
                      <Button size="sm" onClick={() => setPending({ kind: 'recover', token: t })}><RotateCcw className="h-4 w-4" aria-hidden /> Return to queue</Button>
                    </>
                  )} />
                ))}
              </ul>
            ) : <EmptyState title="No one is being served right now." />}
          </section>

          <section aria-labelledby="h-waiting">
            <h2 id="h-waiting" className="mb-4 font-display text-xl text-cream">Waiting ({data.waiting.length})</h2>
            {data.waiting.length ? (
              <ul className="grid gap-3 md:grid-cols-2">
                {data.waiting.map((t) => (
                  <TokenCard
                    key={t.id}
                    t={t}
                    actions={
                      <>
                        {isOwner && (
                          <Button size="sm" variant="primary" loading={busy === `start:${t.id}`} onClick={() => void act(`start:${t.id}`, () => endpoints.startToken(t.id), `${t.tokenNumber} started.`)}>
                            <Play className="h-4 w-4" aria-hidden /> Start service
                          </Button>
                        )}
                        {isOwner && (
                          <select
                            aria-label={`Barber for ${t.tokenNumber}`}
                            className={`${inputCls} !min-h-9 !w-auto !py-1 !text-sm`}
                            value={t.barberId ?? ''}
                            disabled={busy !== null}
                            onChange={(e) => void act(`reassign:${t.id}`, () => endpoints.reassign(t.id, e.target.value || null), 'Token reassigned.')}
                          >
                            <option value="">First available</option>
                            {barberOptions.filter((b) => b.name).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                          </select>
                        )}
                        <Button size="sm" onClick={() => setPending({ kind: 'skip', token: t })}><SkipForward className="h-4 w-4" aria-hidden /> Skip</Button>
                        <Button size="sm" variant="danger" onClick={() => setPending({ kind: 'cancel', token: t })}><X className="h-4 w-4" aria-hidden /> Cancel</Button>
                      </>
                    }
                  />
                ))}
              </ul>
            ) : <EmptyState title="No customers are waiting right now." />}
          </section>

          {data.skipped.length > 0 && (
            <section aria-labelledby="h-skipped">
              <h2 id="h-skipped" className="mb-4 font-display text-xl text-cream">Skipped today ({data.skipped.length})</h2>
              <ul className="grid gap-3 md:grid-cols-2">
                {data.skipped.map((t) => (
                  <TokenCard key={t.id} t={t} showWait={false} actions={
                    <Button size="sm" loading={busy === `requeue:${t.id}`} onClick={() => void act(`requeue:${t.id}`, () => endpoints.requeueToken(t.id), `${t.tokenNumber} re-queued at the back.`)}>
                      <RotateCcw className="h-4 w-4" aria-hidden /> Re-queue
                    </Button>
                  } />
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="h-done">
            <h2 id="h-done" className="mb-4 font-display text-xl text-cream">Completed today ({data.completedToday})</h2>
            {data.completed.length ? (
              <ul className="grid gap-3 md:grid-cols-2">
                {data.completed.map((t) => (
                  <TokenCard key={t.id} t={t} showWait={false} />
                ))}
              </ul>
            ) : <EmptyState title="Nothing completed yet today." />}
          </section>
        </div>
      ) : null}

      {walkIn && (
        <WalkInForm
          onClose={() => setWalkIn(false)}
          onCreated={(n) => { setWalkIn(false); toast.success(`Token ${n} created.`); void reload(true); }}
        />
      )}
      <ConfirmDialog
        open={!!pending}
        title={pending ? COPY[pending.kind].title : ''}
        message={pending ? COPY[pending.kind].message(pending.token) : ''}
        confirmLabel={pending ? COPY[pending.kind].confirm : ''}
        danger
        loading={busy !== null && !!pending && busy.startsWith(pending.kind)}
        onConfirm={() => void confirmPending()}
        onClose={() => setPending(null)}
      />
    </div>
  );
}
