import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: [
      'test/**/*.test.ts',
      'test/**/*.test.tsx',
      'test/**/*.property.test.ts',
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'src/**/*.property.test.ts',
    ],
  },
});
