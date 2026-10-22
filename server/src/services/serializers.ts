import type { TokenLean } from '../models/Token';
import type { QueueSnapshot } from './queueService';
import { makeTrackingToken } from '../utils/tracking';

/**
 * Customer-facing view of THEIR OWN token. Never includes phone numbers or internal ids.
 */
export function toCustomerToken(t: TokenLean, snap: QueueSnapshot) {
  const waiting = t.status === 'waiting';
  const est = waiting ? snap.estimates.byToken.get(String(t._id)) ?? null : null;
  return {
    trackingToken: makeTrackingToken(t._id),
    tokenNumber: t.tokenNumber,
    businessDate: t.businessDate,
    customerName: t.customerName,
    serviceName: t.serviceName,
    priceAtBooking: t.priceAtBooking,
    currency: t.currency,
    source: t.source,
    status: t.status,
    createdAt: t.createdAt,
    startedAt: t.startedAt,
    completedAt: t.completedAt,
    queuePosition: waiting ? snap.positionOf(t._id) : null,
    peopleAhead: waiting ? (snap.positionOf(t._id) ?? 1) - 1 : null,
    estimatedWaitMinutes: est,
    estimateAvailable: waiting ? est !== null : null,
    nowServing: snap.inService.map((s) => s.tokenNumber),
    canCancel: waiting,
  };
}

type PopulatedCustomer = { phone?: string } | null | undefined;
type PopulatedBarber = { _id: unknown; name: string } | null | undefined;

/** Staff/owner view. May include the customer's phone; only ever returned behind authentication. */
export function toStaffToken(
  t: TokenLean & { customerId?: unknown; barberId?: unknown },
  snap?: QueueSnapshot,
  extra: { paid?: boolean; payment?: { paidAt: Date; amount: number; method: string } | null } = {},
) {
  const customer = (t.customerId && typeof t.customerId === 'object' && 'phone' in (t.customerId as object)
    ? (t.customerId as PopulatedCustomer)
    : null) as PopulatedCustomer;
  const barberObj = t.barberId && typeof t.barberId === 'object' && 'name' in (t.barberId as object) ? (t.barberId as unknown as PopulatedBarber) : null;
  const barberId = barberObj ? String(barberObj._id) : t.barberId ? String(t.barberId) : null;
  return {
    id: String(t._id),
    tokenNumber: t.tokenNumber,
    businessDate: t.businessDate,
    customerName: t.customerName,
    customerPhone: customer?.phone ?? null,
    serviceId: String(t.serviceId),
    serviceName: t.serviceName,
    priceAtBooking: t.priceAtBooking,
    currency: t.currency,
    durationMinutes: t.durationMinutesAtBooking,
    source: t.source,
    status: t.status,
    barberId,
    barberName: barberObj?.name ?? null,
    skipReason: t.skipReason,
    createdAt: t.createdAt,
    startedAt: t.startedAt,
    completedAt: t.completedAt,
    position: snap && t.status === 'waiting' ? snap.positionOf(t._id) : null,
    estimatedWaitMinutes: snap && t.status === 'waiting' ? snap.estimates.byToken.get(String(t._id)) ?? null : null,
    paid: extra.paid ?? null,
    /** Only meaningful for completed tokens, and only when payment data was loaded for this view. */
    paymentStatus: t.status === 'completed' && extra.paid !== undefined ? (extra.paid ? 'paid' : 'unpaid') : null,
    paidAt: extra.payment?.paidAt ?? null,
    paidAmount: extra.payment?.amount ?? null,
    paymentMethod: extra.payment?.method ?? null,
    trackingToken: makeTrackingToken(t._id),
  };
}
