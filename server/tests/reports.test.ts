import { beforeEach, describe, expect, it } from 'vitest';
import { app, book, call, loginAs, seed, serviceId } from './helpers';
import request from 'supertest';

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

describe('earnings', () => {
  it('counts the booked price of completed services only', async () => {
    const owner = await loginAs('owner');
    const barber = await loginAs('barber');
    await book(sid);
    await book(sid);
    await book(sid);
    await completeNext(barber);
    await completeNext(barber);
    const r = await call(owner.agent, 'get', '/api/owner/reports/daily');
    expect(r.body.report.byStatus.completed).toBe(2);
    expect(r.body.report.byStatus.waiting).toBe(1);
    expect(r.body.report.earnings).toBe(1000);
    expect(r.body.report.byBarber[0].earnings).toBe(1000);
    expect(r.body.report.days[0].earnings).toBe(1000);

    const d = await call(owner.agent, 'get', '/api/owner/dashboard');
    expect(d.body.earnings).toBe(1000);
  });

  it('payment endpoints no longer exist', async () => {
    const owner = await loginAs('owner');
    await book(sid);
    const r = await call(owner.agent, 'post', '/api/staff/tokens/0123456789abcdef01234567/payment', { method: 'cash' });
    expect(r.status).toBe(404);
  });

  it('reports are owner-only', async () => {
    const barber = await loginAs('barber');
    expect((await call(barber.agent, 'get', '/api/owner/reports/daily')).status).toBe(403);
    expect((await request(app).get('/api/owner/reports/daily')).status).toBe(401);
  });
});
