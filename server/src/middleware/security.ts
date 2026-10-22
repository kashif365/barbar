import type { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { AppError } from '../utils/errors';

export const CSRF_HEADER = 'x-requested-with';
export const CSRF_VALUE = 'shehraz-web';

/**
 * CSRF defence for cookie auth. Every state-changing request must carry a custom header
 * (browsers cannot add it cross-site without a CORS preflight, which our allowlist rejects),
 * and if an Origin header is present it must be an allowed frontend origin.
 */
export function csrfGuard(req: Request, _res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (origin && !env.allowedOrigins.includes(origin.replace(/\/$/, ''))) {
    return next(new AppError(403, 'FORBIDDEN_ORIGIN', 'Request origin is not allowed.'));
  }
  if (req.headers[CSRF_HEADER] !== CSRF_VALUE) {
    return next(new AppError(403, 'CSRF_REJECTED', 'Missing required request header.'));
  }
  next();
}

/** Strip Mongo operator keys ($...) and dotted keys from user input to block NoSQL injection. */
function clean(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k.startsWith('$') || k.includes('.')) continue;
      out[k] = clean(v);
    }
    return out;
  }
  return value;
}

export function sanitizeInput(req: Request, _res: Response, next: NextFunction) {
  if (req.body) req.body = clean(req.body);
  if (req.query) req.query = clean(req.query) as typeof req.query;
  if (req.params) req.params = clean(req.params) as typeof req.params;
  next();
}

const limiter = (windowMs: number, max: number, message: string) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => env.RATE_LIMIT_DISABLED,
    handler: (_req, res) => {
      res.status(429).json({ error: { code: 'RATE_LIMITED', message } });
    },
  });

export const apiLimiter = limiter(60_000, 300, 'Too many requests. Please slow down.');
export const loginLimiter = limiter(15 * 60_000, 10, 'Too many sign-in attempts. Please try again later.');
export const tokenCreateLimiter = limiter(10 * 60_000, 10, 'Too many token requests. Please try again in a few minutes.');
