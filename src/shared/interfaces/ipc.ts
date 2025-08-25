// IPC 接口定义
import { AppSettings, LogEntry, PluginInfo } from '../types';

export interface UpdateCheckResult {
  success: boolean;
  message: string;
}

export interface AppVersionInfo {
  version: string;
  name: string;
}

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

  // Software Version API
  getSoftwareVersion: (softwareName: string) => Promise<string | null>;

  // Auth APIs
  loginDouyinWeb: () => Promise<any>;
  loginDouyinCompanion: () => Promise<any>;
  getDouyinUserStats: (options?: any) => Promise<any>;
  getDouyinUserInfo: () => Promise<any>;

  // Streaming (Companion route first)
  getDouyinCompanionInfo: () => Promise<{ streamUrl?: string; streamKey?: string; error?: string; status?: number }>;
  setOBSStreamSettings: (streamUrl: string, streamKey: string) => Promise<{ success: boolean; message: string }>;
  startOBSStreaming: () => Promise<{ success: boolean; message: string }>;
  stopOBSStreaming: () => Promise<{ success: boolean; message: string }>;
  killMediaSDKServer: () => Promise<{ success: boolean; message: string }>;

  endLiveHotkey: () => Promise<{ success: boolean; message?: string }>;


  // Auto Update APIs
  checkForUpdates: () => Promise<UpdateCheckResult>;
  getAppVersion: () => Promise<AppVersionInfo>;
}

// 扩展 Window 接口
declare global {
  interface Window {
    electronAPI: IpcApi;
  }
}