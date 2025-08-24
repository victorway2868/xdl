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
    return await getDouyinUserInfo();
  });
}

