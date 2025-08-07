/**
 * Streaming Service - Handles platform-specific streaming functionality
 */
import authService from './authService';

class StreamingService {
  constructor() {
    this.currentPlatform = null;
    this.currentMethod = null;
  }

  /**
   * Get streaming information based on platform and method
   * @param {string} platform - Selected platform (e.g., '抖音', 'Bilibili')
   * @param {string} method - Selected method (e.g., '直播伴侣', '手机开播', '自动开播')
   * @returns {Promise<{streamUrl: string, streamKey: string} | {error: string}>} Stream info or error
   */
  async getStreamInfo(platform, method) {
    try {
      // Validate platform
      if (!platform) {
        return { error: '请选择直播平台' };
      }

      // Handle Douyin platform
      if (platform === '抖音') {
        return await this.getDouyinStreamInfo(method);
      }
      
      // Handle Bilibili platform
      if (platform === 'Bilibili') {
        return await this.getBilibiliStreamInfo();
      }
      
      // Handle other platforms
      return { 
        error: `暂不支持 ${platform} 平台` 
      };
    } catch (error) {
      console.error('Failed to get stream info:', error);
      return { 
        error: '获取推流信息失败: ' + error.message 
      };
    }
  }

  /**
   * Get Douyin streaming information based on method
   * @param {string} method - Selected method
   * @returns {Promise<{streamUrl: string, streamKey: string} | {error: string}>} Stream info or error
   */
  async getDouyinStreamInfo(method) {
    // Validate method for Douyin
    if (!method) {
      return { error: '请选择直播方式' };
    }

    // Handle different methods for Douyin
    switch (method) {
      case '直播伴侣':
        return await this.getDouyinCompanionInfo();
      
      case '手机开播':
      case '自动开播':
        // Check if user is authenticated
        if (!authService.isAuthenticated()) {
          return { error: '请先登录平台' };
        }
        return await this.getDouyinApiInfo(method);
      
      default:
        return { error: `不支持的直播方式: ${method}` };
    }
  }

  /**
   * Get streaming info from Douyin Companion app
   * @returns {Promise<{streamUrl: string, streamKey: string} | {error: string}>} Stream info or error
   */
  async getDouyinCompanionInfo() {
    try {
      // In a real implementation, this would communicate with the Douyin Companion app
      // to extract the stream URL and key
      if (window.electron) {
        return await window.electron.getDouyinCompanionInfo();
      }
      
      // Mock data for development
      return {
        streamUrl: 'rtmp://push.douyin.com/live',
        streamKey: 'mock_douyin_companion_key_' + Date.now()
      };
    } catch (error) {
      console.error('Failed to get Douyin Companion info:', error);
      return { error: '无法从直播伴侣获取推流信息: ' + error.message };
    }
  }

  /**
   * Get streaming info from Douyin API
   * @param {string} method - Selected method
   * @returns {Promise<{streamUrl: string, streamKey: string} | {error: string}>} Stream info or error
   */
  async getDouyinApiInfo(method) {
    try {
      // Get auth token
      const token = authService.getToken();
      
      if (!token) {
        return { error: '未找到有效的登录信息，请重新登录' };
      }
      
      // In a real implementation, this would call the Douyin API
      if (window.electron) {
        return await window.electron.getDouyinApiInfo(token, method);
      }
      
      // Mock data for development
      return {
        streamUrl: 'rtmp://push.douyin.com/live',
        streamKey: `mock_douyin_${method}_key_` + Date.now()
      };
    } catch (error) {
      console.error('Failed to get Douyin API info:', error);
      return { error: '无法从抖音API获取推流信息: ' + error.message };
    }
  }

  /**
   * Get Bilibili streaming information
   * @returns {Promise<{streamUrl: string, streamKey: string} | {error: string}>} Stream info or error
   */
  async getBilibiliStreamInfo() {
    try {
      // Check if user is authenticated for Bilibili
      if (!authService.isAuthenticated()) {
        return { error: '请先登录Bilibili平台' };
      }
      
      // Get auth token
      const token = authService.getToken();
      
      // In a real implementation, this would call the Bilibili API
      if (window.electron) {
        return await window.electron.getBilibiliStreamInfo(token);
      }
      
      // Mock data for development
      return {
        streamUrl: 'rtmp://live-push.bilivideo.com/live-bvc',
        streamKey: 'mock_bilibili_key_' + Date.now()
      };
    } catch (error) {
      console.error('Failed to get Bilibili stream info:', error);
      return { error: '无法从Bilibili获取推流信息: ' + error.message };
    }
  }
}

// Create singleton instance
const streamingService = new StreamingService();
export default streamingService;
