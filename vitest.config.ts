import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'src/**/*.test.ts',
      'packages/server/test/**/*.test.ts',
      'packages/api-contract/test/**/*.test.ts',
    ],
    env: { VITEST: 'true' },
  },
});
