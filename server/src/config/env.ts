import 'dotenv/config';
import { z } from 'zod';

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== '' ? v : undefined));

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  CLIENT_ORIGIN: z.string().min(1, 'CLIENT_ORIGIN is required'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  TRACKING_SECRET: z.string().min(32, 'TRACKING_SECRET must be at least 32 characters'),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  SALON_TIMEZONE: z.string().default('Asia/Karachi'),
  RATE_LIMIT_DISABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  OWNER_NAME: optionalString,
  OWNER_EMAIL: optionalString,
  OWNER_PASSWORD: optionalString,
  DEV_SEED_PASSWORD: optionalString,
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // Field names only — never print values, they may be secrets.
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === 'production',
  isTest: parsed.data.NODE_ENV === 'test',
  allowedOrigins: parsed.data.CLIENT_ORIGIN.split(',').map((s) => s.trim().replace(/\/$/, '')),
};
