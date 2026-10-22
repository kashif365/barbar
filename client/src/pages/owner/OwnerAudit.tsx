import { Card, EmptyState, ErrorState, PageHeader, Pill, Skeleton } from '../../components/ui';
import { useFetch } from '../../hooks/useFetch';
import { endpoints } from '../../services/api';
import { formatDateTime } from '../../utils/format';

/** "service.update" -> "Service update" */
const actionLabel = (a: string) => {
  const s = a.replace(/[._]/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Short, readable summary of the logged details. Values are truncated; nothing secret is ever logged by the server. */
function summarize(meta: Record<string, unknown> | undefined): string {
  if (!meta) return '';
  return Object.entries(meta)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .slice(0, 6)
    .map(([k, v]) => {
      const text = typeof v === 'object' ? JSON.stringify(v) : String(v);
      return `${k}: ${text.length > 60 ? `${text.slice(0, 57)}…` : text}`;
    })
    .join(' · ');
}

export default function OwnerAudit() {
  const { data, error, loading, reload } = useFetch(() => endpoints.audit(), []);
  const items = data?.items ?? [];

  return (
    <div>
      <PageHeader title="Audit log" subtitle="The 100 most recent administrative actions: services, staff accounts, settings and reassignments." />
      {loading && !data ? (
        <div className="space-y-3"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
      ) : error && !data ? (
        <ErrorState message={error.message} onRetry={() => void reload()} />
      ) : !items.length ? (
        <EmptyState title="No administrative actions recorded yet." hint="Changes to services, staff, settings and token reassignments will appear here." />
      ) : (
        <Card className="!p-0">
          <ul className="divide-y divide-line">
            {items.map((a) => {
              const detail = summarize(a.meta);
              return (
                <li key={a.id} className="px-4 py-3 text-sm sm:px-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{actionLabel(a.action)}</span>
                      <Pill>{a.entityType}</Pill>
                    </span>
                    <time dateTime={a.createdAt} className="text-xs text-muted">{formatDateTime(a.createdAt)}</time>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">By {a.actorName}</p>
                  {detail && <p className="mt-1 break-words text-xs text-muted">{detail}</p>}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
