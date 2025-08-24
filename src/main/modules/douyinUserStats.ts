import fetch from 'electron-fetch';
import fs from 'fs/promises';
import pathManager, { PathType } from '../utils/pathManager.js';

export interface DouyinStatsOptions { enableFallback?: boolean; verbose?: boolean }
export interface DouyinUserStatsResult {
  nickname?: string;
  unique_id?: string;
  uid?: string;
  sec_uid?: string;
  avatar_url?: string;
  follower_count?: number;
  following_count?: number;
  total_favorited?: number;
  aweme_count?: number;
  signature?: string;
  live_status?: number;
  room_id?: string;
  source?: 'profile_api' | 'webcast_api';
  timestamp?: string;
}

async function douyinGetUserStats(cookieData: string): Promise<DouyinUserStatsResult | null> {
  const url = 'https://www.douyin.com/aweme/v1/web/user/profile/self/?webid=7497768420516333092&aid=6383&version_code=170400&device_platform=webapp';
  const headers: Record<string,string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Cookie': cookieData,
    'Referer': 'https://www.douyin.com/',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9'
  };
  try {
    const res = await fetch(url, { method: 'GET', headers });
    if (res.status !== 200) return null;
    const data = await res.json() as any;
    const user = data?.user || {};
    if (!user || Object.keys(user).length === 0) return null;
    const avatarUrls: string[] = user?.avatar_thumb?.url_list || [];
    const avatarUrl = avatarUrls.length > 0 ? avatarUrls[0] : '';
    return {
      nickname: user.nickname || '',
      unique_id: user.unique_id || '',
      uid: user.uid || '',
      sec_uid: user.sec_uid || '',
      avatar_url: avatarUrl,
      follower_count: user.follower_count || 0,
      following_count: user.following_count || 0,
      total_favorited: user.total_favorited || 0,
      aweme_count: user.aweme_count || 0,
      signature: user.signature || '',
      live_status: user.live_status || 0,
      room_id: user.room_id_str || ''
    };
  } catch {
    return null;
  }
}

async function douyinGetUserStatsWebcast(cookieData: string): Promise<DouyinUserStatsResult | null> {
  const url = 'https://webcast.amemv.com/webcast/room/get_latest_room/?ac=wifi&app_name=webcast_mate&version_code=5.6.0&device_platform=windows&webcast_sdk_version=1520&resolution=1920%2A1080&os_version=10.0.22631&language=zh&aid=2079&live_id=1&channel=online&device_id=3096676051989080&iid=1117559680415880';
  const headers: Record<string,string> = {
    'Connection': 'Keep-Alive',
    'Content-Type': 'application/x-www-form-urlencoded; Charset=UTF-8',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-cn',
    'Cookie': cookieData,
    'Host': 'webcast.amemv.com',
    'Referer': url,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  };
  try {
    const res = await fetch(url, { method: 'POST', headers });
    if (res.status !== 200) return null;
    const data = await res.json() as any;
    const owner = data?.data?.owner || {};
    if (!owner || Object.keys(owner).length === 0) return null;
    const avatarUrls: string[] = owner?.avatar_thumb?.url_list || [];
    const avatarUrl = avatarUrls.length > 0 ? avatarUrls[0] : '';
    return {
      nickname: owner.nickname || '',
      unique_id: owner.unique_id || owner.display_id || '',
      uid: owner.id_str || '',
      sec_uid: owner.sec_uid || '',
      avatar_url: avatarUrl,
      follower_count: owner.follow_info?.follower_count || 0,
      following_count: owner.follow_info?.following_count || 0,
      total_favorited: owner.total_favorited || 0,
      aweme_count: owner.aweme_count || 0,
      room_id: data?.data?.id_str || '',
      live_status: data?.data?.status || 0,
      signature: owner.signature || ''
    };
  } catch {
    return null;
  }
}

export async function getdouyinUserStats(options: DouyinStatsOptions = {}): Promise<DouyinUserStatsResult | null> {
  const { enableFallback = true } = options;
  // Read cookie file saved by login modules
  const cookieFile = pathManager.getPath(PathType.DOUYIN_COOKIES);
  let cookie: string = '';
  try {
    cookie = (await fs.readFile(cookieFile, 'utf8')).trim();
  } catch (e) {
    throw new Error('Cookie文件不存在，请先登录');
  }
  if (!cookie || cookie.length < 50) {
    throw new Error('Cookie内容异常，请重新登录');
  }
  const primary = await douyinGetUserStats(cookie);
  if (primary) return { ...primary, source: 'profile_api', timestamp: new Date().toISOString() };
  if (enableFallback) {
    const fb = await douyinGetUserStatsWebcast(cookie);
    if (fb) return { ...fb, source: 'webcast_api', timestamp: new Date().toISOString() };
  }
  throw new Error('无法获取用户统计信息，请检查网络或重新登录');
}

