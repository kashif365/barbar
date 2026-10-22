import { ArrowRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Service } from '../types';
import { formatPKR } from '../utils/format';
import { Pill } from './ui';

export function ServiceCard({ service, showAction = true, index }: { service: Omit<Service, 'id'> & { id?: string }; showAction?: boolean; index?: number }) {
  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-line bg-gradient-to-b from-card to-panel p-6 transition-all duration-300 hover:-translate-y-1 hover:border-gold/50 hover:shadow-[0_30px_60px_-30px_rgba(201,164,92,0.35)]">
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-3">
        {typeof index === 'number' && <span className="font-display text-sm italic text-gold/70">No. {String(index + 1).padStart(2, '0')}</span>}
        <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted">
          <Clock className="h-3.5 w-3.5" aria-hidden /> ~{service.durationMinutes} min
        </span>
      </div>
      <h3 className="mt-4 font-display text-2xl font-semibold text-cream">{service.name}</h3>
      {service.description && <p className="mt-2 text-sm leading-relaxed text-muted">{service.description}</p>}
      <div className="mt-auto pt-6">
        <div className="flex items-end justify-between gap-3 border-t border-line pt-5">
          <p className="font-display text-gold-gradient text-3xl font-semibold">{formatPKR(service.price)}</p>
          {showAction && service.id && (
            <Link
              to={`/book?service=${service.id}`}
              aria-label={`Get a token for ${service.name}`}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold/50 text-gold-strong transition group-hover:bg-gold group-hover:text-ink"
            >
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
          )}
        </div>
        {service.isDemoPrice && <div className="mt-3"><Pill tone="warn">Demo price — confirm with salon</Pill></div>}
      </div>
    </div>
  );
}
