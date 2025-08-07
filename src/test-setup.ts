// 测试环境设置
import 'jest';

// Mock electron-log
jest.mock('electron-log', () => ({
  default: {
    transports: {
      file: { level: 'info', maxSize: 5 * 1024 * 1024 },
      console: { level: 'debug' }
    },
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock electron
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/mock/path'),
    whenReady: jest.fn(() => Promise.resolve()),
    on: jest.fn(),
    quit: jest.fn()
  },
  BrowserWindow: jest.fn(() => ({
    loadURL: jest.fn(),
    loadFile: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    show: jest.fn(),
    close: jest.fn(),
    getBounds: jest.fn(() => ({ width: 1200, height: 800 })),
    isMaximized: jest.fn(() => false),
    maximize: jest.fn(),
    minimize: jest.fn(),
    unmaximize: jest.fn(),
    focus: jest.fn(),
    isVisible: jest.fn(() => true),
    isDestroyed: jest.fn(() => false)
  })),
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn()
  },
  contextBridge: {
    exposeInMainWorld: jest.fn()
  },
  ipcRenderer: {
    invoke: jest.fn()
  },
  dialog: {
    showOpenDialog: jest.fn(),
    showSaveDialog: jest.fn()
  }
}));