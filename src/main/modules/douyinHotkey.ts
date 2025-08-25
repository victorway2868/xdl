import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';

const fsAccess = promisify(fs.access);
const fsReadFile = promisify(fs.readFile);
const fsWriteFile = promisify(fs.writeFile);

const APPDATA = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
const HOTKEY_STORE_PATH = path.join(APPDATA, 'webcast_mate', 'WBStore', 'hotkeyStore.json');

type StartLiveHotkey = {
  accelerator: string;
  code: string[];
};

const DEFAULT_START_LIVE: StartLiveHotkey = {
  accelerator: 'Ctrl+Shift+L',
  code: ['ControlLeft', 'ShiftLeft', 'KeyL']
};

const DEFAULT_END_LIVE: StartLiveHotkey = {
  accelerator: 'Shift+L',
  code: ['ShiftLeft', 'KeyL']
};

export async function configureHotkeySettings(): Promise<boolean> {
  try {
    // Load existing or initialize new structure
    let data: any = {
      hotkeyStore: {
        config: [
          {
            label: '开始直播', target: '0', command: 'StartLive', accelerator: DEFAULT_START_LIVE.accelerator, code: DEFAULT_START_LIVE.code
          },
          {
            label: '结束直播', target: '0', command: 'EndLive', accelerator: DEFAULT_END_LIVE.accelerator, code: DEFAULT_END_LIVE.code
          }
        ],
        hotkeys: [
          {
            label: '开始直播', target: '0', command: 'StartLive', accelerator: DEFAULT_START_LIVE.accelerator, code: DEFAULT_START_LIVE.code, type: 'LIVE_SETTING'
          },
          {
            label: '结束直播', target: '0', command: 'EndLive', accelerator: DEFAULT_END_LIVE.accelerator, code: DEFAULT_END_LIVE.code, type: 'LIVE_SETTING'
          }
        ],
        enable: true,
        typeEnable: { MESSAGE: true, AUDIO_LIB: false, LIVE_SETTING: true }
      }
    };

    try {
      await fsAccess(HOTKEY_STORE_PATH, fs.constants.R_OK | fs.constants.W_OK);
      const raw = await fsReadFile(HOTKEY_STORE_PATH, 'utf8');
      const parsed = JSON.parse(raw || '{}');
      data = { hotkeyStore: { ...data.hotkeyStore, ...(parsed.hotkeyStore || {}) } };

      // ensure arrays
      if (!Array.isArray(data.hotkeyStore.hotkeys)) data.hotkeyStore.hotkeys = [];
      if (!Array.isArray(data.hotkeyStore.config)) data.hotkeyStore.config = [];
      if (!data.hotkeyStore.typeEnable) data.hotkeyStore.typeEnable = { MESSAGE: true, AUDIO_LIB: false, LIVE_SETTING: true };

      // 强制开启总开关与 LIVE_SETTING，覆盖旧值（与旧项目保持一致）
      data.hotkeyStore.enable = true;
      data.hotkeyStore.typeEnable.LIVE_SETTING = true;

      // add start live if missing
      const hasHotkeyStart = data.hotkeyStore.hotkeys.some((h: any) => h.label === '开始直播' && h.type === 'LIVE_SETTING');
      if (!hasHotkeyStart) {
        data.hotkeyStore.hotkeys.push({ label: '开始直播', target: '0', command: 'StartLive', accelerator: DEFAULT_START_LIVE.accelerator, code: DEFAULT_START_LIVE.code, type: 'LIVE_SETTING' });
      }
      const hasConfigStart = data.hotkeyStore.config.some((c: any) => c.label === '开始直播' && c.command === 'StartLive');
      if (!hasConfigStart) {
        data.hotkeyStore.config.push({ label: '开始直播', target: '0', command: 'StartLive', accelerator: DEFAULT_START_LIVE.accelerator, code: DEFAULT_START_LIVE.code });
      }

      // add end live if missing
      const hasHotkeyEnd = data.hotkeyStore.hotkeys.some((h: any) => h.label === '结束直播' && h.type === 'LIVE_SETTING');
      if (!hasHotkeyEnd) {
        data.hotkeyStore.hotkeys.push({ label: '结束直播', target: '0', command: 'EndLive', accelerator: DEFAULT_END_LIVE.accelerator, code: DEFAULT_END_LIVE.code, type: 'LIVE_SETTING' });
      }
      const hasConfigEnd = data.hotkeyStore.config.some((c: any) => c.label === '结束直播' && c.command === 'EndLive');
      if (!hasConfigEnd) {
        data.hotkeyStore.config.push({ label: '结束直播', target: '0', command: 'EndLive', accelerator: DEFAULT_END_LIVE.accelerator, code: DEFAULT_END_LIVE.code });
      }
    } catch {
      // directory may not exist; create recursively
      fs.mkdirSync(path.dirname(HOTKEY_STORE_PATH), { recursive: true });
    }

    await fsWriteFile(HOTKEY_STORE_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch {
    console.error('Failed to configure hotkey settings');
    return false;
  }
}

export async function getStartLiveHotkey(): Promise<StartLiveHotkey> {
  try {
    await fsAccess(HOTKEY_STORE_PATH, fs.constants.R_OK);
    const raw = await fsReadFile(HOTKEY_STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    const store = parsed.hotkeyStore || {};
    const hk = Array.isArray(store.hotkeys) ? store.hotkeys.find((h: any) => h.label === '开始直播' && h.type === 'LIVE_SETTING') : null;
    if (hk && hk.accelerator && Array.isArray(hk.code)) {
      return { accelerator: hk.accelerator, code: hk.code };
    }
    return DEFAULT_START_LIVE;
  } catch {
    return DEFAULT_START_LIVE;
  }
}

export async function getEndLiveHotkey(): Promise<StartLiveHotkey> {
  try {
    await fsAccess(HOTKEY_STORE_PATH, fs.constants.R_OK);
    const raw = await fsReadFile(HOTKEY_STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    const store = parsed.hotkeyStore || {};
    const hk = Array.isArray(store.hotkeys) ? store.hotkeys.find((h: any) => h.label === '结束直播' && h.type === 'LIVE_SETTING') : null;
    if (hk && hk.accelerator && Array.isArray(hk.code)) {
      return { accelerator: hk.accelerator, code: hk.code };
    }
    return DEFAULT_END_LIVE;
  } catch {
    return DEFAULT_END_LIVE;
  }
}
