import { defineConfig } from 'vite';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600,
    rollupOptions: { output: { manualChunks: { phaser: ['phaser'] } } },
  },
  server: { port: 5180 },
});
