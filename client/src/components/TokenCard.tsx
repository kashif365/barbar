import type { ReactNode } from 'react';
import { Pill, SourceBadge, StatusBadge, cx } from './ui';
import type { StaffToken } from '../types';
import { METHOD_LABEL, formatDateTime, formatPKR, formatTime, waitText } from '../utils/format';

/** One token in a staff list. Actions are passed in so the owner desk and barber desk share the layout. */
export function TokenCard({ t, actions, highlight, showWait = true }: { t: StaffToken; actions?: ReactNode; highlight?: boolean; showWait?: boolean }) {
  return (
    <li className={cx('rounded-2xl border bg-card p-4', highlight ? 'border-gold/60' : 'border-line')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-2xl font-extrabold tracking-tight">{t.tokenNumber}</p>
          <p className="truncate font-medium">{t.customerName}</p>
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
        {t.status === 'completed' && (t.paid ? (
          <Pill tone="ok">
            Paid{t.paidAmount !== null ? ` ${formatPKR(t.paidAmount)}` : ''}
            {t.paymentMethod ? ` · ${METHOD_LABEL[t.paymentMethod]}` : ''}
            {t.paidAt ? ` · ${formatDateTime(t.paidAt)}` : ''}
          </Pill>
        ) : t.paid === false ? <Pill tone="warn">Unpaid</Pill> : null)}
      </div>
      {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
    </li>
  );
}
