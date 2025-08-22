import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

function caseInsensitiveIncludes(str1, str2) {
  return str1.toLowerCase().includes(str2.toLowerCase());
}

/**
 * 获取正在运行进程的路径
 * @param {string} processName 进程名称（包含.exe）
 * @returns {string|null} 进程路径或null
 */
function getRunningProcessPath(processName) {
  try {
    // 方法1: 使用wmic
    const command = `wmic process where "name='${processName}'" get ExecutablePath`;
    const result = execSync(command, { encoding: 'utf8' });
    const lines = result.trim().split('\n');
    if (lines.length > 1 && lines[1].trim()) {
      return lines[1].trim();
    }

    // 备选: 使用PowerShell
    const psCommand = `chcp 65001 > nul && powershell -command "(Get-Process -Name '${processName.replace('.exe', '')}' -ErrorAction SilentlyContinue | Select-Object -First 1).Path"`;
    const psResult = execSync(psCommand, { encoding: 'utf8' });
    if (psResult.trim()) {
      return psResult.trim();
    }

    return null;
  } catch (error) {
    // console.error(`获取进程路径失败: ${error.message}`); // 找不到进程时会报错，属于正常情况，无需打印
    return null;
  }
}

/**
 * 从快捷方式获取目标路径
 * @param {string} shortwareName 快捷方式名称（不含.lnk）
 * @returns {string|null} 目标路径或null
 */
function getPathFromShortcut(shortwareName) {
  try {
    const locations = [
      path.join(os.homedir(), 'Desktop'),
      path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
      path.join('C:', 'ProgramData', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
      path.join('C:', 'Users', 'Public', 'Desktop'),
      path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Internet Explorer', 'Quick Launch', 'User Pinned', 'TaskBar')
    ];

    const possibleNames = [
      shortwareName,
    ].filter(Boolean);

    for (const location of locations) {
      if (!fs.existsSync(location)) continue;

      const files = fs.readdirSync(location);

      for (const file of files) {
        if (!file.toLowerCase().endsWith('.lnk')) continue;
        if (possibleNames.some(name => caseInsensitiveIncludes(file, name))) {
          const shortcutPath = path.join(location, file);
          return shortcutPath;
        }
      }
    }

    return null;
  } catch (error) {
    console.error(`获取快捷方式路径失败: ${error.message}`);
    return null;
  }
}

/**
 * 从注册表获取软件路径
 * @param {string} shortwareName 软件名称
 * @param {string} processName 进程名称
 * @returns {string|null} 软件路径或null
 */
function getPathFromRegistry(shortwareName, processName) {
  if (processName === '直播伴侣.exe') {
    processName = '直播伴侣 Launcher.exe';
  }
  const regPaths = [
    "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
    "HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
    "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall"
  ];

  for (const regPath of regPaths) {
    try {
      const command = `chcp 65001 > nul && reg query "${regPath}" /s /v DisplayIcon`;
      const output = execSync(command, { encoding: "utf8" });
      for (const line of output.split("\n")) {
        if (line.includes("DisplayIcon")) {
          const match = line.match(/DisplayIcon\s+REG_SZ\s+(.+)/);
          if (match) {
            const iconPath = match[1].trim();
            const cleanPath = iconPath.split(",")[0];
            if (caseInsensitiveIncludes(cleanPath, processName)) {
              const pathMatch = cleanPath.match(/[a-zA-Z]:\\.*?\.exe/i);
              return pathMatch ? pathMatch[0] : null;
            }
          }
        }
      }
    } catch (err) {
      // console.error(`查询注册表失败 (${regPath}):`, err.message); // 找不到注册表项是正常情况
    }
  }
  return null;
}

/**
 * 获取软件路径的主函数
 * @param {string} softwareName 软件名称
 * @param {string} processName 进程名称（可选，默认为softwareName.exe）
 * @returns {Promise<string|null>} 软件路径或null
 */
async function getSoftwarePath(softwareName, processName = null) {
  processName = (softwareName === 'OBS Studio') ? 'obs64.exe' : `${softwareName}.exe`;

  console.log(`正在查找 ${softwareName} 的路径...`);

  // 方法1: 检查正在运行的进程
  let foundPath = getRunningProcessPath(processName);
  if (foundPath) {
    console.log(`通过运行进程找到路径: ${foundPath}`);
    return foundPath;
  }

  // 方法2: 检查快捷方式并直接解析
  const shortcutPath = getPathFromShortcut(softwareName);
  if (shortcutPath) {
    console.log(`通过快捷方式找到路径: ${shortcutPath}`);
    const targetPath = await resolveShortcutTarget(shortcutPath);
    if (targetPath) {
      return targetPath;
    }
  }

  // 方法3: 从注册表获取
  foundPath = getPathFromRegistry(softwareName, processName);
  if (foundPath) {
    console.log(`通过注册表找到路径: ${foundPath}`);
    return foundPath;
  }

  console.log(`未能找到 ${softwareName} 的路径`);
  return null;
}

/**
 * 获取文件的版本号
 * @param {string} filePath 文件路径
 * @returns {Promise<string|null>} 版本号或null
 */
async function getFileVersion(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`文件不存在: ${filePath}`);
      return null;
    }

    const ext = path.extname(filePath).toLowerCase();
    if (ext !== '.exe' && ext !== '.dll') {
      console.warn(`文件类型可能不支持版本信息: ${ext}`);
    }

    try {
      const command = `chcp 65001 > nul && powershell -command "(Get-Item -LiteralPath '${filePath.replace(/'/g, "''")}').VersionInfo.FileVersion"`;
      const result = execSync(command, { encoding: 'utf8', timeout: 5000 });

      const version = result.trim();
      if (version && version !== '') {
        const cleanVersion = version.replace(/[^\d.]/g, '').trim();
        if (cleanVersion) {
          console.log(`获取到文件版本: ${cleanVersion}`);
          return cleanVersion;
        }
      }
    } catch (psError) {
      console.debug(`PowerShell获取版本失败: ${psError.message}`);
    }

    try {
      const escapedPath = filePath.replace(/\\/g, '\\\\');
      const wmicCommand = `wmic datafile where "name='${escapedPath}'" get version`;
      const wmicResult = execSync(wmicCommand, { encoding: 'utf8', timeout: 5000 });

      const lines = wmicResult.trim().split('\n');
      if (lines.length > 1) {
        const version = lines[1].trim();
        if (version) {
          console.log(`通过wmic获取到文件版本: ${version}`);
          return version;
        }
      }
    } catch (wmicError) {
      console.debug(`wmic获取版本失败: ${wmicError.message}`);
    }

    console.error(`无法获取文件版本: ${filePath}`);
    return null;
  } catch (error) {
    console.error(`获取文件版本时出错: ${error.message}`);
    return null;
  }
}

