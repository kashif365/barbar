import { Customer, Token } from '../models';
import type { TokenLean } from '../models/Token';
import type { UserDoc } from '../models/User';
import { asyncHandler } from '../utils/asyncHandler';
import { idParam, availabilitySchema, createTokenSchema, skipSchema } from '../validators';
import { createToken } from '../services/tokenService';
import { getQueueSnapshot, type QueueSnapshot } from '../services/queueService';
import { toStaffToken } from '../services/serializers';
import * as actions from '../services/queueActions';
import { audit } from '../services/auditService';
import { emitQueueEvent, emitQueueUpdated } from '../sockets';

/** Attach customer phone + barber name so the staff serializer can show them (authenticated users only). */
export async function decorate(tokens: TokenLean[], snap: QueueSnapshot) {
  const ids = tokens.map((t) => t.customerId).filter(Boolean);
  const customers = ids.length ? await Customer.find({ _id: { $in: ids } }).select('phone').lean() : [];
  const phone = new Map(customers.map((c) => [String(c._id), c.phone]));
  const barberName = new Map(snap.barbers.map((b) => [String(b._id), b.name]));
  return tokens.map((t) =>
    toStaffToken(
      {
        ...t,
        customerId: t.customerId ? { phone: phone.get(String(t.customerId)) } : null,
        barberId: t.barberId ? { _id: t.barberId, name: barberName.get(String(t.barberId)) ?? '' } : null,
      } as unknown as TokenLean,
      snap,
    ),
  );
}

const eligibleFor = (b: UserDoc, t: TokenLean) => {
  const caps = (b.barber?.serviceIds ?? []).map(String);
  const mine = !t.barberId || String(t.barberId) === String(b._id);
  return mine && (caps.length === 0 || caps.includes(String(t.serviceId)));
};

export const getQueue = asyncHandler(async (req, res) => {
  const user = req.user!;
  const snap = await getQueueSnapshot();
  const isBarber = user.role === 'barber';
  const waiting = isBarber ? snap.waiting.filter((t) => eligibleFor(user, t)) : snap.waiting;
  const mine = snap.inService.filter((t) => String(t.barberId) === String(user._id));

  const completedFilter = { businessDate: snap.businessDate, status: 'completed', ...(isBarber ? { barberId: user._id } : {}) };
  const [completedToday, history] = await Promise.all([
    Token.countDocuments(completedFilter),
    isBarber ? Token.find(completedFilter).sort({ completedAt: -1 }).limit(20).lean<TokenLean[]>() : Promise.resolve([] as TokenLean[]),
  ]);

  // Reception/owner also need today's skipped tokens (to re-queue) and completed ones (today's history).
  const [skipped, completed] = isBarber
    ? [[] as TokenLean[], [] as TokenLean[]]
    : await Promise.all([
        Token.find({ businessDate: snap.businessDate, status: 'skipped' }).sort({ skippedAt: -1 }).lean<TokenLean[]>(),
        Token.find({ businessDate: snap.businessDate, status: 'completed' }).sort({ completedAt: -1 }).limit(50).lean<TokenLean[]>(),
      ]);

  const [waitingView, inServiceView, historyView, skippedView, completedView] = await Promise.all([
    decorate(waiting, snap),
    decorate(isBarber ? mine : snap.inService, snap),
    decorate(history, snap),
    decorate(skipped, snap),
    decorate(completed, snap),
  ]);

  res.json({
    businessDate: snap.businessDate,
    me: { id: String(user._id), name: user.name, role: user.role, availability: user.barber?.availability ?? 'offline' },
    waiting: waitingView,
    inService: inServiceView,
    current: isBarber ? inServiceView[0] ?? null : null,
    next: waitingView[0] ?? null,
    completedToday,
    history: historyView,
    skipped: skippedView,
    completed: completedView,
    barbers: snap.barbers.map((b) => ({
      id: String(b._id),
      name: b.name,
      availability: b.barber?.availability ?? 'offline',
      busy: snap.inService.some((t) => String(t.barberId) === String(b._id)),
    })),
    estimatedWaitForNewTokenMinutes: snap.estimates.forNewToken,
  });
});

export const createWalkIn = asyncHandler(async (req, res) => {
  const body = createTokenSchema.parse({ ...req.body, idempotencyKey: req.header('idempotency-key') ?? req.body?.idempotencyKey });
  const { token, replayed } = await createToken({ source: 'walk-in', ...body, createdBy: String(req.user!._id) });
  if (!replayed) emitQueueEvent('token:created', token);
  const snap = await getQueueSnapshot();
  const [view] = await decorate([token], snap);
  res.status(replayed ? 200 : 201).json({ replayed, token: view });
});

export const callNext = asyncHandler(async (req, res) => {
  const token = await actions.callNext(req.user!);
  if (token) emitQueueEvent('token:called', token);
  const snap = await getQueueSnapshot();
  res.json({ token: token ? (await decorate([token], snap))[0] : null, message: token ? undefined : 'No customers are waiting right now.' });
});

export const startToken = asyncHandler(async (req, res) => {
  const { id } = idParam.parse(req.params);
  const user = req.user!;
  // Barbers start tokens for themselves; the owner starts one on behalf of the assigned / first free barber.
  const token = user.role === 'barber' ? await actions.startToken(id, user) : await actions.startTokenAsAdmin(id);
  emitQueueEvent('token:called', token);
  if (user.role !== 'barber') await audit(user, 'token.start', 'Token', id, { tokenNumber: token.tokenNumber, barberId: String(token.barberId) });
  const snap = await getQueueSnapshot();
  res.json({ token: (await decorate([token], snap))[0] });
});

export const completeToken = asyncHandler(async (req, res) => {
  const { id } = idParam.parse(req.params);
  const user = req.user!;
  const token = await actions.completeToken(id, user);
  emitQueueEvent('token:completed', token);
  if (user.role !== 'barber') await audit(user, 'token.complete', 'Token', id, { tokenNumber: token.tokenNumber, barberId: String(token.barberId) });
  const snap = await getQueueSnapshot();
  res.json({ token: (await decorate([token], snap))[0] });
});

export const skipToken = asyncHandler(async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { reason } = skipSchema.parse(req.body ?? {});
  const token = await actions.skipToken(id, req.user!, reason);
  emitQueueEvent('token:skipped', token);
  const snap = await getQueueSnapshot();
  res.json({ token: (await decorate([token], snap))[0] });
});

export const cancelToken = asyncHandler(async (req, res) => {
  const { id } = idParam.parse(req.params);
  const token = await actions.cancelTokenByStaff(id);
  emitQueueEvent('token:cancelled', token);
  await audit(req.user!, 'token.cancel', 'Token', id, { tokenNumber: token.tokenNumber });
  const snap = await getQueueSnapshot();
  res.json({ token: (await decorate([token], snap))[0] });
});

export const requeueToken = asyncHandler(async (req, res) => {
  const { id } = idParam.parse(req.params);
  const token = await actions.requeueToken(id, req.user!.role);
  emitQueueEvent('token:requeued', token);
  await audit(req.user!, 'token.requeue', 'Token', id, { tokenNumber: token.tokenNumber });
  const snap = await getQueueSnapshot();
  res.json({ token: (await decorate([token], snap))[0] });
});

export const setAvailability = asyncHandler(async (req, res) => {
  const { availability } = availabilitySchema.parse(req.body);
  await actions.setAvailability(req.user!, availability);
  emitQueueUpdated();
  res.json({ availability });
});
