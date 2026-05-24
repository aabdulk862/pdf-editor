import { webcrypto } from 'crypto';

if (!globalThis.crypto) {
  // @ts-expect-error webcrypto is compatible with globalThis.crypto for our usage
  globalThis.crypto = webcrypto;
}

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  worker: {
    format: 'es',
  },
});
