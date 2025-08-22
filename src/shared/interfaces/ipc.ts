// IPC 接口定义
import { AppSettings, LogEntry, PluginInfo } from '../types';

export interface IpcApi {
  // Logger APIs
  log: (entry: Omit<LogEntry, 'source' | 'timestamp'>) => void;
  getLogs: () => Promise<LogEntry[]>;
  
  // Settings APIs
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
  
  // Plugin APIs
  getPlugins: () => Promise<PluginInfo[]>;
  enablePlugin: (pluginId: string) => Promise<void>;
  disablePlugin: (pluginId: string) => Promise<void>;
  reloadPlugin: (pluginId: string) => Promise<void>;
  
  // Window APIs
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
}

// 扩展 Window 接口
declare global {
  interface Window {
    electronAPI: IpcApi;
  }
}