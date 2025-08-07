// 插件基类
import { IPlugin, PluginContext } from './types';

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
  
  protected async getSettings(): Promise<any> {
    return this.context?.getSettings();
  }
  
  protected async saveSettings(settings: any): Promise<void> {
    return this.context?.saveSettings(settings);
  }
  
  protected emit(event: string, data?: any): void {
    this.context?.emit(event, data);
  }
  
  protected on(event: string, handler: (data?: any) => void): void {
    this.context?.on(event, handler);
  }
  
  protected off(event: string, handler: (data?: any) => void): void {
    this.context?.off(event, handler);
  }
}