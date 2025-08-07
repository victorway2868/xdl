// 日志相关 IPC 处理器
import { ipcMain } from 'electron';
import { loggerService } from '../services/logger';
import { IPC_CHANNELS } from '../../shared/constants';

export function registerLoggerHandlers(): void {
  // 记录日志
  ipcMain.handle(IPC_CHANNELS.LOG, async (_, level: string, message: string, metadata?: Record<string, any>) => {
    loggerService.addLog(level as any, message, 'renderer', metadata);
  });
  
  // 获取日志列表
  ipcMain.handle(IPC_CHANNELS.GET_LOGS, async () => {
    return loggerService.getLogs();
  });
}