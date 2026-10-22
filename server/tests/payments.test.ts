import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { Token } from '../src/models';
import { businessDateOf } from '../src/utils/time';
import { app, book, call, loginAs, seed, serviceId } from './helpers';

let sid: string;
beforeEach(async () => {
  await seed();
  sid = await serviceId();
});

async function completeNext(barber: Awaited<ReturnType<typeof loginAs>>) {
  const called = await call(barber.agent, 'post', '/api/staff/queue/call-next');
  const id = called.body.token.id as string;
  await call(barber.agent, 'patch', `/api/staff/tokens/${id}/complete`);
  return id;
}

describe('payments and revenue', () => {
  it('records a payment once; duplicates are rejected', async () => {
    const owner = await loginAs('owner');
    const barber = await loginAs('barber');
    await book(sid);
    const id = await completeNext(barber);
    const first = await call(owner.agent, 'post', `/api/owner/tokens/${id}/payment`, { method: 'cash' });
    expect(first.status).toBe(201);
    expect(first.body.payment.amount).toBe(500);
    const dup = await call(owner.agent, 'post', `/api/owner/tokens/${id}/payment`, { method: 'cash' });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('ALREADY_PAID');
  });

  it('handles simultaneous duplicate payment requests', async () => {
    const owner = await loginAs('owner');
    const barber = await loginAs('barber');
    await book(sid);
    const id = await completeNext(barber);
    const rs = await Promise.all([1, 2, 3].map(() => call(owner.agent, 'post', `/api/owner/tokens/${id}/payment`, { method: 'cash' })));
    expect(rs.filter((r) => r.status === 201)).toHaveLength(1);
    expect(rs.filter((r) => r.status === 409)).toHaveLength(2);
  });

  it('counts only recorded payments as revenue (completed-but-unpaid is not revenue)', async () => {
    const owner = await loginAs('owner');
    const barber = await loginAs('barber');
    await book(sid);
    await book(sid);
    const id1 = await completeNext(barber);
    await completeNext(barber);
    await call(owner.agent, 'post', `/api/owner/tokens/${id1}/payment`, { method: 'cash' });
    const r = await call(owner.agent, 'get', '/api/owner/reports/daily');
    expect(r.body.report.byStatus.completed).toBe(2);
    expect(r.body.report.revenue.total).toBe(500);
    expect(r.body.report.completedUnpaid).toBe(1);
  });

  it('cannot take payment for waiting or cancelled tokens, so they never count as revenue', async () => {
    const owner = await loginAs('owner');
    await book(sid);
    await book(sid);
    const [t1, t2] = await Token.find().sort({ tokenNumber: 1 });
    expect((await call(owner.agent, 'post', `/api/owner/tokens/${t1._id}/payment`, { method: 'cash' })).status).toBe(409);
    await call(owner.agent, 'patch', `/api/staff/tokens/${t2._id}/cancel`);
    const paid = await call(owner.agent, 'post', `/api/owner/tokens/${t2._id}/payment`, { method: 'cash' });
    expect(paid.status).toBe(409);
    const r = await call(owner.agent, 'get', '/api/owner/reports/daily');
    expect(r.body.report.revenue.total).toBe(0);
    expect(r.body.report.byStatus.cancelled).toBe(1);
  });

  it('serves dashboard metrics from stored data', async () => {
    const owner = await loginAs('owner');
    await book(sid);
    await book(sid);
    const d = await call(owner.agent, 'get', '/api/owner/dashboard');
    expect(d.status).toBe(200);
    expect(d.body.totalTokens).toBe(2);
    expect(d.body.waiting).toBe(2);
    expect(d.body.revenue).toBe(0);
  });
});

const dayOffset = (n: number) => businessDateOf(new Date(Date.now() + n * 86_400_000));

