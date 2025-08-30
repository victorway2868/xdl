import { ipcMain, shell, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import { loginDouyinCompanion } from '../modules/douyinCompanionLogin';
import { configureHotkeySettings } from '../modules/douyinHotkey';
import { executeStartLiveHotkey, executeEndLiveHotkey, executeCustomHotkey } from '../modules/keyboardShortcut';
import { checkMediaSDKServerRunning, killMediaSDKServer } from '../modules/mediaSdkProcess';
import { setOBSStreamSettings, startOBSStreaming, stopOBSStreaming } from '../modules/obsWebSocket';
import { main as douyinApiMain, startPingAnchor, stopPingAnchor, webcastStop } from '../modules/douyinRtmpApi';

const fsAccess = promisify(fs.access);
const fsReadFile = promisify(fs.readFile);

function splitRtmp(rtmpUrl: string): { streamUrl: string; streamKey: string } | null {
  if (!rtmpUrl) return null;
  const idx = rtmpUrl.lastIndexOf('/');
  if (idx > 0 && idx < rtmpUrl.length - 1) {
    return {
      streamUrl: rtmpUrl.substring(0, idx),
      streamKey: rtmpUrl.substring(idx + 1),
    };
  }
  return null;
}

async function readCompanionRoomStore(): Promise<{ streamUrl?: string; streamKey?: string; status?: number; error?: string }>
{
  const ROOM_STORE_PATH = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'webcast_mate', 'WBStore', 'roomStore.json');
  try {
    await fsAccess(ROOM_STORE_PATH, fs.constants.R_OK);
    const raw = await fsReadFile(ROOM_STORE_PATH, 'utf8');
    const json = JSON.parse(raw || '{}');

    // status at top-level or nested
    let status: number | null = null;
    if (typeof json.status === 'number') status = json.status;
    else if (json.roomStore && typeof json.roomStore.status === 'number') status = json.roomStore.status;

    if (status !== 2) {
      return { error: `直播间未准备好，当前状态: ${status}`, status: status ?? undefined };
    }

    // find rtmp_push_url
    let rtmp: string | null = null;
    if (json.rtmp_push_url) rtmp = json.rtmp_push_url;
    else if (json.settings?.stream_url?.rtmp_push_url) rtmp = json.settings.stream_url.rtmp_push_url;
    else if (json.roomStore?.settings?.stream_url?.rtmp_push_url) rtmp = json.roomStore.settings.stream_url.rtmp_push_url;

    if (!rtmp) {
      // fallback deep search
      const stack: any[] = [json];
      while (stack.length) {
        const obj = stack.pop();
        if (obj && typeof obj === 'object') {
          for (const k of Object.keys(obj)) {
            if (k === 'rtmp_push_url' && typeof obj[k] === 'string') {
              rtmp = obj[k];
              break;
            }
            if (obj[k] && typeof obj[k] === 'object') stack.push(obj[k]);
          }
          if (rtmp) break;
        }
      }
    }

    if (!rtmp) return { error: 'roomStore.json 中未找到 rtmp_push_url 字段', status: status ?? undefined };

    const parts = splitRtmp(rtmp);
    if (!parts) return { error: '无法拆分 rtmp_push_url', status: status ?? undefined };

    return { streamUrl: parts.streamUrl, streamKey: parts.streamKey, status: status ?? undefined };
  } catch (e: any) {
    return { error: `无法读取 roomStore.json: ${e?.message || e}` };
  }
}

// ---------------- Douyin API route helpers ----------------
let securityAuthInProgress = false;
let lastAuthUrl: string | null = null;

// 记录最近一次成功获取到的 room/stream，用于 stop 时调用 webcastStop
let lastRoomId: string | null = null;
let lastStreamId: string | null = null;
let lastMode: 'phone' | 'auto' = 'phone';

function sendToRenderer(channel: string, payload: any) {
  const all = BrowserWindow.getAllWindows();
  const win = all.find(w => !w.isDestroyed()) || null;
  if (win) {
    try { win.webContents.send(channel, payload); } catch {}
  }
}

