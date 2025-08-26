/**
 * 显示器采集配置模块
 * 用于管理OBS中的显示器采集源，包括显示器选择和配置
 */
import { ensureAndConnectToOBS, getObsInstance } from '@main/modules/obsWebSocket';

/**
 * 创建并配置显示器采集源
 * @param options 配置选项
 * @returns 包含操作结果的对象
 */
export async function createDisplayCaptureSource(options: {
  sourceName?: string;
} = {}) {
  // 设置源名称，默认为"显示器采集"
  const sourceName = options.sourceName || '显示器采集';

  // 确保OBS WebSocket连接已建立
  await ensureAndConnectToOBS();
  const obs = getObsInstance();
  if (!obs) throw new Error('OBS WebSocket 未连接');

  try {
    console.log('Creating new display capture...');

    // 获取当前场景
    const { currentProgramSceneName } = await obs.call('GetCurrentProgramScene');
    console.log(`Current Scene: ${currentProgramSceneName}`);

    // 获取可用输入类型以确认monitor_capture是否可用
    const { inputKinds } = await obs.call('GetInputKindList');

    // 检查monitor_capture是否可用
    if (!inputKinds.includes('monitor_capture')) {
      throw new Error('monitor_capture input kind is not available in this OBS version');
    }

    console.log('Display capture is supported in this OBS version');

    // 检查源是否已存在
    const { inputs } = await obs.call('GetInputList');
    const existingSource = inputs.find((input: any) =>
      input.inputName === sourceName && input.inputKind === 'monitor_capture'
    );

    // 如果源不存在则创建
    if (!existingSource) {
      console.log(`Creating new display capture source: ${sourceName}`);

      await obs.call('CreateInput', {
        sceneName: currentProgramSceneName,
        inputName: sourceName,
        inputKind: 'monitor_capture'
      });

      console.log(`Successfully created display capture source: ${sourceName}`);
    } else {
      console.log(`Display capture source already exists: ${sourceName}`);
    }

    // 获取可用显示器列表
    console.log('\n--- Getting Available Monitors ---');
    const monitorListResponse = await obs.call('GetInputPropertiesListPropertyItems', {
      inputName: sourceName,
      propertyName: 'monitor_id'
    });

    const monitorList = monitorListResponse.propertyItems || [];

    if (monitorList.length === 0) {
      console.log('No monitors found');
      return {
        success: false,
        message: 'No monitors available for capture'
      };
    }

    console.log(`Found ${monitorList.length} monitors:`);
    monitorList.forEach((monitor: any, index: number) => {
      console.log(`${index + 1}. ${monitor.itemName} (ID: ${monitor.itemValue})`);
    });

    // 查找主显示器（通常包含"Primary"或"主显示器"或"0,0"）
    let primaryMonitor = monitorList.find((monitor: any) =>
      monitor.itemName.includes('Primary') ||
      monitor.itemName.includes('主显示器') ||
      monitor.itemName.includes('0,0')
    );

    // 如果没有找到主显示器，使用第一个
    if (!primaryMonitor && monitorList.length > 0) {
      primaryMonitor = monitorList[0];
    }

    if (primaryMonitor) {
      console.log(`\nSelecting primary monitor: ${primaryMonitor.itemName}`);

      // 配置显示器采集源使用主显示器
      await obs.call('SetInputSettings', {
        inputName: sourceName,
        inputSettings: {
          monitor_id: primaryMonitor.itemValue
        }
      });

      console.log(`Successfully configured ${sourceName} to capture ${primaryMonitor.itemName}`);
    } else {
      console.log('No monitors available to capture');
      return {
        success: false,
        message: 'No monitors available to capture'
      };
    }

    console.log('\nDisplay capture source setup completed successfully!');

    return {
      success: true,
      sourceName,
      monitorName: primaryMonitor.itemName,
      monitorId: primaryMonitor.itemValue,
      message: `Display capture configured for ${primaryMonitor.itemName}`
    };

  } catch (error: any) {
    console.error('Error:', error.message);
    return {
      success: false,
      message: error.message || 'Failed to create display capture source'
    };
  }
}