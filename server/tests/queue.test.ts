import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { Token } from '../src/models';
import type { TokenLean } from '../src/models/Token';
import type { UserLean } from '../src/models/User';
import { computeEstimates } from '../src/services/estimate';
import { app, book, call, loginAs, seed, serviceId, walkIn } from './helpers';

let sid: string;
beforeEach(async () => {
  await seed();
  sid = await serviceId();
});

describe('shared FIFO queue', () => {
  it('puts online and walk-in tokens in one queue, ordered by creation', async () => {
    const staff = await loginAs('staff');
    await book(sid, 'Online 1');
    await walkIn(staff.agent, sid, 'Walk 1');
    await book(sid, 'Online 2');
    const q = await request(app).get('/api/queue/today');
    expect(q.body.waiting.map((w: { tokenNumber: string }) => w.tokenNumber)).toEqual(['A-001', 'A-002', 'A-003']);
    const view = await call(staff.agent, 'get', '/api/staff/queue');
    expect(view.body.waiting.map((w: { source: string }) => w.source)).toEqual(['online', 'walk-in', 'online']);
  });

  it('call-next claims the oldest waiting token', async () => {
    const b = await loginAs('barber');
    await book(sid, 'First');
    await book(sid, 'Second');
    const r = await call(b.agent, 'post', '/api/staff/queue/call-next');
    expect(r.status).toBe(200);
    expect(r.body.token.tokenNumber).toBe('A-001');
    expect(r.body.token.status).toBe('in_service');
  });

  it('returns an empty result when nobody is waiting', async () => {
    const b = await loginAs('barber');
    const r = await call(b.agent, 'post', '/api/staff/queue/call-next');
    expect(r.status).toBe(200);
    expect(r.body.token).toBeNull();
  });

  it('two barbers calling at once never claim the same token', async () => {
    const b1 = await loginAs('barber', 'one');
    const b2 = await loginAs('barber', 'two');
    for (let i = 0; i < 3; i++) await book(sid);
    const [r1, r2] = await Promise.all([call(b1.agent, 'post', '/api/staff/queue/call-next'), call(b2.agent, 'post', '/api/staff/queue/call-next')]);
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r1.body.token.tokenNumber).not.toBe(r2.body.token.tokenNumber);
    expect(await Token.countDocuments({ status: 'in_service' })).toBe(2);
  });

  it('one barber clicking Call Next repeatedly gets only one active service', async () => {
    const b = await loginAs('barber');
    for (let i = 0; i < 4; i++) await book(sid);
    const rs = await Promise.all(Array.from({ length: 4 }, () => call(b.agent, 'post', '/api/staff/queue/call-next')));
    expect(rs.filter((r) => r.status === 200 && r.body.token).length).toBe(1);
    expect(rs.filter((r) => r.status === 409).length).toBe(3);
    expect(await Token.countDocuments({ status: 'in_service', barberId: b.user._id })).toBe(1);
  });

  it('refuses call-next while the barber is on break', async () => {
    const b = await loginAs('barber');
    await book(sid);
    await call(b.agent, 'patch', '/api/staff/availability', { availability: 'on_break' });
    const r = await call(b.agent, 'post', '/api/staff/queue/call-next');
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('BARBER_NOT_AVAILABLE');
  });
});

