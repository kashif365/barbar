import { Schema, model, Types } from 'mongoose';

export const TOKEN_STATUSES = ['waiting', 'in_service', 'completed', 'skipped', 'cancelled'] as const;
export type TokenStatus = (typeof TOKEN_STATUSES)[number];
export type TokenSource = 'online' | 'walk-in';

export interface IToken {
  tokenNumber: string;
  businessDate: string;
  customerId: Types.ObjectId | null;
  customerName: string;
  serviceId: Types.ObjectId;
  // Snapshots taken at booking time; never updated when the service changes.
  serviceName: string;
  priceAtBooking: number;
  currency: string;
  durationMinutesAtBooking: number;
  source: TokenSource;
  status: TokenStatus;
  /** Preferred barber while waiting; the serving barber once in service. null = first available. */
  barberId: Types.ObjectId | null;
  /** Queue ordering key. Equals createdAt, except after an authorized requeue (reset to "now"). */
  queuedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  skippedAt: Date | null;
  skipReason: 'skipped' | 'no_show' | null;
  cancelledBy: 'customer' | 'staff' | null;
  idempotencyKey?: string;
  createdBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}
export type TokenLean = IToken & { _id: Types.ObjectId };

const tokenSchema = new Schema<IToken>(
  {
    tokenNumber: { type: String, required: true },
    businessDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
    customerName: { type: String, required: true, trim: true, maxlength: 80 },
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
    serviceName: { type: String, required: true },
    priceAtBooking: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'PKR' },
    durationMinutesAtBooking: { type: Number, required: true, min: 1 },
    source: { type: String, enum: ['online', 'walk-in'], required: true },
    status: { type: String, enum: TOKEN_STATUSES, default: 'waiting', required: true },
    barberId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    queuedAt: { type: Date, default: () => new Date(), required: true },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    skippedAt: { type: Date, default: null },
    skipReason: { type: String, enum: ['skipped', 'no_show', null], default: null },
    cancelledBy: { type: String, enum: ['customer', 'staff', null], default: null },
    idempotencyKey: { type: String, maxlength: 100 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

// Unique daily token numbers (also the last line of defence against duplicate numbering).
tokenSchema.index({ businessDate: 1, tokenNumber: 1 }, { unique: true });
// Daily queue queries: waiting tokens in FIFO order with deterministic _id tie-breaker.
tokenSchema.index({ businessDate: 1, status: 1, queuedAt: 1, _id: 1 });
tokenSchema.index({ status: 1 });
// Idempotent creation: one token per client-supplied key.
tokenSchema.index({ idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } });
// A barber can have at most ONE active service. Enforced by the database, so concurrent
// "call next" requests from the same barber cannot create two active tokens.
tokenSchema.index({ barberId: 1 }, { unique: true, partialFilterExpression: { status: 'in_service' } });

export const Token = model<IToken>('Token', tokenSchema);
