// 简化的主进程入口文件 - 用于调试
import { app, BrowserWindow } from 'electron';
import * as path from 'path';

console.log('Main process starting...');

// 创建窗口函数
const createWindow = (): void => {
  console.log('Creating window...');
  
  // 创建浏览器窗口
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
  });

  // 加载应用
  if (process.env.NODE_ENV === 'development') {
    console.log('Loading development server...');
    mainWindow.loadURL('http://localhost:5173');
  } else {
    console.log('Loading production files...');
    mainWindow.loadFile(path.join(__dirname, '../renderer/main_window/index.html'));
  }

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    console.log('Window ready to show');
    mainWindow.show();
  });

  // 窗口关闭时清理
  mainWindow.on('closed', () => {
    console.log('Window closed');
  });
  
  console.log('Window created successfully');
};

// 应用准备就绪
app.whenReady().then(() => {
  console.log('App ready, creating window...');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 所有窗口关闭时退出
app.on('window-all-closed', () => {
  console.log('All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

console.log('Main process setup complete');