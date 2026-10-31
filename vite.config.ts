/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Cabeceras de aislamiento entre orígenes: permiten SharedArrayBuffer y, por tanto,
// la variante multihilo de Stockfish. Si no están disponibles, la app usa
// automáticamente la variante de un solo hilo.
const isolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    headers: isolationHeaders,
    proxy: {
      // Servidor opcional de explicaciones con LLM (ver server/index.mjs).
      '/api': { target: 'http://localhost:8787', changeOrigin: true },
    },
  },
  preview: {
    host: true,
    headers: isolationHeaders,
    proxy: {
      '/api': { target: 'http://localhost:8787', changeOrigin: true },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
    testTimeout: 60000,
  },
});

