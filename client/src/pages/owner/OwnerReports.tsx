import { useState } from 'react';
import { Download } from 'lucide-react';
import { Banner, Button, Card, EmptyState, ErrorState, PageHeader, Skeleton, StatCard, cx, inputCls } from '../../components/ui';
import { useFetch } from '../../hooks/useFetch';
import { endpoints } from '../../services/api';
import type { Report } from '../../types';
import { STATUS_LABEL, addDays, downloadCsv, formatPKR, todayKarachi } from '../../utils/format';

type Mode = 'daily' | 'monthly' | 'range';

function exportCsv(mode: Mode, r: Report) {
  downloadCsv(`shehraz-${mode}-${r.from}${r.to !== r.from ? `_${r.to}` : ''}.csv`, [
    ['Date', 'Tokens', 'Completed', 'Earnings (PKR)'],
    ...r.days.map((d) => [d.date, d.tokens, d.completed, d.earnings]),
  ]);
}

/** Simple bar chart of earnings per day; hidden for single-day reports. */
function EarningsChart({ days }: { days: Report['days'] }) {
  const max = Math.max(1, ...days.map((d) => d.earnings));
  return (
    <Card>
      <h2 className="mb-5 font-display text-xl text-cream">Earnings by day</h2>
      <div className="flex h-44 items-end gap-1 overflow-x-auto pb-1" role="img" aria-label="Bar chart of earnings per day">
        {days.map((d) => (
          <div key={d.date} className="group flex min-w-[0.9rem] flex-1 flex-col items-center justify-end gap-1.5 self-stretch" title={`${d.date}: ${formatPKR(d.earnings)} · ${d.completed} done`}>
            <div className="bg-gold-gradient w-full max-w-10 rounded-t-md opacity-80 transition-opacity group-hover:opacity-100" style={{ height: `${Math.max(2, (d.earnings / max) * 100)}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[0.65rem] uppercase tracking-wider text-muted">
        <span>{days[0]?.date}</span>
        <span>{days[days.length - 1]?.date}</span>
      </div>
    </Card>
  );
}

export default function OwnerReports() {
  const [mode, setMode] = useState<Mode>('daily');
  const [date, setDate] = useState(todayKarachi());
  const [month, setMonth] = useState(todayKarachi().slice(0, 7));
  const [from, setFrom] = useState(addDays(todayKarachi(), -6));
  const [to, setTo] = useState(todayKarachi());
  // Validate before asking the server (the server enforces the same rules).
  const rangeError =
    mode !== 'range' ? null
    : !from || !to ? 'Choose both a start and an end date.'
    : from > to ? 'The start date must be on or before the end date.'
    : addDays(from, 365) < to ? 'Choose a range of at most 366 days.'
    : null;
  const { data, error, loading, reload } = useFetch(
    () => (mode === 'daily' ? endpoints.dailyReport(date) : mode === 'monthly' ? endpoints.monthlyReport(month) : rangeError ? Promise.resolve(null) : endpoints.rangeReport(from, to)),
    [mode, date, month, from, to],
  );
  const r = data?.report;
  const loadingNow = loading && !r && !rangeError;

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Earnings are the booked price of completed services. Customers pay their barber in person."
        actions={r && <Button onClick={() => exportCsv(mode, r)}><Download className="h-4 w-4" aria-hidden /> Export CSV</Button>}
      />
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div role="group" aria-label="Report period" className="inline-flex rounded-full border border-line bg-panel p-1">
          {(['daily', 'monthly', 'range'] as Mode[]).map((m) => (
            <button
              key={m}
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={cx('min-h-10 rounded-full px-5 text-sm font-semibold capitalize transition', mode === m ? 'bg-gold-gradient text-ink' : 'text-muted hover:text-cream')}
            >
              {m}
            </button>
          ))}
        </div>
        {mode === 'daily' ? (
          <label className="text-sm"><span className="mb-1 block text-muted">Date</span><input type="date" className={inputCls} value={date} max={todayKarachi()} onChange={(e) => e.target.value && setDate(e.target.value)} /></label>
        ) : mode === 'monthly' ? (
          <label className="text-sm"><span className="mb-1 block text-muted">Month</span><input type="month" className={inputCls} value={month} max={todayKarachi().slice(0, 7)} onChange={(e) => e.target.value && setMonth(e.target.value)} /></label>
        ) : (
          <>
            <label className="text-sm"><span className="mb-1 block text-muted">From</span><input type="date" className={inputCls} value={from} max={todayKarachi()} onChange={(e) => setFrom(e.target.value)} /></label>
            <label className="text-sm"><span className="mb-1 block text-muted">To</span><input type="date" className={inputCls} value={to} max={todayKarachi()} onChange={(e) => setTo(e.target.value)} /></label>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => { setFrom(addDays(todayKarachi(), -6)); setTo(todayKarachi()); }}>Last 7 days</Button>
              <Button size="sm" onClick={() => { setFrom(addDays(todayKarachi(), -29)); setTo(todayKarachi()); }}>Last 30 days</Button>
            </div>
          </>
        )}
      </div>
      {rangeError && <div className="mb-5"><Banner tone="warn">{rangeError}</Banner></div>}

      {rangeError ? null : loadingNow ? <div className="grid gap-3 sm:grid-cols-4"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
        : error && !r ? <ErrorState message={error.message} onRetry={() => void reload()} />
        : r ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard accent label="Earnings" value={formatPKR(r.earnings)} sub={`${r.byStatus.completed} completed service${r.byStatus.completed === 1 ? '' : 's'}`} />
              <StatCard label="Tokens" value={r.totalTokens} sub={`${r.bySource.online} online · ${r.bySource['walk-in']} walk-in`} />
              <StatCard label="Completed" value={r.byStatus.completed} sub={r.byStatus.completed ? `Avg ${formatPKR(Math.round(r.earnings / r.byStatus.completed))}` : undefined} />
              <StatCard label="Cancelled / skipped" value={`${r.byStatus.cancelled} / ${r.byStatus.skipped}`} />
            </div>

            {r.totalTokens === 0 ? <EmptyState title="No activity in this period." /> : (
              <>
                {r.days.length > 1 && <EarningsChart days={r.days} />}
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <h2 className="mb-4 font-display text-xl text-cream">Services (completed)</h2>
                    {r.popularServices.length ? (
                      <ul className="divide-y divide-line text-sm">
                        {r.popularServices.map((s) => <li key={s.name} className="flex justify-between gap-3 py-2.5"><span className="text-cream">{s.name}</span><span className="text-muted">{s.completed} · {formatPKR(s.earnings)}</span></li>)}
                      </ul>
                    ) : <p className="text-sm text-muted">No completed services.</p>}
                  </Card>
                  <Card>
                    <h2 className="mb-4 font-display text-xl text-cream">By barber (completed)</h2>
                    {r.byBarber.length ? (
                      <ul className="divide-y divide-line text-sm">
                        {r.byBarber.map((b) => <li key={b.barberId} className="flex justify-between gap-3 py-2.5"><span className="text-cream">{b.name}</span><span className="text-muted">{b.completed} · {formatPKR(b.earnings)}</span></li>)}
                      </ul>
                    ) : <p className="text-sm text-muted">No completed services.</p>}
                  </Card>
                  <Card>
                    <h2 className="mb-4 font-display text-xl text-cream">Status breakdown</h2>
                    <ul className="divide-y divide-line text-sm">
                      {(Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).map((s) => <li key={s} className="flex justify-between py-2.5"><span className="text-cream">{STATUS_LABEL[s]}</span><span className="text-muted">{r.byStatus[s]}</span></li>)}
                    </ul>
                  </Card>
                  <Card className="!p-0">
                    <h2 className="px-4 pt-4 font-display text-xl text-cream sm:px-5 sm:pt-5">By day</h2>
                    <div className="overflow-x-auto p-2 sm:px-3">
                      <table className="w-full min-w-[22rem] text-left text-sm">
                        <thead className="text-[0.65rem] uppercase tracking-[0.14em] text-muted"><tr><th className="p-2 font-bold">Date</th><th className="p-2 text-right font-bold">Tokens</th><th className="p-2 text-right font-bold">Done</th><th className="p-2 text-right font-bold">Earnings</th></tr></thead>
                        <tbody className="divide-y divide-line">
                          {r.days.map((d) => <tr key={d.date}><td className="p-2">{d.date}</td><td className="p-2 text-right">{d.tokens}</td><td className="p-2 text-right">{d.completed}</td><td className="p-2 text-right text-gold-strong">{formatPKR(d.earnings)}</td></tr>)}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              </>
            )}
          </div>
        ) : null}
    </div>
  );
}
