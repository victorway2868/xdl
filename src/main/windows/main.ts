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
      icon: path.join(__dirname, '../../../public/icons/icon-256x256.png'), // 设置窗口图标
      frame: false, // 移除默认窗口边框
      titleBarStyle: 'hidden', // 隐藏标题栏
      resizable: true, // 允许调整窗口大小
      show: false, // 先不显示，等加载完成后再显示
    });
    
    // 加载应用
    if (process.env.NODE_ENV === 'development') {
      // 开发模式下加载 Vite 开发服务器
      this.window.loadURL('http://localhost:5173');
    } else {
      // 生产模式下加载打包后的文件
      this.window.loadFile(path.join(__dirname, '../renderer/main_window/index.html'));
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