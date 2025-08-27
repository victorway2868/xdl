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

  // Douyin API route (手机开播/自动开播)
  getDouyinApiInfo: (method: 'get' | 'create' | 'stop') => Promise<any>;
  maintainDouyinStream: (room_id: string, stream_id: string, mode?: 'phone' | 'auto') => Promise<{ success: boolean; message: string }>;
  openAuthUrl: ({ url }: { url: string }) => Promise<{ success: boolean; alreadyInProgress?: boolean; message?: string }>;
  onAuthNotification: (cb: (payload: any) => void) => () => void;
  onStatusNotification: (cb: (payload: any) => void) => () => void;

  // OBS 控制
  setOBSStreamSettings: (streamUrl: string, streamKey: string) => Promise<{ success: boolean; message: string }>;
  startOBSStreaming: () => Promise<{ success: boolean; message: string }>;
  stopOBSStreaming: () => Promise<{ success: boolean; message: string }>;
  killMediaSDKServer: () => Promise<{ success: boolean; message: string }>;

  endLiveHotkey: () => Promise<{ success: boolean; message?: string }>;

  // OBS Configuration
  installFonts: () => Promise<{ success: boolean; message?: string; error?: string }>;
  oneClickConfigureObs: (options: { deviceName: string; resolution: string }) => Promise<{ success: boolean; message: string; steps: any[] }>;

  // OBS Backup & Restore
  backupObsConfig: () => Promise<{ success: boolean; message: string; backupPath?: string }>;
  restoreObsConfig: (backupFilePath?: string) => Promise<{ success: boolean; message: string; profileName?: string; sceneCollectionName?: string; steps?: Array<{ name: string; success: boolean; message?: string }> }>;
  getAvailableBackups: () => Promise<{ success: boolean; backups: Array<{ path: string; name: string; size: number; createdAt: Date }> }>;

  // System Info
  getSystemInfo: () => Promise<any>;

  // Audio APIs
  getAudioFiles: () => Promise<string[]>;
  getLocalSoundPacks: () => Promise<string[]>;
  downloadSoundPack: (packName: string, packUrl: string) => Promise<boolean>;
  playAudioFile: (filePath: string) => Promise<boolean>; // 备用方案
  getAudioFileUrl: (filePath: string) => Promise<string | null>;
  checkSoundPackUpdates: () => Promise<{ files: Array<{ name: string; url: string }> } | null>;

  // Global Hotkey APIs
  registerGlobalHotkey: (hotkey: string, filePath: string) => Promise<boolean>;
  unregisterGlobalHotkey: (hotkey: string) => Promise<boolean>;
  updateGlobalHotkeys: (soundEffects: Array<{id: string, hotkey: string, filePath?: string}>) => Promise<boolean>;
  clearAllGlobalHotkeys: () => Promise<boolean>;
  onHotkeyTriggered: (cb: (payload: { hotkey: string }) => void) => () => void;

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