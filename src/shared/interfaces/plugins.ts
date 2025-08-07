// 插件接口定义

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

export abstract class BasePlugin implements IPlugin {
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly description: string;
  
  protected context?: PluginContext;
  
  async activate(context: PluginContext): Promise<void> {
    this.context = context;
    await this.onActivate();
  }
  
  async deactivate(): Promise<void> {
    await this.onDeactivate();
    this.context = undefined;
  }
  
  protected abstract onActivate(): Promise<void> | void;
  protected abstract onDeactivate(): Promise<void> | void;
  
  protected log(level: string, message: string, metadata?: Record<string, any>): void {
    this.context?.log(level, `[${this.name}] ${message}`, metadata);
  }
}