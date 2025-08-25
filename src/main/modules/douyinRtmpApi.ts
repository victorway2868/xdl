/* Douyin RTMP API (migrated from oldprogram) with basic production hardening
 * - Provides: getStreamURL, webcastStart, startPingAnchor, stopPingAnchor, main
 * - Avoids writing sensitive data to disk; logs are lightly sanitized
 */

import fs from 'fs';
import axios from 'axios';
import { getPath, PathType } from '@main/utils/pathManager';

export type Mode = 'phone' | 'auto';

function readCookiesFromFile(): string | null {
  try {
    const cookieFilePath = getPath(PathType.DOUYIN_COOKIES);
    if (cookieFilePath && fs.existsSync(cookieFilePath)) {
      const raw = fs.readFileSync(cookieFilePath, 'utf8').trim();
      return raw || null;
    }
    return null;
  } catch (e: any) {
    console.error('readCookiesFromFile error:', e?.message || e);
    return null;
  }
}

function buildRequest(mode: Mode): { url: string; data: any; agentValue: string } {
  if (mode === 'phone') {
    return {
      url: 'https://webcast.amemv.com/webcast/room/get_latest_room/?ac=wifi&app_name=webcast_mate&version_code=5.6.0&device_platform=windows&webcast_sdk_version=1520&resolution=1920%2A1080&os_version=10.0.22631&language=zh&aid=2079&live_id=1&channel=online&device_id=3096676051989080&iid=1117559680415880',
      data: {},
      agentValue: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    };
  }
  return {
    url: 'https://webcast.amemv.com/webcast/room/create/?ac=wifi&app_name=webcast_mate&version_code=5.6.0&webcast_sdk_version=1520&device_platform=android&resolution=1920*1080&os_version=10.0.22631&language=zh&aid=2079&live_id=1&channel=online&device_id=2515294039547702&iid=1776452427890550',
    data: {
      multi_resolution: 'true',
      title: '我刚刚开播,大家快来看吧',
      thumb_width: '1080',
      thumb_height: '1920',
      orientation: '0',
      base_category: '416',
      category: '1124',
      has_commerce_goods: 'false',
      disable_location_permission: '1',
      push_stream_type: '3',
      auto_cover: '1',
      cover_uri: '',
      third_party: '1',
      gift_auth: '1',
      record_screen: '1',
    },
    agentValue: 'okhttp/3.10.0.1',
  };
}

function buildHeaders(url: string, cookie: string, agentValue: string): Record<string, string> {
  return {
    Connection: 'Keep-Alive',
    'Content-Type': 'application/x-www-form-urlencoded; Charset=UTF-8',
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'zh-cn',
    Cookie: cookie,
    Host: 'webcast.amemv.com',
    Referer: url,
    'User-Agent': agentValue,
    Origin: 'file://',
    'Sec-Fetch-Site': 'cross-site',
    'Sec-Fetch-Mode': 'cors',
    'X-Requested-With': 'XMLHttpRequest',
  };
}

export async function getStreamURL(mode: Mode = 'phone'): Promise<any> {
  try {
    const cookie = readCookiesFromFile();
    if (!cookie) {
      return { success: false, error: 'No cookie data available' };
    }

    const { url, data, agentValue } = buildRequest(mode);
    const headers = buildHeaders(url, cookie, agentValue);

    const response = await axios.post(url, data, { headers, timeout: 10000 });
    if (response.status !== 200) {
      return { success: false, error: `HTTP Error: ${response.status} - ${response.statusText}` };
    }

    const rd = response.data || {};

    // 需要安全认证
    if (rd.status_code === 4003028 && rd.extra?.web_auth_address) {
      const customAuthMessage = '直播安全认证，请完成后重试！';
      return { success: false, status_code: 4003028, status_msg: customAuthMessage, web_auth_address: rd.extra.web_auth_address, requiresAuth: true };
    }

    if (rd.status_code !== undefined && rd.status_code !== 0) {
      return { success: false, error: rd.status_msg || 'Unknown error' };
    }

    const status = rd?.data?.status;
    const room_id = rd?.data?.living_room_attrs?.room_id_str ?? String(rd?.data?.living_room_attrs?.room_id ?? '');
    const stream_id = rd?.data?.stream_id_str ?? String(rd?.data?.stream_id ?? '');
    const rtmp_push_url = rd?.data?.stream_url?.rtmp_push_url;

    const isReady = (status === 2 && mode === 'phone') || (status === 1 && mode === 'auto');

    // 日志脱敏
    if (rtmp_push_url) {
      const server = rtmp_push_url.substring(0, Math.max(0, rtmp_push_url.lastIndexOf('/')));
      console.log(`[DouyinAPI] status=${status}, room_id=${room_id}, stream_id=${stream_id}, server=${server}`);
    } else {
      console.log(`[DouyinAPI] status=${status}, room_id=${room_id}, stream_id=${stream_id}`);
    }

    return { success: true, status, room_id, stream_id, rtmp_push_url, isReady };
  } catch (e: any) {
    return { success: false, error: e?.message || String(e) };
  }
}

