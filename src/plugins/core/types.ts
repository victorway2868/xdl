// 插件类型定义
export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  main: string;
  dependencies?: string[];
  permissions?: string[];
}

export interface PluginInfo extends PluginManifest {
  id: string;
  enabled: boolean;
  loaded: boolean;
  error?: string;
}

export interface PluginContext {
  // 插件可以使用的 API
  log: (level: string, message: string, metadata?: Record<string, any>) => void;
  getSettings: () => Promise<any>;
  saveSettings: (settings: any) => Promise<void>;
  
  // 插件间通信
  emit: (event: string, data?: any) => void;
  on: (event: string, handler: (data?: any) => void) => void;
  off: (event: string, handler: (data?: any) => void) => void;
  
  // UI 扩展点
  registerComponent: (slot: string, component: any) => void;
  registerMenuItem: (menu: string, item: any) => void;
}

export interface IPlugin {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  
  activate(context: PluginContext): Promise<void> | void;
  deactivate(): Promise<void> | void;
}