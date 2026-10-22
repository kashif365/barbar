import { Schema, model } from 'mongoose';

export interface ISetting {
  key: 'main';
  salonName: string;
  /** Contact details are intentionally empty until the owner supplies real ones. */
  address: string | null;
  phone: string | null;
  instagramUrl: string | null;
  /** "HH:mm" in the salon timezone. null = not configured. */
  openTime: string | null;
  closeTime: string | null;
  /** When false (default) online tokens are accepted at any time. Hours are not yet confirmed. */
  enforceHours: boolean;
  phoneRequired: boolean;
  allowBarberChoice: boolean;
  onlineBookingEnabled: boolean;
}

const hhmm = { type: String, default: null, match: /^([01]\d|2[0-3]):[0-5]\d$/ };

const settingSchema = new Schema<ISetting>(
  {
    key: { type: String, enum: ['main'], default: 'main', required: true },
    salonName: { type: String, default: 'The Shehraz Barber', maxlength: 80 },
    address: { type: String, default: null, maxlength: 200 },
    phone: { type: String, default: null, maxlength: 30 },
    instagramUrl: { type: String, default: 'https://www.instagram.com/the_shehraz_barber/' },
    openTime: hhmm,
    closeTime: hhmm,
    enforceHours: { type: Boolean, default: false },
    phoneRequired: { type: Boolean, default: false },
    allowBarberChoice: { type: Boolean, default: true },
    onlineBookingEnabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

settingSchema.index({ key: 1 }, { unique: true });

export const Setting = model<ISetting>('Setting', settingSchema);
