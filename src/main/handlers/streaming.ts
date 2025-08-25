import { ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import { loginDouyinCompanion } from '../modules/douyinCompanionLogin';
import { configureHotkeySettings } from '../modules/douyinHotkey';
import { executeStartLiveHotkey, executeEndLiveHotkey } from '../modules/keyboardShortcut';
import { checkMediaSDKServerRunning, killMediaSDKServer } from '../modules/mediaSdkProcess';
import { setOBSStreamSettings, startOBSStreaming, stopOBSStreaming } from '../modules/obsWebSocket';

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
}

