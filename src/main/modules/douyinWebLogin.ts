import { BrowserWindow, session, app } from 'electron';
import pathManager, { PathType } from '../utils/pathManager.js';
import fs from 'fs';

export interface DouyinLoginResult {
  success: boolean;
  cookies?: Array<{ name: string; value: string }>;
  cookieString?: string;
  error?: string;
}

async function clearAllBrowserData() {
  try {
    const s = session.defaultSession;
    const all = await s.cookies.get({});
    for (const c of all) {
      try { await s.cookies.remove(`https://${c.domain}${c.path}`, c.name); } catch {}
    }
    await s.clearStorageData({
      storages: ['cookies', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage']
    });
    await s.clearCache();
    await s.clearHostResolverCache();
    await s.clearAuthCache();
  } catch (e) {
    console.warn('clearAllBrowserData error:', (e as Error).message);
  }
}

function saveCookiesToFile(cookies: Electron.Cookie[]) {
  try {
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    const file = pathManager.getPath(PathType.DOUYIN_COOKIES);
    fs.mkdirSync(require('path').dirname(file), { recursive: true });
    fs.writeFileSync(file, cookieString, 'utf8');
    return cookieString;
  } catch (e) {
    console.warn('saveCookiesToFile error:', (e as Error).message);
    return '';
  }
}

export async function loginDouyinWeb(): Promise<DouyinLoginResult> {
  try {
    await clearAllBrowserData();

    let win = new BrowserWindow({
      width: 900,
      height: 700,
      title: '抖音登录',
      center: true,
      resizable: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true }
    });

    win.loadURL('https://www.douyin.com/user/self');
    if (!app.isPackaged) win.webContents.openDevTools({ mode: 'detach' });

    let resolved = false;

    const result = await new Promise<DouyinLoginResult>((resolve) => {
      let tries = 0;
      const maxTries = 120; // up to 2 minutes
      const timer = setInterval(async () => {
        tries++;
        if (win.isDestroyed()) {
          clearInterval(timer);
          if (!resolved) resolve({ success: false, error: '窗口已关闭' });
          return;
        }
        try {
          const title = (win.getTitle() || '').trim();
          const logged = title.includes('的抖音 - 抖音');

          if (logged) {
            clearInterval(timer);

            // 获取并保存 Cookie
            const cookies = await session.defaultSession.cookies.get({ domain: '.douyin.com' });
            const cookieString = saveCookiesToFile(cookies as any);

            resolved = true;
            const out: DouyinLoginResult = {
              success: true,
              cookies: cookies as any,
              cookieString
            };
            try { const w = win; win = null as any; w.close(); } catch {}
            resolve(out);
            return;
          }

          if (tries >= maxTries) {
            clearInterval(timer);
            resolved = true;
            try { const w = win; win = null as any; w.close(); } catch {}
            resolve({ success: false, error: '登录超时' });
          }
        } catch (e) {
          console.warn('login check error:', (e as Error).message);
        }
      }, 1000);

      win.on('closed', () => {
        if (!resolved) {
          resolved = true;
          resolve({ success: false, error: '用户取消登录' });
        }
      });
    });

    return result;
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export default loginDouyinWeb;

