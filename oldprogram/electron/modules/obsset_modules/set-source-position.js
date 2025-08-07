/**
 * OBS WebSocket - Set Source Position, Alignment, and Auto-Scale
 *
 * This script connects to OBS via WebSocket and adjusts the position and alignment of a source in the canvas.
 * It can also automatically scale the source so that its height becomes 52/1080 of the canvas height,
 * while maintaining the original aspect ratio.
 *
 * The scaling is applied relative to the current scale of the source, not as an absolute value.
 * This means if the source is already scaled, the script will adjust that scale to achieve the target height.
 *
 * Usage:
 *   node set-source-position.js [sourceName] [x] [y] [alignment] [useScale]
 *
 * Parameters:
 *   sourceName: The name of the source to transform
 *   x: The X coordinate (horizontal position)
 *   y: The Y coordinate (vertical position)
 *   alignment: The alignment value (0-9)
 *   useScale: Whether to apply automatic scaling (true/1) or keep current scale (false/0)
 *
 * Alignment values:
 *   0: Top Left     1: Top Center     2: Top Right
 *   3: Center Left  4: Center         5: Center Right
 *   6: Bottom Left  7: Bottom Center  8: Bottom Right
 *
 * Examples:
 *   node set-source-position.js "文本" 100 200                # Sets position and auto-scales
 *   node set-source-position.js "文本" 100 200 5              # Sets position with right-center alignment (5) and auto-scales
 *   node set-source-position.js "文本" 0 1080 6 true          # Sets position to bottom-left corner with auto-scaling
 *   node set-source-position.js "文本" 0 1080 6 false         # Sets position to bottom-left corner without scaling
 */

// Import the OBS WebSocket library
import { ensureAndConnectToOBS } from '../obsWebSocketHandlers.js';

/**
 * Format device name to OBS profile name format
 * Replaces spaces with underscores and removes all special characters
 * Preserves Chinese characters, letters, numbers, and underscores
 * @param {string} deviceName - The device name to format
 * @returns {string} - Formatted profile name
 */
function formatProfileName(deviceName) {
  if (!deviceName) return '';
  // Replace spaces with underscores
  let formatted = deviceName.replace(/\s+/g, '_');
  // Remove all special characters while preserving:
  // - Chinese characters (CJK Unified Ideographs: \u4e00-\u9fff)
  // - Chinese characters (CJK Extension A: \u3400-\u4dbf)
  // - Chinese characters (CJK Compatibility Ideographs: \uf900-\ufaff)
  // - Letters (a-z, A-Z)
  // - Numbers (0-9)
  // - Underscores (_)
  formatted = formatted.replace(/[^\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaffa-zA-Z0-9_]/g, '');
  return formatted;
}

/**
 * Sets the position, alignment, and optionally applies automatic scaling to a source in the current OBS scene
 * @param {string} sourceName - The name of the source to transform
 * @param {number|null} x - The X coordinate (horizontal position), null to keep current value
 * @param {number|null} y - The Y coordinate (vertical position), null to keep current value
 * @param {number|null} alignment - The alignment value (0-8), null to keep current value
 *                                 0: Top Left, 1: Top Center, 2: Top Right
 *                                 3: Center Left, 4: Center, 5: Center Right
 *                                 6: Bottom Left, 7: Bottom Center, 8: Bottom Right
 * @param {boolean} useScale - Whether to apply automatic scaling (true) or keep current scale (false)
 */
