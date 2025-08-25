/* Minimal OBS WebSocket v5 controller for RTMP setup and start/stop streaming */
import OBSWebSocket from 'obs-websocket-js';

let obs: OBSWebSocket | null = null;
let connected = false;

async function connect(address = 'ws://127.0.0.1:4455', password = ''): Promise<void> {
  if (connected && obs) return;
  obs = new OBSWebSocket();
  // up to 5 retries with small delay
  let lastErr: any;
  for (let i = 0; i < 5; i++) {
    try {
      await obs.connect(address, password);
      connected = true;
      return;
    } catch (e) {
      lastErr = e;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw lastErr || new Error('Failed to connect to OBS WebSocket');
}

export async function setOBSStreamSettings(streamUrl: string, streamKey: string, password = '') {
  try {
    await connect('ws://127.0.0.1:4455', password);
    if (!obs) throw new Error('OBS not initialized');
    await obs.call('SetStreamServiceSettings', {
      streamServiceType: 'rtmp_custom',
      streamServiceSettings: {
        server: streamUrl,
        key: streamKey,
      },
    });
    return { success: true, message: 'OBS 推流参数设置成功' };
  } catch (e: any) {
    return { success: false, message: e?.message || String(e) };
  }
}

export async function startOBSStreaming(password = '') {
  try {
    await connect('ws://127.0.0.1:4455', password);
    if (!obs) throw new Error('OBS not initialized');

    const status = await obs.call('GetStreamStatus');
    if (!status.outputActive) {
      await obs.call('StartStream');
    }
    return { success: true, message: 'OBS 推流已启动' };
  } catch (e: any) {
    return { success: false, message: e?.message || String(e) };
  }
}

export async function stopOBSStreaming(password = '') {
  try {
    await connect('ws://127.0.0.1:4455', password);
    if (!obs) throw new Error('OBS not initialized');

    const status = await obs.call('GetStreamStatus');
    if (status.outputActive) {
      await obs.call('StopStream');
    }
    return { success: true, message: 'OBS 推流已停止' };
  } catch (e: any) {
    return { success: false, message: e?.message || String(e) };
  }
}

