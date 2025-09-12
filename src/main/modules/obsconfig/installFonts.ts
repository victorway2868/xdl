import os from 'os';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import { app } from 'electron';

function buffersEqual(a: Buffer, b: Buffer) {
  if (a.byteLength !== b.byteLength) return false;
  return a.equals(b);
}

function safeExists(p: string) {
  try { return fs.existsSync(p); } catch { return false; }
}

export function getFontPath(): string {
  const fontFileName = 'CangErShuYuanTiW04-2.ttf';
  if (app.isPackaged) {
    const candidates = [
      path.join(path.dirname(app.getPath('exe')), 'resources', 'app', 'appassets', 'fonts', fontFileName),
      path.join(path.dirname(app.getPath('exe')), 'resources', 'appassets', 'fonts', fontFileName),
      path.join(app.getAppPath(), 'appassets', 'fonts', fontFileName),
      path.join(app.getAppPath(), 'fonts', fontFileName),
      path.join(process.resourcesPath, 'appassets', 'fonts', fontFileName),
      path.join(process.resourcesPath, 'fonts', fontFileName),
    ];
    for (const p of candidates) {
      if (safeExists(p)) return p;
    }
    // fallback to first for error message
    return candidates[0];
  } else {
    return path.join(app.getAppPath(), 'appassets', 'fonts', fontFileName);
  }
}

export async function installFonts(): Promise<{ success: boolean; message?: string; error?: string }>{
  const platform = os.platform();
  let targetDir: string;
  if (platform === 'win32') {
    targetDir = path.join(process.env.WINDIR || 'C:/Windows', 'Fonts');
  } else if (platform === 'darwin') {
    targetDir = path.join(process.env.HOME || os.homedir(), 'Library', 'Fonts');
  } else if (platform === 'linux') {
    targetDir = path.join(process.env.HOME || os.homedir(), '.local', 'share', 'fonts');
    try { await fsp.mkdir(targetDir, { recursive: true }); } catch {}
  } else {
    return { success: false, error: `不支持的平台: ${platform}` };
  }

  const fontFile = getFontPath();
  console.log('fontFile', fontFile);
  if (!safeExists(fontFile)) {
    return { success: false, error: `字体文件不存在: ${fontFile}` };
  }
  const fontName = path.basename(fontFile);
  const targetPath = path.join(targetDir, fontName);

  try {
    // 如果已存在且内容相同则跳过
    if (safeExists(targetPath)) {
      try {
        const [src, dst] = [await fsp.readFile(fontFile), await fsp.readFile(targetPath)];
        if (buffersEqual(src, dst)) {
          return { success: true, message: '字体已安装，无需重复安装。' };
        }
      } catch {}
    }

    await fsp.copyFile(fontFile, targetPath);

    if (platform === 'linux' || platform === 'darwin') {
      try { execSync('fc-cache -f -v', { stdio: 'ignore' }); } catch {}
    }

    return { success: true, message: `字体安装完成: ${targetPath}` };
  } catch (e: any) {
    return { success: false, error: `字体安装失败: ${e?.message || String(e)}` };
  }
}

