export type Role = 'owner' | 'barber' | 'staff';
export type Availability = 'available' | 'on_break' | 'offline';
export type TokenStatus = 'waiting' | 'in_service' | 'completed' | 'skipped' | 'cancelled';
export type TokenSource = 'online' | 'walk-in';

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  durationMinutes: number;
  isDemoPrice: boolean;
}
export interface AdminService extends Service {
  isActive: boolean;
  sortOrder: number;
}

export interface PublicSettings {
  salonName: string;
  address: string | null;
  phone: string | null;
  instagramUrl: string | null;
  openTime: string | null;
  closeTime: string | null;
  enforceHours: boolean;
  isOpen: boolean;
  phoneRequired: boolean;
  allowBarberChoice: boolean;
  onlineBookingEnabled: boolean;
  timezone: string;
}

export interface BarberPublic {
  id: string;
  name: string;
  availability: Availability;
  serviceIds: string[];
}

export interface CustomerToken {
  trackingToken: string;
  tokenNumber: string;
  businessDate: string;
  customerName: string;
  serviceName: string;
  priceAtBooking: number;
  currency: string;
  source: TokenSource;
  status: TokenStatus;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  queuePosition: number | null;
  peopleAhead: number | null;
  estimatedWaitMinutes: number | null;
  estimateAvailable: boolean | null;
  nowServing: string[];
  canCancel: boolean;
}

export interface PublicQueue {
  businessDate: string;
  isOpen: boolean;
  counts: Record<TokenStatus, number>;
  nowServing: { tokenNumber: string }[];
  waiting: { tokenNumber: string; position: number }[];
  estimatedWaitForNewTokenMinutes: number | null;
}

export interface StaffToken {
  id: string;
  tokenNumber: string;
  businessDate: string;
  customerName: string;
  customerPhone: string | null;
  serviceId: string;
  serviceName: string;
  priceAtBooking: number;
  currency: string;
  durationMinutes: number;
  source: TokenSource;
  status: TokenStatus;
  barberId: string | null;
  barberName: string | null;
  skipReason: 'skipped' | 'no_show' | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  position: number | null;
  estimatedWaitMinutes: number | null;
  trackingToken: string;
}

export interface StaffQueue {
  businessDate: string;
  me: { id: string; name: string; role: Role; availability: Availability };
  waiting: StaffToken[];
  inService: StaffToken[];
  current: StaffToken | null;
  next: StaffToken | null;
  completedToday: number;
  history: StaffToken[];
  skipped: StaffToken[];
  completed: StaffToken[];
  barbers: { id: string; name: string; availability: Availability; busy: boolean }[];
  estimatedWaitForNewTokenMinutes: number | null;
}

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  barber?: { availability: Availability; serviceIds: string[] };
}

export interface Dashboard {
  businessDate: string;
  totalTokens: number;
  waiting: number;
  inService: number;
  completed: number;
  cancelled: number;
  skipped: number;
  /** Booked price of services completed today (customers pay the barber in person). */
  earnings: number;
  currency: string;
  popularServices: { name: string; completed: number }[];
  bySource: Record<TokenSource, number>;
  barbers: { id: string; name: string; availability: Availability; busy: boolean; completedToday: number }[];
}

export interface Report {
  from: string;
  to: string;
  currency: string;
  totalTokens: number;
  byStatus: Record<TokenStatus, number>;
  bySource: Record<TokenSource, number>;
  popularServices: { name: string; completed: number; earnings: number }[];
  byBarber: { barberId: string; name: string; completed: number; earnings: number }[];
  earnings: number;
  days: { date: string; tokens: number; completed: number; earnings: number }[];
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'barber' | 'staff';
  isActive: boolean;
  availability: Availability;
  serviceIds: string[];
  completedToday: number;
  busy: boolean;
}

export interface OwnerSettings extends Omit<PublicSettings, 'isOpen' | 'timezone'> {
  salonName: string;
}

export interface Paged<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface AuditEntry {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}
