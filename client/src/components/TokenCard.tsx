import type { ReactNode } from 'react';
import { Pill, SourceBadge, StatusBadge, cx } from './ui';
import type { StaffToken } from '../types';
import { formatPKR, formatTime, waitText } from '../utils/format';

/** One token in a staff list. Actions are passed in so the owner desk and barber desk share the layout. */
export function TokenCard({ t, actions, highlight, showWait = true }: { t: StaffToken; actions?: ReactNode; highlight?: boolean; showWait?: boolean }) {
  return (
    <li
      className={cx(
        'relative overflow-hidden rounded-2xl border bg-gradient-to-b from-card to-panel p-4 transition-colors sm:p-5',
        highlight ? 'border-gold/60 shadow-[0_0_0_1px_rgba(201,164,92,0.25),0_20px_50px_-30px_rgba(201,164,92,0.5)]' : 'border-line hover:border-gold/30',
      )}
    >
      {highlight && <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-gold-gradient" />}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-gold-gradient text-3xl font-semibold">{t.tokenNumber}</p>
          <p className="truncate font-semibold text-cream">{t.customerName}</p>
          {t.customerPhone && <a href={`tel:${t.customerPhone}`} className="text-xs text-muted underline">{t.customerPhone}</a>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <StatusBadge status={t.status} />
          <SourceBadge source={t.source} />
        </div>
      </div>
      <p className="mt-2 text-sm text-muted">
        {t.serviceName} · {formatPKR(t.priceAtBooking)} · ~{t.durationMinutes} min
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>Booked {formatTime(t.createdAt)}</span>
        {t.barberName ? <Pill>{t.barberName}</Pill> : t.status === 'waiting' && <Pill>First available</Pill>}
        {t.status === 'waiting' && showWait && <span>Est. start: {waitText(t.estimatedWaitMinutes)}</span>}
        {t.skipReason === 'no_show' && <Pill tone="warn">No-show</Pill>}
      </div>
      {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
    </li>
  );
}
