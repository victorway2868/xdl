import os from 'os';
import { ensureAndConnectToOBS, getObsInstance } from '@main/modules/obsWebSocket';

// 默认音频源名称
const DEFAULT_AUDIO_SOURCES = {
  desktopAudio: '桌面音频',
  micAudio: '麦克风/Aux',
  noiseSuppressionFilter: '噪声抑制',
};

export type EnableAudioOptions = {
  desktopAudioName?: string;
  micAudioName?: string;
  noiseSuppressionFilterName?: string;
};

export async function enableDefaultAudioSources(options: EnableAudioOptions = {}) {
  const desktopAudio = options.desktopAudioName || DEFAULT_AUDIO_SOURCES.desktopAudio;
  const micAudio = options.micAudioName || DEFAULT_AUDIO_SOURCES.micAudio;
  const noiseSuppressionFilter = options.noiseSuppressionFilterName || DEFAULT_AUDIO_SOURCES.noiseSuppressionFilter;

  // 确保连接 OBS
  await ensureAndConnectToOBS();
  const obs = getObsInstance();
  if (!obs) throw new Error('OBS WebSocket 未连接');

  // 仅在 Windows 下使用 WASAPI 名称，其它平台按需扩展
  const platform = os.platform();
  const desktopKind = platform === 'win32' ? 'wasapi_output_capture' : 'wasapi_output_capture';
  const micKind = platform === 'win32' ? 'wasapi_input_capture' : 'wasapi_input_capture';

  // 获取当前场景与输入列表
  const { currentProgramSceneName } = await obs.call('GetCurrentProgramScene');
  const { inputs } = await obs.call('GetInputList');

  const hasDesktop = Array.isArray(inputs) && inputs.some((i: any) => i.inputName === desktopAudio && i.inputKind === desktopKind);
  if (!hasDesktop) {
    try {
      await obs.call('CreateInput', {
        sceneName: currentProgramSceneName,
        inputName: desktopAudio,
        inputKind: desktopKind,
        inputSettings: { device_id: 'default' },
      });
    } catch (e: any) {
      // 忽略创建失败，继续后续流程
      console.warn('创建桌面音频失败:', e?.message || String(e));
    }
  }

  const hasMic = Array.isArray(inputs) && inputs.some((i: any) => i.inputName === micAudio && i.inputKind === micKind);
  if (!hasMic) {
    try {
      await obs.call('CreateInput', {
        sceneName: currentProgramSceneName,
        inputName: micAudio,
        inputKind: micKind,
        inputSettings: { device_id: 'default' },
      });
    } catch (e: any) {
      console.warn('创建麦克风音频失败:', e?.message || String(e));
    }
  }

  // 取消静音并设置音量到 100%
  try {
    await obs.call('SetInputMute', { inputName: desktopAudio, inputMuted: false });
    await obs.call('SetInputMute', { inputName: micAudio, inputMuted: false });
    await obs.call('SetInputVolume', { inputName: desktopAudio, inputVolumeMul: 1.0 });
    await obs.call('SetInputVolume', { inputName: micAudio, inputVolumeMul: 1.0 });
  } catch (e: any) {
    console.warn('设置音量/静音状态失败:', e?.message || String(e));
  }

  // 给麦克风添加噪声抑制滤镜（若不存在）
  try {
    const { filters } = await obs.call('GetSourceFilterList', { sourceName: micAudio });
    const exists = Array.isArray(filters)
      ? filters.some((f: any) => f.filterName === noiseSuppressionFilter && f.filterKind === 'noise_suppress_filter_v2')
      : false;
    if (!exists) {
      try {
        await obs.call('CreateSourceFilter', {
          sourceName: micAudio,
          filterName: noiseSuppressionFilter,
          filterKind: 'noise_suppress_filter_v2',
          filterSettings: {},
        });
      } catch (e: any) {
        console.warn('创建噪声抑制滤镜失败:', e?.message || String(e));
      }
    }
  } catch (e: any) {
    // 旧版本或无此源时可能失败，忽略
    console.warn('查询或设置麦克风滤镜失败:', e?.message || String(e));
  }

  return {
    success: true,
    desktopAudio,
    micAudio,
    message: '默认音频源已启用（若不存在则创建），并取消静音',
  };
}

