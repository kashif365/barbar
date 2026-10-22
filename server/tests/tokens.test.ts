import crypto from 'node:crypto';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { Service, Token } from '../src/models';
import { createToken } from '../src/services/tokenService';
import { businessDateOf } from '../src/utils/time';
import { app, book, call, H, loginAs, seed, serviceId } from './helpers';

beforeEach(async () => {
  await seed();
});

describe('token numbering', () => {
  it('issues A-001 as the first token of the day, with a tracking credential and no phone', async () => {
    const r = await book(await serviceId(), 'Ali', { customerPhone: '03001234567' });
    expect(r.status).toBe(201);
    expect(r.body.token.tokenNumber).toBe('A-001');
    expect(r.body.token.trackingToken).toBeTruthy();
    expect(JSON.stringify(r.body)).not.toContain('03001234567');
  });

  it('numbers sequentially', async () => {
    const sid = await serviceId();
    const nums = [];
    for (let i = 0; i < 3; i++) nums.push((await book(sid)).body.token.tokenNumber);
    expect(nums).toEqual(['A-001', 'A-002', 'A-003']);
  });

  it('resets the counter on a new business date', async () => {
    const sid = await serviceId();
    const day1 = new Date('2026-10-17T10:00:00Z');
    const day2 = new Date('2026-10-18T10:00:00Z');
    const a = await createToken({ source: 'online', serviceId: sid, customerName: 'A', now: day1 });
    const b = await createToken({ source: 'online', serviceId: sid, customerName: 'B', now: day1 });
    const c = await createToken({ source: 'online', serviceId: sid, customerName: 'C', now: day2 });
    expect([a.token.tokenNumber, b.token.tokenNumber, c.token.tokenNumber]).toEqual(['A-001', 'A-002', 'A-001']);
    expect(c.token.businessDate).toBe('2026-10-18');
  });

  it('computes the business date in Asia/Karachi, not UTC (midnight boundary)', () => {
    // 19:30 UTC on the 17th is 00:30 on the 18th in Karachi (UTC+5).
    expect(businessDateOf(new Date('2026-10-17T19:30:00Z'))).toBe('2026-10-18');
    expect(businessDateOf(new Date('2026-10-17T18:59:00Z'))).toBe('2026-10-17');
  });

  it('never issues duplicate numbers under concurrent requests', async () => {
    const sid = await serviceId();
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) => createToken({ source: i % 2 ? 'walk-in' : 'online', serviceId: sid, customerName: `C${i}` })),
    );
    const numbers = results.map((r) => r.token.tokenNumber).sort();
    expect(new Set(numbers).size).toBe(20);
    expect(numbers[0]).toBe('A-001');
    expect(numbers[19]).toBe('A-020');
  });
});

describe('duplicate submissions', () => {
  it('returns the same token for the same idempotency key and creates only one', async () => {
    const sid = await serviceId();
    const key = crypto.randomUUID();
    const send = () => request(app).post('/api/tokens/online').set(H).set('Idempotency-Key', key).send({ serviceId: sid, customerName: 'Dup' });
    const [a, b] = await Promise.all([send(), send()]);
    expect([200, 201]).toContain(a.status);
    expect([200, 201]).toContain(b.status);
    expect(a.body.token.tokenNumber).toBe(b.body.token.tokenNumber);
    expect(a.body.token.trackingToken).toBe(b.body.token.trackingToken);
    expect(await Token.countDocuments()).toBe(1);
  });

  it('rejects state-changing requests without the CSRF header', async () => {
    const r = await request(app).post('/api/tokens/online').send({ serviceId: await serviceId(), customerName: 'X' });
    expect(r.status).toBe(403);
  });
});

describe('services and prices', () => {
  it('seeds confirmed prices and flags demo prices', async () => {
    const r = await request(app).get('/api/services');
    const by = Object.fromEntries(r.body.items.map((s: { name: string }) => [s.name, s]));
    expect(by['Haircut']).toMatchObject({ price: 500, isDemoPrice: false, durationMinutes: 30 });
    expect(by['Haircut + Beard']).toMatchObject({ price: 750, isDemoPrice: false, durationMinutes: 45 });
    expect(by['Facial']).toMatchObject({ price: 500, isDemoPrice: false });
    for (const n of ['Beard Trim', 'Hair Wash', 'Hair Styling', 'Face Cleanup']) expect(by[n].isDemoPrice).toBe(true);
    expect(by['Beard Trim'].price).toBe(250);
    expect(r.body.items).toHaveLength(7);
  });

  it('ignores client-supplied prices', async () => {
    const r = await book(await serviceId(), 'Sneaky', { priceAtBooking: 1, price: 1 });
    expect(r.body.token.priceAtBooking).toBe(500);
  });

  it('rejects booking an inactive service', async () => {
    const sid = await serviceId('Facial');
    await Service.updateOne({ _id: sid }, { isActive: false });
    const r = await book(sid);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('SERVICE_UNAVAILABLE');
    expect((await request(app).get('/api/services')).body.items.map((s: { name: string }) => s.name)).not.toContain('Facial');
  });

  it('keeps historical price snapshots when the price changes', async () => {
    const sid = await serviceId();
    const t = await book(sid);
    const { agent } = await loginAs('owner');
    const upd = await call(agent, 'patch', `/api/owner/services/${sid}`, { price: 650 });
    expect(upd.status).toBe(200);
    const after = await request(app).get(`/api/tokens/${t.body.token.trackingToken}`);
    expect(after.body.token.priceAtBooking).toBe(500);
    const fresh = await book(sid);
    expect(fresh.body.token.priceAtBooking).toBe(650);
  });

  it('soft-deletes services instead of removing them', async () => {
    const sid = await serviceId();
    const { agent } = await loginAs('owner');
    const r = await call(agent, 'delete', `/api/owner/services/${sid}`);
    expect(r.status).toBe(200);
    expect(await Service.findById(sid)).toMatchObject({ isActive: false });
  });
});
