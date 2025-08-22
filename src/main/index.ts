import { loggerService } from './services/logger';

import { ipcMain } from 'electron';
import { getSoftwareVersion } from './utils/findSoftwarePaths';


// 全局错误捕获
process.on('uncaughtException', (error) => {
  loggerService.addLog('error', `Uncaught Exception: ${error.message}`, 'main', { stack: error.stack });
  // 建议在此处添加额外的错误处理逻辑，例如优雅地退出应用
});

// IPC通信，用于获取软件版本
ipcMain.handle('get-software-version', async (event, softwareName) => {
  try {
    const version = await getSoftwareVersion(softwareName);
    return version;
  } catch (error) {
    loggerService.addLog('error', `Failed to get software version for ${softwareName}: ${error.message}`, 'main');
    return null;
  }
});



process.on('unhandledRejection', (reason) => {
  const error = reason as Error;
  loggerService.addLog('error', `Unhandled Rejection: ${error.message || reason}`, 'main', { stack: error.stack });
});

// 主进程入口文件
import { app, BrowserWindow, crashReporter, ipcMain, session } from 'electron';
import { LogEntry } from '../shared/types';
import * as path from 'path';
import { registerAllHandlers } from './handlers';


// 配置崩溃报告
crashReporter.start({
  productName: 'ElectronFrameworkApp',
  companyName: 'MyCompany',
  submitURL: '', // 替换为您的崩溃报告服务器地址
  uploadToServer: false, // 设置为 true 以自动上传崩溃报告
});

// 监听渲染器进程的日志
ipcMain.on('log', (event, entry: Omit<LogEntry, 'source'>) => {
  loggerService.addLog(entry.level, entry.message, 'renderer', entry.metadata);
});


declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

// 全局错误处理
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('Main process starting...');

// 创建窗口函数
const createWindow = (): void => {
  console.log('Creating main window...');

  try {
    const mainWindow = new BrowserWindow({
      width: 1000,
      height: 760,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
      },
      frame: false, // 移除默认窗口边框
      titleBarStyle: 'hidden', // 隐藏标题栏
      resizable: false, // 禁止调整窗口大小
      show: false,
    });

    // and load the index.html of the app.
    // Vite DEV server URL
    mainWindow.webContents.openDevTools();

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      console.log(`Attempting to load URL: ${MAIN_WINDOW_VITE_DEV_SERVER_URL}`);
      const loadWithRetries = (retries = 20) => {
        mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL).catch(err => {
          console.error('Failed to load dev server URL, retrying...', err);
          if (retries > 0) {
            setTimeout(() => loadWithRetries(retries - 1), 1000); // wait 1s before retrying
          }
        });
      };
      loadWithRetries(); // 实际调用函数
    } else {
      mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
    }

    // 窗口准备好后显示
    mainWindow.once('ready-to-show', () => {
      console.log('Window ready, showing...');
      mainWindow.show();
    });

    // 窗口关闭时清理
    mainWindow.on('closed', () => {
      console.log('Main window closed');
    });

    console.log('Main window created successfully');

  } catch (error) {
    console.error('Error creating window:', error);
  }
};

// 应用准备就绪时创建窗口
app.whenReady().then(() => {
  loggerService.addLog('info', 'Application starting', 'main');
  console.log('App ready, creating window...');




  // 注册所有 IPC 处理器
  registerAllHandlers();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  loggerService.addLog('info', 'Application shutting down', 'main');
  console.log('All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

console.log('Main process setup complete');