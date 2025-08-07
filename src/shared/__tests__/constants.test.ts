// 常量测试
import { APP_NAME, APP_VERSION, DEFAULT_SETTINGS, IPC_CHANNELS } from '../constants';

describe('Constants', () => {
  test('should have correct app info', () => {
    expect(APP_NAME).toBe('Electron Framework App');
    expect(APP_VERSION).toBe('1.0.0');
  });
  
  test('should have default settings', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      theme: 'light',
      language: 'zh-CN',
      autoStart: false,
      windowBounds: {
        width: 1200,
        height: 800,
      },
    });
  });
  
  test('should have IPC channels defined', () => {
    expect(IPC_CHANNELS.LOG).toBe('logger:log');
    expect(IPC_CHANNELS.GET_SETTINGS).toBe('settings:get');
    expect(IPC_CHANNELS.GET_PLUGINS).toBe('plugins:getAll');
  });
});