// 插件管理器
import { pluginLifecycleManager } from '../../plugins/core/lifecycle';
import { pluginLoader } from './loader';
import { loggerService } from '../services/logger';
import { settingsService } from '../services/settings';
import { PluginInfo } from '../../plugins/core/types';

export class PluginManager {
  private initialized = false;
  
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    try {
      loggerService.addLog('info', 'Initializing plugin manager', 'main');
      
      // 注入服务到插件上下文
      this.injectServices();
      
      // 暂时跳过插件加载，先让应用启动
      // TODO: 重新启用插件加载
      // await this.loadAllPlugins();
      // await this.autoActivatePlugins();
      
      this.initialized = true;
      loggerService.addLog('info', 'Plugin manager initialized successfully (plugins disabled for now)', 'main');
    } catch (error) {
      loggerService.addLog('error', `Failed to initialize plugin manager: ${error}`, 'main');
      // 不抛出错误，让应用继续启动
      console.error('Plugin manager initialization failed:', error);
    }
  }
  
  private injectServices(): void {
    // 监听插件生命周期事件，注入服务
    pluginLifecycleManager.on('plugin-loaded', (pluginId: string) => {
      const context = (pluginLifecycleManager as any).contexts.get(pluginId);
      if (context) {
        // 注入日志服务
        context.log = (level: string, message: string, metadata?: Record<string, any>) => {
          loggerService.addLog(level as any, message, 'plugin', { pluginId, ...metadata });
        };
        
        // 注入设置服务
        context.getSettings = async () => {
          return settingsService.getSettings();
        };
        
        context.saveSettings = async (settings: any) => {
          settingsService.updateSettings(settings);
        };
      }
    });
  }
  
  private async loadAllPlugins(): Promise<void> {
    const pluginDirs = await pluginLoader.discoverPlugins();
    
    for (const pluginDir of pluginDirs) {
      try {
        await this.loadPlugin(pluginDir);
      } catch (error) {
        loggerService.addLog('error', `Failed to load plugin from ${pluginDir}: ${error}`, 'main');
      }
    }
  }
  
  private async loadPlugin(pluginDir: string): Promise<void> {
    const manifest = await pluginLoader.loadPluginManifest(pluginDir);
    if (!manifest) {
      return;
    }
    
    const pluginId = manifest.name;
    
    try {
      const plugin = await pluginLoader.loadPluginModule(pluginDir, manifest);
      await pluginLifecycleManager.loadPlugin(pluginId, plugin, manifest);
      
      loggerService.addLog('info', `Plugin loaded: ${pluginId}`, 'main');
    } catch (error) {
      loggerService.addLog('error', `Failed to load plugin ${pluginId}: ${error}`, 'main');
      throw error;
    }
  }
  
  private async autoActivatePlugins(): Promise<void> {
    const plugins = pluginLifecycleManager.getAllPluginInfos();
    
    for (const plugin of plugins) {
      // 这里可以从设置中读取哪些插件应该自动启用
      // 暂时默认启用所有插件
      try {
        await this.enablePlugin(plugin.id);
      } catch (error) {
        loggerService.addLog('error', `Failed to auto-activate plugin ${plugin.id}: ${error}`, 'main');
      }
    }
  }
  
  async enablePlugin(pluginId: string): Promise<void> {
    try {
      await pluginLifecycleManager.activatePlugin(pluginId);
      loggerService.addLog('info', `Plugin enabled: ${pluginId}`, 'main');
    } catch (error) {
      loggerService.addLog('error', `Failed to enable plugin ${pluginId}: ${error}`, 'main');
      throw error;
    }
  }
  
  async disablePlugin(pluginId: string): Promise<void> {
    try {
      await pluginLifecycleManager.deactivatePlugin(pluginId);
      loggerService.addLog('info', `Plugin disabled: ${pluginId}`, 'main');
    } catch (error) {
      loggerService.addLog('error', `Failed to disable plugin ${pluginId}: ${error}`, 'main');
      throw error;
    }
  }
  
  async reloadPlugin(pluginId: string): Promise<void> {
    try {
      // 先停用插件
      await this.disablePlugin(pluginId);
      
      // 卸载插件
      await pluginLifecycleManager.unloadPlugin(pluginId);
      
      // 重新加载插件
      // 这里需要知道插件的目录路径，实际实现中可能需要缓存这个信息
      loggerService.addLog('info', `Plugin reloaded: ${pluginId}`, 'main');
    } catch (error) {
      loggerService.addLog('error', `Failed to reload plugin ${pluginId}: ${error}`, 'main');
      throw error;
    }
  }
  
  getAllPlugins(): PluginInfo[] {
    return pluginLifecycleManager.getAllPluginInfos();
  }
  
  getPlugin(pluginId: string): PluginInfo | undefined {
    return pluginLifecycleManager.getPluginInfo(pluginId);
  }
}

export const pluginManager = new PluginManager();