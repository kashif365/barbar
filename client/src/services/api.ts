import axios, { AxiosError } from 'axios';
import type {
  AdminService, AuditEntry, AuthUser, BarberPublic, CustomerToken, Dashboard, OwnerSettings, Paged, PublicQueue,
  PublicSettings, Report, Service, StaffQueue, StaffToken, TeamMember, TokenSource,
} from '../types';

export const api = axios.create({
  baseURL: window.SB_CONFIG?.apiBaseUrl || import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  timeout: 15000,
  // Custom header required by the server's CSRF guard on state-changing requests.
  headers: { 'X-Requested-With': 'shehraz-web' },
});

/**
 * The server answered, but not with the JSON this app expects. The usual cause is `apiBaseUrl`
 * in config.js pointing at the website instead of the API: the site's catch-all rewrite then
 * answers every /api URL with index.html and a 200.
 */
export class UnexpectedResponseError extends Error {
  constructor(readonly url: string, detail: string) {
    super(`Unexpected response from ${url}: ${detail}`);
    this.name = 'UnexpectedResponseError';
  }
}

api.interceptors.response.use((r) => {
  const type = String(r.headers['content-type'] ?? '');
  if (r.status !== 204 && (!type.includes('application/json') || r.data === null || typeof r.data !== 'object')) {
    const url = `${r.config.baseURL ?? ''}${r.config.url ?? ''}`;
    const err = new UnexpectedResponseError(url, `expected JSON, got ${type || 'no content type'}`);
    console.error(`${err.message}. Check apiBaseUrl in /config.js.`);
    throw err;
  }
  return r;
});

export interface ApiProblem {
  message: string;
  code: string;
  status: number;
  fields: Record<string, string>;
}

/** Turns any thrown error into a friendly, displayable problem. */
export function toProblem(e: unknown): ApiProblem {
  if (axios.isAxiosError(e)) {
    const err = e as AxiosError<{ error?: { code?: string; message?: string; details?: { fields?: Record<string, string> } } }>;
    if (!err.response) {
      return { message: 'We couldn’t reach the server. Check your connection and try again.', code: 'NETWORK', status: 0, fields: {} };
    }
    const body = err.response.data?.error;
    return {
      message: body?.message ?? 'Something went wrong. Please try again.',
      code: body?.code ?? 'UNKNOWN',
      status: err.response.status,
      fields: body?.details?.fields ?? {},
    };
  }
  if (e instanceof UnexpectedResponseError) {
    return { message: 'The server sent an unexpected response. Please try again in a moment.', code: 'BAD_RESPONSE', status: 0, fields: {} };
  }
  return { message: 'Something went wrong. Please try again.', code: 'UNKNOWN', status: 0, fields: {} };
}

/**
 * The parts of each response the screens rely on: `key: 'array'` (must be an array),
 * `'object'` (must be an object), `'object?'` (object or null). Dotted keys reach into nested
 * objects; `items[].x` checks `x` on every element of `items`. A response that does not match is
 * rejected like any failed request, so screens show their error state instead of crashing on a
 * missing list.
 */
type Kind = 'array' | 'object' | 'object?';
type Shape = Record<string, Kind>;

const isObject = (v: unknown) => !!v && typeof v === 'object' && !Array.isArray(v);
const matches = (v: unknown, kind: Kind) => (kind === 'array' ? Array.isArray(v) : kind === 'object' ? isObject(v) : v === null || isObject(v));

/** Every value found at `path`, fanning out over arrays marked with `[]`. */
function valuesAt(body: unknown, path: string): unknown[] {
  let current: unknown[] = [body];
  for (const part of path.split('.')) {
    const each = part.endsWith('[]');
    const key = each ? part.slice(0, -2) : part;
    current = current.flatMap((o) => {
      const v = isObject(o) ? (o as Record<string, unknown>)[key] : undefined;
      return each ? (Array.isArray(v) ? v : [undefined]) : [v];
    });
  }
  return current;
}

function mismatch(body: unknown, shape: Shape): string | null {
  for (const [path, kind] of Object.entries(shape)) {
    if (!valuesAt(body, path).every((v) => matches(v, kind))) {
      return `"${path}" should be ${kind === 'array' ? 'a list' : kind === 'object' ? 'an object' : 'an object or null'}`;
    }
  }
  return null;
}

const data = <T>(p: Promise<{ data: T; config: { url?: string } }>, shape: Shape = {}) =>
  p.then((r) => {
    const why = mismatch(r.data, shape);
    if (why) {
      const err = new UnexpectedResponseError(r.config.url ?? '', why);
      console.error(err.message);
      throw err;
    }
    return r.data;
  });

const ITEMS: Shape = { items: 'array' };
const TOKEN: Shape = { token: 'object', 'token.nowServing': 'array' };
const STAFF_TOKEN: Shape = { token: 'object' };
const REPORT: Shape = {
  report: 'object', 'report.days': 'array', 'report.popularServices': 'array', 'report.byBarber': 'array',
  'report.byStatus': 'object', 'report.bySource': 'object',
};

