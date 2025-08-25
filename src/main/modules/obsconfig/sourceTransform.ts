import type { } from 'electron';
import { getObsInstance, ensureAndConnectToOBS } from '@main/modules/obsWebSocket';

// 将指定源放置到指定位置，并按画布高度的 52/1080 自动缩放
async function setSourceTransform(
  obs: any,
  sourceName: string,
  posX: number | null,
  posY: number | null,
  alignment: number | null = 5,
  autoScale = true
) {
  const { currentProgramSceneName } = await obs.call('GetCurrentProgramScene');
  const { sceneItems } = await obs.call('GetSceneItemList', { sceneName: currentProgramSceneName });
  const item = sceneItems.find((i: any) => i.sourceName === sourceName);
  if (!item) throw new Error(`未找到源: ${sourceName}`);

  const { sceneItemTransform } = await obs.call('GetSceneItemTransform', {
    sceneName: currentProgramSceneName,
    sceneItemId: item.sceneItemId,
  });

  const newTransform: any = { ...sceneItemTransform };
  if (posX !== null) newTransform.positionX = Number(posX);
  if (posY !== null) newTransform.positionY = Number(posY);
  if (alignment !== null) newTransform.alignment = Number(alignment);

  if (autoScale) {
    try {
      const videoSettings = await obs.call('GetVideoSettings');
      const canvasHeight = videoSettings.baseHeight;
      const targetHeight = (52 / 1080) * canvasHeight;
      const currH = sceneItemTransform.height || 0;
      const factor = currH > 0 ? targetHeight / currH : targetHeight / 100;
      newTransform.scaleX = sceneItemTransform.scaleX * factor;
      newTransform.scaleY = sceneItemTransform.scaleY * factor;
    } catch {}
  }

  // API 需要最小的 bounds 数值
  newTransform.boundsWidth = Math.max(1, newTransform.boundsWidth || 0);
  newTransform.boundsHeight = Math.max(1, newTransform.boundsHeight || 0);

  await obs.call('SetSceneItemTransform', {
    sceneName: currentProgramSceneName,
    sceneItemId: item.sceneItemId,
    sceneItemTransform: newTransform,
  });
}

export async function configureSourceTransform() {
  await ensureAndConnectToOBS();
  const obs = getObsInstance();
  if (!obs) throw new Error('OBS WebSocket 未连接');

  // 读取当前 Profile 名称与编码器参数
  const { currentProfileName } = await obs.call('GetProfileList');
  let encoder = 'obs_x264';
  try {
    const p = await obs.call('GetProfileParameter', {
      parameterCategory: 'AdvOut',
      parameterName: 'Encoder',
    });
    if (p?.parameterValue) encoder = p.parameterValue;
  } catch {}

  // 横竖屏检测
  const { baseWidth, baseHeight } = await obs.call('GetVideoSettings');
  const isPortrait = baseWidth < baseHeight;
  if (isPortrait) {
    return { success: true, profileName: currentProfileName, Encodername: encoder, message: '竖屏不添加说明栏' };
  }

  const posW = baseWidth;
  const posH = baseHeight;

  // 尝试放置动图/榜一/设备/消费（若不存在则忽略异常）
  try { await setSourceTransform(obs, '动图', 0, posH, 9, true); } catch {}
  try {
    const imageWidth = (posH * 52 / 1080 * 567 / 376) + 5;
    await setSourceTransform(obs, '榜一', imageWidth, posH, 9, true);
  } catch {}
  try { await setSourceTransform(obs, '设备', posW / 2, posH, 8, true); } catch {}
  try { await setSourceTransform(obs, '消费', posW, posH, 10, true); } catch {}

  return { success: true, profileName: currentProfileName, Encodername: encoder, message: '源位置调整完成' };
}

