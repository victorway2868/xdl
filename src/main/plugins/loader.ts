// 插件加载器
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { loggerService } from '../services/logger';
import { PluginManifest } from '../../plugins/core/types';

export class PluginLoader {
  private pluginsPath: string;
  
  constructor() {
    this.pluginsPath = path.join(app.getPath('userData'), 'plugins');
    this.ensurePluginsDirectory();
  }
  
  private ensurePluginsDirectory(): void {
    if (!fs.existsSync(this.pluginsPath)) {
      fs.mkdirSync(this.pluginsPath, { recursive: true });
      loggerService.addLog('info', `Created plugins directory: ${this.pluginsPath}`, 'main');
    }
  }
  
  async discoverPlugins(): Promise<string[]> {
    try {
      const pluginDirs: string[] = [];
      
      // 扫描内置插件
      const builtinPluginsPath = path.join(__dirname, '../../plugins/modules');
      if (fs.existsSync(builtinPluginsPath)) {
        const builtinDirs = await this.scanPluginDirectory(builtinPluginsPath);
        pluginDirs.push(...builtinDirs.map(dir => path.join(builtinPluginsPath, dir)));
      }
      
      // 扫描用户插件
      if (fs.existsSync(this.pluginsPath)) {
        const userDirs = await this.scanPluginDirectory(this.pluginsPath);
        pluginDirs.push(...userDirs.map(dir => path.join(this.pluginsPath, dir)));
      }
      
      loggerService.addLog('info', `Discovered ${pluginDirs.length} plugin directories`, 'main');
      return pluginDirs;
    } catch (error) {
      loggerService.addLog('error', `Failed to discover plugins: ${error}`, 'main');
      return [];
    }
  }
  
  private async scanPluginDirectory(dirPath: string): Promise<string[]> {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
  }
  
  async loadPluginManifest(pluginDir: string): Promise<PluginManifest | null> {
    try {
      const manifestPath = path.join(pluginDir, 'manifest.json');
      
      if (!fs.existsSync(manifestPath)) {
        loggerService.addLog('warn', `No manifest.json found in ${pluginDir}`, 'main');
        return null;
      }
      
      const manifestContent = await fs.promises.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent) as PluginManifest;
      
      // 验证必需字段
      if (!manifest.name || !manifest.version || !manifest.main) {
        loggerService.addLog('error', `Invalid manifest in ${pluginDir}: missing required fields`, 'main');
        return null;
      }
      
      return manifest;
    } catch (error) {
      loggerService.addLog('error', `Failed to load manifest from ${pluginDir}: ${error}`, 'main');
      return null;
    }
  }
  
  async loadPluginModule(pluginDir: string, manifest: PluginManifest): Promise<any> {
    try {
      const mainPath = path.join(pluginDir, manifest.main);
      
      if (!fs.existsSync(mainPath)) {
        throw new Error(`Main file not found: ${mainPath}`);
      }
      
      // 清除模块缓存以支持热重载
      delete require.cache[require.resolve(mainPath)];
      
      const pluginModule = require(mainPath);
      
      // 支持 ES6 默认导出和 CommonJS 导出
      const PluginClass = pluginModule.default || pluginModule;
      
      if (typeof PluginClass !== 'function') {
        throw new Error(`Plugin main file must export a class or constructor function`);
      }
      
      return new PluginClass();
    } catch (error) {
      loggerService.addLog('error', `Failed to load plugin module from ${pluginDir}: ${error}`, 'main');
      throw error;
    }
  }
  
  getPluginsPath(): string {
    return this.pluginsPath;
  }
}

export const pluginLoader = new PluginLoader();