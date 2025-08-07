// 启动画面窗口
import { BrowserWindow } from 'electron';
import * as path from 'path';
import { loggerService } from '../services/logger';

export class SplashWindow {
  private window: BrowserWindow | null = null;
  
  create(): BrowserWindow {
    this.window = new BrowserWindow({
      width: 400,
      height: 300,
      frame: false,
      alwaysOnTop: true,
      transparent: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
      show: false,
    });
    
    // 加载启动画面 HTML
    const splashHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: white;
          }
          .splash-content {
            text-align: center;
          }
          .logo {
            font-size: 48px;
            margin-bottom: 20px;
          }
          .loading {
            font-size: 16px;
            opacity: 0.8;
          }
          .spinner {
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top: 2px solid white;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="splash-content">
          <div class="logo">⚡</div>
          <div class="loading">Electron Framework App</div>
          <div class="spinner"></div>
          <div class="loading">正在启动...</div>
        </div>
      </body>
      </html>
    `;
    
    this.window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml)}`);
    
    this.window.once('ready-to-show', () => {
      this.window?.show();
      loggerService.addLog('info', 'Splash window shown', 'main');
    });
    
    this.window.on('closed', () => {
      this.window = null;
      loggerService.addLog('info', 'Splash window closed', 'main');
    });
    
    return this.window;
  }
  
  close(): void {
    if (this.window) {
      this.window.close();
      this.window = null;
    }
  }
  
  getWindow(): BrowserWindow | null {
    return this.window;
  }
}

export const splashWindow = new SplashWindow();