export async function webcastStart(room_id: string, stream_id: string, mode: Mode = 'phone'): Promise<any> {
  try {
    const cookie = readCookiesFromFile();
    if (!cookie) return { success: false, error: 'No cookie data available' };

    const url = mode === 'phone'
      ? 'https://webcast.amemv.com/webcast/room/ping/anchor/?ac=wifi&app_name=webcast_mate&version_code=5.6.0&device_platform=windows&webcast_sdk_version=1520&resolution=1920%2A1080&os_version=10.0.22631&language=zh&aid=2079&live_id=1&channel=online&device_id=3096676051989080&iid=1117559680415880'
      : 'https://webcast.amemv.com/webcast/room/ping/anchor/?ac=wifi&app_name=webcast_mate&version_code=5.6.0&webcast_sdk_version=1520&device_platform=android&resolution=1920*1080&os_version=10.0.22631&language=zh&aid=2079&live_id=1&channel=online&device_id=2515294039547702&iid=1776452427890550';
    const agentValue = mode === 'phone' ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0' : 'okhttp/3.10.0.1';

    const headers = buildHeaders(url, cookie, agentValue);
    const data = `stream_id=${stream_id}&room_id=${room_id}&status=2`;

    const response = await axios.post(url, data, { headers, timeout: 10000 });
    if (response.status !== 200) return { success: false, error: `HTTP Error: ${response.status}` };

    const rd = response.data || {};
    if (rd.status_code !== undefined && rd.status_code !== 0) {
      return { success: false, error: rd.status_msg || 'Unknown error', response: rd };
    }
    return { success: true, response: rd };
  } catch (e: any) {
    return { success: false, error: e?.message || String(e) };
  }
}


export async function webcastStop(room_id: string, stream_id: string, mode: Mode = 'phone'): Promise<any> {
  try {
    const cookie = readCookiesFromFile();
    if (!cookie) return { success: false, error: 'No cookie data available' };

    const url = mode === 'phone'
      ? 'https://webcast.amemv.com/webcast/room/ping/anchor/?ac=wifi&app_name=webcast_mate&version_code=5.6.0&device_platform=windows&webcast_sdk_version=1520&resolution=1920%2A1080&os_version=10.0.22631&language=zh&aid=2079&live_id=1&channel=online&device_id=3096676051989080&iid=1117559680415880'
      : 'https://webcast.amemv.com/webcast/room/ping/anchor/?ac=wifi&app_name=webcast_mate&version_code=5.6.0&webcast_sdk_version=1520&device_platform=android&resolution=1920*1080&os_version=10.0.22631&language=zh&aid=2079&live_id=1&channel=online&device_id=2515294039547702&iid=1776452427890550';
    const agentValue = mode === 'phone' ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0' : 'okhttp/3.10.0.1';

    const headers = buildHeaders(url, cookie, agentValue);
    const data = `stream_id=${stream_id}&room_id=${room_id}&status=4&reason_no=1`;

    const response = await axios.post(url, data, { headers, timeout: 10000 });
    if (response.status !== 200) return { success: false, error: `HTTP Error: ${response.status}` };

    const rd = response.data || {};
    if (rd.status_code !== undefined && rd.status_code !== 0) {
      return { success: false, error: rd.status_msg || 'Unknown error', response: rd };
    }
    return { success: true, response: rd };
  } catch (e: any) {
    return { success: false, error: e?.message || String(e) };
  }
}




