// vite.preload.config.ts
import { defineConfig } from 'vite'
import path from 'path'

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
      entry: path.resolve(__dirname, 'src/main/preload.ts'), // preload入口
      formats: ['cjs'], // preload必须CJS
      fileName: () => 'preload.js',
    },
    outDir: path.resolve(__dirname, '.vite/preload'), // 输出目录
    emptyOutDir: true,
    rollupOptions: {
      external: ['electron'], // Electron内置模块不要打包
    },
  },
  publicDir: false, // 不要复制 publicDir 的内容
})
