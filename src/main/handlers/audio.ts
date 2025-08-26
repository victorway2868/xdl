import { ipcMain, globalShortcut } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import axios from 'axios';
import extract from 'extract-zip';
import { loggerService } from '../services/logger';

// 全局快捷键映射
const globalHotkeys = new Map<string, string>(); // hotkey -> filePath

// Get the app data directory for storing sound effects
function getSoundEffectsDir(): string {
  const { app } = require('electron');
  const appDataPath = app.getPath('userData');
  return path.join(appDataPath, 'SoundEffects');
}

// Ensure sound effects directory exists
function ensureSoundEffectsDir(): void {
  const soundEffectsDir = getSoundEffectsDir();
  if (!fs.existsSync(soundEffectsDir)) {
    fs.mkdirSync(soundEffectsDir, { recursive: true });
    loggerService.addLog('info', `Created sound effects directory: ${soundEffectsDir}`, 'main');
  }
}

// Create sample sound pack for testing (if no packs exist)
async function createSampleSoundPack(): Promise<void> {
  try {
    const soundEffectsDir = getSoundEffectsDir();
    const samplePackDir = path.join(soundEffectsDir, 'sample_pack');

    // Only create if no packs exist
    const existingPacks = await getLocalSoundPacks();
    if (existingPacks.length > 0) {
      return;
    }

    if (!fs.existsSync(samplePackDir)) {
      fs.mkdirSync(samplePackDir, { recursive: true });

      // Create a simple text file as placeholder
      const readmePath = path.join(samplePackDir, 'README.txt');
      fs.writeFileSync(readmePath,
        '这是一个示例音效包文件夹。\n' +
        '请将您的音效文件（.mp3, .wav, .ogg等）放在这里。\n' +
        '支持的格式：MP3, WAV, OGG, M4A, AAC\n\n' +
        '您也可以通过"更新音效包"按钮从服务器下载官方音效包。'
      );

      // Create a simple WAV file for testing (1 second of silence)
      try {
        const testWavPath = path.join(samplePackDir, 'test_beep.wav');
        if (!fs.existsSync(testWavPath)) {
          // Create a minimal WAV file header for a 1-second 440Hz tone
          const sampleRate = 44100;
          const duration = 1; // 1 second
          const frequency = 440; // A4 note
          const amplitude = 0.3;

          const numSamples = sampleRate * duration;
          const buffer = Buffer.alloc(44 + numSamples * 2); // WAV header + 16-bit samples

          // WAV header
          buffer.write('RIFF', 0);
          buffer.writeUInt32LE(36 + numSamples * 2, 4);
          buffer.write('WAVE', 8);
          buffer.write('fmt ', 12);
          buffer.writeUInt32LE(16, 16); // PCM format size
          buffer.writeUInt16LE(1, 20);  // PCM format
          buffer.writeUInt16LE(1, 22);  // Mono
          buffer.writeUInt32LE(sampleRate, 24);
          buffer.writeUInt32LE(sampleRate * 2, 28); // Byte rate
          buffer.writeUInt16LE(2, 32);  // Block align
          buffer.writeUInt16LE(16, 34); // Bits per sample
          buffer.write('data', 36);
          buffer.writeUInt32LE(numSamples * 2, 40);

          // Generate sine wave samples
          for (let i = 0; i < numSamples; i++) {
            const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * amplitude * 32767;
            buffer.writeInt16LE(Math.round(sample), 44 + i * 2);
          }

          fs.writeFileSync(testWavPath, buffer);
          loggerService.addLog('info', 'Created test WAV file for audio testing', 'main');
        }
      } catch (wavError) {
        loggerService.addLog('error', `Failed to create test WAV file: ${wavError}`, 'main');
      }

      loggerService.addLog('info', 'Created sample sound pack directory with README', 'main');
    }
  } catch (error) {
    loggerService.addLog('error', `Failed to create sample sound pack: ${error}`, 'main');
  }
}

