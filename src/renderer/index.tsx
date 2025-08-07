// React 应用入口
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// import 'antd/dist/reset.css'; // 暂时注释掉，可能导致 404

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(<App />);