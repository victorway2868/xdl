import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import { ensureAndConnectToOBS, getObsInstance } from '@main/modules/obsWebSocket';
import { formatProfileName } from '@main/utils/stringFormat';

function ensureEven(v: number) { return v % 2 === 0 ? v : v + 1; }

function parseResolution(resolution?: string): { width: number; height: number } {
  if (!resolution) return { width: 1920, height: 1080 };
  const m = resolution.replace(/\s+/g, '').match(/(\d+)[xX×](\d+)/);
  if (!m) return { width: 1920, height: 1080 };
  return { width: parseInt(m[1], 10), height: parseInt(m[2], 10) };
}

function calculateDimensions(width: number, height: number) {
  const heightAdjustmentFactor = (width / height < 1) ? 0 : 52 / 1080;
  const actualBaseWidth = width;
  const actualBaseHeight = Math.round(height * (1 + heightAdjustmentFactor));
  const actualOutputWidth = width;
  const actualOutputHeight = Math.round(height * (1 + heightAdjustmentFactor));

  let rescaleWidth: number, rescaleHeight: number;
  if (actualBaseWidth >= actualBaseHeight) {
    rescaleHeight = ensureEven(1080);
    rescaleWidth = ensureEven(Math.round(rescaleHeight * (actualBaseWidth / actualBaseHeight)));
  } else {
    rescaleWidth = ensureEven(1080);
    rescaleHeight = ensureEven(Math.round(rescaleWidth * (actualBaseHeight / actualBaseWidth)));
  }
  const rescaleResStr = `${rescaleWidth}x${rescaleHeight}`;

  return {
    actualBaseWidth,
    actualBaseHeight,
    actualOutputWidth,
    actualOutputHeight,
    rescaleResStr,
  };
}

async function setProfileParameters(obs: any, params: Array<{ parameterCategory: string; parameterName: string; parameterValue: string }>) {
  for (const p of params) {
    await obs.call('SetProfileParameter', p);
  }
}

function resolveImagePath(): string | null {
  const fname = 'winer.gif';
  const candidates = [
    path.join(path.dirname(app.getPath('exe')), 'resources', 'public', 'images', fname),
    path.join(path.dirname(app.getPath('exe')), 'resources', 'app', 'public', 'images', fname),
    path.join(app.getAppPath(), 'public', 'images', fname),
    path.join(process.resourcesPath || '', 'public', 'images', fname),
  ];
  for (const p of candidates) {
    try { if (fs.existsSync(p)) return p; } catch {}
  }
  return null;
}

async function addOrUpdateTextSource(obs: any, sceneName: string, inputKind: string, sourceName: string, textContent: string) {
  const { inputs } = await obs.call('GetInputList');
  const existing = inputs.find((i: any) => i.inputName === sourceName);
  if (existing) {
    await obs.call('SetInputSettings', {
      inputName: sourceName,
      inputSettings: { text: textContent, font: { face: '仓耳舒圆体 W04', size: 256, style: 'Regular', flags: 0 } },
    });
  } else {
    await obs.call('CreateInput', {
      sceneName,
      inputName: sourceName,
      inputKind,
      inputSettings: { text: textContent, font: { face: '仓耳舒圆体 W04', size: 256, style: 'Regular', flags: 0 } },
    });
  }
}

async function addOrUpdateImageSource(obs: any, sceneName: string, inputKind: string, sourceName: string, filePath: string) {
  const { inputs } = await obs.call('GetInputList');
  const existing = inputs.find((i: any) => i.inputName === sourceName);
  if (existing) {
    await obs.call('SetInputSettings', { inputName: sourceName, inputSettings: { file: filePath } });
  } else {
    await obs.call('CreateInput', { sceneName, inputName: sourceName, inputKind, inputSettings: { file: filePath } });
  }
}

