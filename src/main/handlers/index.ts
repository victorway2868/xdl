// 统一注册所有 IPC 处理器
import { registerLoggerHandlers } from './logger';
import { registerSettingsHandlers } from './settings';
import { registerPluginsHandlers } from './plugins';
import { registerWindowHandlers } from './window';
import { registerAuthHandlers } from './auth';
import { registerAuthingHandlers } from './authing';
import { loggerService } from '../services/logger';
import { registerStreamingHandlers } from './streaming';
import { registerObsConfigHandlers } from './obsConfig';
import { registerSystemHandlers } from './system';
import { registerAudioHandlers } from './audio';

export function registerAllHandlers(): void {
  try {
    registerLoggerHandlers();
    registerSettingsHandlers();
    registerPluginsHandlers();
    registerAuthHandlers();
    registerAuthingHandlers();
    registerStreamingHandlers();
    registerWindowHandlers();
    registerObsConfigHandlers();
    registerSystemHandlers();
    registerAudioHandlers();

    loggerService.addLog('info', 'All IPC handlers registered successfully', 'main');
  } catch (error) {
    loggerService.addLog('error', `Failed to register IPC handlers: ${error}`, 'main');
    throw error;
  }
}