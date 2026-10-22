import { Schema, model, Types } from 'mongoose';

export const PAYMENT_METHODS = ['cash', 'card', 'mobile_wallet'] as const;

/**
 * MVP: one full payment per token, recorded manually. No gateway, no partial payments, no refunds.
 */
export interface IPayment {
  tokenId: Types.ObjectId;
  /** Business date (salon timezone) of paidAt — the date revenue is attributed to. */
  businessDate: string;
  amount: number;
  currency: string;
  method: (typeof PAYMENT_METHODS)[number];
  /** "void" = marked unpaid again by the owner. The record is kept (never deleted) and never counts as revenue. */
  status: 'paid' | 'void';
  recordedBy: Types.ObjectId;
  /** Server clock at the moment the payment was recorded; never taken from the client. */
  paidAt: Date;
  voidedAt?: Date | null;
  voidedBy?: Types.ObjectId | null;
  voidReason?: string | null;
  createdAt: Date;
}
export type PaymentLean = IPayment & { _id: Types.ObjectId };

const paymentSchema = new Schema<IPayment>(
  {
    tokenId: { type: Schema.Types.ObjectId, ref: 'Token', required: true },
    businessDate: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'PKR' },
    method: { type: String, enum: PAYMENT_METHODS, required: true },
    status: { type: String, enum: ['paid', 'void'], default: 'paid' },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    paidAt: { type: Date, required: true },
    voidedAt: { type: Date, default: null },
    voidedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    voidReason: { type: String, default: null, maxlength: 200 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Duplicate (repeated) payment requests for the same token collide here.
paymentSchema.index({ tokenId: 1 }, { unique: true });
paymentSchema.index({ businessDate: 1, status: 1 });

export const Payment = model<IPayment>('Payment', paymentSchema);
