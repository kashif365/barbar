import { Schema, model } from 'mongoose';

export interface ICustomer {
  name: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, trim: true, maxlength: 20 },
  },
  { timestamps: true },
);

customerSchema.index({ phone: 1 }, { unique: true, partialFilterExpression: { phone: { $type: 'string' } } });

export const Customer = model<ICustomer>('Customer', customerSchema);
