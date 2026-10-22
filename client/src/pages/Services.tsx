import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Reveal } from '../components/Media';
import { PageHero } from '../components/PageHero';
import { ServiceCard } from '../components/ServiceCard';
import { Banner, EmptyState, ErrorState, Skeleton } from '../components/ui';
import { useFetch } from '../hooks/useFetch';
import { endpoints } from '../services/api';

export default function Services() {
  const { data, error, loading, reload } = useFetch(() => endpoints.services(), []);
  const items = data?.items ?? [];
  const hasDemo = items.some((s) => s.isDemoPrice);

  return (
    <>
      <PageHero eyebrow="The menu" title={<>Services <span className="text-gold-gradient italic">&amp; prices</span></>}>
        Every price is in Pakistani Rupees, set by the salon. Pay your barber in person after your service.
      </PageHero>

      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        {hasDemo && (
          <div className="mb-8">
            <Banner tone="warn">Some prices are marked “Demo price — confirm with salon”. They are illustrative and not yet confirmed.</Banner>
          </div>
        )}
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-60 rounded-[1.5rem]" />)}</div>
        ) : error ? (
          <ErrorState message={error.message} onRetry={() => void reload()} />
        ) : items.length === 0 ? (
          <EmptyState title="No services are listed right now" hint="Please check back soon." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((s, i) => (
              <Reveal key={s.id} delay={(i % 3) * 90}>
                <ServiceCard service={s} index={i} />
              </Reveal>
            ))}
          </div>
        )}

        <div className="mt-16 flex flex-col items-center gap-4 rounded-[2rem] border border-gold/25 bg-gradient-to-b from-card to-panel px-6 py-12 text-center">
          <p className="font-display text-3xl text-cream sm:text-4xl">Ready for a fresh cut?</p>
          <p className="max-w-md text-sm text-muted">Get a digital token and follow the queue live from your phone.</p>
          <Link to="/book" className="bg-gold-gradient mt-2 inline-flex min-h-13 items-center gap-2 rounded-full px-8 font-bold text-ink transition hover:brightness-110">
            Get Your Token <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </>
  );
}
