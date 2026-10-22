import { ServiceCard } from '../components/ServiceCard';
import { Banner, EmptyState, ErrorState, SectionTitle, Skeleton } from '../components/ui';
import { useFetch } from '../hooks/useFetch';
import { endpoints } from '../services/api';

export default function Services() {
  const { data, error, loading, reload } = useFetch(() => endpoints.services(), []);
  const items = data?.items ?? [];
  const hasDemo = items.some((s) => s.isDemoPrice);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <SectionTitle eyebrow="Services" title="Services & prices">
        All prices are in Pakistani Rupees (PKR) and shown exactly as set by the salon.
      </SectionTitle>
      {hasDemo && (
        <div className="mb-6">
          <Banner tone="warn">Some prices are marked “Demo Price — Confirm with salon”. They are illustrative and not yet verified by the salon.</Banner>
        </div>
      )}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-44" />)}</div>
      ) : error ? (
        <ErrorState message={error.message} onRetry={() => void reload()} />
      ) : items.length === 0 ? (
        <EmptyState title="No services are listed right now" hint="Please check back soon." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((s) => <ServiceCard key={s.id} service={s} />)}</div>
      )}
    </div>
  );
}
