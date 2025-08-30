import axios from 'axios';
import fs from 'fs/promises';
import { getPath, PathType } from '../utils/pathManager';

const USER_API = 'https://webcast.amemv.com/webcast/user/me/?aid=2079&device_platform=windows&version_code=5.6.0';
const AGENT_VALUE = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';

export interface DouyinUserInfo {
  nickname: string;
  userId: string;
  liveid: string;
  avatarUrl: string;
  followerCount: number;
  followingCount: number;
}

async function fetchDouyinUserInfo(cookie: string): Promise<DouyinUserInfo | null> {
  const headers = {
    'Connection': 'Keep-Alive',
    'Content-Type': 'application/x-www-form-urlencoded; Charset=UTF-8',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-cn',
    'Cookie': cookie,
    'Host': 'webcast.amemv.com',
    'Referer': 'https://webcast.amemv.com/webcast/',
    'User-Agent': AGENT_VALUE,
    'Origin': 'https://webcast.amemv.com',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-Mode': 'cors',
  };

  try {
    const response = await axios.get(USER_API, { headers });
    const data = response.data;

    if (data.status_code === 0) {
      const userData = data.data || {};
      const userInfo: DouyinUserInfo = {
        nickname: userData.nickname || '未知',
        userId: userData.id || '未知',
        liveid: userData.short_id || '未知',        
        avatarUrl: (userData.avatar_thumb && userData.avatar_thumb.url_list && userData.avatar_thumb.url_list[0]) || '未知',
        followerCount: (userData.follow_info && userData.follow_info.follower_count) || 0,
        followingCount: (userData.follow_info && userData.follow_info.following_count) || 0,
      };
      return userInfo;
    } else {
      throw new Error(`API returned error: ${data.status_msg || 'Unknown error'}`);
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Axios error: ${error.message}`);
    } else {
      throw error;
    }
  }
}

export async function getDouyinUserInfo(): Promise<DouyinUserInfo | null> {
  const cookieFile = getPath(PathType.DOUYIN_COOKIES);
  let cookie: string;
  try {
    cookie = (await fs.readFile(cookieFile, 'utf8')).trim();
    if (!cookie || cookie.length < 50) {
      throw new Error('Cookie is invalid');
    }
  } catch {
    throw new Error('Cookie file not found or unreadable');
  }

  return fetchDouyinUserInfo(cookie);
}

