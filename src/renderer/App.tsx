// React 应用根组件
import React from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { store } from './store/store';
import { ThemeProvider } from './contexts/ThemeContext';
import MainLayout from './components/layout/MainLayout';
import HomePage from './pages/HomePage';
import DanmuPage from './pages/DanmuPage';
import ObsConfigPage from './pages/ObsConfigPage';
import AudioSettingsPage from './pages/AudioSettingsPage';
import TutorialsPage from './pages/TutorialsPage';
import PluginsPage from './pages/PluginsPage';
import DevicesPage from './pages/DevicesPage';
import './styles/App.css';

// 在生产环境(file://)下使用 HashRouter，避免 BrowserRouter 在 file 协议下跳转到 /app 导致空白页
const RouterComponent = window.location.protocol === 'file:' ? HashRouter : BrowserRouter;

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <ThemeProvider defaultTheme="dark">
        <ConfigProvider locale={zhCN}>
          <RouterComponent>
            <Routes>
              {/* 重定向根路径到 /app */}
              <Route path="/" element={<Navigate to="/app" replace />} />

              {/* 主应用路由 */}
              <Route path="/app" element={<MainLayout />}>
                <Route index element={<HomePage />} />
                <Route path="obs-config" element={<ObsConfigPage />} />
                <Route path="audio-settings" element={<AudioSettingsPage />} />
                <Route path="tutorials" element={<TutorialsPage />} />
                <Route path="plugins" element={<PluginsPage />} />
                <Route path="devices" element={<DevicesPage />} />
              </Route>

              {/* 弹幕功能路由 */}
              <Route path="/danmu" element={<DanmuPage />} />
            </Routes>
          </RouterComponent>
        </ConfigProvider>
      </ThemeProvider>
    </Provider>
  );
};

export default App;