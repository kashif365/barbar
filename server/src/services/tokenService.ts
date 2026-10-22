import type { Types } from 'mongoose';
import { Customer, DailyCounter, Service, Token, User } from '../models';
import type { TokenLean, TokenSource } from '../models/Token';
import { AppError, conflict, isDuplicateKeyError } from '../utils/errors';
import { businessDateOf, formatTokenNumber } from '../utils/time';
import { getSettings, isSalonOpen } from './settingsService';

export interface CreateTokenInput {
  source: TokenSource;
  serviceId: string;
  customerName: string;
  customerPhone?: string;
  barberId?: string | null;
  idempotencyKey?: string;
  createdBy?: string | null;
  /** Injectable clock (tests, and a single consistent timestamp for the whole operation). */
  now?: Date;
}

/**
 * Atomic, concurrency-safe sequence generator. `$inc` with upsert is a single atomic server-side
 * operation, so simultaneous requests always receive distinct numbers. The only race is two
 * simultaneous FIRST requests of the day both trying to insert the counter: one gets a duplicate-key
 * error, which we simply retry (the retry then increments the existing document).
 * A number can be skipped if a later step fails; numbers are never reused.
 */
export async function nextSequence(businessDate: string): Promise<number> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const c = await DailyCounter.findOneAndUpdate(
        { businessDate },
        { $inc: { lastNumber: 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      return c.lastNumber;
    } catch (e) {
      if (isDuplicateKeyError(e)) continue;
      throw e;
    }
  }
  throw new AppError(503, 'COUNTER_BUSY', 'Could not allocate a token number. Please try again.');
}

/**
 * The ONE place tokens are created. Online and walk-in tokens both go through here, so they share
 * the same counter, the same validation and the same FIFO queue. Price, name and duration are read
 * from the database here — the client never supplies them.
 */
export async function createToken(input: CreateTokenInput): Promise<{ token: TokenLean; replayed: boolean }> {
  const now = input.now ?? new Date();
  const settings = await getSettings();

  if (input.source === 'online') {
    if (!settings.onlineBookingEnabled) {
      throw new AppError(403, 'ONLINE_DISABLED', 'Online tokens are currently turned off. Please visit the salon.');
    }
    if (!isSalonOpen(settings, now)) {
      throw new AppError(403, 'SALON_CLOSED', 'The salon is currently closed. Please try again during operating hours.');
    }
    if (settings.phoneRequired && !input.customerPhone) {
      throw new AppError(400, 'VALIDATION_ERROR', 'A phone number is required.', { fields: { customerPhone: 'Phone number is required' } });
    }
  }

  // Idempotent replay: same key => same token, no new number consumed.
  if (input.idempotencyKey) {
    const existing = await Token.findOne({ idempotencyKey: input.idempotencyKey }).lean<TokenLean>();
    if (existing) return { token: existing, replayed: true };
  }

  const service = await Service.findById(input.serviceId).lean();
  if (!service || !service.isActive) {
    throw conflict('SERVICE_UNAVAILABLE', 'That service is no longer available. Please choose another service.');
  }

  let barberId: string | null = null;
  if (input.barberId) {
    if (!settings.allowBarberChoice && input.source === 'online') {
      throw new AppError(400, 'BARBER_CHOICE_DISABLED', 'Choosing a barber is not available.');
    }
    const barber = await User.findOne({ _id: input.barberId, role: 'barber', isActive: true }).lean();
    if (!barber) throw conflict('BARBER_UNAVAILABLE', 'That barber is not available. Please choose another or select First Available.');
    const caps = (barber.barber?.serviceIds ?? []).map(String);
    if (caps.length > 0 && !caps.includes(String(service._id))) {
      throw conflict('BARBER_CANNOT_SERVE', 'That barber does not offer this service.');
    }
    barberId = String(barber._id);
  }

  let customerId: Types.ObjectId | null = null;
  if (input.customerPhone) {
    const c = await Customer.findOneAndUpdate(
      { phone: input.customerPhone },
      { $set: { name: input.customerName } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
    customerId = c?._id ?? null;
  }

  const businessDate = businessDateOf(now);

  for (let attempt = 0; attempt < 3; attempt++) {
    const n = await nextSequence(businessDate);
    try {
      const doc = await Token.create({
        tokenNumber: formatTokenNumber(n),
        businessDate,
        customerId,
        customerName: input.customerName,
        serviceId: service._id,
        serviceName: service.name,
        priceAtBooking: service.price,
        currency: service.currency,
        durationMinutesAtBooking: service.durationMinutes,
        source: input.source,
        status: 'waiting',
        barberId,
        queuedAt: now,
        idempotencyKey: input.idempotencyKey,
        createdBy: input.createdBy ?? null,
      });
      return { token: doc.toObject() as TokenLean, replayed: false };
    } catch (e) {
      if (isDuplicateKeyError(e)) {
        // Two identical submissions raced past the replay check above: return the winner.
        if (input.idempotencyKey) {
          const winner = await Token.findOne({ idempotencyKey: input.idempotencyKey }).lean<TokenLean>();
          if (winner) return { token: winner, replayed: true };
        }
        continue; // token-number collision (should not happen): take the next number
      }
      throw e;
    }
  }
  throw new AppError(503, 'TOKEN_CREATE_FAILED', "We couldn't create your token. Please try again.");
}
