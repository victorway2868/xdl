// 窗口控制 IPC 处理器
import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants';
import { loggerService } from '../services/logger';

export function registerWindowHandlers(): void {
  // 最小化窗口
  ipcMain.handle(IPC_CHANNELS.MINIMIZE_WINDOW, async () => {
    try {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        focusedWindow.minimize();
        loggerService.addLog('info', 'Window minimized', 'main');
        return { success: true };
      }
      return { success: false, error: 'No focused window found' };
    } catch (error) {
      loggerService.addLog('error', `Failed to minimize window: ${error}`, 'main');
      return { success: false, error: error.message };
    }
  });

  // 最大化/还原窗口
  ipcMain.handle(IPC_CHANNELS.MAXIMIZE_WINDOW, async () => {
    try {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        if (focusedWindow.isMaximized()) {
          focusedWindow.unmaximize();
          loggerService.addLog('info', 'Window unmaximized', 'main');
        } else {
          focusedWindow.maximize();
          loggerService.addLog('info', 'Window maximized', 'main');
        }
        return { success: true };
      }
      return { success: false, error: 'No focused window found' };
    } catch (error) {
      loggerService.addLog('error', `Failed to maximize/unmaximize window: ${error}`, 'main');
      return { success: false, error: error.message };
    }
  });

  // 关闭窗口
  ipcMain.handle(IPC_CHANNELS.CLOSE_WINDOW, async () => {
    try {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        focusedWindow.close();
        loggerService.addLog('info', 'Window close requested', 'main');
        return { success: true };
      }
      return { success: false, error: 'No focused window found' };
    } catch (error) {
      loggerService.addLog('error', `Failed to close window: ${error}`, 'main');
      return { success: false, error: error.message };
    }
  });

  loggerService.addLog('info', 'Window handlers registered', 'main');
}
