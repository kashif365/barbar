import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    testTimeout: 30_000,
    // The first run downloads a MongoDB binary for mongodb-memory-server.
    hookTimeout: 180_000,
    include: ['tests/**/*.test.ts'],
  },
});
