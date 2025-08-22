// React 应用根组件
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { store } from './store/store';
import { ThemeProvider } from './contexts/ThemeContext';
import MainLayout from './components/layout/MainLayout';
import HomePage from './pages/HomePage';
import DanmuPage from './pages/DanmuPage';
import './styles/App.css';

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <ThemeProvider defaultTheme="dark">
        <ConfigProvider locale={zhCN}>
          <Router>
            <Routes>
              {/* 重定向根路径到 /app */}
              <Route path="/" element={<Navigate to="/app" replace />} />

              {/* 主应用路由 */}
              <Route path="/app" element={<MainLayout />}>
                <Route index element={<HomePage />} />
              </Route>

              {/* 弹幕功能路由 */}
              <Route path="/danmu" element={<DanmuPage />} />
            </Routes>
          </Router>
        </ConfigProvider>
      </ThemeProvider>
    </Provider>
  );
};

export default App;