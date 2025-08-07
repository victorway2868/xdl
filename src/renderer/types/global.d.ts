// 全局类型定义
import { IpcApi } from '@shared/interfaces/ipc';

declare global {
  interface Window {
    electronAPI: IpcApi;
  }
}

export {};
