import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';


// 存储软件路径的配置文件
const CONFIG_FILE = path.join(os.homedir(), 'app_paths.json');
function caseInsensitiveIncludes(str1, str2) {
  return str1.toLowerCase().includes(str2.toLowerCase());
}

/**
 * 从配置文件获取软件路径
 * @param {string} softwareName 软件名称
 * @returns {string|null} 软件路径或null
 */
function getPathFromConfig(softwareName) {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      const config = JSON.parse(data);

      if (config[softwareName] && config[softwareName].path) {
        return config[softwareName].path;
      }
    }

    return null;
  } catch (error) {
    console.error(`读取配置失败: ${error.message}`);
    return null;
  }
}

/**
 * 保存软件路径到配置文件
 * @param {string} softwareName 软件名称
 * @param {string} filePath 软件路径
 * @returns {boolean} 保存是否成功
 */
function savePathToConfig(softwareName, filePath) {
  try {
    let config = {};

    // 读取现有配置（如果存在）
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      config = JSON.parse(data);
    }

    // 更新配置
    config[softwareName] = {
      path: filePath,
      updated: new Date().toISOString()
    };

    // 保存配置
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    console.log(`已保存 ${softwareName} 的路径到配置文件`);
    return true;
  } catch (error) {
    console.error(`保存配置失败: ${error.message}`);
    return false;
  }
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
    if (lines.length > 1) {
      return lines[1].trim();
    }

    // 备选: 使用PowerShell
    const psCommand = `chcp 65001 > nul && powershell -command "Get-Process ${processName.replace('.exe', '')} | Select-Object Path | Format-Table -HideTableHeaders"`;
    const psResult = execSync(psCommand, { encoding: 'utf8' });
    if (psResult.trim()) {
      return psResult.trim();
    }

    return null;
  } catch (error) {
    console.error(`获取进程路径失败: ${error.message}`);
    return null;
  }
}

/**
 * 从快捷方式获取目标路径
 * @param {string} shortcutName 快捷方式名称（不含.lnk）
 * @returns {string|null} 目标路径或null
 */
