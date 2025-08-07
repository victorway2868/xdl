import { defineConfig } from 'vite';
import path from 'path';

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@main': path.resolve(__dirname, 'src/main'),
      '@plugins': path.resolve(__dirname, 'src/plugins'),
    },
  },
  build: {
    rollupOptions: {
      external: ['electron'],
    },
  },
});