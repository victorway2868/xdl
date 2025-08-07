
// ES module imports
import os from 'os';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { app } from 'electron';

/**
 * Get font file path for development and production environments
 * @returns {string} Path to the font file
 */
function getFontPath() {
  const fontFileName = 'CangErShuYuanTiW04-2.ttf';

  if (app.isPackaged) {
    // 生产环境 - 尝试多个可能的路径
    const possiblePaths = [
      // 标准打包路径
      path.join(path.dirname(app.getPath('exe')), 'resources', 'app', 'public', 'fonts', fontFileName),
      // 备用路径1 - 直接在resources下
      path.join(path.dirname(app.getPath('exe')), 'resources', 'public', 'fonts', fontFileName),
      // 备用路径2 - 在app目录下
      path.join(app.getAppPath(), 'public', 'fonts', fontFileName),
      // 备用路径3 - 在extraResources中
      path.join(process.resourcesPath, 'public', 'fonts', fontFileName)
    ];

    // 尝试找到存在的字体文件
    for (const fontPath of possiblePaths) {
      if (fs.existsSync(fontPath)) {
        console.log(`找到字体文件: ${fontPath}`);
        return fontPath;
      }
    }

    // 如果都没找到，返回第一个路径（用于错误报告）
    console.warn('未找到字体文件，尝试的路径:', possiblePaths);
    return possiblePaths[0];
  } else {
    // 开发环境 - 字体文件在项目的public/fonts目录中
    return path.join(app.getAppPath(), 'public', 'fonts', fontFileName);
  }
}

function filesAreEqual(file1, file2) {
  try {
    const buf1 = fs.readFileSync(file1);
    const buf2 = fs.readFileSync(file2);
    return buf1.equals(buf2);
  } catch (err) {
    return false;
  }
}

function installFonts() {
  const platform = os.platform();
  let targetDir;

  // 识别平台对应的字体目录
  if (platform === 'win32') {
    targetDir = path.join(process.env.WINDIR, 'Fonts');
  } else if (platform === 'darwin') {
    targetDir = path.join(process.env.HOME, 'Library', 'Fonts');
  } else if (platform === 'linux') {
    targetDir = path.join(process.env.HOME, '.local', 'share', 'fonts');
    fs.mkdirSync(targetDir, { recursive: true }); // 创建字体目录（如果不存在）
  } else {
    console.error(`不支持的平台: ${platform}`);
    return {
      success: false,
      message: `不支持的平台: ${platform}`
    };
  }

  // 获取字体文件路径（支持开发和生产环境）
  const fontFile = getFontPath();
  console.log(`字体文件路径: ${fontFile}`);

  // 检查字体文件是否存在
  if (!fs.existsSync(fontFile)) {
    const errorMessage = `字体文件不存在: ${fontFile}`;
    console.error(errorMessage);
    return {
      success: false,
      message: errorMessage
    };
  }

  const fontName = path.basename(fontFile);
  const targetPath = path.join(targetDir, fontName);

  try {
    // 判断是否已存在且内容一致
    if (fs.existsSync(targetPath) && filesAreEqual(fontFile, targetPath)) {
      console.log('字体已安装，无需重复安装。✅');
      return {
        success: true,
        message: '字体已安装，无需重复安装。'
      };
    }

    // 拷贝字体文件
    fs.copyFileSync(fontFile, targetPath);
    console.log(`字体已复制到: ${targetPath}`);

    // Linux/macOS 需要刷新字体缓存
    if (platform === 'linux' || platform === 'darwin') {
      console.log('刷新字体缓存...');
      execSync('fc-cache -f -v', { stdio: 'ignore' });
    }

    console.log('字体安装完成 ✅');
    return {
      success: true,
      message: '字体安装完成'
    };
  } catch (err) {
    const errorMessage = `字体安装失败: ${err.message}`;
    console.error('字体安装失败 ❌', err.message);
    return {
      success: false,
      message: errorMessage
    };
  }
}

// ES module exports
export {
  installFonts,
  getFontPath,
  filesAreEqual
};