/**
 * 解析快捷方式文件获取目标路径
 * @param {string} shortcutPath 快捷方式文件路径
 * @returns {Promise<string|null>} 目标路径或null
 */
async function resolveShortcutTarget(shortcutPath) {
  try {
    if (!shortcutPath.toLowerCase().endsWith('.lnk')) {
      return shortcutPath;
    }

    const command = `chcp 65001 > nul && powershell -command "$shell = New-Object -ComObject WScript.Shell; $shortcut = $shell.CreateShortcut('${shortcutPath.replace(/'/g, "''")}'); $shortcut.TargetPath"`;
    const result = execSync(command, { encoding: 'utf8', timeout: 5000 });

    const targetPath = result.trim();
    if (targetPath && targetPath !== '') {
      console.log(`快捷方式目标路径: ${targetPath}`);
      return targetPath;
    }

    console.error(`无法解析快捷方式: ${shortcutPath}`);
    return null;
  } catch (error) {
    console.error(`解析快捷方式时出错: ${error.message}`);
    return shortcutPath;
  }
}

/**
 * 获取软件的版本号
 * @param {string} softwareName 软件名称
 * @param {string} processName 进程名称（可选，默认为softwareName.exe）
 * @returns {Promise<string|null>} 版本号或null
 */
async function getSoftwareVersion(softwareName, processName = null) {
  try {
    const softwarePath = await getSoftwarePath(softwareName, processName);
    if (!softwarePath) {
      console.error(`未找到软件路径，无法获取版本: ${softwareName}`);
      return null;
    }
    // getSoftwarePath 现在直接返回最终路径，无需再解析
    return await getFileVersion(softwarePath);
  } catch (error) {
    console.error(`获取软件版本时出错: ${error.message}`);
    return null;
  }
}

export {
  getSoftwarePath,
  getSoftwareVersion,
  getRunningProcessPath,
  getPathFromShortcut,
  getPathFromRegistry,
  getFileVersion,
  resolveShortcutTarget,
};
