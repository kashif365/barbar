import type { FilterQuery, Types } from 'mongoose';
import { Token, User } from '../models';
import type { IToken, TokenLean, TokenStatus } from '../models/Token';
import type { Availability, Role, UserDoc, UserLean } from '../models/User';
import { AppError, conflict, isDuplicateKeyError, notFound } from '../utils/errors';
import { businessDateOf } from '../utils/time';

/** Documented state machine. Every mutation below enforces it atomically in the database query itself. */
export const ALLOWED_TRANSITIONS: Record<TokenStatus, TokenStatus[]> = {
  waiting: ['in_service', 'skipped', 'cancelled'],
  in_service: ['completed', 'waiting'], // in_service -> waiting is owner-only recovery
  skipped: ['waiting'], // only via authorized requeue
  completed: [],
  cancelled: [],
};
export const canTransition = (from: TokenStatus, to: TokenStatus) => ALLOWED_TRANSITIONS[from].includes(to);

/**
 * All mutations are single atomic `findOneAndUpdate` calls whose FILTER contains the expected
 * current status. If two actors race (two barbers claiming the same token, a customer cancelling
 * while staff starts it), exactly one filter matches; the loser gets null and a 409.
 */
async function explainFailure(id: string, wanted: TokenStatus): Promise<never> {
  const t = await Token.findById(id).lean<TokenLean>();
  if (!t) throw notFound('Token');
  throw conflict(
    'INVALID_TRANSITION',
    `Token ${t.tokenNumber} is ${t.status.replace('_', ' ')} and cannot be moved to ${wanted.replace('_', ' ')}.`,
    { from: t.status, to: wanted },
  );
}

function eligibilityFilter(barber: UserDoc): FilterQuery<IToken> {
  const caps = barber.barber?.serviceIds ?? [];
  const f: FilterQuery<IToken> = { $or: [{ barberId: null }, { barberId: barber._id }] };
  return caps.length > 0 ? { $and: [f, { serviceId: { $in: caps } }] } : f;
}

async function assertCanServe(barber: UserDoc) {
  if (barber.barber?.availability !== 'available') {
    throw conflict('BARBER_NOT_AVAILABLE', 'Set yourself to Available before calling a customer.');
  }
  const busy = await Token.exists({ barberId: barber._id, status: 'in_service' });
  if (busy) throw conflict('ALREADY_SERVING', 'Finish your current service before calling the next customer.');
}

async function claim(filter: FilterQuery<IToken>, barber: { _id: Types.ObjectId }, sort?: Record<string, 1 | -1>): Promise<TokenLean | null> {
  try {
    return await Token.findOneAndUpdate(
      filter,
      { $set: { status: 'in_service', barberId: barber._id, startedAt: new Date() } },
      { new: true, sort },
    ).lean<TokenLean>();
  } catch (e) {
    // Partial unique index {barberId} where status=in_service: the DB rejects a second active service.
    if (isDuplicateKeyError(e)) throw conflict('ALREADY_SERVING', 'You already have a customer in service.');
    throw e;
  }
}

/** Atomically claims the oldest eligible waiting token for this barber. Returns null if none. */
export async function callNext(barber: UserDoc, now = new Date()): Promise<TokenLean | null> {
  await assertCanServe(barber);
  return claim(
    { $and: [{ businessDate: businessDateOf(now), status: 'waiting' }, eligibilityFilter(barber)] },
    barber,
    { queuedAt: 1, _id: 1 },
  );
}

export async function startToken(id: string, barber: UserDoc, now = new Date()): Promise<TokenLean> {
  await assertCanServe(barber);
  const t = await claim(
    { $and: [{ _id: id, businessDate: businessDateOf(now), status: 'waiting' }, eligibilityFilter(barber)] },
    barber,
  );
  if (!t) return explainFailure(id, 'in_service');
  return t;
}

/**
 * Admin (owner) start. A token in service must carry the serving barber, and the database allows only
 * one active service per barber, so the admin start resolves one: the barber already assigned to the token,
 * otherwise the first barber who is available, idle and offers the service. The token keeps its queuedAt,
 * so queue order and token details are untouched. Fails with 409 (never silently) if nobody can serve it.
 */
export async function startTokenAsAdmin(id: string, now = new Date()): Promise<TokenLean> {
  const tok = await Token.findById(id).lean<TokenLean>();
  if (!tok) throw notFound('Token');
  if (tok.status !== 'waiting') return explainFailure(id, 'in_service');
  if (tok.businessDate !== businessDateOf(now)) {
    throw conflict('STALE_TOKEN', 'This token is from a previous business day and cannot be started.');
  }

  const barbers = await User.find({
    role: 'barber',
    isActive: true,
    'barber.availability': 'available',
    ...(tok.barberId ? { _id: tok.barberId } : {}),
  })
    .sort({ createdAt: 1, _id: 1 })
    .lean<UserLean[]>();
  const capable = barbers.filter((b) => {
    const caps = (b.barber?.serviceIds ?? []).map(String);
    return caps.length === 0 || caps.includes(String(tok.serviceId));
  });
  const busyDocs = capable.length
    ? await Token.find({ status: 'in_service', barberId: { $in: capable.map((b) => b._id) } }).select('barberId').lean()
    : [];
  const busy = new Set(busyDocs.map((d) => String(d.barberId)));
  const free = capable.filter((b) => !busy.has(String(b._id)));

  for (const barber of free) {
    try {
      // Filter pins the expected status AND the assignment we read, so a concurrent cancel/skip/reassign makes this a 409.
      const t = await claim({ _id: id, businessDate: tok.businessDate, status: 'waiting', barberId: tok.barberId }, barber);
      if (!t) return explainFailure(id, 'in_service');
      return t;
    } catch (e) {
      // This barber just became busy (DB unique index). Try the next free barber.
      if (e instanceof AppError && e.code === 'ALREADY_SERVING') continue;
      throw e;
    }
  }
  throw conflict(
    'NO_BARBER_AVAILABLE',
    tok.barberId
      ? 'The assigned barber is not available or is already serving someone. Reassign the token or try again when they are free.'
      : 'No available barber is free to serve this token right now.',
  );
}

