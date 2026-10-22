import { Link } from 'react-router-dom';
import { Card, EmptyState, ErrorState, LiveDot, Skeleton } from '../components/ui';
import { useFetch } from '../hooks/useFetch';
import { useLiveQueue } from '../hooks/useLiveQueue';
import { endpoints } from '../services/api';
import { waitText } from '../utils/format';

export default function QueuePage() {
  const { data: q, error, loading, reload } = useFetch(() => endpoints.queueToday(), []);
  const connected = useLiveQueue(() => void reload(true));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Live queue</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Today at the salon</h1>
        </div>
        <LiveDot connected={connected} />
      </div>

      {loading && !q ? (
        <div className="space-y-4"><Skeleton className="h-36" /><Skeleton className="h-48" /></div>
      ) : error && !q ? (
        <ErrorState message={error.message} onRetry={() => void reload()} />
      ) : q ? (
        <div className="space-y-4">
          {!q.isOpen && <p role="note" className="rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">The salon is currently closed. Please try again during operating hours.</p>}

          <Card className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Now serving</p>
            {q.nowServing.length ? (
              <div className="mt-3 flex flex-wrap justify-center gap-3">
                {q.nowServing.map((n) => (
                  <span key={n.tokenNumber} className="text-5xl font-extrabold tracking-tight text-gold-strong sm:text-6xl">{n.tokenNumber}</span>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-lg text-muted">No one is being served right now.</p>
            )}
          </Card>

          <div className="grid grid-cols-3 gap-3 text-center">
            <Card className="!p-3"><p className="text-2xl font-bold">{q.counts.waiting}</p><p className="text-xs text-muted">Waiting</p></Card>
            <Card className="!p-3"><p className="text-2xl font-bold">{q.counts.in_service}</p><p className="text-xs text-muted">In service</p></Card>
            <Card className="!p-3"><p className="text-2xl font-bold">{q.counts.completed}</p><p className="text-xs text-muted">Done today</p></Card>
          </div>

          <Card>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="font-semibold">Waiting</h2>
              <p className="text-xs text-muted">New token wait: {waitText(q.estimatedWaitForNewTokenMinutes)}</p>
            </div>
            {q.waiting.length ? (
              <ol className="flex flex-wrap gap-2">
                {q.waiting.map((w) => (
                  <li key={w.tokenNumber} className="rounded-xl border border-line bg-panel px-3 py-2 text-center">
                    <span className="block text-[10px] uppercase tracking-wider text-muted">#{w.position}</span>
                    <span className="text-lg font-bold">{w.tokenNumber}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState title="No customers are waiting right now." hint="Get a token and you’ll be next in line." />
            )}
          </Card>

          <Link to="/book" className="flex min-h-12 items-center justify-center rounded-xl bg-gold font-semibold text-ink hover:bg-gold-strong">Get Your Token</Link>
          <p className="text-center text-xs text-muted">Only token numbers are shown here, never names or phone numbers.</p>
        </div>
      ) : null}
    </div>
  );
}
