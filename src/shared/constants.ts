// 共享的常量定义

export const APP_NAME = 'Electron Framework App';
export const APP_VERSION = '1.0.0';

export const DEFAULT_SETTINGS: import('./types').AppSettings = {
  theme: 'light',
  language: 'zh-CN',
  autoStart: false,
  windowBounds: {
    width: 1200,
    height: 800,
  },
};

export const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
} as const;

export const IPC_CHANNELS = {
  // Logger
  LOG: 'logger:log',
  GET_LOGS: 'logger:getLogs',
  
  // Settings
  GET_SETTINGS: 'settings:get',
  SAVE_SETTINGS: 'settings:save',
  RESET_SETTINGS: 'settings:reset',
  
  // Plugins
  GET_PLUGINS: 'plugins:getAll',
  ENABLE_PLUGIN: 'plugins:enable',
  DISABLE_PLUGIN: 'plugins:disable',
  RELOAD_PLUGIN: 'plugins:reload',
  
  // Window
  MINIMIZE_WINDOW: 'window:minimize',
  MAXIMIZE_WINDOW: 'window:maximize',
  CLOSE_WINDOW: 'window:close',
} as const;