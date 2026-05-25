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
    rollupOptions: {
      output: {
        // Content-hash filenames for immutable caching (cache busting on content change)
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        manualChunks(id) {
          // React runtime — needed on initial load, split for long-term caching
          if (
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-router')
          ) {
            return 'vendor-react';
          }
          // State management — needed on initial load
          if (id.includes('node_modules/zustand') || id.includes('node_modules/immer')) {
            return 'vendor-state';
          }
          // JSZip — only needed by specific tools
          if (id.includes('node_modules/jszip')) {
            return 'vendor-jszip';
          }
          // docx — only needed by canvas editor export
          if (id.includes('node_modules/docx')) {
            return 'vendor-docx';
          }
        },
      },
    },
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
