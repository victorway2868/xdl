// 日志相关 IPC 处理器
import { ipcMain } from 'electron';
import { loggerService } from '../services/logger';
import { IPC_CHANNELS } from '../../shared/constants';

export function registerLoggerHandlers(): void {
  // 获取日志列表
  ipcMain.handle(IPC_CHANNELS.GET_LOGS, async () => {
    return loggerService.getLogs();
  });
}