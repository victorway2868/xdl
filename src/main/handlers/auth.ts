import { ipcMain } from 'electron';
import { loginDouyinWeb } from '../modules/douyinWebLogin';
import { loginDouyinCompanion } from '../modules/douyinCompanionLogin';
import { getdouyinUserStats } from '../modules/douyinUserStats';
import { getDouyinUserInfo } from '../modules/douyinUserInfo';

export function registerAuthHandlers(): void {
  ipcMain.handle('login-douyin-web', async () => {
    return await loginDouyinWeb();
  });

  ipcMain.handle('login-douyin-companion', async () => {
    return await loginDouyinCompanion();
  });

  ipcMain.handle('get-douyin-user-stats', async (_event, options) => {
    return await getdouyinUserStats(options);
  });

  ipcMain.handle('get-douyin-user-info', async () => {
    try {
      return await getDouyinUserInfo();
    } catch (e) {
      // 当 Cookie 不存在或不可用时，不抛到渲染进程，返回 null 即可
      return null;
    }
  });
}

