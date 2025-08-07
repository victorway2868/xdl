// 设置相关 IPC 处理器
import { ipcMain } from 'electron';
import { settingsService } from '../services/settings';
import { IPC_CHANNELS } from '../../shared/constants';
import { AppSettings } from '../../shared/types';

export function registerSettingsHandlers(): void {
  // 获取设置
  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, async () => {
    return settingsService.getSettings();
  });
  
  // 保存设置
  ipcMain.handle(IPC_CHANNELS.SAVE_SETTINGS, async (_, updates: Partial<AppSettings>) => {
    settingsService.updateSettings(updates);
  });
  
  // 重置设置
  ipcMain.handle(IPC_CHANNELS.RESET_SETTINGS, async () => {
    settingsService.resetSettings();
  });
}