let pingIntervalId: NodeJS.Timeout | null = null;
let pingCount = 0;
const LOG_EVERY = 10; // 节流日志输出

export function startPingAnchor(room_id: string, stream_id: string, mode: Mode = 'phone'): boolean {
  stopPingAnchor();
  pingCount = 0;
  console.log(`[DouyinAPI] start ping anchor room=${room_id}, stream=${stream_id}, mode=${mode}`);
  pingIntervalId = setInterval(async () => {
    try {
      pingCount++;
      const r = await webcastStart(room_id, stream_id, mode);
      if (pingCount % LOG_EVERY === 0) {
        if (r.success) console.log(`[DouyinAPI] ping ok #${pingCount}`);
        else console.warn(`[DouyinAPI] ping fail #${pingCount}: ${r.error}`);
      }
    } catch (e: any) {
      if (pingCount % LOG_EVERY === 0) console.warn(`[DouyinAPI] ping error #${pingCount}: ${e?.message || e}`);
    }
  }, 3000);
  return true;
}

export function stopPingAnchor(): boolean {
  if (pingIntervalId) {
    clearInterval(pingIntervalId);
    pingIntervalId = null;
    pingCount = 0;
    console.log('[DouyinAPI] stop ping anchor');
    return true;
  }
  return false;
}

export async function main(mode: Mode = 'phone', options: { handleAuth?: boolean } = { handleAuth: false }): Promise<any> {
  const streamResult = await getStreamURL(mode);

  if ((streamResult.status_code === 4003028 || streamResult.requiresAuth) && streamResult.web_auth_address && options.handleAuth) {
    const customAuthMessage = '直播安全认证，请完成后重试！';
    return { requiresAuth: true, authUrl: streamResult.web_auth_address, authPrompt: customAuthMessage };
  }

  if (!streamResult.success) {
    return { error: streamResult.error || '获取推流信息失败' };
  }

  // phone 模式期望 status=2
  if (mode === 'phone') {
    if (streamResult.status === 4) {
      return {
        currentStatus: streamResult.status,
        room_id: streamResult.room_id,
        stream_id: streamResult.stream_id,
      };
    } else if (streamResult.status === 2) {
      const rtmpUrl = streamResult.rtmp_push_url;
      let streamUrl = '';
      let streamKey = '';
      if (typeof rtmpUrl === 'string') {
        const idx = rtmpUrl.lastIndexOf('/');
        if (idx > 0) { streamUrl = rtmpUrl.substring(0, idx); streamKey = rtmpUrl.substring(idx + 1); }
      }
      // 就绪则默认启动心跳包
      if (streamResult.room_id && streamResult.stream_id) startPingAnchor(streamResult.room_id, streamResult.stream_id, mode);
      return {
        room_id: streamResult.room_id,
        stream_id: streamResult.stream_id,
        rtmpUrl,
        streamUrl,
        streamKey,
      };
    } else {
      return {
        currentStatus: streamResult.status,
        room_id: streamResult.room_id,
        stream_id: streamResult.stream_id,
      };
    }
  }

  // 其他模式（auto）
  const rtmpUrl = streamResult.rtmp_push_url;
  let streamUrl = '';
  let streamKey = '';
  if (typeof rtmpUrl === 'string') {
    const idx = rtmpUrl.lastIndexOf('/');
    if (idx > 0) { streamUrl = rtmpUrl.substring(0, idx); streamKey = rtmpUrl.substring(idx + 1); }
  }

  if (streamResult.isReady && streamResult.room_id && streamResult.stream_id) startPingAnchor(streamResult.room_id, streamResult.stream_id, mode);

  return {
    rtmpUrl,
    room_id: streamResult.room_id,
    stream_id: streamResult.stream_id,
    streamUrl,
    streamKey,
  };
}

