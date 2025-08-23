import { defineConfig } from 'vite';
import { builtinModules } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config
export default defineConfig({
  // Required to work with Electron
  root: __dirname,
  publicDir: false,
  build: {
    // The output directory for the build
    outDir: '.vite/build',
    // Build for a CJS target, suitable for the Electron main process
    ssr: true,
    rollupOptions: {
      // The entry point for the main process
      input: 'src/main/index.ts',
      output: {
        format: 'cjs',
        entryFileNames: 'main.js',
      },
      // Do not bundle Electron or Node.js built-in modules
      external: [
        'electron',
        'electron-log',
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
      ],
    },
    minify: false,
  },
});

