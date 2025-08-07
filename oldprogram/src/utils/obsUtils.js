/**
 * OBS Utility Functions
 */
import obsService from '../services/obsService';
import streamingService from '../services/streamingService';

/**
 * Core function to get streaming information and configure OBS
 * @param {string} platform - Selected platform
 * @param {string} method - Selected method (optional, required for Douyin)
 * @returns {Promise<{success: boolean, message: string, streamUrl?: string, streamKey?: string}>} Result
 */
export async function workspaceStreamInfo(platform, method) {
  try {
    // Step 1: Get streaming information based on platform and method
    const streamInfo = await streamingService.getStreamInfo(platform, method);
    
    // Check for errors
    if (streamInfo.error) {
      return {
        success: false,
        message: streamInfo.error
      };
    }
    
    // Return success with stream info
    return {
      success: true,
      message: '成功获取推流信息',
      streamUrl: streamInfo.streamUrl,
      streamKey: streamInfo.streamKey
    };
  } catch (error) {
    console.error('WorkspaceStreamInfo failed:', error);
    return {
      success: false,
      message: '获取推流信息失败: ' + error.message
    };
  }
}

/**
 * Configure OBS and start streaming
 * @param {string} streamUrl - Stream URL
 * @param {string} streamKey - Stream key
 * @returns {Promise<{success: boolean, message: string}>} Result
 */
export async function configureAndStartOBS(streamUrl, streamKey) {
  try {
    // Step 1: Ensure OBS WebSocket is enabled
    const websocketEnabled = await obsService.ensureWebSocketEnabled();
    if (!websocketEnabled) {
      return {
        success: false,
        message: '无法启用OBS WebSocket，请检查OBS安装'
      };
    }
    
    // Step 2: Connect to OBS
    const connected = await obsService.connectToOBS();
    if (!connected) {
      return {
        success: false,
        message: '无法连接到OBS，请确保OBS已启动'
      };
    }
    
    // Step 3: Configure stream settings
    const configured = await obsService.configureStreamSettings(streamUrl, streamKey);
    if (!configured) {
      return {
        success: false,
        message: '无法配置OBS推流设置'
      };
    }
    
    // Step 4: Start streaming
    const started = await obsService.startStreaming();
    if (!started) {
      return {
        success: false,
        message: '无法启动OBS推流'
      };
    }
    
    // Return success
    return {
      success: true,
      message: 'OBS推流已成功启动'
    };
  } catch (error) {
    console.error('Configure and start OBS failed:', error);
    return {
      success: false,
      message: '配置并启动OBS失败: ' + error.message
    };
  }
}
