import { Service, Setting, User } from '../models';
import { hashPassword } from '../utils/password';

/**
 * Prices marked isDemoPrice:false are CONFIRMED by the project owner.
 * Prices marked isDemoPrice:true are illustrative only and must be confirmed with the salon.
 * Durations are initial estimates, not confirmed operating facts — editable in the owner dashboard.
 */
export const SERVICE_SEED = [
  { name: 'Haircut', price: 500, durationMinutes: 30, isDemoPrice: false, sortOrder: 1, description: 'Classic men’s haircut, tailored to you.' },
  { name: 'Haircut + Beard', price: 750, durationMinutes: 45, isDemoPrice: false, sortOrder: 2, description: 'Haircut with beard shaping and trim.' },
  { name: 'Facial', price: 500, durationMinutes: 30, isDemoPrice: false, sortOrder: 3, description: 'Refreshing facial treatment.' },
  { name: 'Beard Trim', price: 250, durationMinutes: 15, isDemoPrice: true, sortOrder: 4, description: 'Precise beard trim and edge-up.' },
  { name: 'Hair Wash', price: 200, durationMinutes: 15, isDemoPrice: true, sortOrder: 5, description: 'Shampoo wash and rinse.' },
  { name: 'Hair Styling', price: 300, durationMinutes: 20, isDemoPrice: true, sortOrder: 6, description: 'Finish and styling for any occasion.' },
  { name: 'Face Cleanup', price: 400, durationMinutes: 20, isDemoPrice: true, sortOrder: 7, description: 'Deep-cleansing face cleanup.' },
] as const;

/** Insert-only: re-running never overwrites prices the owner has since edited. */
export async function seedServices(): Promise<number> {
  let created = 0;
  for (const s of SERVICE_SEED) {
    const res = await Service.updateOne({ name: s.name }, { $setOnInsert: { ...s, currency: 'PKR', isActive: true } }, { upsert: true, collation: { locale: 'en', strength: 2 } });
    if (res.upsertedCount) created++;
  }
  return created;
}

export async function seedSettings(): Promise<void> {
  await Setting.updateOne({ key: 'main' }, { $setOnInsert: { key: 'main' } }, { upsert: true });
}

export async function seedOwner(opts: { name: string; email: string; password: string }): Promise<'created' | 'exists'> {
  const email = opts.email.trim().toLowerCase();
  if (await User.exists({ email })) return 'exists';
  await User.create({ name: opts.name, email, passwordHash: await hashPassword(opts.password), role: 'owner', isActive: true });
  return 'created';
}
