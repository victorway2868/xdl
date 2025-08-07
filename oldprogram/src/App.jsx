import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import PluginsPage from './pages/PluginsPage';
import DevicesPage from './pages/DevicesPage';
import TutorialsPage from './pages/TutorialsPage';
import MorePage from './pages/MorePage';
import ObsConfigPage from './pages/ObsConfigPage';
import AudioSettingsPage from './pages/AudioSettingsPage';
import MembershipPage from './pages/MembershipPage';
import DanmuPage from './pages/DanmuPage';
import MainLayout from './layouts/MainLayout';

export default function App() {
  return (
    <Routes>
      {/* 重定向根路径到 /app */}
      <Route path="/" element={<Navigate to="/app" replace />} />

      {/* 主应用路由 */}
      <Route path="/app" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="plugins" element={<PluginsPage />} />
        <Route path="devices" element={<DevicesPage />} />
        <Route path="tutorials" element={<TutorialsPage />} />
        <Route path="more" element={<MorePage />} />
        <Route path="obs-config" element={<ObsConfigPage />} />
        <Route path="audio-settings" element={<AudioSettingsPage />} />
        <Route path="membership" element={<MembershipPage />} />
        <Route path="danmu" element={<DanmuPage />} />
      </Route>
    </Routes>
  );
}