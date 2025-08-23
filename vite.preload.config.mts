import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    lib: {
      entry: path.resolve(__dirname, 'src/main/preload.ts'),
      formats: ['cjs'],
      fileName: () => 'preload.js',
    },
    outDir: path.resolve(__dirname, '.vite/preload'),
    emptyOutDir: true,
    rollupOptions: {
      external: ['electron'],
    },
  },
  publicDir: false,
});

