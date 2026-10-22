import crypto from 'node:crypto';
import { Types } from 'mongoose';
import { env } from '../config/env';

/**
 * Public tracking credential = `<tokenObjectId>.<HMAC-SHA256 signature>`.
 * The ObjectId alone is useless: without the secret-keyed signature a tracking URL cannot be
 * guessed or enumerated. Because it is derived, an idempotent replay can return the same URL
 * without storing the credential. Rotating TRACKING_SECRET invalidates all existing links.
 */
function sign(id: string): string {
  return crypto.createHmac('sha256', env.TRACKING_SECRET).update(id).digest('base64url');
}

export function makeTrackingToken(id: Types.ObjectId | string): string {
  const s = String(id);
  return `${s}.${sign(s)}`;
}

/** Returns the token id if the credential is authentic, otherwise null. */
export function verifyTrackingToken(credential: string): string | null {
  if (typeof credential !== 'string' || credential.length > 200) return null;
  const [id, sig, ...rest] = credential.split('.');
  if (!id || !sig || rest.length > 0 || !Types.ObjectId.isValid(id) || id.length !== 24) return null;
  const expected = Buffer.from(sign(id));
  const given = Buffer.from(sig);
  if (expected.length !== given.length) return null;
  return crypto.timingSafeEqual(expected, given) ? id : null;
}
