// React 应用入口
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// import 'antd/dist/reset.css'; // 暂时注释掉，可能导致 404

// 全局错误捕获
window.addEventListener('error', (event) => {
  window.electronAPI.log({
    level: 'error',
    message: `Uncaught Exception: ${event.message}`,
    metadata: { filename: event.filename, lineno: event.lineno, colno: event.colno }
  });
});

window.addEventListener('unhandledrejection', (event) => {
  window.electronAPI.log({
    level: 'error',
    message: `Unhandled Rejection: ${event.reason?.message || event.reason}`,
    metadata: { stack: event.reason?.stack }
  });
});


const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(<App />);