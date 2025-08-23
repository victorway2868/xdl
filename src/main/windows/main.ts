// 主窗口创建和控制
import { BrowserWindow } from 'electron';
import * as path from 'path';
import { settingsService } from '../services/settings';
import { loggerService } from '../services/logger';

export class MainWindow {
  private window: BrowserWindow | null = null;
  
  create(): BrowserWindow {
    const settings = settingsService.getSettings();
    
    // 创建浏览器窗口
    this.window = new BrowserWindow({
      width: settings.windowBounds.width,
      height: settings.windowBounds.height,
      x: settings.windowBounds.x,
      y: settings.windowBounds.y,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload.js'),
      },
      frame: false, // 移除默认窗口边框
      titleBarStyle: 'hidden', // 隐藏标题栏
      resizable: false, // 禁止调整窗口大小
      show: false, // 先不显示，等加载完成后再显示
    });
    
    // Vite plugin must be defined in main process
    declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
    declare const MAIN_WINDOW_VITE_NAME: string;

    // 加载应用
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      this.window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
      this.window.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
    }
    
    // 窗口准备好后显示
    this.window.once('ready-to-show', () => {
      this.window?.show();
      loggerService.addLog('info', 'Main window shown', 'main');
    });
    
    // 保存窗口位置和大小
    this.window.on('close', () => {
      if (this.window) {
        const bounds = this.window.getBounds();
        settingsService.updateSettings({
          windowBounds: bounds,
        });
      }
    });
    
    // 窗口关闭时清理
    this.window.on('closed', () => {
      this.window = null;
      loggerService.addLog('info', 'Main window closed', 'main');
    });
    
    loggerService.addLog('info', 'Main window created', 'main');
    return this.window;
  }
  
  getWindow(): BrowserWindow | null {
    return this.window;
  }
  
  minimize(): void {
    this.window?.minimize();
  }
  
  maximize(): void {
    if (this.window?.isMaximized()) {
      this.window.unmaximize();
    } else {
      this.window?.maximize();
    }
  }
  
  close(): void {
    this.window?.close();
  }
  
  focus(): void {
    this.window?.focus();
  }
  
  isVisible(): boolean {
    return this.window?.isVisible() ?? false;
  }
}

export const mainWindow = new MainWindow();