import { Schema, model, Types, HydratedDocument } from 'mongoose';

export type Role = 'owner' | 'barber' | 'staff';
export type Availability = 'available' | 'on_break' | 'offline';
export const AVAILABILITIES: Availability[] = ['available', 'on_break', 'offline'];

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  isActive: boolean;
  /** Portrait shown to customers (team section, booking, their token). A path under /media/team/. */
  photoUrl: string | null;
  barber: {
    availability: Availability;
    /** Empty = can serve every service. Otherwise only these. */
    serviceIds: Types.ObjectId[];
  };
  createdAt: Date;
  updatedAt: Date;
}
export type UserDoc = HydratedDocument<IUser>;
export type UserLean = IUser & { _id: Types.ObjectId };

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['owner', 'barber', 'staff'], required: true },
    isActive: { type: Boolean, default: true },
    photoUrl: { type: String, default: null, maxlength: 200 },
    barber: {
      type: new Schema(
        {
          availability: { type: String, enum: AVAILABILITIES, default: 'offline' },
          serviceIds: { type: [Schema.Types.ObjectId], default: [] },
        },
        { _id: false },
      ),
      default: () => ({ availability: 'offline', serviceIds: [] }),
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1, isActive: 1 });

export const User = model<IUser>('User', userSchema);
