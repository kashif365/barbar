// Runs before every test file. Environment MUST be set before any app module is imported.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/unused-in-tests';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
process.env.SESSION_SECRET = 'test-session-secret-test-session-secret-123456';
process.env.TRACKING_SECRET = 'test-tracking-secret-test-tracking-secret-1234';
process.env.RATE_LIMIT_DISABLED = 'true';
process.env.SALON_TIMEZONE = 'Asia/Karachi';

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, beforeEach } from 'vitest';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  const { ensureIndexes } = await import('../src/models');
  await ensureIndexes(); // unique indexes are part of what we are testing
});

beforeEach(async () => {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});