/** Barbers complete only their own service; the owner can complete any token that is in service. */
export async function completeToken(id: string, actor: UserDoc): Promise<TokenLean> {
  const t = await Token.findOneAndUpdate(
    actor.role === 'barber' ? { _id: id, status: 'in_service', barberId: actor._id } : { _id: id, status: 'in_service' },
    { $set: { status: 'completed', completedAt: new Date() } },
    { new: true },
  ).lean<TokenLean>();
  if (!t) return explainFailure(id, 'completed');
  return t;
}

export async function skipToken(id: string, actor: UserDoc, reason: 'skipped' | 'no_show'): Promise<TokenLean> {
  const filter: FilterQuery<IToken> =
    actor.role === 'barber' ? { $and: [{ _id: id, status: 'waiting' }, eligibilityFilter(actor)] } : { _id: id, status: 'waiting' };
  const t = await Token.findOneAndUpdate(
    filter,
    { $set: { status: 'skipped', skippedAt: new Date(), skipReason: reason } },
    { new: true },
  ).lean<TokenLean>();
  if (!t) return explainFailure(id, 'skipped');
  return t;
}

export async function cancelTokenByStaff(id: string): Promise<TokenLean> {
  const t = await Token.findOneAndUpdate(
    { _id: id, status: 'waiting' },
    { $set: { status: 'cancelled', cancelledAt: new Date(), cancelledBy: 'staff' } },
    { new: true },
  ).lean<TokenLean>();
  if (!t) return explainFailure(id, 'cancelled');
  return t;
}

export async function cancelTokenByCustomer(id: string): Promise<TokenLean> {
  const t = await Token.findOneAndUpdate(
    { _id: id, status: 'waiting' },
    { $set: { status: 'cancelled', cancelledAt: new Date(), cancelledBy: 'customer' } },
    { new: true },
  ).lean<TokenLean>();
  if (!t) {
    const cur = await Token.findById(id).lean<TokenLean>();
    if (!cur) throw notFound('Token');
    throw conflict('CANNOT_CANCEL', 'This token can no longer be cancelled.', { status: cur.status });
  }
  return t;
}

/**
 * Authorized re-entry. A skipped customer who returns goes to the BACK of the queue
 * (queuedAt = now), so they do not jump ahead of people who waited. Owner/staff only.
 * Recovering an in_service token (e.g. a barber's device died) is owner-only.
 */
export async function requeueToken(id: string, actorRole: Role, now = new Date()): Promise<TokenLean> {
  const current = await Token.findById(id).lean<TokenLean>();
  if (!current) throw notFound('Token');
  if (current.businessDate !== businessDateOf(now)) {
    throw conflict('STALE_TOKEN', 'This token is from a previous business day and cannot be re-queued.');
  }
  if (current.status === 'in_service' && actorRole !== 'owner') {
    throw new AppError(403, 'FORBIDDEN', 'Only the owner can recover a token that is in service.');
  }
  if (current.status !== 'skipped' && current.status !== 'in_service') {
    throw conflict('INVALID_TRANSITION', `Token ${current.tokenNumber} is ${current.status} and cannot be re-queued.`, { from: current.status, to: 'waiting' });
  }
  const t = await Token.findOneAndUpdate(
    { _id: id, status: current.status },
    {
      $set: { status: 'waiting', queuedAt: now, startedAt: null, skippedAt: null, skipReason: null, barberId: null },
    },
    { new: true },
  ).lean<TokenLean>();
  if (!t) return explainFailure(id, 'waiting');
  return t;
}

export async function reassignToken(id: string, barberId: string | null): Promise<TokenLean> {
  if (barberId) {
    const b = await User.findOne({ _id: barberId, role: 'barber', isActive: true }).lean();
    if (!b) throw conflict('BARBER_UNAVAILABLE', 'That barber is not active.');
    const tok = await Token.findById(id).lean<TokenLean>();
    if (!tok) throw notFound('Token');
    const caps = (b.barber?.serviceIds ?? []).map(String);
    if (caps.length > 0 && !caps.includes(String(tok.serviceId))) {
      throw conflict('BARBER_CANNOT_SERVE', 'That barber does not offer this service.');
    }
  }
  const t = await Token.findOneAndUpdate({ _id: id, status: 'waiting' }, { $set: { barberId } }, { new: true }).lean<TokenLean>();
  if (!t) return explainFailure(id, 'waiting');
  return t;
}

export async function setAvailability(user: UserDoc, availability: Availability): Promise<void> {
  await User.updateOne({ _id: user._id }, { $set: { 'barber.availability': availability } });
}
