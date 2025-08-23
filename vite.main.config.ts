import { defineConfig } from 'vite';
import { builtinModules } from 'module';

// https://vitejs.dev/config
export default defineConfig({
  publicDir: false, // Do not copy the public directory to the main process output
  build: {
    outDir: '.vite/build',
    // Configure Rollup to build the main process entry file
    rollupOptions: {
      // The entry point for the main process
      input: 'src/main/index.ts',
      output: {
        // Output format should be CommonJS
        format: 'cjs',
        // The name of the output file
        entryFileNames: 'main.js',
      },
      // Do not bundle Electron or Node.js built-in modules
      external: [
        'electron',
        // List all Node.js built-in modules
        ...builtinModules,
        // Also include modules with the 'node:' prefix
        ...builtinModules.map((m) => `node:${m}`),
      ],
    },
    // Disable minification for better debugging
    minify: false,
  },
});