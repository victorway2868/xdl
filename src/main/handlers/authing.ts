import { ipcMain } from 'electron';
import { getStatus, startLoginInteractive, logout } from '../services/authing';

export function registerAuthingHandlers() {
  ipcMain.handle('authing:get-status', async () => {
    return await getStatus(true);
  });
  ipcMain.handle('authing:start-login', async () => {
    await startLoginInteractive();
    return { success: true };
  });
  ipcMain.handle('authing:logout', async () => {
    await logout();
    return { success: true };
  });
}

