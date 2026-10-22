import { LiveDot, StatusBadge } from './ui';
import { Logo } from './Logo';
import type { CustomerToken } from '../types';
import { formatDateTimeLong, formatPKR, waitText } from '../utils/format';
import { BRAND, RECEIPT_FOOTER, firstName, queueFacts } from '../utils/receipt';

const GREETING: Record<CustomerToken['status'], string> = {
  waiting: 'Your token is confirmed. You are in the queue.',
  in_service: 'It is your turn. Please head to your barber.',
  completed: 'Your service is complete. Thank you for visiting.',
  skipped: 'You were skipped because you were not present when called.',
  cancelled: 'This token was cancelled.',
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-line py-3 first:border-t-0">
      <dt className="shrink-0 text-sm text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-right text-sm font-semibold text-white">{children}</dd>
    </div>
  );
}

/** Premium black-and-gold digital token. Every value comes from the server's token data. */
export function TokenReceipt({ t, connected }: { t: CustomerToken; connected: boolean }) {
  const q = queueFacts(t);
  const hasQueue = q.position !== null || q.waitMinutes !== null;

  return (
    <article aria-label={`Token receipt ${t.tokenNumber}`} className="relative overflow-hidden rounded-3xl border border-gold/50 bg-card shadow-[0_24px_60px_-24px_rgba(0,0,0,0.95),0_0_0_1px_rgba(185,164,119,0.08)]">
      <div aria-hidden className="h-1 bg-gradient-to-r from-transparent via-gold to-transparent" />

      <header className="flex items-center justify-between gap-3 px-5 pt-5 sm:px-7 sm:pt-6">
        <div className="flex min-w-0 items-center gap-3">
          <Logo size={44} className="shrink-0 ring-1 ring-gold/50" />
          <div className="min-w-0">
            <p className="text-[0.72rem] font-bold uppercase leading-tight tracking-[0.14em] text-gold sm:text-[0.8rem] sm:tracking-[0.22em]">{BRAND}</p>
            <p className="text-xs text-muted">Digital token</p>
          </div>
        </div>
        <LiveDot connected={connected} />
      </header>

      <div className="px-5 pt-6 sm:px-7">
        <h1 className="break-words text-xl font-bold sm:text-2xl">Hello, {firstName(t.customerName)}</h1>
        <p className="mt-1 text-sm text-muted">{GREETING[t.status]}</p>

        <div className="mt-5 rounded-2xl border border-gold/40 bg-ink px-4 py-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted">Your token</p>
          <p
            className="mt-1 bg-gradient-to-b from-[#ecdfbd] to-gold bg-clip-text text-6xl font-extrabold tracking-tight text-transparent sm:text-7xl"
            aria-label={`Token ${t.tokenNumber}`}
          >
            {t.tokenNumber}
          </p>
          <div className="mt-3 flex justify-center"><StatusBadge status={t.status} /></div>
        </div>
      </div>

      {/* ticket perforation */}
      <div aria-hidden className="relative my-6 h-6">
        <div className="absolute inset-x-6 top-1/2 border-t border-dashed border-gold/30" />
        <span className="absolute -left-3 top-0 h-6 w-6 rounded-full border border-gold/40 bg-ink" />
        <span className="absolute -right-3 top-0 h-6 w-6 rounded-full border border-gold/40 bg-ink" />
      </div>

      <div className="px-5 pb-6 sm:px-7">
        <dl>
          <Row label="Customer">{t.customerName}</Row>
          <Row label="Service">{t.serviceName}</Row>
          <Row label="Price">{formatPKR(t.priceAtBooking)}</Row>
          <Row label="Booked">{formatDateTimeLong(t.createdAt)}</Row>
          <Row label="Status">{t.status === 'in_service' ? 'In Service' : t.status.charAt(0).toUpperCase() + t.status.slice(1)}</Row>
        </dl>

        {hasQueue && (
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-gold/30 bg-ink p-4 text-center" data-testid="queue-facts">
            {q.position !== null && (
              <div className={q.waitMinutes === null ? 'col-span-2' : ''}>
                <p className="text-xs uppercase tracking-wider text-muted">Queue position</p>
                <p className="mt-1 text-3xl font-bold text-gold-strong">{q.position}</p>
                <p className="text-xs text-muted">{t.peopleAhead === 0 ? 'You are next' : typeof t.peopleAhead === 'number' ? `${t.peopleAhead} ahead of you` : ''}</p>
              </div>
            )}
            {q.waitMinutes !== null && (
              <div className={q.position === null ? 'col-span-2' : ''}>
                <p className="text-xs uppercase tracking-wider text-muted">Estimated wait</p>
                <p className="mt-1 text-lg font-bold leading-9 text-gold-strong sm:text-xl">{waitText(q.waitMinutes)}</p>
                <p className="text-xs text-muted">Approximate</p>
              </div>
            )}
          </div>
        )}
        {t.status === 'waiting' && t.nowServing.length > 0 && (
          <p className="mt-3 text-center text-sm text-muted">Now serving: {t.nowServing.join(', ')}</p>
        )}

        <p className="mt-5 border-t border-gold/20 pt-4 text-center text-sm leading-relaxed text-gold">{RECEIPT_FOOTER}</p>
      </div>
    </article>
  );
}
