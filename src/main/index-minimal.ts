console.log('DEBUG: Main process started at very top of file');
// 最小化的主进程文件
const { app, BrowserWindow } = require('electron');
let mainWindow; // Declare a global variable to hold the window reference

console.log('=== MINIMAL ELECTRON APP STARTING ===');

// 全局错误处理
process.on('uncaughtException', (error) => {
  console.error('=== UNCAUGHT EXCEPTION ===', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('=== UNHANDLED REJECTION ===', reason);
});

function createWindow() {
  console.log('Creating window...');
  
  mainWindow = new BrowserWindow({ // Assign to mainWindow
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // 加载最简单的内容
  mainWindow.loadURL('data:text/html,<h1>Hello World!</h1><p>Minimal Electron App</p>'); // Use mainWindow
  
  mainWindow.on('closed', () => { // Use mainWindow
    console.log('Window closed');
    mainWindow = null; // Dereference the window object when it's closed
  });
  
  console.log('Window created');
}

app.whenReady().then(() => {
  console.log('App ready');
  createWindow();
});

app.on('window-all-closed', () => {
  console.log('All windows closed');
  app.quit();
});

console.log('=== SETUP COMPLETE ===');