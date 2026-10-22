import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Hourglass, Scissors, Ticket, Wallet, XCircle } from 'lucide-react';
import { Card, ErrorState, LiveDot, PageHeader, Pill, Skeleton, StatCard } from '../../components/ui';
import { useFetch } from '../../hooks/useFetch';
import { useLiveQueue } from '../../hooks/useLiveQueue';
import { endpoints } from '../../services/api';
import { AVAILABILITY_LABEL, formatPKR, initialsOf } from '../../utils/format';

const I = 'h-4 w-4';

export default function OwnerOverview() {
  const { data: d, error, loading, reload } = useFetch(() => endpoints.dashboard(), []);
  const connected = useLiveQueue(() => void reload(true));
  const maxPopular = Math.max(1, ...(d?.popularServices.map((s) => s.completed) ?? [1]));

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle={d ? `Today · ${d.businessDate}` : undefined}
        actions={<span className="self-center rounded-full border border-line bg-panel px-3 py-1.5"><LiveDot connected={connected} /></span>}
      />
      {loading && !d ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : error && !d ? (
        <ErrorState message={error.message} onRetry={() => void reload()} />
      ) : d ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="col-span-2">
              <StatCard
                accent
                label="Earnings today"
                value={formatPKR(d.earnings)}
                sub={`${d.completed} service${d.completed === 1 ? '' : 's'} completed · paid to barbers in person`}
                icon={<Wallet className="h-5 w-5" />}
              />
            </div>
            <StatCard label="Tokens today" value={d.totalTokens} sub={`${d.bySource.online} online · ${d.bySource['walk-in']} walk-in`} icon={<Ticket className={I} />} />
            <StatCard label="Waiting" value={d.waiting} sub={`${d.inService} in the chair`} icon={<Hourglass className={I} />} />
            <StatCard label="Completed" value={d.completed} icon={<CheckCircle2 className={I} />} />
            <StatCard label="In service" value={d.inService} icon={<Scissors className={I} />} />
            <StatCard label="Cancelled" value={d.cancelled} icon={<XCircle className={I} />} />
            <StatCard label="Skipped" value={d.skipped} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-xl text-cream">Popular services today</h2>
                <Link to="/owner/reports" className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.14em] text-gold hover:text-gold-strong">
                  Reports <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
              {d.popularServices.length ? (
                <ul className="space-y-3.5 text-sm">
                  {d.popularServices.map((s) => (
                    <li key={s.name}>
                      <div className="mb-1.5 flex justify-between"><span className="text-cream">{s.name}</span><span className="text-muted">{s.completed}</span></div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-line">
                        <div className="bg-gold-gradient h-full rounded-full" style={{ width: `${(s.completed / maxPopular) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted">No completed services yet today.</p>}
            </Card>
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-xl text-cream">Barbers</h2>
                <Link to="/owner/team" className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.14em] text-gold hover:text-gold-strong">
                  Manage <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
              {d.barbers.length ? (
                <ul className="divide-y divide-line text-sm">
                  {d.barbers.map((b) => (
                    <li key={b.id} className="flex items-center justify-between gap-3 py-3">
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-ink text-xs font-bold text-gold">
                          {initialsOf(b.name)}
                        </span>
                        <span className="min-w-0 truncate text-cream">{b.name}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-xs text-muted">{b.completedToday} done</span>
                        {b.busy ? <Pill tone="gold">With customer</Pill> : <Pill tone={b.availability === 'available' ? 'ok' : 'neutral'}>{AVAILABILITY_LABEL[b.availability]}</Pill>}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted">No barbers added yet. Add them under Barbers &amp; staff.</p>}
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
