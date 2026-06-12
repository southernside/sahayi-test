import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**', 'src/index.ts'],
    },
  },
  resolve: {
    alias: {
      '@sahayi/schemas': path.resolve(__dirname, '../../packages/schemas/src'),
      '@sahayi/types': path.resolve(__dirname, '../../packages/types/src'),
    },
  },
});
