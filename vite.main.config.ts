import { defineConfig } from 'vite';
import path from 'path';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    lib: {
      entry: 'src/main/index-minimal.ts', // 保持入口文件不变
      fileName: 'main', // 指定输出文件名为 'main'
      formats: ['cjs'] // 主进程通常需要 CommonJS 格式
    },
    outDir: '.vite/build', // 确保输出目录正确
  },
  resolve: {
    // Some libs that can run in both Web and Node.js, such as `axios`, we need to tell Vite to build them in Node.js.
    browserField: false,
    mainFields: ['module', 'jsnext:main', 'jsnext'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@main': path.resolve(__dirname, 'src/main'),
      '@plugins': path.resolve(__dirname, 'src/plugins'),
    },
  },
});