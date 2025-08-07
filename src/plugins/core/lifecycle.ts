// 插件生命周期管理
import { EventEmitter } from 'events';
import { IPlugin, PluginContext, PluginInfo } from './types';

export class PluginLifecycleManager extends EventEmitter {
  private plugins: Map<string, IPlugin> = new Map();
  private pluginInfos: Map<string, PluginInfo> = new Map();
  private contexts: Map<string, PluginContext> = new Map();
  
  async loadPlugin(pluginId: string, plugin: IPlugin, manifest: any): Promise<void> {
    try {
      // 创建插件上下文
      const context = this.createPluginContext(pluginId);
      this.contexts.set(pluginId, context);
      
      // 存储插件信息
      const pluginInfo: PluginInfo = {
        id: pluginId,
        name: plugin.name,
        version: plugin.version,
        description: plugin.description,
        author: manifest.author || 'Unknown',
        main: manifest.main || 'index.js',
        dependencies: manifest.dependencies || [],
        permissions: manifest.permissions || [],
        enabled: false,
        loaded: true,
      };
      
      this.plugins.set(pluginId, plugin);
      this.pluginInfos.set(pluginId, pluginInfo);
      
      this.emit('plugin-loaded', pluginId, pluginInfo);
    } catch (error) {
      const pluginInfo: PluginInfo = {
        id: pluginId,
        name: 'Unknown',
        version: '0.0.0',
        description: 'Failed to load',
        author: 'Unknown',
        main: 'index.js',
        enabled: false,
        loaded: false,
        error: String(error),
      };
      
      this.pluginInfos.set(pluginId, pluginInfo);
      this.emit('plugin-error', pluginId, error);
      throw error;
    }
  }
  
  async activatePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    const context = this.contexts.get(pluginId);
    const info = this.pluginInfos.get(pluginId);
    
    if (!plugin || !context || !info) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    
    if (info.enabled) {
      return; // 已经激活
    }
    
    try {
      await plugin.activate(context);
      info.enabled = true;
      info.error = undefined;
      
      this.emit('plugin-activated', pluginId, info);
    } catch (error) {
      info.error = String(error);
      this.emit('plugin-error', pluginId, error);
      throw error;
    }
  }
  
  async deactivatePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    const info = this.pluginInfos.get(pluginId);
    
    if (!plugin || !info) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    
    if (!info.enabled) {
      return; // 已经停用
    }
    
    try {
      await plugin.deactivate();
      info.enabled = false;
      info.error = undefined;
      
      this.emit('plugin-deactivated', pluginId, info);
    } catch (error) {
      info.error = String(error);
      this.emit('plugin-error', pluginId, error);
      throw error;
    }
  }
  
  async unloadPlugin(pluginId: string): Promise<void> {
    const info = this.pluginInfos.get(pluginId);
    
    if (info?.enabled) {
      await this.deactivatePlugin(pluginId);
    }
    
    this.plugins.delete(pluginId);
    this.pluginInfos.delete(pluginId);
    this.contexts.delete(pluginId);
    
    this.emit('plugin-unloaded', pluginId);
  }
  
  getPlugin(pluginId: string): IPlugin | undefined {
    return this.plugins.get(pluginId);
  }
  
  getPluginInfo(pluginId: string): PluginInfo | undefined {
    return this.pluginInfos.get(pluginId);
  }
  
  getAllPluginInfos(): PluginInfo[] {
    return Array.from(this.pluginInfos.values());
  }
  
  private createPluginContext(pluginId: string): PluginContext {
    const eventEmitter = new EventEmitter();
    
    return {
      log: (level: string, message: string, metadata?: Record<string, any>) => {
        // 这里会被插件管理器注入实际的日志服务
        console.log(`[${pluginId}] ${level}: ${message}`, metadata);
      },
      
      getSettings: async () => {
        // 这里会被插件管理器注入实际的设置服务
        return {};
      },
      
      saveSettings: async (settings: any) => {
        // 这里会被插件管理器注入实际的设置服务
      },
      
      emit: (event: string, data?: any) => {
        eventEmitter.emit(`plugin:${pluginId}:${event}`, data);
      },
      
      on: (event: string, handler: (data?: any) => void) => {
        eventEmitter.on(`plugin:${pluginId}:${event}`, handler);
      },
      
      off: (event: string, handler: (data?: any) => void) => {
        eventEmitter.off(`plugin:${pluginId}:${event}`, handler);
      },
      
      registerComponent: (slot: string, component: any) => {
        // UI 组件注册逻辑
        this.emit('component-registered', pluginId, slot, component);
      },
      
      registerMenuItem: (menu: string, item: any) => {
        // 菜单项注册逻辑
        this.emit('menu-item-registered', pluginId, menu, item);
      },
    };
  }
}

export const pluginLifecycleManager = new PluginLifecycleManager();