export function registerStreamingHandlers(): void {
  // 获取抖音直播伴侣推流信息
  ipcMain.handle('get-douyin-companion-info', async () => {
    try {
      let isRunning = await checkMediaSDKServerRunning();

      // 先确保快捷键配置写入（尽量在启动伴侣之前）
      await configureHotkeySettings();

      if (!isRunning) {
        const login = await loginDouyinCompanion();
        if (!login.success) {
          return { error: login.error || '启动直播伴侣失败' };
        }
        // 等待伴侣后台服务启动
        await new Promise(r => setTimeout(r, 15000));
        isRunning = await checkMediaSDKServerRunning();
        if (!isRunning) {
          return { error: '启动直播伴侣后，仍未检测到 MediaSDK_Server.exe 运行' };
        }
      }

      // 发送开始直播热键（如果不是全局热键，将尝试聚焦窗口后发送）
      try { await executeStartLiveHotkey(); } catch {}

      // 轮询等待伴侣写入 roomStore.json 并达到状态=2，最多重试 25 次（~25s）
      await new Promise(r => setTimeout(r, 1500));
      let lastErr: any = null;
      for (let i = 0; i < 25; i++) {
        const info = await readCompanionRoomStore();
        if (info.streamUrl && info.streamKey) {
          return { streamUrl: info.streamUrl, streamKey: info.streamKey };
        }
        lastErr = info?.error;
        // 状态未就绪或文件尚未可读，继续等待
        await new Promise(r => setTimeout(r, 1000));
      }
      return { error: lastErr || '未能在限定时间内获取推流信息，请确认直播伴侣已开始直播' };
    } catch (e: any) {
      return { error: e?.message || String(e) };
    }
  });

  // 触发结束直播热键（Shift+L 默认）
  ipcMain.handle('end-live-hotkey', async () => {
    try {
      try { await configureHotkeySettings(); } catch {}
      await executeEndLiveHotkey();
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e?.message || String(e) };
    }
  });

  // 执行自定义快捷键
  ipcMain.handle('execute-custom-hotkey', async (_, keys: string[]) => {
    try {
      await executeCustomHotkey(keys);
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e?.message || String(e) };
    }
  });

  // OBS 推流参数设置
  ipcMain.handle('set-obs-stream-settings', async (_e, { streamUrl, streamKey }) => {
    return await setOBSStreamSettings(streamUrl, streamKey);
  });

  // 启动/停止 OBS 推流
  ipcMain.handle('start-obs-streaming', async () => {
    return await startOBSStreaming();
  });
  ipcMain.handle('stop-obs-streaming', async () => {
    return await stopOBSStreaming();
  });

  // MediaSDK_Server 进程管理
  ipcMain.handle('kill-mediasdk-server', async () => {
    return await killMediaSDKServer();
  });

  // ---------------- Douyin API 路线 ----------------
  ipcMain.handle('open-auth-url', async (_e, { url }) => {
    if (!url) return { success: false, message: '无效的认证地址' };
    if (securityAuthInProgress && lastAuthUrl === url) {
      return { success: true, alreadyInProgress: true };
    }
    securityAuthInProgress = true;
    lastAuthUrl = url;
    try {
      await shell.openExternal(url);
      // 8 秒后允许再次打开
      setTimeout(() => { securityAuthInProgress = false; }, 8000);
      return { success: true };
    } catch (e: any) {
      securityAuthInProgress = false;
      return { success: false, message: e?.message || String(e) };
    }
  });

  // 打开外部链接
  ipcMain.handle('open-external', async (_e, url: string) => {
    try {
      await shell.openExternal(url);
    } catch (e: any) {
      console.error('Failed to open external URL:', e);
      throw e;
    }
  });

  ipcMain.handle('get-douyin-api-info', async (_e, { method }: { method: 'get' | 'create' | 'stop' }) => {
    try {
      const mode = method === 'create' ? 'auto' : 'phone';

      if (method === 'stop') {
        try { stopPingAnchor(); } catch {}
        let stopMsg = '已停止维持心跳';
        try {
          if (lastRoomId && lastStreamId) {
            const res = await webcastStop(lastRoomId, lastStreamId, lastMode);
            if (res?.success) stopMsg = '已停止维持心跳并结束抖音直播';
          }
        } catch {}
        sendToRenderer('status-notification', { message: stopMsg });
        return { success: true, message: stopMsg };
      }

      const result = await douyinApiMain(mode as any, { handleAuth: true });

      // 认证需求
      if (result?.requiresAuth && result?.authUrl) {
        sendToRenderer('auth-notification', { url: result.authUrl, message: result.authPrompt || '需要进行直播安全认证' });
        return { requiresAuth: true, authUrl: result.authUrl };
      }

      // 状态提示
      if (result?.statusMessage) {
        sendToRenderer('status-notification', { message: result.statusMessage, status: result.status });
      }

      // 统一返回结构
      const out: any = {};
      if (result?.needsRetry !== undefined) out.needsRetry = result.needsRetry;
      if (result?.currentStatus !== undefined) out.currentStatus = result.currentStatus;
      if (result?.expectedStatus !== undefined) out.expectedStatus = result.expectedStatus;
      if (result?.room_id) out.room_id = result.room_id;
      if (result?.stream_id) out.stream_id = result.stream_id;

      const rtmp = result?.rtmpUrl || result?.rtmp_push_url;
      if (typeof rtmp === 'string') {
        const parts = splitRtmp(rtmp);
        if (parts) {
          out.streamUrl = parts.streamUrl;
          out.streamKey = parts.streamKey;
        }
      }

      if (result?.error) {
        out.error = result.error;
      }

      // 记录最近一次 room/stream，用于停止时调用 webcastStop
      if (out.room_id && out.stream_id) {
        lastRoomId = String(out.room_id);
        lastStreamId = String(out.stream_id);
        lastMode = mode as any;
      }

      return out;
    } catch (e: any) {
      return { error: e?.message || String(e) };
    }
  });

  ipcMain.handle('maintain-douyin-stream', async (_e, { room_id, stream_id, mode }: { room_id: string; stream_id: string; mode?: 'phone' | 'auto' }) => {
    try {
      const ok = startPingAnchor(room_id, stream_id, (mode as any) || 'phone');
      if (ok) {
        sendToRenderer('status-notification', { message: '已开始维持直播心跳', room_id, stream_id });
        return { success: true, message: '已开始维持直播心跳' };
      }
      return { success: false, message: '无法启动心跳维持' };
    } catch (e: any) {
      return { success: false, message: e?.message || String(e) };
    }
  });
}