async function setSourceTransform(obs, sourceName, posx, posy, alignment = 5, useScale = true) {

  try {
    // Get current scene
    const { currentProgramSceneName } = await obs.call('GetCurrentProgramScene');
    console.log(`Current Scene: ${currentProgramSceneName}`);

    // Get scene items to find the item ID for the source
    const { sceneItems } = await obs.call('GetSceneItemList', {
      sceneName: currentProgramSceneName
    });

    // Find the scene item with the matching source name
    const sceneItem = sceneItems.find(item => item.sourceName === sourceName);

    if (!sceneItem) {
      throw new Error(`Source "${sourceName}" not found in scene "${currentProgramSceneName}"`);
    }

    console.log(`Found source "${sourceName}" with item ID: ${sceneItem.sceneItemId}`);

    // Get current transform to preserve other properties
    const { sceneItemTransform } = await obs.call('GetSceneItemTransform', {
      sceneName: currentProgramSceneName,
      sceneItemId: sceneItem.sceneItemId
    });

    console.log('Current transform:', sceneItemTransform);

    // Create a new transform object, only updating the provided values
    const newTransform = { ...sceneItemTransform };

    // Update position if provided
    if (posx !== null) newTransform.positionX = parseFloat(posx);
    if (posy !== null) newTransform.positionY = parseFloat(posy);

    // Update alignment if provided
    if (alignment !== null) {
      // Ensure alignment is a valid value (0-8)
      const alignmentValue = parseInt(alignment);
      if (alignmentValue >= 0 && alignmentValue <= 10) {
        newTransform.alignment = alignmentValue;
        console.log(`Setting alignment to ${alignmentValue}`);
      } else {
        console.warn(`Invalid alignment value: ${alignment}. Must be between 0 and 10.`);
      }
    }

    // Apply automatic scaling if useScale is true
    if (useScale) {
      try {
        // Get current video settings to determine canvas height
        const videoSettings = await obs.call('GetVideoSettings');
        const canvasHeight = videoSettings.baseHeight;
        console.log(`Canvas height: ${canvasHeight}`);

        // Calculate target height (52/1080 of canvas height)
        const targetHeight = 52 / 1080 * canvasHeight;
        console.log(`Target height: ${targetHeight} (52/1080 of canvas height)`);

        // Get current source height in the canvas
        const currentHeight = sceneItemTransform.height;
        console.log(`Current source height: ${currentHeight}`);

        // Check if current height is valid (not zero or too small)
        if (currentHeight > 0.001) {
          // Calculate scale factor as ratio of target height to current height
          const scaleFactor = targetHeight / currentHeight;
          console.log(`Scale factor: ${scaleFactor} (${targetHeight}/${currentHeight})`);

          // Apply the scale factor to both dimensions to maintain aspect ratio
          newTransform.scaleX = sceneItemTransform.scaleX * scaleFactor;
          newTransform.scaleY = sceneItemTransform.scaleY * scaleFactor;
        } else {
          // If current height is zero or too small, set a reasonable default scale
          console.log(`Warning: Current height is too small (${currentHeight}). Using default scale.`);
          // Set a reasonable default scale based on the target height
          // Assuming 100 is a reasonable base size for most sources
          const defaultScaleFactor = targetHeight / 100;
          newTransform.scaleX = defaultScaleFactor;
          newTransform.scaleY = defaultScaleFactor;
        }
        console.log(`Setting scaleX to ${newTransform.scaleX} and scaleY to ${newTransform.scaleY}`);
      } catch (error) {
        console.error('Error getting video settings:', error.message);
      }
    } else {
      console.log('Automatic scaling is disabled. Keeping current scale.');
    }

    // Fix for bounds-related errors - always ensure boundsWidth and boundsHeight are at least 1
    // This is required by OBS WebSocket API even when boundsType is 'OBS_BOUNDS_NONE'
    newTransform.boundsWidth = Math.max(1, newTransform.boundsWidth || 0);
    newTransform.boundsHeight = Math.max(1, newTransform.boundsHeight || 0);

    // Set the new transform
    console.log('Setting new transform:', newTransform);
    console.log('Original transform:', sceneItemTransform);
    console.log('Changes: ' +
      (newTransform.width !== sceneItemTransform.width ? `width ${sceneItemTransform.width} -> ${newTransform.width}, ` : '') +
      (newTransform.height !== sceneItemTransform.height ? `height ${sceneItemTransform.height} -> ${newTransform.height}, ` : '') +
      (newTransform.scaleX !== sceneItemTransform.scaleX ? `scaleX ${sceneItemTransform.scaleX} -> ${newTransform.scaleX}, ` : '') +
      (newTransform.scaleY !== sceneItemTransform.scaleY ? `scaleY ${sceneItemTransform.scaleY} -> ${newTransform.scaleY}, ` : '') +
      (newTransform.positionX !== sceneItemTransform.positionX ? `positionX ${sceneItemTransform.positionX} -> ${newTransform.positionX}, ` : '') +
      (newTransform.positionY !== sceneItemTransform.positionY ? `positionY ${sceneItemTransform.positionY} -> ${newTransform.positionY}, ` : '') +
      (newTransform.rotation !== sceneItemTransform.rotation ? `rotation ${sceneItemTransform.rotation} -> ${newTransform.rotation}` : '')
    );

    try {
      await obs.call('SetSceneItemTransform', {
        sceneName: currentProgramSceneName,
        sceneItemId: sceneItem.sceneItemId,
        sceneItemTransform: newTransform
      });

      // Verify the transform was applied
      const { sceneItemTransform: updatedTransform } = await obs.call('GetSceneItemTransform', {
        sceneName: currentProgramSceneName,
        sceneItemId: sceneItem.sceneItemId
      });

      console.log('Transform after update:', updatedTransform);
      console.log('Verification: ' +
        (updatedTransform.width === newTransform.width ? 'width applied ✓, ' : 'width not applied ✗, ') +
        (updatedTransform.height === newTransform.height ? 'height applied ✓, ' : 'height not applied ✗, ') +
        (updatedTransform.scaleX === newTransform.scaleX ? 'scaleX applied ✓, ' : 'scaleX not applied ✗, ') +
        (updatedTransform.scaleY === newTransform.scaleY ? 'scaleY applied ✓, ' : 'scaleY not applied ✗, ') +
        (updatedTransform.positionX === newTransform.positionX ? 'positionX applied ✓, ' : 'positionX not applied ✗, ') +
        (updatedTransform.positionY === newTransform.positionY ? 'positionY applied ✓, ' : 'positionY not applied ✗, ') +
        (updatedTransform.rotation === newTransform.rotation ? 'rotation applied ✓' : 'rotation not applied ✗')
      );
    } catch (error) {
      console.error('Error setting transform:', error.message);
      throw error;
    }

    console.log(`Successfully transformed source "${sourceName}"`);
    console.log(`Position: X=${newTransform.positionX}, Y=${newTransform.positionY}`);
    console.log(`Scale: X=${newTransform.scaleX}, Y=${newTransform.scaleY}`);
    if (alignment !== null) {
      console.log(`Alignment: ${newTransform.alignment}`);
    }
  } catch (error) {
    console.error('Error during source transformation:', error.message);
  }
}

