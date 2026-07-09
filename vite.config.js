import { defineConfig } from 'vite';

export default defineConfig({
  root: './src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  optimizeDeps: {
    exclude: ['@capacitor-community/sqlite', 'jeep-sqlite', 'sql.js']
  }
});
