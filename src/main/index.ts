import { app, BrowserWindow, crashReporter, ipcMain, session } from 'electron';
import { loggerService } from './services/logger';
import { AutoUpdater } from './updater';
import { updaterConfig } from './config/updater.config';
import { getSoftwareVersion } from './utils/findSoftwarePaths';

// Handle Squirrel.Windows events to create Desktop and Start Menu shortcuts on install/update
if (process.platform === 'win32') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const squirrelStartup = require('electron-squirrel-startup');
  if (squirrelStartup) {
    app.quit();
  }
}


// 全局错误捕获
process.on('uncaughtException', (error) => {
  loggerService.addLog('error', `Uncaught Exception: ${error.message}`, 'main', { stack: error.stack });
  // 建议在此处添加额外的错误处理逻辑，例如优雅地退出应用
});

// 全局更新器实例
let globalUpdater: AutoUpdater | null = null;

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

// IPC通信，用于手动检查更新
ipcMain.handle('check-for-updates', async () => {
  if (!globalUpdater) {
    return { success: false, message: 'Updater not initialized' };
  }

  try {
    const result = await globalUpdater.manualCheckForUpdates();
    return { success: result, message: result ? 'Update check completed' : 'Update check failed' };
  } catch (error) {
    loggerService.addLog('error', `Manual update check failed: ${error.message}`, 'main');
    return { success: false, message: error.message };
  }
});

// IPC通信，获取当前版本信息
ipcMain.handle('get-app-version', () => {
  return {
    version: app.getVersion(),
    name: app.getName()
  };
});



process.on('unhandledRejection', (reason) => {
  const error = reason as Error;
  loggerService.addLog('error', `Unhandled Rejection: ${error.message || reason}`, 'main', { stack: error.stack });
});

// 主进程入口文件
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


// These may be injected by Vite only in dev. Use typeof checks at runtime.
// Provide ambient declarations so TypeScript can compile.
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string | undefined;
declare const MAIN_WINDOW_PRELOAD_VITE_URL: string | undefined;

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
        // Use resourcesPath in production to load icon from extraResources
        const iconPath = app.isPackaged
          ? path.join(process.resourcesPath, 'assets', 'icons', 'icon-128x128.ico')
          : path.join(__dirname, '../../public/icons/icon-128x128.ico');
        const mainWindow = new BrowserWindow({
      icon: iconPath,
      width: 1000,
      height: 760,
      webPreferences: {
        // In dev, Vite plugin injects MAIN_WINDOW_PRELOAD_VITE_URL. In prod, use built file at .vite/preload/preload.js
        preload: (typeof MAIN_WINDOW_PRELOAD_VITE_URL !== 'undefined' && MAIN_WINDOW_PRELOAD_VITE_URL) || path.join(__dirname, '../preload/preload.js'),

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

    const DEV_SERVER_URL = (typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined' && MAIN_WINDOW_VITE_DEV_SERVER_URL) || '';
    if (DEV_SERVER_URL) {
      console.log(`Attempting to load URL: ${DEV_SERVER_URL}`);
      const loadWithRetries = (retries = 20) => {
        mainWindow.loadURL(DEV_SERVER_URL).catch(err => {
          console.error('Failed to load dev server URL, retrying...', err);
          if (retries > 0) {
            setTimeout(() => loadWithRetries(retries - 1), 1000); // wait 1s before retrying
          }
        });
      };
      loadWithRetries(); // 实际调用函数
    } else {
      // In production, load the built renderer index.html (renderer name is 'main_window' per forge.config)
      mainWindow.loadFile(path.join(__dirname, '../renderer/main_window/index.html'));
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

  // 初始化自动更新器
  if (updaterConfig.enabled) {
    globalUpdater = new AutoUpdater(updaterConfig.updateServerUrl);

    // 启动定期更新检查
    globalUpdater.startPeriodicCheck(updaterConfig.checkIntervalHours);

    loggerService.addLog('info', `Auto updater initialized with server: ${updaterConfig.updateServerUrl}`, 'main');
  } else {
    loggerService.addLog('info', 'Auto updater disabled', 'main');
  }

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