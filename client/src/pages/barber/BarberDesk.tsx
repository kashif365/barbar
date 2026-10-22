import { useState } from 'react';
import { Check, Coffee, PhoneCall, Play, SkipForward, UserX } from 'lucide-react';
import { Banner, Button, Card, ConfirmDialog, EmptyState, ErrorState, LiveDot, PageHeader, Skeleton, cx } from '../../components/ui';
import { TokenCard } from '../../components/TokenCard';
import { useAction } from '../../hooks/useAction';
import { useFetch } from '../../hooks/useFetch';
import { useLiveQueue } from '../../hooks/useLiveQueue';
import { endpoints } from '../../services/api';
import type { Availability, StaffToken } from '../../types';
import { AVAILABILITY_LABEL, formatTime } from '../../utils/format';

type Pending = { reason: 'skipped' | 'no_show'; token: StaffToken };
const STATES: Availability[] = ['available', 'on_break', 'offline'];

export default function BarberDesk() {
  const { data, error, loading, reload } = useFetch(() => endpoints.staffQueue(), []);
  const connected = useLiveQueue(() => void reload(true));
  const { busy, run } = useAction();
  const [pending, setPending] = useState<Pending | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const act = async (key: string, fn: () => Promise<unknown>, msg?: string) => {
    const r = await run(key, fn, msg);
    await reload(true); // always reconcile: another device may have changed the queue
    return r;
  };

  const callNext = async () => {
    setNotice(null);
    const r = await act('call', () => endpoints.callNext());
    if (r && typeof r === 'object' && 'token' in r && !(r as { token: unknown }).token) setNotice((r as { message?: string }).message ?? 'No customers are waiting right now.');
  };

  const confirmSkip = async () => {
    if (!pending) return;
    const label = pending.reason === 'no_show' ? 'marked as no-show' : 'skipped';
    const r = await act(`skip:${pending.token.id}`, () => endpoints.skipToken(pending.token.id, pending.reason), `${pending.token.tokenNumber} ${label}.`);
    if (r) setPending(null);
  };

  const me = data?.me;
  const current = data?.current ?? null;
  const canCall = !!me && me.availability === 'available' && !current;

  return (
    <div>
      <PageHeader title="My queue" subtitle={me ? `${me.name} · ${data?.completedToday ?? 0} completed today` : undefined} actions={<span className="self-center"><LiveDot connected={connected} /></span>} />

      {loading && !data ? (
        <div className="space-y-3"><Skeleton className="h-16" /><Skeleton className="h-40" /><Skeleton className="h-28" /></div>
      ) : error && !data ? (
        <ErrorState message={error.message} onRetry={() => void reload()} />
      ) : data && me ? (
        <div className="space-y-6">
          <div role="group" aria-label="Availability" className="grid grid-cols-3 gap-2">
            {STATES.map((s) => (
              <Button
                key={s}
                variant={me.availability === s ? 'primary' : 'secondary'}
                aria-pressed={me.availability === s}
                loading={busy === `avail:${s}`}
                onClick={() => void act(`avail:${s}`, () => endpoints.setAvailability(s), `You are now ${AVAILABILITY_LABEL[s].toLowerCase()}.`)}
              >
                {s === 'on_break' && <Coffee className="h-4 w-4" aria-hidden />} {AVAILABILITY_LABEL[s]}
              </Button>
            ))}
          </div>
          {me.availability !== 'available' && <Banner tone="warn">You are {AVAILABILITY_LABEL[me.availability].toLowerCase()}. Set yourself to Available to call customers.</Banner>}
          {notice && <Banner tone="info">{notice}</Banner>}

          <section aria-labelledby="h-current">
            <h2 id="h-current" className="mb-4 font-display text-xl text-cream">Current customer</h2>
            {current ? (
              <ul>
                <TokenCard t={current} highlight showWait={false} actions={
                  <Button variant="primary" size="lg" className="w-full sm:w-auto" loading={busy === `done:${current.id}`} onClick={() => void act(`done:${current.id}`, () => endpoints.completeToken(current.id), `${current.tokenNumber} completed.`)}>
                    <Check className="h-5 w-5" aria-hidden /> Complete service
                  </Button>
                } />
                <li className="mt-1 text-xs text-muted">Started {formatTime(current.startedAt)}</li>
              </ul>
            ) : (
              <Card className="flex flex-col items-center gap-3 text-center">
                <p className="text-muted">{data.next ? `Next in line: ${data.next.tokenNumber} · ${data.next.customerName}` : 'No customers are waiting right now.'}</p>
                <Button variant="primary" size="lg" className="w-full sm:w-auto" disabled={!canCall || !data.next} loading={busy === 'call'} onClick={() => void callNext()}>
                  <PhoneCall className="h-5 w-5" aria-hidden /> Call next
                </Button>
              </Card>
            )}
          </section>

          <section aria-labelledby="h-wait">
            <h2 id="h-wait" className="mb-4 font-display text-xl text-cream">Waiting ({data.waiting.length})</h2>
            {data.waiting.length ? (
              <ul className="grid gap-3 md:grid-cols-2">
                {data.waiting.map((t, i) => (
                  <TokenCard key={t.id} t={t} highlight={i === 0} actions={
                    <>
                      <Button size="sm" variant="primary" disabled={!canCall} loading={busy === `start:${t.id}`} onClick={() => void act(`start:${t.id}`, () => endpoints.startToken(t.id), `${t.tokenNumber} started.`)}>
                        <Play className="h-4 w-4" aria-hidden /> Start
                      </Button>
                      <Button size="sm" onClick={() => setPending({ reason: 'skipped', token: t })}><SkipForward className="h-4 w-4" aria-hidden /> Skip</Button>
                      <Button size="sm" variant="danger" onClick={() => setPending({ reason: 'no_show', token: t })}><UserX className="h-4 w-4" aria-hidden /> No-show</Button>
                    </>
                  } />
                ))}
              </ul>
            ) : <EmptyState title="No customers are waiting right now." />}
          </section>

          <section aria-labelledby="h-hist">
            <h2 id="h-hist" className="mb-4 font-display text-xl text-cream">Completed today</h2>
            {data.history.length ? (
              <Card className="!p-0">
                <ul className="divide-y divide-line">
                  {data.history.map((t) => (
                    <li key={t.id} className={cx('flex items-center justify-between gap-3 px-4 py-3 text-sm')}>
                      <span className="font-semibold">{t.tokenNumber}</span>
                      <span className="min-w-0 flex-1 truncate text-muted">{t.serviceName}</span>
                      <span className="text-xs text-muted">{formatTime(t.completedAt)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : <EmptyState title="No services completed yet today." />}
          </section>
        </div>
      ) : null}

      <ConfirmDialog
        open={!!pending}
        title={pending?.reason === 'no_show' ? 'Mark as no-show?' : 'Skip this customer?'}
        message={pending ? `${pending.token.tokenNumber} (${pending.token.customerName}) will leave the waiting queue. Reception can re-queue them if they return.` : ''}
        confirmLabel={pending?.reason === 'no_show' ? 'Mark no-show' : 'Skip customer'}
        danger
        loading={busy !== null && busy.startsWith('skip:')}
        onConfirm={() => void confirmSkip()}
        onClose={() => setPending(null)}
      />
    </div>
  );
}
