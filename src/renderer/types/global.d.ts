// 全局类型定义
import { IpcApi } from '@shared/interfaces/ipc';

declare global {
  interface Window {
    electronAPI: IpcApi;
  }
}


declare module '*.ico' {
  const value: string;
  export default value;
}

export {};
