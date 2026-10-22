import { Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Service } from '../types';
import { formatPKR } from '../utils/format';
import { Card, Pill } from './ui';

export function ServiceCard({ service, showAction = true }: { service: Omit<Service, 'id'> & { id?: string }; showAction?: boolean }) {
  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold">{service.name}</h3>
        <p className="shrink-0 text-lg font-bold text-gold-strong">{formatPKR(service.price)}</p>
      </div>
      {service.description && <p className="mt-2 text-sm text-muted">{service.description}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted">
          <Clock className="h-3.5 w-3.5" aria-hidden /> ~{service.durationMinutes} min
        </span>
        {service.isDemoPrice && <Pill tone="warn">Demo Price — Confirm with salon</Pill>}
      </div>
      {showAction && service.id && (
        <Link
          to={`/book?service=${service.id}`}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl border border-line px-4 text-sm font-medium hover:border-gold/60"
        >
          Get token for this service
        </Link>
      )}
    </Card>
  );
}
