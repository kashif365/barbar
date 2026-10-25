import { z } from 'zod';

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
export const idParam = z.object({ id: objectId });

const name = z.string().trim().min(1, 'Name is required').max(80, 'Name is too long');
const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9 \-]{6,18}$/, 'Enter a valid phone number');
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm');

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

export const createTokenSchema = z.object({
  serviceId: objectId,
  barberId: objectId.nullish(),
  customerName: name,
  customerPhone: phone.optional().or(z.literal('').transform(() => undefined)),
  idempotencyKey: z.string().trim().min(8).max(100).optional(),
});

export const skipSchema = z.object({ reason: z.enum(['skipped', 'no_show']).default('skipped') });
export const availabilitySchema = z.object({ availability: z.enum(['available', 'on_break', 'offline']) });
export const reassignSchema = z.object({ barberId: objectId.nullable() });

export const serviceCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).default(''),
  price: z.number().min(0).max(1_000_000),
  durationMinutes: z.number().int().min(1).max(480),
  isActive: z.boolean().default(true),
  isDemoPrice: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(1000).default(0),
});
export const serviceUpdateSchema = serviceCreateSchema.partial();

/** Only the site's own team portraits; never an arbitrary URL. */
const photoUrl = z
  .string()
  .regex(/^\/media\/team\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/, 'Choose one of the team photos')
  .nullable();

export const barberCreateSchema = z.object({
  name,
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(10, 'Use at least 10 characters').max(100),
  role: z.enum(['barber', 'staff']).default('barber'),
  serviceIds: z.array(objectId).max(50).default([]),
  photoUrl: photoUrl.default(null),
});
export const barberUpdateSchema = z.object({
  name: name.optional(),
  isActive: z.boolean().optional(),
  availability: z.enum(['available', 'on_break', 'offline']).optional(),
  serviceIds: z.array(objectId).max(50).optional(),
  password: z.string().min(10).max(100).optional(),
  photoUrl: photoUrl.optional(),
});

export const ownerTokensQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(['waiting', 'in_service', 'completed', 'skipped', 'cancelled']).optional(),
  source: z.enum(['online', 'walk-in']).optional(),
  q: z.string().trim().max(20).optional(),
  date: dateStr.optional(),
  barberId: objectId.optional(),
});

const realDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
export const rangeReportQuery = z
  .object({
    from: z.string().refine(realDate, 'Use a real date as YYYY-MM-DD'),
    to: z.string().refine(realDate, 'Use a real date as YYYY-MM-DD'),
  })
  .refine((r) => r.from <= r.to, { message: 'The start date must be on or before the end date.', path: ['from'] })
  .refine((r) => (Date.parse(`${r.to}T00:00:00Z`) - Date.parse(`${r.from}T00:00:00Z`)) / 86_400_000 <= 365, {
    message: 'Choose a range of at most 366 days.',
    path: ['to'],
  });

export const dailyReportQuery = z.object({ date: dateStr.optional() });
export const monthlyReportQuery = z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM').optional() });

export const settingsUpdateSchema = z.object({
  salonName: z.string().trim().min(1).max(80).optional(),
  address: z.string().trim().max(200).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  // http(s) only: this value is rendered as a public link, so schemes like javascript: must be rejected.
  instagramUrl: z.string().trim().url().max(200).refine((u) => /^https?:\/\//i.test(u), 'Enter a full URL starting with https://').nullable().optional(),
  openTime: hhmm.nullable().optional(),
  closeTime: hhmm.nullable().optional(),
  enforceHours: z.boolean().optional(),
  phoneRequired: z.boolean().optional(),
  allowBarberChoice: z.boolean().optional(),
  onlineBookingEnabled: z.boolean().optional(),
});