// Get all audio files from sound effects directory
async function getAudioFiles(): Promise<string[]> {
  try {
    ensureSoundEffectsDir();
    await createSampleSoundPack();
    const soundEffectsDir = getSoundEffectsDir();
    const audioFiles: string[] = [];

    // Supported audio formats
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac'];

    // Recursively scan for audio files
    function scanDirectory(dir: string, relativePath: string = ''): void {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const itemRelativePath = relativePath ? path.join(relativePath, item) : item;

        if (fs.statSync(fullPath).isDirectory()) {
          scanDirectory(fullPath, itemRelativePath);
        } else {
          const ext = path.extname(item).toLowerCase();
          if (audioExtensions.includes(ext)) {
            // Normalize path separators to forward slashes for consistency
            const normalizedPath = itemRelativePath.replace(/\\/g, '/');
            audioFiles.push(normalizedPath);
          }
        }
      }
    }

    scanDirectory(soundEffectsDir);
    return audioFiles;
  } catch (error) {
    loggerService.addLog('error', `Failed to get audio files: ${error}`, 'main');
    return [];
  }
}

// Get list of local sound pack folders
async function getLocalSoundPacks(): Promise<string[]> {
  try {
    ensureSoundEffectsDir();
    const soundEffectsDir = getSoundEffectsDir();
    const items = fs.readdirSync(soundEffectsDir);

    return items.filter(item => {
      const fullPath = path.join(soundEffectsDir, item);
      return fs.statSync(fullPath).isDirectory();
    });
  } catch (error) {
    loggerService.addLog('error', `Failed to get local sound packs: ${error}`, 'main');
    return [];
  }
}

// Check for sound pack updates from server
async function checkSoundPackUpdates(): Promise<{ files: Array<{ name: string; url: string }> } | null> {
  try {
    loggerService.addLog('info', 'Checking for sound pack updates...', 'main');

    const response = await axios.get('https://xiaodouli.openclouds.dpdns.org/SoundEffects/soundeffects.json', {
      timeout: 10000, // 10 seconds timeout
    });

    return response.data;
  } catch (error) {
    loggerService.addLog('error', `Failed to check for sound pack updates: ${error}`, 'main');
    return null;
  }
}

// Download and extract a sound pack
async function downloadSoundPack(packName: string, packUrl: string): Promise<boolean> {
  try {
    ensureSoundEffectsDir();
    const soundEffectsDir = getSoundEffectsDir();
    const packDir = path.join(soundEffectsDir, packName);

    // Skip if pack already exists
    if (fs.existsSync(packDir)) {
      loggerService.addLog('info', `Sound pack ${packName} already exists, skipping`, 'main');
      return true;
    }

    loggerService.addLog('info', `Downloading sound pack: ${packName} from ${packUrl}`, 'main');

    // Download the zip file
    const response = await axios({
      method: 'GET',
      url: packUrl,
      responseType: 'stream',
      timeout: 30000, // 30 seconds timeout
    });

    const tempZipPath = path.join(soundEffectsDir, `${packName}_temp.zip`);
    const writer = fs.createWriteStream(tempZipPath);

    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Extract the zip file
    loggerService.addLog('info', `Extracting sound pack: ${packName}`, 'main');
    await extract(tempZipPath, { dir: packDir });

    // Clean up temp file
    fs.unlinkSync(tempZipPath);

    loggerService.addLog('info', `Successfully downloaded and extracted sound pack: ${packName}`, 'main');
    return true;
  } catch (error) {
    loggerService.addLog('error', `Failed to download sound pack ${packName}: ${error}`, 'main');
    return false;
  }
}

// 简化的音频播放函数 - 现在主要用于后端播放（如果需要）
async function playAudioFile(filePath: string): Promise<boolean> {
  try {
    const soundEffectsDir = getSoundEffectsDir();
    const cleanedFilePath = filePath.trim().replace(/^[/\\]+|[/\\]+$/g, '');
    const normalizedFilePath = cleanedFilePath.replace(/[/\\]+/g, path.sep);
    const fullPath = path.join(soundEffectsDir, normalizedFilePath);

    if (!fs.existsSync(fullPath)) {
      loggerService.addLog('error', `Audio file not found: ${fullPath}`, 'main');
      return false;
    }

    // 简单的系统播放器调用（备用方案）
    if (process.platform === 'win32') {
      exec(`cmd /c start /min "" "${fullPath}"`, (error) => {
        if (error) {
          loggerService.addLog('error', `Windows playback error: ${error}`, 'main');
        }
      });
    } else if (process.platform === 'darwin') {
      exec(`afplay "${fullPath}"`, (error) => {
        if (error) {
          loggerService.addLog('error', `macOS playback error: ${error}`, 'main');
        }
      });
    } else {
      exec(`paplay "${fullPath}" || aplay "${fullPath}"`, (error) => {
        if (error) {
          loggerService.addLog('error', `Linux playback error: ${error}`, 'main');
        }
      });
    }

    return true;
  } catch (error) {
    loggerService.addLog('error', `Failed to play audio file ${filePath}: ${error}`, 'main');
    return false;
  }
}

