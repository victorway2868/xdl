// 插件相关 IPC 处理器
import { ipcMain } from 'electron';
import { pluginManager } from '../plugins/manager';
import { IPC_CHANNELS } from '../../shared/constants';

export function registerPluginsHandlers(): void {
  // 获取所有插件
  ipcMain.handle(IPC_CHANNELS.GET_PLUGINS, async () => {
    return pluginManager.getAllPlugins();
  });
  
  // 启用插件
  ipcMain.handle(IPC_CHANNELS.ENABLE_PLUGIN, async (_, pluginId: string) => {
    await pluginManager.enablePlugin(pluginId);
  });
  
  // 禁用插件
  ipcMain.handle(IPC_CHANNELS.DISABLE_PLUGIN, async (_, pluginId: string) => {
    await pluginManager.disablePlugin(pluginId);
  });
  
  // 重新加载插件
  ipcMain.handle(IPC_CHANNELS.RELOAD_PLUGIN, async (_, pluginId: string) => {
    await pluginManager.reloadPlugin(pluginId);
  });
}