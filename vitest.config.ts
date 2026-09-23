import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // All tests live in packages (domain/contracts/testing) and apps/api;
    // the domain package is pure TS with no framework deps, so a single Node
    // pool resolves the workspace directly.
    include: ['packages/*/tests/**/*.test.ts', 'apps/*/tests/**/*.test.ts'],
    environment: 'node',
  },
});
