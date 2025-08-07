// 窗口管理器
import { BrowserWindow, ipcMain } from 'electron';
import { mainWindow } from './main';
import { splashWindow } from './splash';
import { loggerService } from '../services/logger';
import { IPC_CHANNELS } from '@shared/constants';

export class WindowManager {
  private windows: Map<string, BrowserWindow> = new Map();
  
  constructor() {
    this.registerWindowHandlers();
  }
  
  private registerWindowHandlers(): void {
    // 窗口控制 IPC 处理器
    ipcMain.handle(IPC_CHANNELS.MINIMIZE_WINDOW, () => {
      const window = BrowserWindow.getFocusedWindow();
      window?.minimize();
    });
    
    ipcMain.handle(IPC_CHANNELS.MAXIMIZE_WINDOW, () => {
      const window = BrowserWindow.getFocusedWindow();
      if (window?.isMaximized()) {
        window.unmaximize();
      } else {
        window?.maximize();
      }
    });
    
    ipcMain.handle(IPC_CHANNELS.CLOSE_WINDOW, () => {
      const window = BrowserWindow.getFocusedWindow();
      window?.close();
    });
  }
  
  async createMainWindow(): Promise<BrowserWindow> {
    // 显示启动画面
    const splash = splashWindow.create();
    
    // 模拟启动延迟
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 创建主窗口
    const main = mainWindow.create();
    this.windows.set('main', main);
    
    // 主窗口准备好后关闭启动画面
    main.once('ready-to-show', () => {
      splash.close();
    });
    
    loggerService.addLog('info', 'Main window created by window manager', 'main');
    return main;
  }
  
  getWindow(name: string): BrowserWindow | undefined {
    return this.windows.get(name);
  }
  
  getAllWindows(): BrowserWindow[] {
    return Array.from(this.windows.values());
  }
  
  closeAllWindows(): void {
    this.windows.forEach(window => {
      if (!window.isDestroyed()) {
        window.close();
      }
    });
    this.windows.clear();
    loggerService.addLog('info', 'All windows closed', 'main');
  }
  
  focusMainWindow(): void {
    const main = this.windows.get('main');
    if (main && !main.isDestroyed()) {
      if (main.isMinimized()) {
        main.restore();
      }
      main.focus();
    }
  }
}

export const windowManager = new WindowManager();