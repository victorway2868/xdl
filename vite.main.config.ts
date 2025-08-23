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
      external: ['electron'], // 不要打包 electron 内置模块
    },
  },
});