import * as fs from 'fs';
import fsp from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

function getStreamEncoderPath(profileName: string) {
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  return path.join(appData, 'obs-studio', 'basic', 'profiles', profileName, 'streamEncoder.json');
}

export async function configureEncoder(encoderName: string, profileName: string) {
  try {
    // defaults
    let cfg: any = { bitrate: 18000, keyint_sec: 2, preset: 'medium', profile: 'high' };

    if (encoderName === 'jim_nvenc') {
      cfg = { bitrate: 20000, keyint_sec: 2, preset: 'p7', profile: 'high' };
    } else if (encoderName === 'amd_amf_h264') {
      cfg = { bitrate: 20000, keyint_sec: 2, quality: 'quality', profile: 'high' };
    } else if (encoderName === 'obs_qsv11_v2') {
      cfg = { bitrate: 18000, keyint_sec: 2, target_usage: 'TU1' };
    }

    const outPath = getStreamEncoderPath(profileName);
    await fsp.mkdir(path.dirname(outPath), { recursive: true });
    await fsp.writeFile(outPath, JSON.stringify(cfg, null, 2), 'utf8');

    return { success: true, message: `编码器配置写入完成: ${outPath}`, profileName, encoderName };
  } catch (e: any) {
    return { success: false, message: `编码器配置失败: ${e?.message || String(e)}` };
  }
}

