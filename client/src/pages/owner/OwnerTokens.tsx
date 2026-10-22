import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Button, ConfirmDialog, EmptyState, ErrorState, PageHeader, Skeleton, inputCls } from '../../components/ui';
import { TokenCard } from '../../components/TokenCard';
import { useAction } from '../../hooks/useAction';
import { useFetch } from '../../hooks/useFetch';
import { useLiveQueue } from '../../hooks/useLiveQueue';
import { endpoints } from '../../services/api';
import type { StaffToken, TokenSource, TokenStatus } from '../../types';
import { STATUS_LABEL, todayKarachi } from '../../utils/format';

export default function OwnerTokens() {
  const [date, setDate] = useState(todayKarachi());
  const [status, setStatus] = useState<TokenStatus | ''>('');
  const [source, setSource] = useState<TokenSource | ''>('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [cancelling, setCancelling] = useState<StaffToken | null>(null);
  const { busy, run } = useAction();

  const { data, error, loading, reload } = useFetch(
    () => endpoints.ownerTokens({ date, status: status || undefined, source: source || undefined, q: q.trim() || undefined, page, limit: 20 }),
    [date, status, source, q, page],
  );
  useLiveQueue(() => void reload(true));
  const team = useFetch(() => endpoints.team(), []);
  const barbers = (team.data?.items ?? []).filter((m) => m.role === 'barber' && m.isActive);

  const reassign = async (t: StaffToken, barberId: string) => {
    const r = await run(`reassign:${t.id}`, () => endpoints.reassign(t.id, barberId || null), 'Token reassigned.');
    if (r !== undefined) await reload(true);
  };
  const confirmCancel = async () => {
    if (!cancelling) return;
    const r = await run(`cancel:${cancelling.id}`, () => endpoints.cancelToken(cancelling.id), 'Token cancelled.');
    if (r !== undefined) { setCancelling(null); await reload(true); }
  };
  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };

  return (
    <div>
      <PageHeader title="All tokens" subtitle="Every token for the selected business date." />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Date</span>
          <input type="date" className={inputCls} value={date} max={todayKarachi()} onChange={(e) => e.target.value && reset(setDate)(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Status</span>
          <select className={inputCls} value={status} onChange={(e) => reset(setStatus)(e.target.value as TokenStatus | '')}>
            <option value="">All statuses</option>
            {(Object.keys(STATUS_LABEL) as TokenStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Source</span>
          <select className={inputCls} value={source} onChange={(e) => reset(setSource)(e.target.value as TokenSource | '')}>
            <option value="">Online &amp; walk-in</option>
            <option value="online">Online</option>
            <option value="walk-in">Walk-in</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Token number</span>
          <span className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <input className={`${inputCls} pl-9`} placeholder="e.g. A-004" value={q} maxLength={20} onChange={(e) => reset(setQ)(e.target.value)} />
          </span>
        </label>
      </div>

      {loading && !data ? (
        <div className="space-y-3"><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
      ) : error && !data ? (
        <ErrorState message={error.message} onRetry={() => void reload()} />
      ) : data && data.items.length ? (
        <>
          <p className="mb-3 text-sm text-muted">{data.total} token{data.total === 1 ? '' : 's'}</p>
          <ul className="grid gap-3 md:grid-cols-2">
            {data.items.map((t) => (
              <TokenCard
                key={t.id}
                t={t}
                actions={
                  <>
                    {t.status === 'waiting' && (
                      <>
                        <select
                          aria-label={`Barber for ${t.tokenNumber}`}
                          className={`${inputCls} !min-h-9 !w-auto !py-1 !text-sm`}
                          value={t.barberId ?? ''}
                          disabled={busy !== null}
                          onChange={(e) => void reassign(t, e.target.value)}
                        >
                          <option value="">First available</option>
                          {barbers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                        <Button size="sm" variant="danger" onClick={() => setCancelling(t)}><X className="h-4 w-4" aria-hidden /> Cancel</Button>
                      </>
                    )}
                  </>
                }
              />
            ))}
          </ul>
          {data.pages > 1 && (
            <div className="mt-5 flex items-center justify-between">
              <Button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <span className="text-sm text-muted">Page {data.page} of {data.pages}</span>
              <Button disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          )}
        </>
      ) : <EmptyState title="No tokens match these filters." hint="Try another date or clear a filter." />}

      <ConfirmDialog
        open={!!cancelling}
        title="Cancel this token?"
        message={cancelling ? `${cancelling.tokenNumber} (${cancelling.customerName}) will leave the queue and cannot be restored.` : ''}
        confirmLabel="Cancel token"
        danger
        loading={!!cancelling && busy === `cancel:${cancelling.id}`}
        onConfirm={() => void confirmCancel()}
        onClose={() => setCancelling(null)}
      />
    </div>
  );
}
