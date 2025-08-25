import { ipcMain } from 'electron';
import { getSystemInfo } from '@main/utils/hardwareInfo';

export function registerSystemHandlers(): void {
  ipcMain.handle('get-system-info', async () => {
    try {
      return await getSystemInfo();
    } catch (e: any) {
      return { error: e?.message || String(e) };
    }
  });
}

