import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config
export default defineConfig({
  root: __dirname,
  base: './',
  publicDir: 'public',
  server: {
    port: 5174,
    strictPort: true,
    host: '127.0.0.1',
    open: false,
    proxy: {
      '/dylive': {
        target: 'https://live.douyin.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/dylive/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36');
            proxyReq.setHeader('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8');
            proxyReq.setHeader('Accept-Language', 'zh-CN,zh;q=0.9,en;q=0.8');
            proxyReq.setHeader('Accept-Encoding', 'gzip, deflate, br');
            proxyReq.setHeader('Connection', 'keep-alive');
            proxyReq.setHeader('Upgrade-Insecure-Requests', '1');
            proxyReq.setHeader('Referer', 'https://live.douyin.com/');
          });
        },
        cookieDomainRewrite: {
          '*': ''
        }
      },
      '/socket': {
        target: 'wss://webcast5-ws-web-lf.douyin.com',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/socket/, ''),
      },
    },
  },
  build: {
    outDir: path.resolve(__dirname, '.vite/renderer/main_window'),
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html')
    }
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@renderer': path.resolve(__dirname, './src/renderer'),
      '@plugins': path.resolve(__dirname, './src/plugins'),
    },
  },
});

