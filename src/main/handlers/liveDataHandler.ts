/**
 * 直播数据 IPC 处理器
 * 处理渲染进程与直播数据服务的通信
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { LiveDataService } from '../services/liveDataService';
import { loggerService } from '../services/logger';

export class LiveDataHandler {
  private liveDataService: LiveDataService;

  constructor() {
    this.liveDataService = LiveDataService.getInstance();
    this.registerHandlers();
  }

  private registerHandlers(): void {
    // 连接到直播间
    ipcMain.handle('liveData:connect', async (event: IpcMainInvokeEvent, roomId: string) => {
      try {
        loggerService.addLog('info', `IPC: Connecting to room ${roomId}`, 'main');
        return await this.liveDataService.connectToRoom(roomId);
      } catch (error) {
        loggerService.addLog('error', 'IPC: Failed to connect to room', 'main', { error });
        return { 
          success: false, 
          message: error instanceof Error ? error.message : '连接失败' 
        };
      }
    });

    // 断开连接
    ipcMain.handle('liveData:disconnect', async (event: IpcMainInvokeEvent) => {
      try {
        loggerService.addLog('info', 'IPC: Disconnecting from room', 'main');
        await this.liveDataService.disconnect();
        return { success: true };
      } catch (error) {
        loggerService.addLog('error', 'IPC: Failed to disconnect', 'main', { error });
        return { 
          success: false, 
          message: error instanceof Error ? error.message : '断开连接失败' 
        };
      }
    });

    // 获取当前状态
    ipcMain.handle('liveData:getCurrentState', async (event: IpcMainInvokeEvent) => {
      try {
        return this.liveDataService.getCurrentState();
      } catch (error) {
        loggerService.addLog('error', 'IPC: Failed to get current state', 'main', { error });
        return null;
      }
    });

    // 启动 WebSocket 服务器
    ipcMain.handle('liveData:startWebSocketServer', async (event: IpcMainInvokeEvent, port?: number) => {
      try {
        await this.liveDataService.startWebSocketServer(port);
        return { success: true };
      } catch (error) {
        loggerService.addLog('error', 'IPC: Failed to start WebSocket server', 'main', { error });
        return { 
          success: false, 
          message: error instanceof Error ? error.message : '启动WebSocket服务器失败' 
        };
      }
    });

    // 停止 WebSocket 服务器
    ipcMain.handle('liveData:stopWebSocketServer', async (event: IpcMainInvokeEvent) => {
      try {
        await this.liveDataService.stopWebSocketServer();
        return { success: true };
      } catch (error) {
        loggerService.addLog('error', 'IPC: Failed to stop WebSocket server', 'main', { error });
        return { 
          success: false, 
          message: error instanceof Error ? error.message : '停止WebSocket服务器失败' 
        };
      }
    });

    loggerService.addLog('info', 'LiveDataHandler: IPC handlers registered', 'main');
  }

  /**
   * 清理处理器
   */
  cleanup(): void {
    ipcMain.removeHandler('liveData:connect');
    ipcMain.removeHandler('liveData:disconnect');
    ipcMain.removeHandler('liveData:getCurrentState');
    ipcMain.removeHandler('liveData:startWebSocketServer');
    ipcMain.removeHandler('liveData:stopWebSocketServer');
    
    loggerService.addLog('info', 'LiveDataHandler: IPC handlers cleaned up', 'main');
  }
}