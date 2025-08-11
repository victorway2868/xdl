// 预加载脚本 - 安全的 IPC 通信桥梁
import { contextBridge, ipcRenderer } from 'electron';
import { IpcApi } from '../shared/interfaces/ipc';
import { LiveDataIPC } from '../shared/interfaces/liveData';
import { IPC_CHANNELS } from '../shared/constants';

// 创建直播数据 API
const liveDataAPI: LiveDataIPC = {
  connectToRoom: (roomId: string) =>
    ipcRenderer.invoke('liveData:connect', roomId),
  
  disconnect: () =>
    ipcRenderer.invoke('liveData:disconnect'),
  
  getCurrentState: () =>
    ipcRenderer.invoke('liveData:getCurrentState'),
  
  onDataUpdate: (callback) => {
    ipcRenderer.on('liveData:update', (event, data) => callback(data));
  },
  
  removeDataUpdateListener: (callback) => {
    ipcRenderer.removeListener('liveData:update', callback);
  }
};

// 创建安全的 API 对象
const electronAPI: IpcApi & { liveData: LiveDataIPC } = {
  // Logger APIs
  log: (level: string, message: string, metadata?: Record<string, any>) =>
    ipcRenderer.invoke(IPC_CHANNELS.LOG, level, message, metadata),
  
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
  
  // Live Data APIs
  liveData: liveDataAPI
};

// 通过 contextBridge 安全地暴露 API
contextBridge.exposeInMainWorld('electronAPI', electronAPI);