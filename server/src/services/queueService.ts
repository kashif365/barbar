import { Token, User } from '../models';
import type { TokenLean } from '../models/Token';
import type { UserLean } from '../models/User';
import { businessDateOf } from '../utils/time';
import { computeEstimates, type Estimates } from './estimate';

export interface QueueSnapshot {
  businessDate: string;
  waiting: TokenLean[]; // FIFO by queuedAt, then _id
  inService: TokenLean[];
  barbers: UserLean[];
  estimates: Estimates;
  /** 1-based position among ALL waiting tokens today. Same definition everywhere. */
  positionOf: (id: unknown) => number | null;
}

/**
 * Queue position is never stored; it is derived from the current waiting list so it stays correct
 * as tokens are completed, skipped or cancelled.
 * "In service" is intentionally NOT filtered by date: a service that crosses midnight must stay
 * visible so it can still be completed. Waiting tokens from earlier business dates are stale and hidden.
 */
export async function getQueueSnapshot(now: Date = new Date()): Promise<QueueSnapshot> {
  const businessDate = businessDateOf(now);
  const [waiting, inService, barbers] = await Promise.all([
    Token.find({ businessDate, status: 'waiting' }).sort({ queuedAt: 1, _id: 1 }).lean<TokenLean[]>(),
    Token.find({ status: 'in_service' }).sort({ startedAt: 1 }).lean<TokenLean[]>(),
    User.find({ role: 'barber', isActive: true }).lean<UserLean[]>(),
  ]);
  const estimates = computeEstimates(waiting, inService, barbers, now);
  const index = new Map(waiting.map((t, i) => [String(t._id), i + 1]));
  return { businessDate, waiting, inService, barbers, estimates, positionOf: (id) => index.get(String(id)) ?? null };
}
