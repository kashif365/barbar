import crypto from 'node:crypto';
import request from 'supertest';
import { expect } from 'vitest';
import { createApp } from '../src/app';
import { Service, User } from '../src/models';
import type { Role } from '../src/models/User';
import { hashPassword } from '../src/utils/password';
import { seedServices } from '../src/scripts/seedData';

export const app = createApp();
export const H = { 'X-Requested-With': 'shehraz-web' } as const;
export const PASSWORD = 'Test-Passw0rd-123';

type Agent = ReturnType<typeof request.agent>;

export async function mkUser(role: Role, name: string = role, extra: Record<string, unknown> = {}) {
  const email = `${name.replace(/\W+/g, '').toLowerCase()}-${crypto.randomBytes(3).toString('hex')}@test.invalid`;
  const user = await User.create({
    name,
    email,
    passwordHash: await hashPassword(PASSWORD),
    role,
    barber: { availability: role === 'barber' ? 'available' : 'offline', serviceIds: [] },
    ...extra,
  });
  return { user, email };
}

export async function login(email: string): Promise<Agent> {
  const agent = request.agent(app);
  const r = await agent.post('/api/auth/login').set(H).send({ email, password: PASSWORD });
  expect(r.status).toBe(200);
  return agent;
}

export async function loginAs(role: Role, name: string = role) {
  const { user, email } = await mkUser(role, name);
  return { user, agent: await login(email) };
}

export const serviceId = async (name = 'Haircut') => String((await Service.findOne({ name }).lean())!._id);
export const seed = () => seedServices();

export async function book(sid: string, customerName = 'Test Customer', extra: Record<string, unknown> = {}) {
  return request(app)
    .post('/api/tokens/online')
    .set(H)
    .set('Idempotency-Key', crypto.randomUUID())
    .send({ serviceId: sid, customerName, ...extra });
}

export async function walkIn(agent: Agent, sid: string, customerName = 'Walk In') {
  return agent.post('/api/staff/tokens/walk-in').set(H).set('Idempotency-Key', crypto.randomUUID()).send({ serviceId: sid, customerName });
}

export const call = (agent: Agent, method: 'get' | 'post' | 'patch' | 'delete', url: string, body?: object) => {
  const r = agent[method](url).set(H);
  return body ? r.send(body) : r;
};
