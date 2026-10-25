import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { Setting } from '../src/models';
import { app, book, call, H, loginAs, mkUser, seed, serviceId } from './helpers';

describe('barber photos', () => {
  beforeEach(async () => {
    await seed();
  });

  it('lets the owner set a team photo, and rejects anything outside /media/team/', async () => {
    const owner = await loginAs('owner');
    const { user } = await mkUser('barber', 'Rasheed');
    const ok = await call(owner.agent, 'patch', `/api/owner/barbers/${user._id}`, { photoUrl: '/media/team/rasheed.jpg' });
    expect(ok.status).toBe(200);
    expect(ok.body.barber.photoUrl).toBe('/media/team/rasheed.jpg');

    for (const bad of ['https://evil.example/x.jpg', '/media/../config.js', '/media/team/x.svg', 'javascript:alert(1)']) {
      const r = await call(owner.agent, 'patch', `/api/owner/barbers/${user._id}`, { photoUrl: bad });
      expect(r.status).toBe(400);
    }
    const cleared = await call(owner.agent, 'patch', `/api/owner/barbers/${user._id}`, { photoUrl: null });
    expect(cleared.body.barber.photoUrl).toBeNull();
  });

  it('shows the chosen barber (name and photo, no id) on the customer token and in the public list', async () => {
    await Setting.updateOne({ key: 'main' }, { $set: { allowBarberChoice: true } }, { upsert: true });
    const { user } = await mkUser('barber', 'Ricky Sothra', { photoUrl: '/media/team/ricky-sothra.jpg' });

    const list = await request(app).get('/api/barbers').set(H);
    expect(list.body.items.find((b: { id: string }) => b.id === String(user._id)).photoUrl).toBe('/media/team/ricky-sothra.jpg');

    const chosen = await book(await serviceId(), 'Customer A', { barberId: String(user._id) });
    expect(chosen.status).toBe(201);
    expect(chosen.body.token.barber).toEqual({ name: 'Ricky Sothra', photoUrl: '/media/team/ricky-sothra.jpg' });
    expect(JSON.stringify(chosen.body.token)).not.toContain(String(user._id));

    const anyone = await book(await serviceId(), 'Customer B');
    expect(anyone.body.token.barber).toBeNull();
  });
});
