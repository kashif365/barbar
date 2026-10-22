import { useState } from 'react';
import { Download } from 'lucide-react';
import { Banner, Button, Card, EmptyState, ErrorState, PageHeader, Skeleton, inputCls } from '../../components/ui';
import { useFetch } from '../../hooks/useFetch';
import { endpoints } from '../../services/api';
import type { Report } from '../../types';
import { STATUS_LABEL, addDays, downloadCsv, formatPKR, todayKarachi } from '../../utils/format';

type Mode = 'daily' | 'monthly' | 'range';

function exportCsv(mode: Mode, r: Report) {
  downloadCsv(`shehraz-${mode}-${r.from}${r.to !== r.from ? `_${r.to}` : ''}.csv`, [
    ['Date', 'Tokens', 'Completed', 'Recorded revenue (PKR)'],
    ...r.days.map((d) => [d.date, d.tokens, d.completed, d.revenue]),
  ]);
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
        subtitle="Revenue counts recorded payments only. Completed-but-unpaid services are shown separately."
        actions={r && <Button onClick={() => exportCsv(mode, r)}><Download className="h-4 w-4" aria-hidden /> Export CSV</Button>}
      />
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div role="group" aria-label="Report period" className="inline-flex rounded-xl border border-line p-1">
          {(['daily', 'monthly', 'range'] as Mode[]).map((m) => (
            <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)} className={`min-h-10 rounded-lg px-4 text-sm capitalize ${mode === m ? 'bg-gold text-ink' : 'text-muted hover:text-white'}`}>{m}</button>
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
      <p className="mb-5 text-xs text-muted">Revenue is counted on the day a payment was received. A service paid later counts on the day it was paid, not the day it was booked.</p>

      {rangeError ? null : loadingNow ? <div className="grid gap-3 sm:grid-cols-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
        : error && !r ? <ErrorState message={error.message} onRetry={() => void reload()} />
        : r ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Card className="!p-4"><p className="text-xs uppercase tracking-wider text-muted">Recorded revenue</p><p className="mt-1 text-2xl font-bold">{formatPKR(r.revenue.total)}</p><p className="text-xs text-muted">{r.revenue.paymentsCount} payment{r.revenue.paymentsCount === 1 ? '' : 's'}</p></Card>
              <Card className="!p-4"><p className="text-xs uppercase tracking-wider text-muted">Tokens</p><p className="mt-1 text-2xl font-bold">{r.totalTokens}</p><p className="text-xs text-muted">{r.bySource.online} online · {r.bySource['walk-in']} walk-in</p></Card>
              <Card className="!p-4"><p className="text-xs uppercase tracking-wider text-muted">Completed</p><p className="mt-1 text-2xl font-bold">{r.byStatus.completed}</p><p className="text-xs text-muted">{r.completedUnpaid} unpaid · {formatPKR(r.completedUnpaidAmount)}</p></Card>
              <Card className="!p-4"><p className="text-xs uppercase tracking-wider text-muted">Cancelled / skipped</p><p className="mt-1 text-2xl font-bold">{r.byStatus.cancelled} / {r.byStatus.skipped}</p></Card>
            </div>

            {r.totalTokens === 0 && r.revenue.paymentsCount === 0 ? <EmptyState title="No activity in this period." /> : (
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <h2 className="mb-3 font-semibold">Status breakdown</h2>
                  <ul className="divide-y divide-line text-sm">
                    {(Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).map((s) => <li key={s} className="flex justify-between py-2"><span>{STATUS_LABEL[s]}</span><span className="text-muted">{r.byStatus[s]}</span></li>)}
                  </ul>
                </Card>
                <Card>
                  <h2 className="mb-3 font-semibold">Service popularity (completed)</h2>
                  {r.popularServices.length ? <ul className="divide-y divide-line text-sm">{r.popularServices.map((s) => <li key={s.name} className="flex justify-between py-2"><span>{s.name}</span><span className="text-muted">{s.completed}</span></li>)}</ul> : <p className="text-sm text-muted">No completed services.</p>}
                </Card>
                <Card>
                  <h2 className="mb-3 font-semibold">By barber (completed)</h2>
                  {r.byBarber.length ? <ul className="divide-y divide-line text-sm">{r.byBarber.map((b) => <li key={b.barberId} className="flex justify-between py-2"><span>{b.name}</span><span className="text-muted">{b.completed}</span></li>)}</ul> : <p className="text-sm text-muted">No completed services.</p>}
                </Card>
                <Card className="!p-0">
                  <h2 className="px-4 pt-4 font-semibold sm:px-5">By day</h2>
                  <div className="overflow-x-auto p-2 sm:px-3">
                    <table className="w-full min-w-[22rem] text-left text-sm">
                      <thead className="text-xs uppercase tracking-wider text-muted"><tr><th className="p-2 font-medium">Date</th><th className="p-2 text-right font-medium">Tokens</th><th className="p-2 text-right font-medium">Done</th><th className="p-2 text-right font-medium">Revenue</th></tr></thead>
                      <tbody className="divide-y divide-line">
                        {r.days.map((d) => <tr key={d.date}><td className="p-2">{d.date}</td><td className="p-2 text-right">{d.tokens}</td><td className="p-2 text-right">{d.completed}</td><td className="p-2 text-right">{formatPKR(d.revenue)}</td></tr>)}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}
          </div>
        ) : null}
    </div>
  );
}
