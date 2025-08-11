// 全局类型定义
import { IpcApi } from '@shared/interfaces/ipc';
import { LiveDataIPC } from '@shared/interfaces/liveData';

declare global {
  interface Window {
    electronAPI: IpcApi & {
      liveData: LiveDataIPC;
    };
  }
}

export {};