export const endpoints = {
  // public
  services: () => data<{ items: Service[] }>(api.get('/services'), ITEMS),
  barbers: () => data<{ items: BarberPublic[] }>(api.get('/barbers'), { items: 'array', 'items[].serviceIds': 'array' }),
  settings: () => data<{ settings: PublicSettings }>(api.get('/settings/public'), { settings: 'object' }),
  queueToday: () => data<PublicQueue>(api.get('/queue/today'), { counts: 'object', nowServing: 'array', waiting: 'array' }),
  createOnlineToken: (body: { serviceId: string; barberId?: string | null; customerName: string; customerPhone?: string }, idempotencyKey: string) =>
    data<{ token: CustomerToken; replayed: boolean }>(api.post('/tokens/online', body, { headers: { 'Idempotency-Key': idempotencyKey } }), TOKEN),
  getToken: (tracking: string) => data<{ token: CustomerToken }>(api.get(`/tokens/${encodeURIComponent(tracking)}`), TOKEN),
  cancelOwnToken: (tracking: string) => data<{ token: CustomerToken }>(api.patch(`/tokens/${encodeURIComponent(tracking)}/cancel`), TOKEN),

  // auth
  login: (email: string, password: string) => data<{ user: AuthUser }>(api.post('/auth/login', { email, password }), { user: 'object' }),
  logout: () => data<{ ok: boolean }>(api.post('/auth/logout')),
  me: () => data<{ user: AuthUser }>(api.get('/auth/me'), { user: 'object' }),

  // staff
  staffQueue: () => data<StaffQueue>(api.get('/staff/queue'), {
      me: 'object', waiting: 'array', inService: 'array', history: 'array', skipped: 'array', completed: 'array', barbers: 'array',
      current: 'object?', next: 'object?',
    }),
  walkIn: (body: { serviceId: string; barberId?: string | null; customerName: string; customerPhone?: string }, key: string) =>
    data<{ token: StaffToken }>(api.post('/staff/tokens/walk-in', body, { headers: { 'Idempotency-Key': key } }), STAFF_TOKEN),
  callNext: () => data<{ token: StaffToken | null; message?: string }>(api.post('/staff/queue/call-next'), { token: 'object?' }),
  startToken: (id: string) => data<{ token: StaffToken }>(api.patch(`/staff/tokens/${id}/start`), STAFF_TOKEN),
  completeToken: (id: string) => data<{ token: StaffToken }>(api.patch(`/staff/tokens/${id}/complete`), STAFF_TOKEN),
  skipToken: (id: string, reason: 'skipped' | 'no_show') => data<{ token: StaffToken }>(api.patch(`/staff/tokens/${id}/skip`, { reason }), STAFF_TOKEN),
  cancelToken: (id: string) => data<{ token: StaffToken }>(api.patch(`/staff/tokens/${id}/cancel`), STAFF_TOKEN),
  requeueToken: (id: string) => data<{ token: StaffToken }>(api.patch(`/staff/tokens/${id}/requeue`), STAFF_TOKEN),
  setAvailability: (availability: string) => data<{ availability: string }>(api.patch('/staff/availability', { availability })),

  // owner
  dashboard: () => data<Dashboard>(api.get('/owner/dashboard'), { popularServices: 'array', barbers: 'array', bySource: 'object' }),
  ownerTokens: (params: Record<string, string | number | undefined>) => data<Paged<StaffToken>>(api.get('/owner/tokens', { params }), ITEMS),
  dailyReport: (date?: string) => data<{ report: Report }>(api.get('/owner/reports/daily', { params: { date } }), REPORT),
  rangeReport: (from: string, to: string) => data<{ report: Report }>(api.get('/owner/reports/range', { params: { from, to } }), REPORT),
  monthlyReport: (month?: string) => data<{ report: Report }>(api.get('/owner/reports/monthly', { params: { month } }), REPORT),
  ownerServices: () => data<{ items: AdminService[] }>(api.get('/owner/services'), ITEMS),
  createService: (b: Omit<AdminService, 'id' | 'currency'>) => data<{ service: AdminService }>(api.post('/owner/services', b)),
  updateService: (id: string, b: Partial<Omit<AdminService, 'id' | 'currency'>>) => data<{ service: AdminService }>(api.patch(`/owner/services/${id}`, b)),
  team: () => data<{ items: TeamMember[] }>(api.get('/owner/barbers'), { items: 'array', 'items[].serviceIds': 'array' }),
  createMember: (b: { name: string; email: string; password: string; role: 'barber' | 'staff'; serviceIds: string[]; photoUrl?: string | null }) =>
    data<{ barber: TeamMember }>(api.post('/owner/barbers', b)),
  updateMember: (id: string, b: Partial<{ name: string; isActive: boolean; availability: string; serviceIds: string[]; password: string; photoUrl: string | null }>) =>
    data<{ barber: TeamMember }>(api.patch(`/owner/barbers/${id}`, b)),
  reassign: (id: string, barberId: string | null) => data<{ token: StaffToken }>(api.patch(`/owner/tokens/${id}/reassign`, { barberId })),
  ownerSettings: () => data<{ settings: OwnerSettings }>(api.get('/owner/settings'), { settings: 'object' }),
  updateSettings: (b: Partial<OwnerSettings>) => data<{ settings: OwnerSettings }>(api.patch('/owner/settings', b), { settings: 'object' }),
  audit: () => data<{ items: AuditEntry[] }>(api.get('/owner/audit'), ITEMS),
};

export type { TokenSource };
