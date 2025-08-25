// 预加载脚本 - 安全的 IPC 通信桥梁
import { contextBridge, ipcRenderer } from 'electron';
import { IpcApi } from '../shared/interfaces/ipc';
import { IPC_CHANNELS } from '../shared/constants';
import type { LogEntry } from '../shared/types';

// 创建安全的 API 对象
const electronAPI: IpcApi = {
  // Software Version API
  getSoftwareVersion: (softwareName: string) => ipcRenderer.invoke('get-software-version', softwareName),
  // Logger APIs
  log: (entry: Omit<LogEntry, 'source' | 'timestamp'>) =>
    ipcRenderer.send('log', { ...entry, source: 'renderer' }),

  getLogs: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_LOGS),


  // Settings APIs
  getSettings: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS),

  saveSettings: (settings) =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_SETTINGS, settings),

  resetSettings: () =>
    ipcRenderer.invoke(IPC_CHANNELS.RESET_SETTINGS),

  // Plugin APIs
  getPlugins: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_PLUGINS),

  enablePlugin: (pluginId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.ENABLE_PLUGIN, pluginId),

  disablePlugin: (pluginId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.DISABLE_PLUGIN, pluginId),

  reloadPlugin: (pluginId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.RELOAD_PLUGIN, pluginId),

  // Window APIs
  minimizeWindow: () =>
    ipcRenderer.invoke(IPC_CHANNELS.MINIMIZE_WINDOW),

  maximizeWindow: () =>
    ipcRenderer.invoke(IPC_CHANNELS.MAXIMIZE_WINDOW),

  closeWindow: () =>
    ipcRenderer.invoke(IPC_CHANNELS.CLOSE_WINDOW),

  // Auth APIs
  loginDouyinWeb: () => ipcRenderer.invoke('login-douyin-web'),
  loginDouyinCompanion: () => ipcRenderer.invoke('login-douyin-companion'),
  getDouyinUserStats: (options?: any) => ipcRenderer.invoke('get-douyin-user-stats', options),
  getDouyinUserInfo: () => ipcRenderer.invoke('get-douyin-user-info'),


  // Streaming APIs (Companion route first, then API route)
  getDouyinCompanionInfo: () => ipcRenderer.invoke('get-douyin-companion-info'),
  // Douyin API route
  getDouyinApiInfo: (method: 'get' | 'create' | 'stop') => ipcRenderer.invoke('get-douyin-api-info', { method }),
  maintainDouyinStream: (room_id: string, stream_id: string, mode: 'phone' | 'auto' = 'phone') =>
    ipcRenderer.invoke('maintain-douyin-stream', { room_id, stream_id, mode }),
  openAuthUrl: ({ url }: { url: string }) => ipcRenderer.invoke('open-auth-url', { url }),
  onAuthNotification: (cb: (payload: any) => void) => {
    const listener = (_event: any, payload: any) => cb(payload);
    ipcRenderer.on('auth-notification', listener);
    return () => ipcRenderer.removeListener('auth-notification', listener);
  },
  onStatusNotification: (cb: (payload: any) => void) => {
    const listener = (_event: any, payload: any) => cb(payload);
    ipcRenderer.on('status-notification', listener);
    return () => ipcRenderer.removeListener('status-notification', listener);
  },
  // OBS
  setOBSStreamSettings: (streamUrl: string, streamKey: string) => ipcRenderer.invoke('set-obs-stream-settings', { streamUrl, streamKey }),
  startOBSStreaming: () => ipcRenderer.invoke('start-obs-streaming'),
  stopOBSStreaming: () => ipcRenderer.invoke('stop-obs-streaming'),
  killMediaSDKServer: () => ipcRenderer.invoke('kill-mediasdk-server'),


  // Hotkey APIs
  endLiveHotkey: () => ipcRenderer.invoke('end-live-hotkey'),



  // Auto Update APIs
  checkForUpdates: () =>
    ipcRenderer.invoke('check-for-updates'),

  getAppVersion: () =>
    ipcRenderer.invoke('get-app-version'),
};

// 通过 contextBridge 安全地暴露 API
contextBridge.exposeInMainWorld('electronAPI', electronAPI);