// Get audio file URL for frontend playback
async function getAudioFileUrl(filePath: string): Promise<string | null> {
  try {
    const soundEffectsDir = getSoundEffectsDir();
    const cleanedFilePath = filePath.trim().replace(/^[/\\]+|[/\\]+$/g, '');
    const normalizedFilePath = cleanedFilePath.replace(/[/\\]+/g, path.sep);
    const fullPath = path.join(soundEffectsDir, normalizedFilePath);

    if (!fs.existsSync(fullPath)) {
      loggerService.addLog('error', `Audio file not found: ${fullPath}`, 'main');
      return null;
    }

    // Return file:// URL for the audio file
    const fileUrl = `file://${fullPath.replace(/\\/g, '/')}`;
    loggerService.addLog('info', `Generated audio file URL: ${fileUrl}`, 'main');
    return fileUrl;
  } catch (error) {
    loggerService.addLog('error', `Failed to get audio file URL ${filePath}: ${error}`, 'main');
    return null;
  }
}

// 转换快捷键格式（从前端格式转换为Electron格式）
function convertHotkeyFormat(hotkey: string): string {
  // 前端格式: Ctrl+A, Alt+F1, Shift+Space
  // Electron格式: CommandOrControl+A, Alt+F1, Shift+Space
  return hotkey
    .replace(/Ctrl/g, 'CommandOrControl')
    .replace(/Meta/g, 'CommandOrControl'); // Mac的Cmd键
}

// 注册全局快捷键
async function registerGlobalHotkey(hotkey: string, filePath: string): Promise<boolean> {
  try {
    const electronHotkey = convertHotkeyFormat(hotkey);

    // 如果快捷键已存在，先取消注册
    if (globalHotkeys.has(hotkey)) {
      globalShortcut.unregister(electronHotkey);
      globalHotkeys.delete(hotkey);
    }

    // 注册新的快捷键
    const success = globalShortcut.register(electronHotkey, () => {
      loggerService.addLog('info', `Global hotkey triggered: ${hotkey} -> ${filePath}`, 'main');

      // 通知渲染进程播放音频，而不是在主进程播放
      const { BrowserWindow } = require('electron');
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        mainWindow.webContents.send('play-audio-from-hotkey', { hotkey, filePath });
      }
    });

    if (success) {
      globalHotkeys.set(hotkey, filePath);
      loggerService.addLog('info', `Registered global hotkey: ${hotkey} (${electronHotkey}) -> ${filePath}`, 'main');
      return true;
    } else {
      loggerService.addLog('error', `Failed to register global hotkey: ${hotkey} (${electronHotkey})`, 'main');
      return false;
    }
  } catch (error) {
    loggerService.addLog('error', `Error registering global hotkey ${hotkey}: ${error}`, 'main');
    return false;
  }
}

// 取消注册全局快捷键
async function unregisterGlobalHotkey(hotkey: string): Promise<boolean> {
  try {
    const electronHotkey = convertHotkeyFormat(hotkey);

    if (globalHotkeys.has(hotkey)) {
      globalShortcut.unregister(electronHotkey);
      globalHotkeys.delete(hotkey);
      loggerService.addLog('info', `Unregistered global hotkey: ${hotkey} (${electronHotkey})`, 'main');
      return true;
    }

    return false;
  } catch (error) {
    loggerService.addLog('error', `Error unregistering global hotkey ${hotkey}: ${error}`, 'main');
    return false;
  }
}

