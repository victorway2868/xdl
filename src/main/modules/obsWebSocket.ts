/* OBS WebSocket v5 controller with auto-check/enable based on old ensureAndConnectToOBS logic */
import * as fs from 'fs';
import fsp from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { exec as execCb } from 'child_process';
import { promisify } from 'util';
import { closeOBS, isOBSRunning } from '@main/utils/close-obs-direct';
import { getSoftwarePath } from '@main/utils/findSoftwarePaths';

const exec = promisify(execCb);

let obs: any | null = null;
let connected = false;

type ObsWsConfig = {
  server_enabled?: boolean;
  server_port?: number;
  server_password?: string;
  [k: string]: any;
};

const getObsWsConfigPath = () =>
  path.join(
    process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
    'obs-studio',
    'plugin_config',
    'obs-websocket',
    'config.json'
  );

async function startOBSProcess(): Promise<{ success: boolean; message: string }> {
  try {
    const obsPath = await getSoftwarePath('OBS Studio', 'obs64.exe');
    if (!obsPath) return { success: false, message: '无法找到 OBS 安装路径，请确保已安装 OBS Studio' };
    const isExe = obsPath.toLowerCase().endsWith('.exe');
    if (isExe) {
      const dir = path.dirname(obsPath);
      await exec(`start /d "${dir}" "" ${path.basename(obsPath)}`);
    } else {
      await exec(`start "" "${obsPath}"`);
    }
    return { success: true, message: '成功启动 OBS 进程' };
  } catch (e: any) {
    return { success: false, message: '启动 OBS 进程时出错: ' + (e?.message || String(e)) };
  }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function readObsConfig(): Promise<ObsWsConfig | null> {
  const cfgPath = getObsWsConfigPath();
  try {
    await fsp.access(cfgPath, fs.constants.R_OK | fs.constants.W_OK);
  } catch {
    return null;
  }
  try {
    const data = await fsp.readFile(cfgPath, 'utf8');
    return JSON.parse(data) as ObsWsConfig;
  } catch {
    return null;
  }
}

async function writeObsConfig(cfg: ObsWsConfig): Promise<boolean> {
  const cfgPath = getObsWsConfigPath();
  try {
    await fsp.writeFile(cfgPath, JSON.stringify(cfg, null, 2), 'utf8');
    return true;
  } catch {
    return false;
  }
}

async function ensureObsEnabledAndMaybeRestart(): Promise<{ ok: boolean; cfg?: ObsWsConfig; msg?: string }>{
  const cfgPath = getObsWsConfigPath();
  const running = await isOBSRunning();
  // Ensure config exists
  let cfg = await readObsConfig();
  if (!cfg) {
    if (!running) {
      const r = await startOBSProcess();
      if (!r.success) return { ok: false, msg: r.message };
      await sleep(8000);
      cfg = await readObsConfig();
      if (!cfg) return { ok: false, msg: `找不到 OBS WebSocket 配置文件: ${cfgPath}` };
    } else {
      return { ok: false, msg: `OBS WebSocket 配置文件不存在或无法访问: ${cfgPath}` };
    }
  }

  // Enable if disabled
  let needRestart = false;
  if (!cfg.server_enabled) {
    if (running) {
      const res = await closeOBS();
      if (res.status !== 'not_running' && res.status !== 'gracefully_closed' && res.status !== 'force_closed') {
        return { ok: false, msg: '关闭 OBS 进程失败' };
      }
    }
    cfg.server_enabled = true;
    if (!(await writeObsConfig(cfg))) return { ok: false, msg: '写入 OBS WebSocket 配置失败' };
    needRestart = true;
  }

  if (needRestart || !(await isOBSRunning())) {
    const r = await startOBSProcess();
    if (!r.success) return { ok: false, msg: r.message };
    await sleep(8000);
  }

  return { ok: true, cfg };
}

async function ConnectToOBS(address = '', password = ''): Promise<void> {
  if (connected && obs) return;

  const ensure = await ensureObsEnabledAndMaybeRestart();
  if (!ensure.ok) throw new Error(ensure.msg || '确保 OBS WebSocket 启用失败');
  const cfg = ensure.cfg || {};

  // determine address and port
  let serverAddress = 'localhost';
  let serverPort = cfg.server_port ?? 4455;
  if (address) {
    if (address.startsWith('ws://')) address = address.replace(/^ws:\/\//, '');
    if (address.includes(':')) {
      const [addr, portStr] = address.split(':');
      serverAddress = addr || 'localhost';
      serverPort = Number(portStr) || serverPort;
    } else {
      serverAddress = address;
    }
  }
  const fullUrl = `ws://${serverAddress}:${serverPort}`;
  const pass = password || cfg.server_password || '';


  const { default: OBSWebSocket } = await import('obs-websocket-js');

  if (obs) {
    try { await obs.disconnect(); } catch {}
  }  

  console.log(`正在尝试连接 OBS WebSocket: ${fullUrl}`);
  try {
    obs = new OBSWebSocket();
    await obs.connect(fullUrl, pass);
    connected = true;
    console.log('成功连接到 OBS WebSocket');
  } catch (error) {
    console.error('连接 OBS WebSocket 失败:', error);
    connected = false;
    throw error; // 将错误抛出，以便调用方可以捕获
  }
}

export async function setOBSStreamSettings(streamUrl: string, streamKey: string, password = '') {
  console.log('setOBSStreamSettings called');
  try {
    await ConnectToOBS('', password);
    if (!obs) throw new Error('OBS not initialized');
    await obs.call('SetStreamServiceSettings', {
      streamServiceType: 'rtmp_custom',
      streamServiceSettings: { server: streamUrl, key: streamKey },
    });
    return { success: true, message: 'OBS 推流参数设置成功' };
  } catch (e: any) {
    return { success: false, message: e?.message || String(e) };
  }
}

export async function startOBSStreaming(password = '') {
  console.log('startOBSStreaming called');
  try {
    await ConnectToOBS('', password);
    if (!obs) throw new Error('OBS not initialized');
    const status = await obs.call('GetStreamStatus');
    if (!status.outputActive) await obs.call('StartStream');
    return { success: true, message: 'OBS 推流已启动' };
  } catch (e: any) {
    return { success: false, message: e?.message || String(e) };
  }
}

export async function stopOBSStreaming(password = '') {
  console.log('stopOBSStreaming called');
  try {
    await ConnectToOBS('', password);
    if (!obs) throw new Error('OBS not initialized');
    const status = await obs.call('GetStreamStatus');
    if (status.outputActive) await obs.call('StopStream');
    return { success: true, message: 'OBS 推流已停止' };
  } catch (e: any) {
    return { success: false, message: e?.message || String(e) };
  }
}
