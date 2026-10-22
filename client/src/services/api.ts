import axios, { AxiosError } from 'axios';
import type {
  AdminService, AuditEntry, AuthUser, BarberPublic, CustomerToken, Dashboard, OwnerSettings, Paged, PublicQueue,
  PublicSettings, Report, Service, StaffQueue, StaffToken, TeamMember, TokenSource,
} from '../types';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  timeout: 15000,
  // Custom header required by the server's CSRF guard on state-changing requests.
  headers: { 'X-Requested-With': 'shehraz-web' },
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
  return { message: 'Something went wrong. Please try again.', code: 'UNKNOWN', status: 0, fields: {} };
}

const data = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data);

export const endpoints = {
  // public
  services: () => data<{ items: Service[] }>(api.get('/services')),
  barbers: () => data<{ items: BarberPublic[] }>(api.get('/barbers')),
  settings: () => data<{ settings: PublicSettings }>(api.get('/settings/public')),
  queueToday: () => data<PublicQueue>(api.get('/queue/today')),
  createOnlineToken: (body: { serviceId: string; barberId?: string | null; customerName: string; customerPhone?: string }, idempotencyKey: string) =>
    data<{ token: CustomerToken; replayed: boolean }>(api.post('/tokens/online', body, { headers: { 'Idempotency-Key': idempotencyKey } })),
  getToken: (tracking: string) => data<{ token: CustomerToken }>(api.get(`/tokens/${encodeURIComponent(tracking)}`)),
  cancelOwnToken: (tracking: string) => data<{ token: CustomerToken }>(api.patch(`/tokens/${encodeURIComponent(tracking)}/cancel`)),

  // auth
  login: (email: string, password: string) => data<{ user: AuthUser }>(api.post('/auth/login', { email, password })),
  logout: () => data<{ ok: boolean }>(api.post('/auth/logout')),
  me: () => data<{ user: AuthUser }>(api.get('/auth/me')),

  // staff
  staffQueue: () => data<StaffQueue>(api.get('/staff/queue')),
  walkIn: (body: { serviceId: string; barberId?: string | null; customerName: string; customerPhone?: string }, key: string) =>
    data<{ token: StaffToken }>(api.post('/staff/tokens/walk-in', body, { headers: { 'Idempotency-Key': key } })),
  callNext: () => data<{ token: StaffToken | null; message?: string }>(api.post('/staff/queue/call-next')),
  startToken: (id: string) => data<{ token: StaffToken }>(api.patch(`/staff/tokens/${id}/start`)),
  completeToken: (id: string) => data<{ token: StaffToken }>(api.patch(`/staff/tokens/${id}/complete`)),
  skipToken: (id: string, reason: 'skipped' | 'no_show') => data<{ token: StaffToken }>(api.patch(`/staff/tokens/${id}/skip`, { reason })),
  cancelToken: (id: string) => data<{ token: StaffToken }>(api.patch(`/staff/tokens/${id}/cancel`)),
  requeueToken: (id: string) => data<{ token: StaffToken }>(api.patch(`/staff/tokens/${id}/requeue`)),
  setAvailability: (availability: string) => data<{ availability: string }>(api.patch('/staff/availability', { availability })),
  recordPayment: (id: string, body: { amount?: number; method: 'cash' | 'card' | 'mobile_wallet' }) =>
    data<{ payment: { id: string; amount: number } }>(api.post(`/staff/tokens/${id}/payment`, body)),

  // owner
  dashboard: () => data<Dashboard>(api.get('/owner/dashboard')),
  ownerTokens: (params: Record<string, string | number | undefined>) => data<Paged<StaffToken>>(api.get('/owner/tokens', { params })),
  dailyReport: (date?: string) => data<{ report: Report }>(api.get('/owner/reports/daily', { params: { date } })),
  rangeReport: (from: string, to: string) => data<{ report: Report }>(api.get('/owner/reports/range', { params: { from, to } })),
  voidPayment: (id: string, reason?: string) => data<{ ok: boolean }>(api.patch(`/staff/tokens/${id}/payment/void`, { reason: reason || undefined })),
  monthlyReport: (month?: string) => data<{ report: Report }>(api.get('/owner/reports/monthly', { params: { month } })),
  ownerServices: () => data<{ items: AdminService[] }>(api.get('/owner/services')),
  createService: (b: Omit<AdminService, 'id' | 'currency'>) => data<{ service: AdminService }>(api.post('/owner/services', b)),
  updateService: (id: string, b: Partial<Omit<AdminService, 'id' | 'currency'>>) => data<{ service: AdminService }>(api.patch(`/owner/services/${id}`, b)),
  team: () => data<{ items: TeamMember[] }>(api.get('/owner/barbers')),
  createMember: (b: { name: string; email: string; password: string; role: 'barber' | 'staff'; serviceIds: string[] }) =>
    data<{ barber: TeamMember }>(api.post('/owner/barbers', b)),
  updateMember: (id: string, b: Partial<{ name: string; isActive: boolean; availability: string; serviceIds: string[]; password: string }>) =>
    data<{ barber: TeamMember }>(api.patch(`/owner/barbers/${id}`, b)),
  reassign: (id: string, barberId: string | null) => data<{ token: StaffToken }>(api.patch(`/owner/tokens/${id}/reassign`, { barberId })),
  ownerSettings: () => data<{ settings: OwnerSettings }>(api.get('/owner/settings')),
  updateSettings: (b: Partial<OwnerSettings>) => data<{ settings: OwnerSettings }>(api.patch('/owner/settings', b)),
  audit: () => data<{ items: AuditEntry[] }>(api.get('/owner/audit')),
};

export type { TokenSource };
