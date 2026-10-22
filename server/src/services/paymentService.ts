import type { Types } from 'mongoose';
import { Payment, Token } from '../models';
import type { TokenLean } from '../models/Token';
import type { UserDoc } from '../models/User';
import { PAYMENT_METHODS, type PaymentLean } from '../models/Payment';
import { conflict, isDuplicateKeyError, notFound } from '../utils/errors';
import { businessDateOf } from '../utils/time';

export type PaymentInfo = { paidAt: Date; amount: number; method: string };

/**
 * Records a (full) payment for a COMPLETED token. Completing a service does not imply payment.
 * The unique index on tokenId makes repeated/duplicate requests safe: the second one gets 409.
 * `paidAt` and the revenue date always come from the SERVER clock, so a service booked yesterday
 * and paid today counts as today's revenue.
 * A payment the owner previously voided is re-activated in place (the unique index allows one record per token).
 */
export async function recordPayment(
  tokenId: string,
  actor: UserDoc,
  input: { amount?: number; method: (typeof PAYMENT_METHODS)[number] },
  now = new Date(),
): Promise<PaymentLean> {
  const token = await Token.findById(tokenId).lean<TokenLean>();
  if (!token) throw notFound('Token');
  if (token.status !== 'completed') {
    throw conflict('NOT_COMPLETED', 'Payment can only be recorded for a completed service.', { status: token.status });
  }
  const fields = {
    businessDate: businessDateOf(now),
    amount: input.amount ?? token.priceAtBooking,
    currency: token.currency,
    method: input.method,
    status: 'paid' as const,
    recordedBy: actor._id,
    paidAt: now,
  };
  const reopened = await Payment.findOneAndUpdate(
    { tokenId: token._id, status: 'void' },
    { $set: fields, $unset: { voidedAt: '', voidedBy: '', voidReason: '' } },
    { new: true },
  ).lean<PaymentLean>();
  if (reopened) return reopened;
  try {
    const p = await Payment.create({ tokenId: token._id, ...fields });
    return p.toObject() as PaymentLean;
  } catch (e) {
    if (isDuplicateKeyError(e)) {
      throw conflict('ALREADY_PAID', 'A payment has already been recorded for this token.');
    }
    throw e;
  }
}

/**
 * Marks a paid token as unpaid again (owner correction). Non-destructive: the payment is flagged "void"
 * with who/when/why, it stops counting as revenue immediately, and the audit log keeps the original details.
 */
export async function voidPayment(tokenId: string, actor: UserDoc, reason: string | null, now = new Date()) {
  const token = await Token.findById(tokenId).select('tokenNumber').lean<{ tokenNumber: string }>();
  if (!token) throw notFound('Token');
  const before = await Payment.findOneAndUpdate(
    { tokenId, status: 'paid' },
    { $set: { status: 'void', voidedAt: now, voidedBy: actor._id, voidReason: reason } },
    { new: false },
  ).lean<PaymentLean>();
  if (!before) throw conflict('NOT_PAID', 'There is no recorded payment to mark as unpaid for this token.');
  return { before, tokenNumber: token.tokenNumber };
}

/** Active (not voided) payments for the given tokens, keyed by token id. */
export async function paidPaymentsFor(tokenIds: Types.ObjectId[]): Promise<Map<string, PaymentInfo>> {
  if (!tokenIds.length) return new Map();
  const rows = await Payment.find({ tokenId: { $in: tokenIds }, status: 'paid' }).select('tokenId paidAt amount method').lean();
  return new Map(rows.map((p) => [String(p.tokenId), { paidAt: p.paidAt, amount: p.amount, method: p.method }]));
}
