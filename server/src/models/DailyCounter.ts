import { Schema, model } from 'mongoose';

export interface IDailyCounter {
  businessDate: string;
  lastNumber: number;
  createdAt: Date;
  updatedAt: Date;
}

const dailyCounterSchema = new Schema<IDailyCounter>(
  {
    businessDate: { type: String, required: true },
    lastNumber: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

// Single-salon version: one counter per business date.
// Multi-salon: add salonId to this index, to Token's unique index, and to every counter query.
dailyCounterSchema.index({ businessDate: 1 }, { unique: true });

export const DailyCounter = model<IDailyCounter>('DailyCounter', dailyCounterSchema);
