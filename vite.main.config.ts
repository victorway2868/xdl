import { defineConfig } from 'vite';
import path from 'path';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    lib: {
      entry: 'src/main/index.ts', // 保持入口文件不变
      fileName: 'main', // 指定输出文件名为 'main'
      formats: ['cjs'] // 主进程通常需要 CommonJS 格式
    },
    outDir: '.vite/build', // 确保输出目录正确
  },
  
});