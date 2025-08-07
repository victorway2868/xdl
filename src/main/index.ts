// 主进程入口文件
import { app, BrowserWindow } from 'electron';
import * as path from 'path';

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
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        // 暂时不使用 preload 脚本
        // preload: path.join(__dirname, 'preload.js'),
      },
      show: false,
    });

    // 加载一个简单的 HTML 内容先测试
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Electron Framework App</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
          }
          h1 {
            font-size: 2.5em;
            margin-bottom: 20px;
          }
          p {
            font-size: 1.2em;
            line-height: 1.6;
          }
          .status {
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚀 Electron Framework App</h1>
          <p>应用已成功启动！</p>
          <div class="status">
            <h3>系统状态</h3>
            <p>✅ 主进程运行正常</p>
            <p>✅ 窗口创建成功</p>
            <p>⏳ 正在初始化服务...</p>
          </div>
          <p>这是一个基于现代 Electron 架构的应用程序</p>
        </div>
      </body>
      </html>
    `;

    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

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