// 更新所有全局快捷键
async function updateGlobalHotkeys(soundEffects: Array<{ id: string, hotkey: string, filePath?: string }>): Promise<void> {
  try {
    // 清除所有现有快捷键
    globalShortcut.unregisterAll();
    globalHotkeys.clear();

    // 注册新的快捷键
    for (const effect of soundEffects) {
      if (effect.hotkey && effect.filePath) {
        await registerGlobalHotkey(effect.hotkey, effect.filePath);
      }
    }

    loggerService.addLog('info', `Updated ${globalHotkeys.size} global hotkeys`, 'main');
  } catch (error) {
    loggerService.addLog('error', `Error updating global hotkeys: ${error}`, 'main');
  }
}

// 清除所有全局快捷键
async function clearAllGlobalHotkeys(): Promise<void> {
  try {
    globalShortcut.unregisterAll();
    globalHotkeys.clear();
    loggerService.addLog('info', 'Cleared all global hotkeys', 'main');
  } catch (error) {
    loggerService.addLog('error', `Error clearing global hotkeys: ${error}`, 'main');
  }
}

export function registerAudioHandlers(): void {
  // Get available audio files
  ipcMain.handle('get-audio-files', async () => {
    try {
      return await getAudioFiles();
    } catch (error) {
      loggerService.addLog('error', `IPC get-audio-files error: ${error}`, 'main');
      return [];
    }
  });

  // Get local sound packs
  ipcMain.handle('get-local-sound-packs', async () => {
    try {
      return await getLocalSoundPacks();
    } catch (error) {
      loggerService.addLog('error', `IPC get-local-sound-packs error: ${error}`, 'main');
      return [];
    }
  });

  // Download sound pack
  ipcMain.handle('download-sound-pack', async (_, packName: string, packUrl: string) => {
    try {
      return await downloadSoundPack(packName, packUrl);
    } catch (error) {
      loggerService.addLog('error', `IPC download-sound-pack error: ${error}`, 'main');
      return false;
    }
  });

  // Play audio file (备用方案，主要使用前端HTML5播放)
  ipcMain.handle('play-audio-file', async (_, filePath: string) => {
    try {
      return await playAudioFile(filePath);
    } catch (error) {
      loggerService.addLog('error', `IPC play-audio-file error: ${error}`, 'main');
      return false;
    }
  });

  // Get audio file URL
  ipcMain.handle('get-audio-file-url', async (_, filePath: string) => {
    try {
      return await getAudioFileUrl(filePath);
    } catch (error) {
      loggerService.addLog('error', `IPC get-audio-file-url error: ${error}`, 'main');
      return null;
    }
  });

  // Check for sound pack updates
  ipcMain.handle('check-sound-pack-updates', async () => {
    try {
      return await checkSoundPackUpdates();
    } catch (error) {
      loggerService.addLog('error', `IPC check-sound-pack-updates error: ${error}`, 'main');
      return null;
    }
  });

  // 注册全局快捷键
  ipcMain.handle('register-global-hotkey', async (_, hotkey: string, filePath: string) => {
    try {
      return await registerGlobalHotkey(hotkey, filePath);
    } catch (error) {
      loggerService.addLog('error', `IPC register-global-hotkey error: ${error}`, 'main');
      return false;
    }
  });

  // 取消注册全局快捷键
  ipcMain.handle('unregister-global-hotkey', async (_, hotkey: string) => {
    try {
      return await unregisterGlobalHotkey(hotkey);
    } catch (error) {
      loggerService.addLog('error', `IPC unregister-global-hotkey error: ${error}`, 'main');
      return false;
    }
  });

  // 更新所有全局快捷键
  ipcMain.handle('update-global-hotkeys', async (_, soundEffects: Array<{ id: string, hotkey: string, filePath?: string }>) => {
    try {
      await updateGlobalHotkeys(soundEffects);
      return true;
    } catch (error) {
      loggerService.addLog('error', `IPC update-global-hotkeys error: ${error}`, 'main');
      return false;
    }
  });

  // 清除所有全局快捷键
  ipcMain.handle('clear-all-global-hotkeys', async () => {
    try {
      await clearAllGlobalHotkeys();
      return true;
    } catch (error) {
      loggerService.addLog('error', `IPC clear-all-global-hotkeys error: ${error}`, 'main');
      return false;
    }
  });

  loggerService.addLog('info', 'Audio handlers registered successfully', 'main');
}