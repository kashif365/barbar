import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User, type UserDoc } from '../models/User';
import type { Role } from '../models/User';
import { AppError } from '../utils/errors';
import { asyncHandler } from '../utils/asyncHandler';

export const SESSION_COOKIE = 'sb_session';
const SESSION_HOURS = 12;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserDoc;
    }
  }
}

export function signSession(userId: string): string {
  return jwt.sign({ sub: userId }, env.SESSION_SECRET, { expiresIn: `${SESSION_HOURS}h` });
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: env.isProd || env.COOKIE_SAMESITE === 'none',
  sameSite: env.COOKIE_SAMESITE,
  maxAge: SESSION_HOURS * 60 * 60 * 1000,
  path: '/',
} as const;

/**
 * Cookie session: a signed, HttpOnly, short-lived JWT. The user is re-loaded from the database
 * on EVERY request, so deactivating an account takes effect immediately, even for logged-in users.
 */
export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const raw = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (!raw) throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
  let sub: string;
  try {
    sub = (jwt.verify(raw, env.SESSION_SECRET) as { sub: string }).sub;
  } catch {
    throw new AppError(401, 'SESSION_EXPIRED', 'Your session has expired. Please sign in again.');
  }
  const user = await User.findById(sub);
  if (!user || !user.isActive) throw new AppError(401, 'UNAUTHENTICATED', 'Your account is not active.');
  req.user = user;
  next();
});

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue.'));
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'FORBIDDEN', 'You do not have permission to do that.'));
    }
    next();
  };
