import { Link } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import { PageHero } from '../components/PageHero';
import { Banner, EmptyState, ErrorState, LiveDot, Skeleton } from '../components/ui';
import { useFetch } from '../hooks/useFetch';
import { useLiveQueue } from '../hooks/useLiveQueue';
import { endpoints } from '../services/api';
import { waitText } from '../utils/format';

export default function QueuePage() {
  const { data: q, error, loading, reload } = useFetch(() => endpoints.queueToday(), []);
  const connected = useLiveQueue(() => void reload(true));

  return (
    <>
      <PageHero
        eyebrow="Live queue"
        title={<>Today <span className="text-gold-gradient italic">at the shop</span></>}
        aside={<span className="rounded-full border border-line bg-ink/60 px-4 py-2"><LiveDot connected={connected} /></span>}
      >
        Updates the moment a barber calls the next token. Only token numbers are shown, never names or phone numbers.
      </PageHero>

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        {loading && !q ? (
          <div className="space-y-4"><Skeleton className="h-56 rounded-[2rem]" /><Skeleton className="h-48 rounded-[2rem]" /></div>
        ) : error && !q ? (
          <ErrorState message={error.message} onRetry={() => void reload()} />
        ) : q ? (
          <div className="space-y-6">
            {!q.isOpen && <Banner tone="warn">The salon is currently closed. Please check back during opening hours.</Banner>}

            {/* Now serving board */}
            <div className="grain relative overflow-hidden rounded-[2rem] border border-gold/30 bg-gradient-to-b from-card to-ink p-8 text-center sm:p-12">
              <div aria-hidden className="bg-spotlight absolute inset-0" />
              <p className="relative text-[0.7rem] font-bold uppercase tracking-[0.35em] text-gold">Now serving</p>
              {q.nowServing.length ? (
                <div className="relative mt-5 flex flex-wrap justify-center gap-x-10 gap-y-4">
                  {q.nowServing.map((n) => (
                    <span key={n.tokenNumber} className="font-display text-gold-gradient text-7xl font-semibold sm:text-8xl">{n.tokenNumber}</span>
                  ))}
                </div>
              ) : (
                <p className="relative mt-5 font-display text-3xl italic text-cream/60">Chairs are free</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {[
                { n: q.counts.waiting, l: 'Waiting' },
                { n: q.counts.in_service, l: 'In the chair' },
                { n: q.counts.completed, l: 'Done today' },
              ].map((x) => (
                <div key={x.l} className="rounded-[1.5rem] border border-line bg-gradient-to-b from-card to-panel p-4 text-center sm:p-6">
                  <p className="font-display text-4xl text-cream sm:text-5xl">{x.n}</p>
                  <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted sm:text-xs">{x.l}</p>
                </div>
              ))}
            </div>

            <div className="rounded-[2rem] border border-line bg-gradient-to-b from-card to-panel p-6 sm:p-8">
              <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="font-display text-2xl text-cream">In line</h2>
                <p className="inline-flex items-center gap-1.5 text-sm text-muted">
                  <Clock className="h-4 w-4 text-gold" aria-hidden /> New token wait: <span className="font-semibold text-cream">{waitText(q.estimatedWaitForNewTokenMinutes)}</span>
                </p>
              </div>
              {q.waiting.length ? (
                <ol className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-6">
                  {q.waiting.map((w, i) => (
                    <li
                      key={w.tokenNumber}
                      className={`rounded-2xl border px-3 py-3 text-center ${i === 0 ? 'border-gold/60 bg-gold/10' : 'border-line bg-ink/60'}`}
                    >
                      <span className="block text-[0.6rem] font-bold uppercase tracking-[0.18em] text-muted">{i === 0 ? 'Next' : `#${w.position}`}</span>
                      <span className="font-display text-2xl text-cream">{w.tokenNumber}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <EmptyState title="No one is waiting right now." hint="Get a token and you’ll be next in line." />
              )}
            </div>

            <Link
              to="/book"
              className="bg-gold-gradient flex min-h-14 items-center justify-center gap-2 rounded-full text-base font-bold text-ink shadow-[0_18px_40px_-14px_rgba(201,164,92,0.9)] transition hover:brightness-110"
            >
              Get Your Token <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
          </div>
        ) : null}
      </div>
    </>
  );
}
