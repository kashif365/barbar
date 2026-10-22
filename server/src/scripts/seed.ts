import mongoose from 'mongoose';
import { env } from '../config/env';
import { ensureIndexes } from '../models';
import { seedOwner, seedServices, seedSettings } from './seedData';

/**
 * Usage: set OWNER_NAME, OWNER_EMAIL, OWNER_PASSWORD (12+ chars) in the environment, then `npm run seed`.
 * Safe to re-run. No default/predictable credentials exist anywhere in the code.
 */
async function run() {
  await mongoose.connect(env.MONGODB_URI);
  await ensureIndexes();

  const created = await seedServices();
  await seedSettings();
  console.log(`Services: ${created} created (existing ones left untouched).`);

  const { OWNER_NAME, OWNER_EMAIL, OWNER_PASSWORD } = env;
  if (OWNER_EMAIL && OWNER_PASSWORD) {
    if (OWNER_PASSWORD.length < 12) throw new Error('OWNER_PASSWORD must be at least 12 characters.');
    const r = await seedOwner({ name: OWNER_NAME ?? 'Owner', email: OWNER_EMAIL, password: OWNER_PASSWORD });
    console.log(r === 'created' ? `Owner account created for ${OWNER_EMAIL}. Remove OWNER_PASSWORD from your environment now.` : 'Owner already exists; nothing changed.');
  } else {
    console.log('OWNER_EMAIL / OWNER_PASSWORD not set: owner account not created.');
  }
  await mongoose.disconnect();
}

run().catch(async (e) => {
  console.error('Seed failed:', e instanceof Error ? e.message : e);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
