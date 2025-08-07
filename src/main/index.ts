// 主进程入口文件
import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { registerAllHandlers } from './handlers';

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
  console.log('All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

console.log('Main process setup complete');