describe('state transitions', () => {
  it('rejects completing a token that is not in service', async () => {
    const b = await loginAs('barber');
    const t = await book(sid);
    const id = String((await Token.findOne({ tokenNumber: 'A-001' }))!._id);
    const r = await call(b.agent, 'patch', `/api/staff/tokens/${id}/complete`);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('INVALID_TRANSITION');
    expect(t.status).toBe(201);
  });

  it("does not let another barber complete someone else's service", async () => {
    const b1 = await loginAs('barber', 'one');
    const b2 = await loginAs('barber', 'two');
    await book(sid);
    const called = await call(b1.agent, 'post', '/api/staff/queue/call-next');
    const r = await call(b2.agent, 'patch', `/api/staff/tokens/${called.body.token.id}/complete`);
    expect(r.status).toBe(409);
  });

  it('completed tokens leave the waiting queue and cannot be reopened', async () => {
    const b = await loginAs('barber');
    const staff = await loginAs('staff');
    await book(sid);
    await book(sid);
    const called = await call(b.agent, 'post', '/api/staff/queue/call-next');
    const done = await call(b.agent, 'patch', `/api/staff/tokens/${called.body.token.id}/complete`);
    expect(done.body.token.status).toBe('completed');
    const q = await request(app).get('/api/queue/today');
    expect(q.body.waiting.map((w: { tokenNumber: string }) => w.tokenNumber)).toEqual(['A-002']);
    expect(q.body.nowServing).toEqual([]);
    const reopen = await call(staff.agent, 'patch', `/api/staff/tokens/${called.body.token.id}/requeue`);
    expect(reopen.status).toBe(409);
    const cancel = await call(staff.agent, 'patch', `/api/staff/tokens/${called.body.token.id}/cancel`);
    expect(cancel.status).toBe(409);
  });

  it('cancelled tokens leave the queue and are not reused', async () => {
    const staff = await loginAs('staff');
    await book(sid);
    const id = String((await Token.findOne())!._id);
    const r = await call(staff.agent, 'patch', `/api/staff/tokens/${id}/cancel`);
    expect(r.body.token.status).toBe('cancelled');
    expect((await request(app).get('/api/queue/today')).body.waiting).toEqual([]);
    const next = await book(sid);
    expect(next.body.token.tokenNumber).toBe('A-002');
  });

  it('skip -> requeue: barbers cannot requeue; staff can; the customer goes to the back', async () => {
    const b = await loginAs('barber');
    const staff = await loginAs('staff');
    await book(sid, 'One');
    await book(sid, 'Two');
    const first = String((await Token.findOne({ tokenNumber: 'A-001' }))!._id);
    const skipped = await call(b.agent, 'patch', `/api/staff/tokens/${first}/skip`, { reason: 'no_show' });
    expect(skipped.body.token.status).toBe('skipped');
    expect((await call(b.agent, 'patch', `/api/staff/tokens/${first}/requeue`)).status).toBe(403);
    const back = await call(staff.agent, 'patch', `/api/staff/tokens/${first}/requeue`);
    expect(back.status).toBe(200);
    const q = await request(app).get('/api/queue/today');
    expect(q.body.waiting.map((w: { tokenNumber: string }) => w.tokenNumber)).toEqual(['A-002', 'A-001']);
  });

  it('lets a customer cancel their waiting token once, but not after service started', async () => {
    const b = await loginAs('barber');
    const t1 = await book(sid);
    const t2 = await book(sid);
    const c1 = await request(app).patch(`/api/tokens/${t1.body.token.trackingToken}/cancel`).set('X-Requested-With', 'shehraz-web');
    expect(c1.status).toBe(200);
    expect(c1.body.token.status).toBe('cancelled');
    const again = await request(app).patch(`/api/tokens/${t1.body.token.trackingToken}/cancel`).set('X-Requested-With', 'shehraz-web');
    expect(again.status).toBe(409);
    await call(b.agent, 'post', '/api/staff/queue/call-next');
    const late = await request(app).patch(`/api/tokens/${t2.body.token.trackingToken}/cancel`).set('X-Requested-With', 'shehraz-web');
    expect(late.status).toBe(409);
  });

  it('returns assigned waiting tokens to first-available when a barber is deactivated', async () => {
    const owner = await loginAs('owner');
    const b = await loginAs('barber');
    await book(sid, 'Pref', { barberId: String(b.user._id) });
    expect((await Token.findOne())!.barberId).not.toBeNull();
    await call(owner.agent, 'patch', `/api/owner/barbers/${b.user._id}`, { isActive: false });
    expect((await Token.findOne())!.barberId).toBeNull();
  });
});

describe('wait estimates', () => {
  const tok = (id: string, minutes: number, extra: Partial<TokenLean> = {}) =>
    ({ _id: id, serviceId: 's1', durationMinutesAtBooking: minutes, barberId: null, startedAt: null, ...extra }) as unknown as TokenLean;
  const barber = (id: string, availability: string) => ({ _id: id, barber: { availability, serviceIds: [] } }) as unknown as UserLean;

  it('accumulates durations ahead for a single barber', () => {
    const e = computeEstimates([tok('a', 30), tok('b', 45), tok('c', 15)], [], [barber('x', 'available')]);
    expect([...e.byToken.values()]).toEqual([0, 30, 75]);
    expect(e.forNewToken).toBe(90);
  });

  it('accounts for the remaining time of the current service', () => {
    const now = new Date('2026-10-17T10:10:00Z');
    const current = tok('cur', 30, { barberId: 'x' as never, startedAt: new Date('2026-10-17T10:00:00Z') });
    const e = computeEstimates([tok('a', 30)], [current], [barber('x', 'available')], now);
    expect(e.byToken.get('a')).toBe(20);
  });

  it('splits work across available barbers', () => {
    const e = computeEstimates([tok('a', 30), tok('b', 30), tok('c', 30)], [], [barber('x', 'available'), barber('y', 'available')]);
    expect([...e.byToken.values()]).toEqual([0, 0, 30]);
  });

  it('returns null instead of inventing a number when nobody is available', () => {
    const e = computeEstimates([tok('a', 30)], [], [barber('x', 'on_break'), barber('y', 'offline')]);
    expect(e.byToken.get('a')).toBeNull();
    expect(e.forNewToken).toBeNull();
  });
});

