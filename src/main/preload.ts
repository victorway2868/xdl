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

  // Authing APIs
  getAuthingStatus: () => ipcRenderer.invoke('authing:get-status'),
  startAuthingLogin: () => ipcRenderer.invoke('authing:start-login'),
  logoutAuthing: () => ipcRenderer.invoke('authing:logout'),
  onAuthingUpdated: (cb: (payload: any) => void) => {
    const listener = (_event: any, payload: any) => cb(payload);
    ipcRenderer.on('authing-updated', listener);
    return () => ipcRenderer.removeListener('authing-updated', listener);
  },


  // Streaming APIs (Companion route first, then API route)
  getDouyinCompanionInfo: () => ipcRenderer.invoke('get-douyin-companion-info'),
  // Douyin API route
  getDouyinApiInfo: (method: 'get' | 'create' | 'stop') => ipcRenderer.invoke('get-douyin-api-info', { method }),
  maintainDouyinStream: (room_id: string, stream_id: string, mode: 'phone' | 'auto' = 'phone') =>
    ipcRenderer.invoke('maintain-douyin-stream', { room_id, stream_id, mode }),
  openAuthUrl: ({ url }: { url: string }) => ipcRenderer.invoke('open-auth-url', { url }),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
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

  // OBS Configuration APIs
  installFonts: () => ipcRenderer.invoke('install-fonts'),
  oneClickConfigureObs: (options: { deviceName: string; resolution: string }) =>
    ipcRenderer.invoke('one-click-configure-obs', options),

  // OBS Backup & Restore APIs
  backupObsConfig: () => ipcRenderer.invoke('backup-obs-config'),
  restoreObsConfig: (backupFilePath?: string) => ipcRenderer.invoke('restore-obs-config', backupFilePath),
  getAvailableBackups: () => ipcRenderer.invoke('get-available-backups'),

  // System Info
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

  // Audio APIs
  getAudioFiles: () => ipcRenderer.invoke('get-audio-files'),
  getLocalSoundPacks: () => ipcRenderer.invoke('get-local-sound-packs'),
  downloadSoundPack: (packName: string, packUrl: string) => ipcRenderer.invoke('download-sound-pack', packName, packUrl),
  playAudioFile: (filePath: string) => ipcRenderer.invoke('play-audio-file', filePath), // 备用方案
  getAudioFileUrl: (filePath: string) => ipcRenderer.invoke('get-audio-file-url', filePath),
  checkSoundPackUpdates: () => ipcRenderer.invoke('check-sound-pack-updates'),
  copyAudioToCustomSounds: (sourcePath: string) => ipcRenderer.invoke('copy-audio-to-custom-sounds', sourcePath),

  // Global Hotkey APIs
  registerGlobalHotkey: (hotkey: string, filePath: string) => ipcRenderer.invoke('register-global-hotkey', hotkey, filePath),
  unregisterGlobalHotkey: (hotkey: string) => ipcRenderer.invoke('unregister-global-hotkey', hotkey),
  updateGlobalHotkeys: (soundEffects: Array<{id: string, hotkey: string, filePath?: string}>) => ipcRenderer.invoke('update-global-hotkeys', soundEffects),
  clearAllGlobalHotkeys: () => ipcRenderer.invoke('clear-all-global-hotkeys'),
  executeCustomHotkey: (keys: string[]) => ipcRenderer.invoke('execute-custom-hotkey', keys),
  onHotkeyTriggered: (cb: (payload: { hotkey: string }) => void) => {
    const unsubscribe = () => ipcRenderer.removeAllListeners('hotkey-triggered');
    ipcRenderer.on('hotkey-triggered', (_, payload) => cb(payload));
    return unsubscribe;
  },

  // Auto Update APIs
  checkForUpdates: () =>
    ipcRenderer.invoke('check-for-updates'),

  getAppVersion: () =>
    ipcRenderer.invoke('get-app-version'),
};

// 通过 contextBridge 安全地暴露 API
contextBridge.exposeInMainWorld('electronAPI', electronAPI);