function getPathFromShortcut(shortwareName) {
  try {
    // 扩展快捷方式搜索位置
    const locations = [
      path.join(os.homedir(), 'Desktop'),
      path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
      path.join('C:', 'ProgramData', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
      // 添加更多常见位置
      path.join('C:', 'Users', 'Public', 'Desktop'),
      path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Internet Explorer', 'Quick Launch', 'User Pinned', 'TaskBar')
    ];

    // 支持模糊匹配文件名
    const possibleNames = [
      shortwareName,
      shortwareName.toLowerCase(),
      shortwareName.toUpperCase(),
      // 处理特殊软件名称
      // shortwareName === 'OBS Studio' ? 'obs64' : null,
      // shortwareName === '直播伴侣' ? 'webcast_mate' : null
    ].filter(Boolean);

    for (const location of locations) {
      if (!fs.existsSync(location)) continue;

      // 读取目录下所有文件
      const files = fs.readdirSync(location);

      for (const file of files) {
        if (!file.endsWith('.lnk')) continue;
        // 检查是否匹配任一可能的名称
        // if (possibleNames.some(name => caseInsensitiveIncludes(file,name))) {
        if (possibleNames.some(name => name === file.replace('.lnk', ''))) {
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
 * @param {string} processName 软件名称
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
      // 查询注册表
      // const output = execSync(`reg query "${regPath}" /s /v DisplayIcon`, { encoding: "utf8" });
      // 设置代码页为 UTF-8，然后执行注册表查询
      const command = `chcp 65001 > nul && reg query "${regPath}" /s /v DisplayIcon`;
      const output = execSync(command, { encoding: "utf8" });
      // 解析注册表数据
      for (const line of output.split("\n")) {
        if (line.includes("DisplayIcon")) {
          // 提取 DisplayIcon 路径
          const match = line.match(/DisplayIcon\s+REG_SZ\s+(.+)/);
          if (match) {
            const iconPath = match[1].trim();
            // 忽略后面的 `,0` 或 `,1` 之类的索引
            const cleanPath = iconPath.split(",")[0];
            // console.log(cleanPath);
            // 进行大小写不敏感匹配
            if (caseInsensitiveIncludes(cleanPath, processName)) {
              // 提取 `.exe` 文件路径
              const pathMatch = cleanPath.match(/[a-zA-Z]:\\.*?\.exe/i);
              return pathMatch ? pathMatch[0] : null;
            }
          }
        }
      }
    } catch (err) {
      console.error(`查询注册表失败 (${regPath}):`, err.message);
    }
  }
  console.log(`未找到 ${shortwareName} 的路径`);
  return null;
}

/**
 * 获取软件路径的主函数
 * @param {string} softwareName 软件名称
 * @param {string} processName 进程名称（可选，默认为softwareName.exe）
 * @returns {Promise<string|null>} 软件路径或null
 */
async function getSoftwarePath(softwareName, processName = null) {
  // 如果未提供进程名，则使用软件名+.exe
  if (!processName) {
    processName = `${softwareName}.exe`;
  }

  console.log(`正在查找 ${softwareName} 的路径...`);

  // 首先尝试从配置中获取（如果曾经找到过）
  let path = getPathFromConfig(softwareName);
  if (path && fs.existsSync(path)) {
    console.log(`从配置文件中获取路径: ${path}`);
    return path;
  }

  // 方法1: 检查正在运行的进程
  path = getRunningProcessPath(processName);
  if (path) {
    console.log(`通过运行进程找到路径: ${path}`);
    savePathToConfig(softwareName, path);
    return path;
  }

  //方法2: 检查快捷方式
  path = getPathFromShortcut(softwareName);
  if (path) {
    console.log(`通过快捷方式找到路径: ${path}`);
    savePathToConfig(softwareName, path);
    return path;
  }

  // 方法3: 从注册表获取
  path = getPathFromRegistry(softwareName, processName);
  if (path) {
    console.log(`通过注册表找到路径: ${path}`);
    savePathToConfig(softwareName, path);
    return path;
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
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      console.error(`文件不存在: ${filePath}`);
      return null;
    }

    // 检查文件扩展名
    const ext = path.extname(filePath).toLowerCase();
    if (ext !== '.exe' && ext !== '.dll') {
      console.warn(`文件类型可能不支持版本信息: ${ext}`);
      // 继续尝试获取版本，因为有些非标准扩展名的文件也可能包含版本信息
    }

    // 使用PowerShell获取文件版本信息
    try {
      // 尝试获取FileVersion
      const command = `chcp 65001 > nul && powershell -command "(Get-Item -LiteralPath '${filePath.replace(/'/g, "''")}').VersionInfo.FileVersion"`;
      const result = execSync(command, { encoding: 'utf8', timeout: 5000 });

      const version = result.trim();
      if (version && version !== '') {
        // 清理版本字符串，移除额外的文本和空格
        const cleanVersion = version.replace(/[^\d.]/g, '').trim();
        if (cleanVersion) {
          console.log(`获取到文件版本: ${cleanVersion}`);
          return cleanVersion;
        }
      }
    } catch (psError) {
      console.debug(`PowerShell获取版本失败: ${psError.message}`);
    }

    // 如果上述方法失败，尝试使用wmic（仅适用于Windows）
    try {
      // 需要处理路径中的反斜杠
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
      // 如果不是快捷方式，直接返回原路径
      return shortcutPath;
    }

    // 使用PowerShell解析快捷方式
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
    return shortcutPath; // 出错时返回原路径，尝试直接获取版本
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
    // 首先获取软件路径
    const softwarePath = await getSoftwarePath(softwareName, processName);
    if (!softwarePath) {
      console.error(`未找到软件路径，无法获取版本: ${softwareName}`);
      return null;
    }

    // 如果是快捷方式，先解析目标路径
    const actualPath = await resolveShortcutTarget(softwarePath);
    if (!actualPath) {
      console.error(`无法解析快捷方式目标路径: ${softwarePath}`);
      return null;
    }

    // 获取文件版本
    return await getFileVersion(actualPath);
  } catch (error) {
    console.error(`获取软件版本时出错: ${error.message}`);
    return null;
  }
}

// 导出所有功能
export {
  // 主函数
  getSoftwarePath,
  getSoftwareVersion,

  // 工具函数
  getRunningProcessPath,
  getPathFromShortcut,
  getPathFromRegistry,
  savePathToConfig,
  getPathFromConfig,
  getFileVersion,
  resolveShortcutTarget,

  // 常量
  CONFIG_FILE
};