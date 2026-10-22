import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { AppError, isDuplicateKeyError } from '../utils/errors';
import { env } from '../config/env';

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, 'NOT_FOUND', 'Route not found.'));
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
  }
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) fields[issue.path.join('.') || '_'] = issue.message;
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Please check the highlighted fields.', details: { fields } } });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid identifier.' } });
  }
  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid data.' } });
  }
  if (isDuplicateKeyError(err)) {
    return res.status(409).json({ error: { code: 'DUPLICATE', message: 'That record already exists.' } });
  }
  if (typeof err === 'object' && err !== null && (err as { type?: string }).type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'BAD_JSON', message: 'Malformed request body.' } });
  }
  // Log server-side (message + stack only; request bodies may contain personal data or passwords).
  if (!env.isTest) console.error(`[${req.method} ${req.path}]`, err instanceof Error ? err.stack : err);
  const dbDown =
    err instanceof mongoose.Error.MongooseServerSelectionError || (err as { name?: string })?.name === 'MongoNetworkError';
  if (dbDown) {
    return res.status(503).json({ error: { code: 'DB_UNAVAILABLE', message: 'The service is temporarily unavailable. Please try again shortly.' } });
  }
  return res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong on our side. Please try again.' } });
}