export async function manageProfileAndSceneCollection(options: {
  profileName?: string;
  sceneCollectionName?: string;
  deviceName?: string;
  resolution?: string;
  address?: string;
  password?: string;
}) {
  const rawName = options.deviceName || options.profileName || '默认配置';
  const name = formatProfileName(rawName);
  const sceneName = formatProfileName(options.deviceName || options.sceneCollectionName || rawName);
  const { width, height } = parseResolution(options.resolution);
  const dims = calculateDimensions(width, height);

  await ensureAndConnectToOBS(options.address || '', options.password || '');
  const obs = getObsInstance();
  if (!obs) throw new Error('OBS WebSocket 未连接');

  // Profile
  const maxProfileRetries = 3;
  for (let attempt = 1; attempt <= maxProfileRetries; attempt++) {
    try {
      const prof = await obs.call('GetProfileList');
      const profiles: string[] = prof.profiles || [];
      const current: string = prof.currentProfileName;
      if (!profiles.includes(name)) {
        await obs.call('CreateProfile', { profileName: name });
        await new Promise(r => setTimeout(r, 600));
      }
      if (current !== name) {
        await obs.call('SetCurrentProfile', { profileName: name });
        await new Promise(r => setTimeout(r, 800));
      }
      // verify
      const verify = await obs.call('GetProfileList');
      if (verify.currentProfileName !== name) throw new Error('配置文件切换验证失败');
      break;
    } catch (e) {
      if (attempt === maxProfileRetries) throw e;
      await new Promise(r => setTimeout(r, 500 * attempt));
    }
  }

  // Video settings
  await obs.call('SetVideoSettings', {
    baseWidth: dims.actualBaseWidth,
    baseHeight: dims.actualBaseHeight,
    outputWidth: dims.actualOutputWidth,
    outputHeight: dims.actualOutputHeight,
    fpsNumerator: 65,
    fpsDenominator: 1,
  });

  await setProfileParameters(obs, [
    { parameterCategory: 'Output', parameterName: 'Mode', parameterValue: 'Advanced' },
    { parameterCategory: 'AdvOut', parameterName: 'Encoder', parameterValue: 'obs_x264' },
    { parameterCategory: 'AdvOut', parameterName: 'Rescale', parameterValue: 'true' },
    { parameterCategory: 'AdvOut', parameterName: 'RescaleFilter', parameterValue: '4' },
    { parameterCategory: 'AdvOut', parameterName: 'RescaleRes', parameterValue: dims.rescaleResStr },
  ]);

  // Scene collection
  const maxSceneRetries = 5;
  for (let attempt = 1; attempt <= maxSceneRetries; attempt++) {
    try {
      const sc = await obs.call('GetSceneCollectionList');
      const list: string[] = sc.sceneCollections || [];
      const current = sc.currentSceneCollectionName;
      if (!list.includes(sceneName)) {
        await obs.call('CreateSceneCollection', { sceneCollectionName: sceneName });
        await new Promise(r => setTimeout(r, 800));
      }
      if (current !== sceneName) {
        await obs.call('SetCurrentSceneCollection', { sceneCollectionName: sceneName });
        await new Promise(r => setTimeout(r, 800));
      }
      const verify = await obs.call('GetSceneCollectionList');
      if (verify.currentSceneCollectionName !== sceneName) throw new Error('场景集合切换验证失败');
      break;
    } catch (e) {
      if (attempt === maxSceneRetries) throw e;
      await new Promise(r => setTimeout(r, 800 * attempt));
    }
  }

  // Add sources (best-effort, only for landscape)
  if (width >= height) {
    try {
      const { currentProgramSceneName } = await obs.call('GetCurrentProgramScene');
      const { inputKinds } = await obs.call('GetInputKindList');

      // image
      const imageKind = ['image_source', 'ffmpeg_source'].find(k => inputKinds.includes(k));
      const imgPath = resolveImagePath();
      if (imageKind && imgPath) {
        try { await addOrUpdateImageSource(obs, currentProgramSceneName, imageKind, '动图', imgPath); } catch {}
      }

      // text
      const textKind = ['text_gdiplus_v2', 'text_ft2_source_v2'].find(k => inputKinds.includes(k));
      if (textKind) {
        try { await addOrUpdateTextSource(obs, currentProgramSceneName, textKind, '榜一', '昨日榜一:XX'); } catch {}
        try { await addOrUpdateTextSource(obs, currentProgramSceneName, textKind, '设备', `设备:${name}`); } catch {}
        try { await addOrUpdateTextSource(obs, currentProgramSceneName, textKind, '消费', '禁止未成年消费'); } catch {}
      }
    } catch {}
  }

  return {
    success: true,
    profileName: name,
    sceneCollectionName: sceneName,
    dimensions: dims,
    message: 'OBS 配置文件与场景集合配置完成',
  };
}

