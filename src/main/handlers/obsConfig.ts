import { ipcMain } from 'electron';
import { installFonts } from '@main/modules/obsconfig/installFonts';
import { manageProfileAndSceneCollection } from '@main/modules/obsconfig/manageProfileAndScene';
import { configureSourceTransform } from '@main/modules/obsconfig/sourceTransform';
import { configureEncoder } from '@main/modules/obsconfig/encoderConfig';
import { addOrEnsureVideoCaptureDevice } from '@main/modules/obsconfig/videoCaptureDevice';
import { createDisplayCaptureSource } from '@main/modules/obsconfig/displayCapture';
import { backupObsConfiguration, restoreObsConfiguration, getAvailableBackups } from '@main/modules/obsconfig/backupRestore';
import { enableDefaultAudioSources } from '@main/modules/obsconfig/enableAudioSources';
import { ensureObsEnabledAndMaybeRestart, startOBSProcess } from '@main/modules/obsWebSocket';
import { closeOBS } from '@main/utils/close-obs-direct';

export function registerObsConfigHandlers() {
  // 安装字体
  ipcMain.handle('install-fonts', async () => {
    try { return await installFonts(); } catch (e: any) { return { success: false, error: e?.message || String(e) }; }
  });

  // 配置 Profile/Scene
  ipcMain.handle('configure-obs-profile', async (_e, options: { deviceName: string; resolution: string }) => {
    try {
      return await manageProfileAndSceneCollection(options);
    } catch (e: any) {
      return { success: false, message: e?.message || String(e) };
    }
  });

  // 一键配置 OBS（步骤化返回）
  ipcMain.handle('one-click-configure-obs', async (_e, options: { deviceName: string; resolution: string }) => {
    const steps: Array<{ name: string; success: boolean; message?: string }> = [];
    try {
      // Step 1: 字体
      const fontRes = await installFonts();
      steps.push({ name: 'Install fonts', success: !!fontRes.success, message: fontRes.message || (fontRes as any).error });
      if (!fontRes.success) return { success: false, message: 'Font install failed', steps };

      // Step 2: 确保 WebSocket 启用/启动 OBS
      const ensure = await ensureObsEnabledAndMaybeRestart();
      steps.push({ name: 'Ensure OBS WebSocket', success: ensure.ok, message: ensure.msg });
      if (!ensure.ok) return { success: false, message: ensure.msg, steps };

      // Step 3: 配置 Profile/Scene
      const prof = await manageProfileAndSceneCollection(options);
      steps.push({ name: 'Configure profile/scene', success: !!prof.success, message: prof.message });
      if (!prof.success) return { success: false, message: prof.message, steps };


      // Step 4: 根据设备类型配置采集源
      let captureResult: any;
      if (options.deviceName === 'PC端游') {
        // PC端游使用显示器采集
        captureResult = await createDisplayCaptureSource({ sourceName: '显示器采集' });
        steps.push({ name: 'Configure display capture', success: !!captureResult.success, message: captureResult.message || `monitor=${captureResult.monitorName}` });
      } else {
        // 其他设备使用视频采集设备
        captureResult = await addOrEnsureVideoCaptureDevice({ preferredResolution: options.resolution, applyFilters: true });
        steps.push({ name: 'Configure video capture device', success: !!captureResult.success, message: captureResult.message || `resolution=${captureResult.resolution}` });
      }
      if (!captureResult.success) return { success: false, message: captureResult.message || '采集源配置失败', steps };

      // Step 5: 启用音频源（桌面音频/麦克风 + 噪声抑制）
      const audio = await enableDefaultAudioSources();
      steps.push({ name: 'Enable audio sources', success: !!audio.success, message: audio.message });
      if (!audio.success) return { success: false, message: audio.message, steps };

      // Step 6: 源位置/说明栏
      const pos = await configureSourceTransform();
      steps.push({ name: 'Configure source transform', success: !!pos.success, message: pos.message });
      if (!pos.success) return { success: false, message: pos.message, steps };

      // Step 7: 关闭 OBS 以写入编码器配置
      steps.push({ name: 'Closing OBS', success: true, message: '正在关闭 OBS 以应用离线配置...' });
      const closeResult = await closeOBS();
      if (closeResult.status === 'failed') {
        const errMsg = (closeResult as any).error ? `关闭 OBS 失败: ${(closeResult as any).error}` : '关闭 OBS 失败';
        steps[steps.length - 1] = { name: 'Closing OBS', success: false, message: errMsg };
        return { success: false, message: errMsg, steps };
      }
      steps[steps.length - 1].message = 'OBS 已关闭';
      await new Promise(r => setTimeout(r, 2000)); // 等待进程完全退出

      // Step 8: 写入编码器配置
      steps.push({ name: 'Configure encoder', success: true, message: '正在写入编码器配置...' });
      const enc = await configureEncoder(pos.Encodername || 'obs_x264', pos.profileName);
      steps[steps.length - 1] = { name: 'Configure encoder', success: !!enc.success, message: enc.message };
      if (!enc.success) return { success: false, message: enc.message, steps };

      // Step 9: 重启 OBS
      steps.push({ name: 'Restarting OBS', success: true, message: '正在重启 OBS...' });
      const startResult = await startOBSProcess();
      if (!startResult.success) {
        steps[steps.length - 1] = { name: 'Restarting OBS', success: false, message: `重启 OBS 失败: ${startResult.message}` };
        return { success: false, message: '重启 OBS 失败', steps };
      }
      steps[steps.length - 1].message = 'OBS 已重启，配置完成';

      return { success: true, message: 'One-click OBS configuration completed', steps };
    } catch (e: any) {
      steps.push({ name: 'Error', success: false, message: e?.message || String(e) });
      return { success: false, message: e?.message || String(e), steps };
    }
  });

  // 单独配置编码器
  ipcMain.handle('configure-obs-encoder', async (_e, options: { encoderName: string; profileName: string }) => {
    try { return await configureEncoder(options.encoderName, options.profileName); } catch (e: any) { return { success: false, message: e?.message || String(e) }; }
  });

  // 配置显示器采集
  ipcMain.handle('configure-display-capture', async (_e, options: { sourceName?: string } = {}) => {
    try { return await createDisplayCaptureSource(options); } catch (e: any) { return { success: false, message: e?.message || String(e) }; }
  });

  // 备份OBS配置
  ipcMain.handle('backup-obs-config', async () => {
    try { return await backupObsConfiguration(); } catch (e: any) { return { success: false, message: e?.message || String(e) }; }
  });

  // 恢复OBS配置
  ipcMain.handle('restore-obs-config', async (_e, backupFilePath?: string) => {
    try { return await restoreObsConfiguration(backupFilePath); } catch (e: any) { return { success: false, message: e?.message || String(e) }; }
  });

  // 获取可用备份列表
  ipcMain.handle('get-available-backups', async () => {
    try { return await getAvailableBackups(); } catch (e: any) { return { success: false, backups: [], message: e?.message || String(e) }; }
  });
}

