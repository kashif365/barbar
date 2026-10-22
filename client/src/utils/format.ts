import type { Availability, TokenStatus } from '../types';

const TZ = 'Asia/Karachi';

/** Up to two initials from a name, ignoring brackets and symbols ("[DEMO] Barber One" -> "BO"). */
export const initialsOf = (name: string) =>
  (name.replace(/\[[^\]]*\]/g, '').match(/\p{L}+/gu) ?? ['?']).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

export const formatPKR = (n: number) => `PKR ${n.toLocaleString('en-PK')}`;

export const formatTime = (iso: string | null | undefined) =>
  iso ? new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(iso)) : '—';

export const formatDateTime = (iso: string | null | undefined) =>
  iso
    ? new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(iso))
    : '—';


/** YYYY-MM-DD plus n days (calendar arithmetic, independent of the browser's timezone). */
export const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Full date and time including the year, in the salon timezone (used on receipts). */
export const formatDateTimeLong = (iso: string | null | undefined) =>
  iso
    ? new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso))
    : '—';

export const STATUS_LABEL: Record<TokenStatus, string> = {
  waiting: 'Waiting',
  in_service: 'In Service',
  completed: 'Completed',
  skipped: 'Skipped',
  cancelled: 'Cancelled',
};

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  available: 'Available',
  on_break: 'On break',
  offline: 'Offline',
};

/** Estimate wording. `null` means "cannot be estimated reliably" — never invent a number. */
export function waitText(min: number | null | undefined): string {
  if (min === null || min === undefined) return 'Estimate unavailable right now';
  if (min <= 1) return 'Up next';
  if (min < 60) return `About ${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `About ${h} h${m ? ` ${m} min` : ''}`;
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const blob = new Blob([rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const newKey = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}-xxxxxxxx`;

/** Today's business date (YYYY-MM-DD) in the salon timezone, not the browser's. */
export const todayKarachi = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
