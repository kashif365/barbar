import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { User } from '../src/models';
import { makeTrackingToken } from '../src/utils/tracking';
import { app, book, call, H, loginAs, mkUser, seed, serviceId } from './helpers';

let sid: string;
beforeEach(async () => {
  await seed();
  sid = await serviceId();
});

describe('authentication', () => {
  it('rejects wrong passwords and unknown emails with the same message', async () => {
    const { email } = await mkUser('barber');
    const wrong = await request(app).post('/api/auth/login').set(H).send({ email, password: 'nope-nope-nope' });
    const unknown = await request(app).post('/api/auth/login').set(H).send({ email: 'ghost@test.invalid', password: 'nope-nope-nope' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error.message).toBe(unknown.body.error.message);
  });

  it('never returns password hashes', async () => {
    const { email } = await mkUser('owner');
    const r = await request(app).post('/api/auth/login').set(H).send({ email, password: 'Test-Passw0rd-123' });
    expect(JSON.stringify(r.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
    const agent = await loginAs('owner');
    const list = await call(agent.agent, 'get', '/api/owner/barbers');
    expect(JSON.stringify(list.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });

  it('is not vulnerable to NoSQL operator injection on login', async () => {
    await mkUser('owner');
    const r = await request(app).post('/api/auth/login').set(H).send({ email: { $gt: '' }, password: { $gt: '' } });
    expect(r.status).toBeGreaterThanOrEqual(400);
    expect(r.status).toBeLessThan(500);
  });

  it('invalidates a logged-in session as soon as the account is deactivated', async () => {
    const b = await loginAs('barber');
    expect((await call(b.agent, 'get', '/api/staff/queue')).status).toBe(200);
    await User.updateOne({ _id: b.user._id }, { isActive: false });
    expect((await call(b.agent, 'get', '/api/staff/queue')).status).toBe(401);
  });

  it('ends the session on logout', async () => {
    const b = await loginAs('barber');
    await call(b.agent, 'post', '/api/auth/logout');
    expect((await call(b.agent, 'get', '/api/auth/me')).status).toBe(401);
  });
});

describe('authorization', () => {
  it('blocks unauthenticated users from every staff and owner route', async () => {
    const routes: Array<['get' | 'post' | 'patch', string]> = [
      ['get', '/api/staff/queue'],
      ['post', '/api/staff/queue/call-next'],
      ['post', '/api/staff/tokens/walk-in'],
      ['patch', '/api/staff/tokens/000000000000000000000000/complete'],
      ['get', '/api/owner/dashboard'],
      ['get', '/api/owner/reports/daily'],
      ['post', '/api/owner/services'],
    ];
    for (const [m, url] of routes) {
      const r = await request(app)[m](url).set(H).send({});
      expect(r.status, `${m} ${url}`).toBe(401);
    }
  });

  it('forbids barbers and reception staff from owner-only endpoints', async () => {
    const b = await loginAs('barber');
    const s = await loginAs('staff');
    for (const a of [b.agent, s.agent]) {
      expect((await call(a, 'get', '/api/owner/dashboard')).status).toBe(403);
      expect((await call(a, 'get', '/api/owner/reports/monthly')).status).toBe(403);
      expect((await call(a, 'post', '/api/owner/services', { name: 'X', price: 1, durationMinutes: 5 })).status).toBe(403);
      expect((await call(a, 'post', '/api/owner/barbers', { name: 'X', email: 'x@test.invalid', password: 'longenoughpass' })).status).toBe(403);
      expect((await call(a, 'patch', '/api/owner/settings', { salonName: 'Hacked' })).status).toBe(403);
    }
  });

  it('forbids reception staff from calling or completing services', async () => {
    const s = await loginAs('staff');
    expect((await call(s.agent, 'post', '/api/staff/queue/call-next')).status).toBe(403);
  });

  it('customers (no session) cannot call, complete or reassign', async () => {
    const t = await book(sid);
    const id = String((await (await import('../src/models')).Token.findOne())!._id);
    for (const [m, url] of [
      ['post', '/api/staff/queue/call-next'],
      ['patch', `/api/staff/tokens/${id}/complete`],
      ['patch', `/api/owner/tokens/${id}/reassign`],
    ] as const) {
      expect((await request(app)[m](url).set(H).send({})).status, url).toBe(401);
    }
    expect(t.status).toBe(201);
  });
});

describe('public tracking privacy', () => {
  it('rejects forged, tampered and unknown tracking credentials identically', async () => {
    const a = await book(sid, 'A');
    const b = await book(sid, 'B');
    const [idA] = a.body.token.trackingToken.split('.');
    const [, sigB] = b.body.token.trackingToken.split('.');
    const forged = `${idA}.${sigB}`; // A's id with B's signature
    const unsigned = idA;
    const unknown = makeTrackingToken('0123456789abcdef01234567');
    for (const c of [forged, unsigned, `${idA}.`, 'garbage', unknown]) {
      const r = await request(app).get(`/api/tokens/${encodeURIComponent(c)}`);
      expect(r.status, c).toBe(404);
    }
    const ok = await request(app).get(`/api/tokens/${a.body.token.trackingToken}`);
    expect(ok.status).toBe(200);
    expect(ok.body.token.tokenNumber).toBe('A-001');
  });

  it('never leaks phone numbers or names in public queue or tracking data', async () => {
    const phone = '0300 1234567';
    const t = await book(sid, 'Private Person', { customerPhone: phone });
    expect(t.status).toBe(201);
    const q = await request(app).get('/api/queue/today');
    const tr = await request(app).get(`/api/tokens/${t.body.token.trackingToken}`);
    for (const body of [JSON.stringify(q.body), JSON.stringify(tr.body)]) {
      expect(body).not.toContain('1234567');
      expect(body).not.toMatch(/phone/i);
    }
    expect(JSON.stringify(q.body)).not.toContain('Private Person');
  });
});
