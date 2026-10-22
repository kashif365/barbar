import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { AuditLog, Setting } from '../src/models';
import { app, call, login, loginAs, mkUser } from './helpers';

const FULL = {
  salonName: 'The Shehraz Barber & Co',
  address: 'Main Road, Test City',
  phone: '0300 0000000',
  instagramUrl: 'https://www.instagram.com/example/',
  openTime: '09:30',
  closeTime: '21:00',
  enforceHours: true,
  phoneRequired: true,
  allowBarberChoice: false,
  onlineBookingEnabled: false,
};

describe('owner settings: save and reload', () => {
  it('saves every field to MongoDB and returns the same values on reload, in a new session and publicly', async () => {
    const { user, email } = await mkUser('owner', 'settingsowner');
    const a = await login(email);
    const r = await call(a, 'patch', '/api/owner/settings', FULL);
    expect(r.status).toBe(200);
    expect(r.body.settings).toMatchObject(FULL);

    const stored = (await Setting.findOne({ key: 'main' }).lean())!;
    expect(stored).toMatchObject(FULL);

    // "refresh": a plain GET returns the saved values
    expect((await call(a, 'get', '/api/owner/settings')).body.settings).toMatchObject(FULL);
    // "log out and back in": a brand-new session sees the same values
    const b = await login(email);
    expect((await call(b, 'get', '/api/owner/settings')).body.settings).toMatchObject(FULL);
    // the public site reflects the saved values
    const pub = (await request(app).get('/api/settings/public')).body.settings;
    expect(pub).toMatchObject({ salonName: FULL.salonName, address: FULL.address, onlineBookingEnabled: false, allowBarberChoice: false, phoneRequired: true });

    const log = await AuditLog.findOne({ action: 'settings.update' }).lean();
    expect(String(log?.actorId)).toBe(String(user._id));
  });

  it('a partial update changes only the sent fields; null clears optional ones', async () => {
    const { agent } = await loginAs('owner');
    await call(agent, 'patch', '/api/owner/settings', FULL);
    const r = await call(agent, 'patch', '/api/owner/settings', { phoneRequired: false, address: null });
    expect(r.status).toBe(200);
    expect(r.body.settings).toMatchObject({ ...FULL, phoneRequired: false, address: null });
    expect(await Setting.countDocuments()).toBe(1);
  });

  it('rejects invalid values with field errors and saves nothing', async () => {
    const { agent } = await loginAs('owner');
    await call(agent, 'patch', '/api/owner/settings', FULL);
    const bad: Record<string, unknown>[] = [
      { salonName: '' },
      { openTime: '25:00' },
      { instagramUrl: 'javascript:alert(1)' },
      { instagramUrl: 'not a url' },
      { enforceHours: 'yes' },
      { address: 'x'.repeat(201) },
    ];
    for (const body of bad) {
      const r = await call(agent, 'patch', '/api/owner/settings', body);
      expect(r.status, JSON.stringify(body)).toBe(400);
      expect(r.body.error.code).toBe('VALIDATION_ERROR');
    }
    expect((await Setting.findOne({ key: 'main' }).lean())).toMatchObject(FULL);
  });

  it('ignores unknown fields and requires the owner role and a signed-in session', async () => {
    const { agent } = await loginAs('owner');
    const r = await call(agent, 'patch', '/api/owner/settings', { salonName: 'Safe', key: 'other', role: 'owner' });
    expect(r.status).toBe(200);
    expect((await Setting.find().lean()).map((s) => s.key)).toEqual(['main']);

    expect((await call((await loginAs('barber')).agent, 'patch', '/api/owner/settings', { salonName: 'x' })).status).toBe(403);
    expect((await call((await loginAs('staff')).agent, 'patch', '/api/owner/settings', { salonName: 'x' })).status).toBe(403);
    const anon = await request(app).patch('/api/owner/settings').set('X-Requested-With', 'shehraz-web').send({ salonName: 'x' });
    expect(anon.status).toBe(401);
    expect((await Setting.findOne({ key: 'main' }).lean())!.salonName).toBe('Safe');
  });
});
