import { Schema, model, Types } from 'mongoose';

export interface IService {
  name: string;
  description: string;
  price: number;
  currency: string;
  durationMinutes: number;
  isActive: boolean;
  isDemoPrice: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
export type ServiceLean = IService & { _id: Types.ObjectId };

const serviceSchema = new Schema<IService>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: '', trim: true, maxlength: 500 },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'PKR' },
    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
      validate: { validator: Number.isInteger, message: 'durationMinutes must be an integer' },
    },
    isActive: { type: Boolean, default: true },
    isDemoPrice: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

serviceSchema.index({ isActive: 1, sortOrder: 1 });
serviceSchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

export const Service = model<IService>('Service', serviceSchema);
