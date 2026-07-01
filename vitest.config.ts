import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Resolve the `@/*` path alias from tsconfig.json natively (no plugin).
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
