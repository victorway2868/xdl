/**
 * Utility functions for handling Douyin RTMP API
 */

/**
 * Create a new live room with authentication support
 * @param {Function} openAuthUrl - Function to open authentication URL
 * @param {Function} showNotification - Function to show notification
 * @returns {Promise<Object>} Result of the operation
 */
export const createDouyinLiveRoom = async (openAuthUrl, showNotification) => {
  try {
    if (!window.electron) {
      throw new Error('Electron API not available');
    }

    // Call the API to create a live room
    const result = await window.electron.getDouyinApiInfo(null, 'create');

    // Check if authentication is required
    if (result.requiresAuth && result.authUrl) {
      console.log('Security authentication required for creating live room');

      // Open authentication URL
      if (openAuthUrl) {
        await openAuthUrl(result.authUrl);
      }

      // Show notification
      if (showNotification) {
        // Always use our custom message regardless of what the API returns
        const message = '直播安全认证，请完成后重试！';
        showNotification(message);
      }

      return {
        success: false,
        requiresAuth: true,
        message: '需要完成安全认证'
      };
    }

    // Check if we got a valid RTMP URL
    if (result.streamUrl && result.streamKey) {
      return {
        success: true,
        streamUrl: result.streamUrl,
        streamKey: result.streamKey
      };
    }

    // If we got here, something went wrong
    return {
      success: false,
      message: result.error || '获取推流信息失败'
    };
  } catch (error) {
    console.error('Error creating Douyin live room:', error);
    return {
      success: false,
      message: error.message
    };
  }
};

/**
 * Get the latest room information
 * @returns {Promise<Object>} Result of the operation
 */
export const getLatestRoomInfo = async () => {
  try {
    if (!window.electron) {
      throw new Error('Electron API not available');
    }

    // Call the API to get the latest room info
    const result = await window.electron.getDouyinApiInfo(null, 'get');

    // Check if we got a valid RTMP URL
    if (result.streamUrl && result.streamKey) {
      return {
        success: true,
        streamUrl: result.streamUrl,
        streamKey: result.streamKey
      };
    }

    // If we got here, something went wrong
    return {
      success: false,
      message: result.error || '获取推流信息失败'
    };
  } catch (error) {
    console.error('Error getting latest room info:', error);
    return {
      success: false,
      message: error.message
    };
  }
};
