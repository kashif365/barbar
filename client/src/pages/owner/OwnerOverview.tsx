import { Card, ErrorState, LiveDot, PageHeader, Pill, Skeleton } from '../../components/ui';
import { useFetch } from '../../hooks/useFetch';
import { useLiveQueue } from '../../hooks/useLiveQueue';
import { endpoints } from '../../services/api';
import { AVAILABILITY_LABEL, formatPKR } from '../../utils/format';

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card className="!p-4">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </Card>
  );
}

export default function OwnerOverview() {
  const { data: d, error, loading, reload } = useFetch(() => endpoints.dashboard(), []);
  const connected = useLiveQueue(() => void reload(true));

  return (
    <div>
      <PageHeader title="Overview" subtitle={d ? `Business date ${d.businessDate}` : undefined} actions={<span className="self-center"><LiveDot connected={connected} /></span>} />
      {loading && !d ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : error && !d ? (
        <ErrorState message={error.message} onRetry={() => void reload()} />
      ) : d ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Tokens today" value={d.totalTokens} sub={`${d.bySource.online} online · ${d.bySource['walk-in']} walk-in`} />
            <Stat label="Waiting" value={d.waiting} />
            <Stat label="In service" value={d.inService} />
            <Stat label="Completed" value={d.completed} sub={d.completedUnpaid ? `${d.completedUnpaid} unpaid` : 'All paid'} />
            <Stat label="Cancelled" value={d.cancelled} />
            <Stat label="Skipped" value={d.skipped} />
            <Stat label="Recorded revenue" value={formatPKR(d.revenue)} sub="From payment records" />
          </div>

          <section aria-labelledby="h-money">
            <h2 id="h-money" className="mb-1 font-semibold">Payments &amp; revenue</h2>
            <p className="mb-3 text-xs text-muted">Revenue is money actually received, counted on the day the payment was recorded. Completed-but-unpaid services are never included.</p>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="Received today" value={formatPKR(d.payments.receivedToday)} sub="Payments recorded today" />
              <Stat label="Paid services" value={d.payments.paidServicesToday} sub="Payments received today" />
              <Stat label="Completed, unpaid today" value={d.payments.completedTodayUnpaidCount} sub={`${formatPKR(d.payments.completedTodayUnpaidAmount)} not yet received`} />
              <Stat label="Outstanding unpaid" value={formatPKR(d.payments.outstandingAmount)} sub={`${d.payments.outstandingCount} completed service${d.payments.outstandingCount === 1 ? '' : 's'}, all dates`} />
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="mb-3 font-semibold">Popular services today</h2>
              {d.popularServices.length ? (
                <ul className="divide-y divide-line text-sm">
                  {d.popularServices.map((s) => <li key={s.name} className="flex justify-between py-2"><span>{s.name}</span><span className="text-muted">{s.completed} completed</span></li>)}
                </ul>
              ) : <p className="text-sm text-muted">No completed services yet today.</p>}
            </Card>
            <Card>
              <h2 className="mb-3 font-semibold">Barbers</h2>
              {d.barbers.length ? (
                <ul className="divide-y divide-line text-sm">
                  {d.barbers.map((b) => (
                    <li key={b.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0 truncate">{b.name}</span>
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
