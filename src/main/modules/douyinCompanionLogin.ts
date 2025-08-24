import { exec } from 'child_process';
import { getSoftwareVersion, getSoftwarePath } from '../utils/findSoftwarePaths.js';
import { getDouyinCompanionCookies } from './getDouyinCompanionCookies';

export interface DouyinLoginResult {
  success: boolean;
  cookies?: Array<{ name: string; value: string }>;
  cookieString?: string;
  error?: string;
}

export async function loginDouyinCompanion(): Promise<DouyinLoginResult> {
  try {
    const version = await getSoftwareVersion('直播伴侣');
    if (!version) {
      return { success: false, error: '未检测到直播伴侣，请先安装直播伴侣' };
    }

    // 启动直播伴侣（可选）
    try {
      const exePath = await getSoftwarePath('直播伴侣');
      if (exePath) {
        exec(`"${exePath}"`, () => {});
      }
    } catch {}

    // 直接提取 Cookie
    const result = await getDouyinCompanionCookies();
    return result as DouyinLoginResult;
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export default loginDouyinCompanion;

