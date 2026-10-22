import http from 'node:http';
import mongoose from 'mongoose';
import { env } from './config/env';
import { createApp } from './app';
import { ensureIndexes } from './models';
import { closeSocket, initSocket } from './sockets';

async function main() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
  await ensureIndexes();

  const app = createApp();
  const server = http.createServer(app);
  initSocket(server);
  server.listen(env.PORT, () => console.log(`API listening on :${env.PORT} (${env.NODE_ENV})`));

  const shutdown = async (signal: string) => {
    console.log(`${signal} received, shutting down`);
    await closeSocket();
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((e) => {
  // Print the message only: connection errors can echo the URI (with credentials).
  console.error('Fatal startup error:', e instanceof Error ? e.name : 'unknown');
  process.exit(1);
});
