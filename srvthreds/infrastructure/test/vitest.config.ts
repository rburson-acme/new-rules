import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.test.ts',
        '**/*.config.ts',
        '**/types/**',
        'cloud/terraform/**/*.tf',
      ],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 75,
        functions: 75,
        branches: 70,
        statements: 75,
      },
    },
    include: ['**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