/** A service completed on an earlier business day, exactly as an existing database record would look. */
async function legacyCompleted(businessDate: string, tokenNumber: string, price = 500) {
  return Token.create({
    tokenNumber,
    businessDate,
    customerName: 'Earlier Customer',
    serviceId: sid,
    serviceName: 'Haircut',
    priceAtBooking: price,
    currency: 'PKR',
    durationMinutesAtBooking: 30,
    source: 'walk-in',
    status: 'completed',
    completedAt: new Date(Date.now() - 86_400_000),
  });
}

describe('paid / unpaid status', () => {
  it('shows unpaid for completed tokens, then paid with a server-side timestamp', async () => {
    const owner = await loginAs('owner');
    const barber = await loginAs('barber');
    await book(sid);
    const id = await completeNext(barber);
    const before = Date.now();

    let q = await call(owner.agent, 'get', '/api/staff/queue');
    expect(q.body.completed[0]).toMatchObject({ paymentStatus: 'unpaid', paid: false, paidAt: null });

    // a client-supplied paidAt must be ignored: the server clock decides
    const r = await call(owner.agent, 'post', `/api/owner/tokens/${id}/payment`, { method: 'card', paidAt: '2001-01-01T00:00:00Z' });
    expect(r.status).toBe(201);
    q = await call(owner.agent, 'get', '/api/staff/queue');
    const t = q.body.completed[0];
    expect(t).toMatchObject({ paymentStatus: 'paid', paid: true, paymentMethod: 'card', paidAmount: 500 });
    expect(new Date(t.paidAt).getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(t.priceAtBooking).toBe(500);
  });

  it('lets reception record payment but only the owner can mark it unpaid; public and barbers get nothing', async () => {
    const owner = await loginAs('owner');
    const staff = await loginAs('staff');
    const barber = await loginAs('barber');
    await book(sid);
    const id = await completeNext(barber);

    expect((await call(staff.agent, 'post', `/api/staff/tokens/${id}/payment`, { method: 'cash' })).status).toBe(201);
    expect((await call(staff.agent, 'patch', `/api/staff/tokens/${id}/payment/void`, {})).status).toBe(403);
    expect((await call(barber.agent, 'patch', `/api/staff/tokens/${id}/payment/void`, {})).status).toBe(403);
    expect((await call(barber.agent, 'post', `/api/staff/tokens/${id}/payment`, { method: 'cash' })).status).toBe(403);
    const anon = (m: 'post' | 'patch' | 'get', url: string) => request(app)[m](url).set('X-Requested-With', 'shehraz-web').send({});
    expect((await anon('post', `/api/staff/tokens/${id}/payment`)).status).toBe(401);
    expect((await anon('patch', `/api/staff/tokens/${id}/payment/void`)).status).toBe(401);
    expect((await anon('get', '/api/owner/reports/range?from=2026-01-01&to=2026-01-02')).status).toBe(401);
    expect((await anon('get', '/api/owner/dashboard')).status).toBe(401);
    expect((await call(staff.agent, 'get', '/api/owner/reports/range?from=2026-01-01&to=2026-01-02')).status).toBe(403);

    expect((await call(owner.agent, 'patch', `/api/staff/tokens/${id}/payment/void`, { reason: 'Entered by mistake' })).status).toBe(200);
  });

  it('marking unpaid removes the revenue, keeps the record, can be paid again, and is audit-logged', async () => {
    const owner = await loginAs('owner');
    const barber = await loginAs('barber');
    await book(sid);
    const id = await completeNext(barber);
    await call(owner.agent, 'post', `/api/owner/tokens/${id}/payment`, { method: 'cash' });
    expect((await call(owner.agent, 'get', '/api/owner/reports/daily')).body.report.revenue.total).toBe(500);

    const v = await call(owner.agent, 'patch', `/api/staff/tokens/${id}/payment/void`, { reason: 'Wrong token' });
    expect(v.status).toBe(200);
    const day = (await call(owner.agent, 'get', '/api/owner/reports/daily')).body.report;
    expect(day.revenue.total).toBe(0);
    expect(day.completedUnpaid).toBe(1);
    expect(day.completedUnpaidAmount).toBe(500);
    const again = await call(owner.agent, 'patch', `/api/staff/tokens/${id}/payment/void`, {});
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('NOT_PAID');

    const repay = await call(owner.agent, 'post', `/api/owner/tokens/${id}/payment`, { method: 'mobile_wallet' });
    expect(repay.status).toBe(201);
    expect((await call(owner.agent, 'get', '/api/owner/reports/daily')).body.report.revenue.total).toBe(500);

    const log = await call(owner.agent, 'get', '/api/owner/audit');
    expect(log.body.items.map((a: { action: string }) => a.action)).toEqual(expect.arrayContaining(['payment.void', 'payment.record']));
  });
});

describe('revenue by payment date, dashboard money section and date ranges', () => {
  it('counts a service completed yesterday but paid today as TODAY\'s revenue, and never counts unpaid amounts', async () => {
    const owner = await loginAs('owner');
    const yesterday = dayOffset(-1);
    const today = dayOffset(0);
    const paidLater = await legacyCompleted(yesterday, 'A-901', 500);
    await legacyCompleted(yesterday, 'A-902', 750); // never paid

    expect((await call(owner.agent, 'get', `/api/owner/reports/daily?date=${yesterday}`)).body.report.revenue.total).toBe(0);
    expect((await call(owner.agent, 'post', `/api/owner/tokens/${paidLater._id}/payment`, { method: 'cash' })).status).toBe(201);

    const y = (await call(owner.agent, 'get', `/api/owner/reports/daily?date=${yesterday}`)).body.report;
    expect(y.revenue.total).toBe(0); // not yesterday's revenue: it was received today
    expect(y.completedUnpaid).toBe(1);
    expect(y.completedUnpaidAmount).toBe(750);
    const t = (await call(owner.agent, 'get', `/api/owner/reports/daily?date=${today}`)).body.report;
    expect(t.revenue).toEqual({ total: 500, paymentsCount: 1 });

    const range = (await call(owner.agent, 'get', `/api/owner/reports/range?from=${yesterday}&to=${today}`)).body.report;
    expect(range.revenue.total).toBe(500);
    expect(range.completedUnpaidAmount).toBe(750);
    expect(range.days.find((d: { date: string }) => d.date === today).revenue).toBe(500);
    expect(range.days.find((d: { date: string }) => d.date === yesterday).revenue).toBe(0);
    expect((await Token.findById(paidLater._id).lean())!.priceAtBooking).toBe(500); // existing record untouched
  });

  it('dashboard shows received today, paid services, unpaid completed today and the all-dates outstanding balance', async () => {
    const owner = await loginAs('owner');
    const barber = await loginAs('barber');
    await legacyCompleted(dayOffset(-1), 'A-901', 750); // older unpaid
    for (let i = 0; i < 3; i++) await book(sid);
    const [a] = [await completeNext(barber)];
    await completeNext(barber);
    await completeNext(barber);
    await call(owner.agent, 'post', `/api/owner/tokens/${a}/payment`, { method: 'cash' });

    const d = (await call(owner.agent, 'get', '/api/owner/dashboard')).body;
    expect(d.payments).toEqual({
      receivedToday: 500,
      paidServicesToday: 1,
      completedTodayUnpaidCount: 2,
      completedTodayUnpaidAmount: 1000,
      outstandingCount: 3,
      outstandingAmount: 1750,
    });
    expect(d.revenue).toBe(500);
  });

  it('validates date ranges', async () => {
    const owner = await loginAs('owner');
    const bad = [
      'from=2026-02-31&to=2026-03-01',
      'from=2026-03-02&to=2026-03-01',
      'from=2025-01-01&to=2026-06-01',
      'from=nope&to=2026-03-01',
      'from=2026-03-01',
    ];
    for (const q of bad) expect((await call(owner.agent, 'get', `/api/owner/reports/range?${q}`)).status, q).toBe(400);
    expect((await call(owner.agent, 'get', '/api/owner/reports/range?from=2026-03-01&to=2026-03-01')).status).toBe(200);
  });
});