describe('owner start / complete (Live Queue buttons)', () => {
  const idOf = async (tokenNumber: string) => String((await Token.findOne({ tokenNumber }))!._id);

  it('start moves a waiting token to in_service, saves it, and keeps queue order and details', async () => {
    const owner = await loginAs('owner');
    const barber = await loginAs('barber');
    await book(sid, 'First');
    await book(sid, 'Second');
    const before = (await Token.findOne({ tokenNumber: 'A-001' }).lean())!;

    const r = await call(owner.agent, 'patch', `/api/staff/tokens/${await idOf('A-001')}/start`);
    expect(r.status).toBe(200);
    expect(r.body.token.status).toBe('in_service');
    expect(r.body.token.barberId).toBe(String(barber.user._id));

    const saved = (await Token.findOne({ tokenNumber: 'A-001' }).lean())!;
    expect(saved.status).toBe('in_service');
    expect(saved.startedAt).toBeInstanceOf(Date);
    expect(saved.queuedAt).toEqual(before.queuedAt);
    expect(saved.customerName).toBe(before.customerName);
    expect(saved.priceAtBooking).toBe(before.priceAtBooking);

    const view = await call(owner.agent, 'get', '/api/staff/queue');
    expect(view.body.inService.map((t: { tokenNumber: string }) => t.tokenNumber)).toEqual(['A-001']);
    expect(view.body.waiting.map((t: { tokenNumber: string }) => t.tokenNumber)).toEqual(['A-002']);
  });

  it('uses the barber already assigned to the token', async () => {
    const owner = await loginAs('owner');
    await loginAs('barber', 'one');
    const two = await loginAs('barber', 'two');
    await book(sid);
    const id = await idOf('A-001');
    await call(owner.agent, 'patch', `/api/owner/tokens/${id}/reassign`, { barberId: String(two.user._id) });
    const r = await call(owner.agent, 'patch', `/api/staff/tokens/${id}/start`);
    expect(r.status).toBe(200);
    expect(r.body.token.barberId).toBe(String(two.user._id));
  });

  it('refuses to start when no barber is free, leaving the token waiting', async () => {
    const owner = await loginAs('owner');
    await book(sid);
    await book(sid);
    const none = await call(owner.agent, 'patch', `/api/staff/tokens/${await idOf('A-001')}/start`);
    expect(none.status).toBe(409);
    expect(none.body.error.code).toBe('NO_BARBER_AVAILABLE');
    expect((await Token.findOne({ tokenNumber: 'A-001' }))!.status).toBe('waiting');

    await loginAs('barber');
    expect((await call(owner.agent, 'patch', `/api/staff/tokens/${await idOf('A-001')}/start`)).status).toBe(200);
    const busy = await call(owner.agent, 'patch', `/api/staff/tokens/${await idOf('A-002')}/start`);
    expect(busy.status).toBe(409);
    expect(busy.body.error.code).toBe('NO_BARBER_AVAILABLE');
    expect(await Token.countDocuments({ status: 'in_service' })).toBe(1);
  });

  it('only waiting tokens can be started; a double click starts exactly once', async () => {
    const owner = await loginAs('owner');
    await loginAs('barber', 'one');
    await loginAs('barber', 'two');
    await book(sid);
    const id = await idOf('A-001');
    const rs = await Promise.all([call(owner.agent, 'patch', `/api/staff/tokens/${id}/start`), call(owner.agent, 'patch', `/api/staff/tokens/${id}/start`)]);
    expect(rs.filter((r) => r.status === 200).length).toBe(1);
    expect(rs.filter((r) => r.status === 409).length).toBe(1);
    expect(await Token.countDocuments({ status: 'in_service' })).toBe(1);

    for (const status of ['completed', 'cancelled', 'skipped'] as const) {
      await Token.updateOne({ tokenNumber: 'A-001' }, { $set: { status } });
      const r = await call(owner.agent, 'patch', `/api/staff/tokens/${id}/start`);
      expect(r.status).toBe(409);
      expect(r.body.error.code).toBe('INVALID_TRANSITION');
    }
  });

  it('complete moves an in_service token to completed, removes it from the active queue and keeps it in history', async () => {
    const owner = await loginAs('owner');
    await loginAs('barber');
    await book(sid);
    await book(sid);
    const id = await idOf('A-001');
    await call(owner.agent, 'patch', `/api/staff/tokens/${id}/start`);

    const r = await call(owner.agent, 'patch', `/api/staff/tokens/${id}/complete`);
    expect(r.status).toBe(200);
    expect(r.body.token.status).toBe('completed');
    const saved = (await Token.findOne({ tokenNumber: 'A-001' }).lean())!;
    expect(saved.status).toBe('completed');
    expect(saved.completedAt).toBeInstanceOf(Date);

    const view = await call(owner.agent, 'get', '/api/staff/queue');
    expect(view.body.inService).toEqual([]);
    expect(view.body.waiting.map((t: { tokenNumber: string }) => t.tokenNumber)).toEqual(['A-002']);
    expect(view.body.completed.map((t: { tokenNumber: string }) => t.tokenNumber)).toEqual(['A-001']);
    const pub = await request(app).get('/api/queue/today');
    expect(pub.body.nowServing).toEqual([]);

    const hist = await call(owner.agent, 'get', '/api/owner/tokens');
    expect(hist.body.items.map((t: { tokenNumber: string }) => t.tokenNumber)).toContain('A-001');
  });

  it('cannot complete a token that is waiting, already completed, or cancelled', async () => {
    const owner = await loginAs('owner');
    await book(sid);
    const id = await idOf('A-001');
    for (const status of ['waiting', 'completed', 'cancelled'] as const) {
      await Token.updateOne({ tokenNumber: 'A-001' }, { $set: { status } });
      const r = await call(owner.agent, 'patch', `/api/staff/tokens/${id}/complete`);
      expect(r.status).toBe(409);
      expect(r.body.error.code).toBe('INVALID_TRANSITION');
    }
  });

  it('records owner start and complete in the audit log', async () => {
    const owner = await loginAs('owner');
    await loginAs('barber');
    await book(sid);
    const id = await idOf('A-001');
    await call(owner.agent, 'patch', `/api/staff/tokens/${id}/start`);
    await call(owner.agent, 'patch', `/api/staff/tokens/${id}/complete`);
    const log = await call(owner.agent, 'get', '/api/owner/audit');
    const actions = log.body.items.map((a: { action: string }) => a.action);
    expect(actions).toEqual(expect.arrayContaining(['token.start', 'token.complete']));
  });

  it('reception staff cannot start or complete; skip and cancel still work for the owner', async () => {
    const owner = await loginAs('owner');
    const staff = await loginAs('staff');
    await loginAs('barber');
    await book(sid);
    await book(sid);
    await book(sid);
    const [a, b, c] = [await idOf('A-001'), await idOf('A-002'), await idOf('A-003')];
    expect((await call(staff.agent, 'patch', `/api/staff/tokens/${a}/start`)).status).toBe(403);
    expect((await call(staff.agent, 'patch', `/api/staff/tokens/${a}/complete`)).status).toBe(403);
    expect((await call(owner.agent, 'patch', `/api/staff/tokens/${a}/skip`, { reason: 'skipped' })).body.token.status).toBe('skipped');
    expect((await call(owner.agent, 'patch', `/api/staff/tokens/${b}/cancel`)).body.token.status).toBe('cancelled');
    expect((await call(owner.agent, 'patch', `/api/staff/tokens/${c}/start`)).body.token.status).toBe('in_service');
  });

  it('barbers still start and complete their own tokens exactly as before', async () => {
    const barber = await loginAs('barber');
    await book(sid);
    const id = await idOf('A-001');
    expect((await call(barber.agent, 'patch', `/api/staff/tokens/${id}/start`)).body.token.status).toBe('in_service');
    expect((await call(barber.agent, 'patch', `/api/staff/tokens/${id}/complete`)).body.token.status).toBe('completed');
  });
});
