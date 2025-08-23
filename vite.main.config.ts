import { defineConfig } from 'vite';
import path from 'path';

// https://vitejs.dev/config
export default defineConfig({
  publicDir: false, // 不要复制 public 到主进程输出目录
  build: {
    lib: {
      entry: 'src/main/index.ts', // 主进程入口
      fileName: 'main', // 输出文件名
      formats: ['cjs'] // 主进程需要 CommonJS
    },
    outDir: '.vite/build',
    rollupOptions: {
      // Prevent bundling of certain imported packages and instead retrieve them from node_modules.
      // This is particularly important for keeping the 'electron' module external.
      external: ['electron', ...Object.keys(require('./package.json').dependencies || {})].filter(
        // We want to bundle 'electron-squirrel-startup' so it's available at runtime.
        (dep) => dep !== 'electron-squirrel-startup'
      ),
    },
  },
});