async function configureSourceTransform(address = 'localhost:4455', password = '') {
  // 创建一个新的OBS WebSocket连接，而不是使用共享实例
  let obs = null;
  let currentProfileName = '';
  let formattedProfileName = '';
  let parameterresult = null;

  try {
    // 使用obsWebSocketHandlers.js中的ensureAndConnectToOBS函数连接到OBS
    console.log('正在连接到OBS WebSocket...');
    const connectResult = await ensureAndConnectToOBS(address, password);

    if (!connectResult.success) {
      throw new Error(`无法连接到OBS WebSocket: ${connectResult.message}`);
    }

    // 获取OBS WebSocket客户端实例
    // 注意：ensureAndConnectToOBS函数会返回一个连接结果，但不会返回OBS WebSocket客户端实例
    // 我们需要从obsWebSocketHandlers.js模块中获取它

    // 导入obsWebSocketHandlers.js中的getOBSWebSocketInstance函数
    const { getOBSWebSocketInstance } = await import('../obsWebSocketHandlers.js');
    obs = getOBSWebSocketInstance();

    if (!obs || !obs.identified) {
      throw new Error('OBS WebSocket客户端未连接');
    }

    // Get OBS profile name
    const { currentProfileName } = await obs.call('GetProfileList');

    // Format profile name according to OBS standard
    const formattedProfileName = formatProfileName(currentProfileName);

    console.log(`Current Profile: ${currentProfileName}`);
    console.log(`Formatted Profile Name: ${formattedProfileName}`);
    const parameterresult = await obs.call('GetProfileParameter', {
      parameterCategory: 'AdvOut',
      parameterName: 'Encoder'
    });

    const videoSettings = await obs.call('GetVideoSettings');
    const posHeight = videoSettings.baseHeight;
    const posWidth = videoSettings.baseWidth;
    // 检测是否为竖屏模式（宽小于高）
    const isPortrait = posWidth < posHeight;
    if (isPortrait) {
      console.log('Portrait orientation detected (width < height). Using portrait layout.');
    } else {
      console.log('Landscape orientation detected (width >= height). Using landscape layout.');
    }

    if (posWidth < posHeight) {
      console.log('竖屏直播间配置,不需要添加说明栏');
      return {
        success: true,
        profileName: formattedProfileName,
        Encodername: parameterresult.parameterValue,
        message: '竖屏直播间配置,不需要添加说明栏'
      };
    }

    // Position all sources
    console.log('Positioning "动图" source...');
    try {
      await setSourceTransform(obs, '动图', 0, posHeight, 9, true);
      console.log('Successfully positioned "动图" source');
    } catch (error) {
      console.warn(`Warning: Failed to position "动图" source: ${error.message}`);
    }

    console.log('Positioning "榜一" source...');
    try {
      const imagewidth = (posHeight * 52 / 1080 * 567 / 376) + 5;
      await setSourceTransform(obs, '榜一', imagewidth, posHeight, 9, true);
      console.log('Successfully positioned "榜一" source');
    } catch (error) {
      console.warn(`Warning: Failed to position "榜一" source: ${error.message}`);
    }

    console.log('Positioning "设备" source...');
    try {
      await setSourceTransform(obs, '设备', posWidth / 2, posHeight, 8, true);
      console.log('Successfully positioned "设备" source');
    } catch (error) {
      console.warn(`Warning: Failed to position "设备" source: ${error.message}`);
    }

    console.log('Positioning "消费" source...');
    try {
      await setSourceTransform(obs, '消费', posWidth, posHeight, 10, true);
      console.log('Successfully positioned "消费" source');
    } catch (error) {
      console.warn(`Warning: Failed to position "消费" source: ${error.message}`);
    }

    console.log('All sources positioned successfully');
    return {
      success: true,
      profileName: formattedProfileName,
      Encodername: parameterresult.parameterValue,
      message: 'All sources positioned successfully'
    };
  } catch (error) {
    console.error('Error during source transformation:', error.message);
    // 如果在错误处理中，formattedProfileName可能未定义，所以需要再次格式化
    const profileNameToUse = typeof formattedProfileName !== 'undefined'
      ? formattedProfileName
      : (currentProfileName ? formatProfileName(currentProfileName) : '');

    return {
      success: false,
      profileName: profileNameToUse,
      Encodername: parameterresult ? parameterresult.parameterValue : '',
      message: `Error during source transformation: ${error.message}`
    };
  } finally {
    // Disconnect from OBS WebSocket
    try {
      if (obs && obs.identified) {
        await obs.disconnect();
        console.log('Disconnected from OBS WebSocket');
      }
    } catch (disconnectError) {
      console.error('Error disconnecting from OBS WebSocket:', disconnectError.message);
    }
  }
}

// Export functions
export {
  setSourceTransform,
  configureSourceTransform
};
