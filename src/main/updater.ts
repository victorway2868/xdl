import { app, dialog, shell } from 'electron';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';
import { loggerService } from './services/logger';

interface UpdateInfo {
  version: string;
  url: string;
  releaseDate: string;
  sha512: string;
  platform: string;
  fileName: string;
}

class AutoUpdater {
  private updateCheckUrl: string;
  private currentVersion: string;
  private isChecking = false;
  private downloadInProgress = false;

  constructor(updateServerUrl: string) {
    this.updateCheckUrl = updateServerUrl;
    this.currentVersion = app.getVersion();
  }

  /**
   * 开始检查更新
   */
  async checkForUpdates(): Promise<void> {
    if (this.isChecking || this.downloadInProgress) {
      console.log('Update check already in progress');
      return;
    }

    this.isChecking = true;
    console.log(`Checking for updates... Current version: ${this.currentVersion}`);

    try {
      const updateInfo = await this.fetchUpdateInfo();

      // 验证更新信息的完整性
      if (!this.validateUpdateInfo(updateInfo)) {
        throw new Error('[UPDATE_FETCH] Invalid update information received');
      }

      // 显示版本对比信息（控制台和日志）
      console.log(`Update check result -> Current: ${this.currentVersion}, Remote: ${updateInfo.version}`);
      loggerService.addLog('info', `更新检查：当前版本 ${this.currentVersion}，服务器版本 ${updateInfo.version}`,'main');

      if (this.isNewerVersion(updateInfo.version, this.currentVersion)) {
        console.log(`New version available: ${updateInfo.version}`);
        loggerService.addLog('info', `检测到新版本 ${updateInfo.version}，开始下载并安装`,'main');
        await this.downloadAndInstallUpdate(updateInfo);
      } else {
        console.log('Application is up to date');
        loggerService.addLog('info', '已是最新版本，无需更新','main');
      }
    } catch (error) {
      const err = error as Error;
      console.error('Failed to check for updates:', err);
      loggerService.addLog('error', `检查更新失败：${err.message}`,'main');
      // 按需求：无法连接服务器或下载失败时，提示并退出应用
      this.showBlockingErrorAndExit('无法完成更新检查', err.message);
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * 从服务器获取更新信息
   */
  private async fetchUpdateInfo(): Promise<UpdateInfo> {
    const platform = this.getCurrentPlatform();
    const updateUrl = `${this.updateCheckUrl}/updates/latest-${platform}.json`;
    
    console.log(`Fetching update info from: ${updateUrl}`);
    
    const response = await fetch(updateUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch update info: ${response.status} ${response.statusText}`);
    }
    
    const updateInfo: UpdateInfo = await response.json();
    return updateInfo;
  }

  /**
   * 比较版本号
   */
  private isNewerVersion(remoteVersion: string, currentVersion: string): boolean {
    const parseVersion = (version: string) => {
      return version.split('.').map(num => parseInt(num, 10));
    };

    const remote = parseVersion(remoteVersion);
    const current = parseVersion(currentVersion);

    for (let i = 0; i < Math.max(remote.length, current.length); i++) {
      const r = remote[i] || 0;
      const c = current[i] || 0;
      
      if (r > c) return true;
      if (r < c) return false;
    }
    
    return false;
  }

  /**
   * 下载并安装更新
   */
  private async downloadAndInstallUpdate(updateInfo: UpdateInfo): Promise<void> {
    this.downloadInProgress = true;
    let downloadPath = '';

    try {
      console.log(`Downloading update: ${updateInfo.fileName}`);

      // 下载文件
      downloadPath = await this.downloadFile(updateInfo.url, updateInfo.fileName);

      // 验证文件完整性
      const isValid = await this.verifyFileIntegrity(downloadPath, updateInfo.sha512);
      if (!isValid) {
        this.cleanupTempFiles(downloadPath);
        throw new Error('Downloaded file integrity check failed');
      }

      console.log('File integrity verified, starting installation...');

      // 安装更新
      await this.installUpdate(downloadPath, updateInfo.platform);

    } catch (error) {
      const err = error as Error;
      console.error('Failed to download and install update:', err);
      loggerService.addLog('error', `下载/安装更新失败：${err.message}`, 'main');

      // 清理临时文件
      if (downloadPath) {
        this.cleanupTempFiles(downloadPath);
      }

      this.downloadInProgress = false;

      // 按需求：下载失败则提示并退出
      this.showBlockingErrorAndExit('无法下载或安装更新', err.message);

      throw err;
    }
  }

  /**
   * 下载文件
   */
  private async downloadFile(url: string, fileName: string): Promise<string> {
    const tempDir = os.tmpdir();
    const downloadPath = path.join(tempDir, fileName);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(downloadPath, Buffer.from(buffer));
    
    console.log(`File downloaded to: ${downloadPath}`);
    return downloadPath;
  }

  /**
   * 验证文件完整性
   */
  private async verifyFileIntegrity(filePath: string, expectedHash: string): Promise<boolean> {
    return new Promise((resolve) => {
      const hash = crypto.createHash('sha512');
      const stream = fs.createReadStream(filePath);
      
      stream.on('data', (data) => {
        hash.update(data);
      });
      
      stream.on('end', () => {
        const fileHash = hash.digest('hex');
        const isValid = fileHash === expectedHash;
        
        if (!isValid) {
          console.error('Hash mismatch:');
          console.error(`Expected: ${expectedHash}`);
          console.error(`Actual:   ${fileHash}`);
        }
        
        resolve(isValid);
      });
      
      stream.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * 安装更新
   */
  private async installUpdate(installerPath: string, platform: string): Promise<void> {
    console.log(`Installing update from: ${installerPath}`);
    
    if (platform === 'windows') {
      // Windows: 执行 Setup.exe 并退出当前应用
      spawn(installerPath, ['--silent'], {
        detached: true,
        stdio: 'ignore'
      });
    } else if (platform === 'macos') {
      // macOS: 解压ZIP文件并替换应用
      const appPath = app.getAppPath();
      const appDir = path.dirname(appPath);
      
      // 使用系统的unzip命令解压
      spawn('unzip', ['-o', installerPath, '-d', appDir], {
        detached: true,
        stdio: 'ignore'
      });
    }
    
    // 等待一小段时间让安装程序启动
    setTimeout(() => {
      console.log('Quitting application for update installation...');
      app.quit();
    }, 1000);
  }

  /**
   * 获取当前平台
   */
  private getCurrentPlatform(): string {
    const platform = os.platform();
    
    switch (platform) {
      case 'win32':
        return 'windows';
      case 'darwin':
        return 'macos';
      case 'linux':
        return 'linux';
      default:
        return 'unknown';
    }
  }

  /**
   * 验证更新信息的完整性
   */
  private validateUpdateInfo(updateInfo: any): updateInfo is UpdateInfo {
    return (
      updateInfo &&
      typeof updateInfo.version === 'string' &&
      typeof updateInfo.url === 'string' &&
      typeof updateInfo.sha512 === 'string' &&
      typeof updateInfo.platform === 'string' &&
      typeof updateInfo.fileName === 'string' &&
      updateInfo.version.length > 0 &&
      updateInfo.url.startsWith('http') &&
      updateInfo.sha512.length === 128 // SHA512 哈希长度
    );
  }

  /**
   * 显示阻塞性错误并退出应用。
   * 无法连接服务器或无法下载时，提示原因，提供“访问官网”按钮，随后退出软件。
   */
  private showBlockingErrorAndExit(title: string, reason?: string): void {
    const siteUrl = 'https://streamassist.xiaodouli.dpdns.org/';
    const fullMessage = `${title}${reason ? `\n\n原因：${reason}` : ''}\n\n您可以点击“访问官网”获取帮助。`;

    console.error(`[Update Fatal] ${title}${reason ? `: ${reason}` : ''}`);
    loggerService.addLog('error', `${title}${reason ? `：${reason}` : ''}`, 'main');

    try {
      const result = dialog.showMessageBoxSync({
        type: 'error',
        title: '更新检查失败',
        message: fullMessage,
        buttons: ['访问官网', '退出'],
        defaultId: 0,
        cancelId: 1,
        noLink: true,
      });

      if (result === 0) {
        // 打开官网，再退出
        try { shell.openExternal(siteUrl); } catch {}
        setTimeout(() => app.quit(), 300);
        return;
      }
    } catch (e) {
      // 如果弹窗失败，直接退出
      console.error('Failed to show error dialog:', e);
    }

    app.quit();
  }

  /**
   * 安全地清理临时文件
   */
  private cleanupTempFiles(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Cleaned up temp file: ${filePath}`);
      }
    } catch (error) {
      console.error(`Failed to cleanup temp file: ${filePath}`, error);
    }
  }

  /**
   * 启动定期检查更新
   * @param intervalHours 检查间隔（小时）
   * @param initialDelayMs 首次检查延迟（毫秒）。为 0 或未提供时立即检查一次
   */
  startPeriodicCheck(intervalHours: number = 4, initialDelayMs: number = 0): void {
    const doCheck = () => this.checkForUpdates();

    if (initialDelayMs && initialDelayMs > 0) {
      setTimeout(doCheck, initialDelayMs);
    } else {
      // 立即检查一次
      doCheck();
    }

    // 设置定期检查
    setInterval(doCheck, intervalHours * 60 * 60 * 1000);
  }

  /**
   * 手动检查更新（供外部调用）
   */
  async manualCheckForUpdates(): Promise<boolean> {
    try {
      await this.checkForUpdates();
      return true;
    } catch (error) {
      console.error('Manual update check failed:', error);
      return false;
    }
  }
}

export { AutoUpdater };
export type { UpdateInfo };
