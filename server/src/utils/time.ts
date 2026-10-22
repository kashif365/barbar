import { env } from '../config/env';

/**
 * Business date (YYYY-MM-DD) in the salon's configured timezone — never the server's.
 * A token created at 00:30 Asia/Karachi belongs to the NEW business date, even if the
 * server runs in UTC where it is still the previous day.
 */
export function businessDateOf(d: Date = new Date(), tz: string = env.SALON_TIMEZONE): string {
  // The en-CA locale formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** Minutes since local midnight in the salon timezone. */
export function localMinutesOfDay(d: Date = new Date(), tz: string = env.SALON_TIMEZONE): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return h * 60 + m;
}

export function parseHHmm(v: string | null | undefined): number | null {
  if (!v) return null;
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(v);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export function formatTokenNumber(n: number): string {
  return `A-${String(n).padStart(3, '0')}`;
}
