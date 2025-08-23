import { loggerService } from './services/logger';
import { AutoUpdater } from './updater';
import { updaterConfig } from './config/updater.config';

import { ipcMain } from 'electron';
import { getSoftwareVersion } from './utils/findSoftwarePaths';


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
import { app, BrowserWindow, crashReporter, ipcMain, session, dialog } from 'electron';
import { LogEntry } from '../shared/types';
import * as path from 'path';
import { registerAllHandlers } from './handlers';

// 检查管理员权限
const checkAdminPrivileges = (): boolean => {
  if (process.platform === 'win32') {
    try {
      // 在Windows上检查是否以管理员身份运行
      const { execSync } = require('child_process');
      const result = execSync('net session', { encoding: 'utf8', stdio: 'pipe' });
      return true; // 如果命令成功执行，说明有管理员权限
    } catch (error) {
      return false; // 命令失败，说明没有管理员权限
    }
  }
  return true; // 非Windows系统暂时返回true
};

// 检查是否为生产环境
const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production' || !process.defaultApp;
};


// 配置崩溃报告
crashReporter.start({
  productName: '小斗笠直播助手',
  companyName: '小斗笠工作室',
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
      icon: path.join(__dirname, '../../public/icons/icon-256x256.png'),
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

  // 检查管理员权限 - 生产环境强制要求
  const hasAdminPrivileges = checkAdminPrivileges();
  const productionMode = isProduction();

  if (!hasAdminPrivileges) {
    loggerService.addLog('warning', `Application not running with administrator privileges (Production: ${productionMode})`, 'main');

    if (productionMode) {
      // 生产环境：强制退出，不允许继续运行
      dialog.showMessageBoxSync({
        type: 'error',
        title: '小斗笠直播助手',
        message: '权限不足 - 无法启动',
        detail: '生产环境下，此应用程序必须以管理员权限运行。\n\n请右键点击应用程序图标，选择"以管理员身份运行"。\n\n应用程序将立即退出。',
        buttons: ['确定']
      });

      loggerService.addLog('error', 'Application terminated due to insufficient privileges in production', 'main');
      app.quit();
      return;
    } else {
      // 开发环境：显示警告但允许继续
      dialog.showMessageBox({
        type: 'warning',
        title: '小斗笠直播助手 - 开发模式',
        message: '权限不足',
        detail: '此应用程序建议以管理员权限运行以获得完整功能。\n\n开发模式下允许继续运行，但某些功能可能受限。',
        buttons: ['继续运行', '退出应用'],
        defaultId: 0,
        cancelId: 1
      }).then((result) => {
        if (result.response === 1) {
          app.quit();
          return;
        }
      });
    }
  } else {
    loggerService.addLog('info', `Application running with administrator privileges (Production: ${productionMode})`, 'main');
  }

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