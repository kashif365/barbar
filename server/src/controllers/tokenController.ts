import { Token } from '../models';
import type { TokenLean } from '../models/Token';
import { asyncHandler } from '../utils/asyncHandler';
import { notFound } from '../utils/errors';
import { verifyTrackingToken } from '../utils/tracking';
import { createTokenSchema } from '../validators';
import { createToken } from '../services/tokenService';
import { getQueueSnapshot } from '../services/queueService';
import { toCustomerToken } from '../services/serializers';
import { cancelTokenByCustomer } from '../services/queueActions';
import { emitQueueEvent } from '../sockets';

export const createOnlineToken = asyncHandler(async (req, res) => {
  const body = createTokenSchema.parse({
    ...req.body,
    idempotencyKey: req.header('idempotency-key') ?? req.body?.idempotencyKey,
  });
  const { token, replayed } = await createToken({ source: 'online', ...body });
  if (!replayed) emitQueueEvent('token:created', token);
  const snap = await getQueueSnapshot();
  res.status(replayed ? 200 : 201).json({ replayed, token: toCustomerToken(token, snap) });
});

async function loadByTracking(credential: string): Promise<TokenLean> {
  const id = verifyTrackingToken(credential);
  // Invalid credential and unknown token look identical, so nothing can be probed.
  if (!id) throw notFound('Token');
  const t = await Token.findById(id).lean<TokenLean>();
  if (!t) throw notFound('Token');
  return t;
}

export const getTokenByTracking = asyncHandler(async (req, res) => {
  const t = await loadByTracking(String(req.params.trackingToken));
  const snap = await getQueueSnapshot();
  res.json({ token: toCustomerToken(t, snap) });
});

export const cancelOwnToken = asyncHandler(async (req, res) => {
  const t = await loadByTracking(String(req.params.trackingToken));
  const cancelled = await cancelTokenByCustomer(String(t._id));
  emitQueueEvent('token:cancelled', cancelled);
  const snap = await getQueueSnapshot();
  res.json({ token: toCustomerToken(cancelled, snap) });
});
