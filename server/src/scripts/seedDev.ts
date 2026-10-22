import mongoose from 'mongoose';
import { env } from '../config/env';
import { ensureIndexes, User } from '../models';
import { hashPassword } from '../utils/password';
import { createToken } from '../services/tokenService';
import { Service } from '../models';
import { seedServices, seedSettings } from './seedData';

/** DEVELOPMENT ONLY. Creates clearly labelled demo barbers and a few demo tokens. */
async function run() {
  if (env.isProd) throw new Error('seed:dev is disabled in production.');
  const pw = env.DEV_SEED_PASSWORD;
  if (!pw || pw.length < 10) throw new Error('Set DEV_SEED_PASSWORD (10+ chars) to run seed:dev.');

  await mongoose.connect(env.MONGODB_URI);
  await ensureIndexes();
  await seedServices();
  await seedSettings();

  for (const [i, name] of ['[DEMO] Barber One', '[DEMO] Barber Two'].entries()) {
    const email = `demo.barber${i + 1}@demo.invalid`;
    await User.updateOne(
      { email },
      { $setOnInsert: { name, email, passwordHash: await hashPassword(pw), role: 'barber', isActive: true, barber: { availability: 'available', serviceIds: [] } } },
      { upsert: true },
    );
  }
  await User.updateOne(
    { email: 'demo.reception@demo.invalid' },
    { $setOnInsert: { name: '[DEMO] Reception', email: 'demo.reception@demo.invalid', passwordHash: await hashPassword(pw), role: 'staff', isActive: true } },
    { upsert: true },
  );

  const haircut = await Service.findOne({ name: 'Haircut' }).lean();
  if (haircut) {
    for (const [name, source] of [['[DEMO] Customer A', 'online'], ['[DEMO] Customer B', 'walk-in'], ['[DEMO] Customer C', 'online']] as const) {
      await createToken({ source, serviceId: String(haircut._id), customerName: name });
    }
  }
  console.log(`Dev data ready. Demo accounts: demo.barber1@demo.invalid, demo.barber2@demo.invalid, demo.reception@demo.invalid (password = DEV_SEED_PASSWORD).`);
  await mongoose.disconnect();
}

run().catch(async (e) => {
  console.error('seed:dev failed:', e instanceof Error ? e.message : e);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
