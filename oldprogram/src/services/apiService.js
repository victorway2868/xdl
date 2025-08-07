/**
 * API Service - Handles HTTP requests to the backend server
 */

// 在开发环境中使用代理，在生产环境中使用完整URL
const API_BASE_URL = import.meta.env.DEV ? '' : 'http://117.72.82.170:10272';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    console.log('ApiService initialized with baseURL:', this.baseURL);
  }

  /**
   * Make a GET request to the API
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async get(endpoint, options = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      console.log(`Making GET request to: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...options.headers
        },
        mode: 'cors', // 明确设置CORS模式
        ...options
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`GET ${endpoint} response:`, data);
      return data;
    } catch (error) {
      console.error(`API GET request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Make a POST request to the API
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body data
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async post(endpoint, data = {}, options = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      console.log(`Making POST request to: ${url}`, data);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...options.headers
        },
        body: JSON.stringify(data),
        ...options
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log(`POST ${endpoint} response:`, responseData);
      return responseData;
    } catch (error) {
      console.error(`API POST request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Get all media manifest data
   * @returns {Promise<Object>} Object containing media items grouped by type
   */
  async getAllMediaManifest() {
    try {
      const data = await this.get('/api/v1/media-manifest/public/all');
      return data;
    } catch (error) {
      console.error('Failed to get all media manifest:', error);
      throw new Error('获取媒体数据失败: ' + error.message);
    }
  }

  /**
   * Get hot/popular media manifest data
   * @returns {Promise<Object>} Object containing hot media items grouped by type
   */
  async getHotMediaManifest() {
    try {
      const data = await this.get('/api/v1/media-manifest/public/hot');
      return data;
    } catch (error) {
      console.error('Failed to get hot media manifest:', error);
      throw new Error('获取热门媒体数据失败: ' + error.message);
    }
  }

  /**
   * Get advertisement data
   * @returns {Promise<Array>} Array containing advertisement items
   */
  async getAdvertisementData() {
    try {
      const data = await this.get('/api/v1/media-manifest/public/category/advertisement');
      return data;
    } catch (error) {
      console.error('Failed to get advertisement data:', error);
      throw new Error('获取广告数据失败: ' + error.message);
    }
  }

  /**
   * Get media items by type from the grouped data structure
   * @param {Object} mediaData - Media data object from server
   * @param {string} type - Type to get ('tutorial', 'advertisement', 'device', 'plugin')
   * @returns {Array} Array of media items for the specified type
   */
  getMediaByType(mediaData, type) {
    if (!mediaData || typeof mediaData !== 'object') {
      console.warn('mediaData is not a valid object:', mediaData);
      return [];
    }

    // Map type names to server field names
    const typeMapping = {
      'tutorial': 'tutorial',
      'advertisement': 'advertisement',
      'device': 'device',
      'plugin': 'plugin'
    };

    const serverFieldName = typeMapping[type];
    if (!serverFieldName) {
      console.warn('Unknown media type:', type);
      return [];
    }

    const items = mediaData[serverFieldName];
    if (!Array.isArray(items)) {
      console.warn(`No data found for type ${type}:`, items);
      return [];
    }

    return items;
  }

  /**
   * Add video ID extraction to media item for Douyin videos
   * @param {Object} mediaItem - Media item from server
   * @returns {Object} Media item with extracted videoId if applicable
   */
  addVideoId(mediaItem) {
    // 为抖音平台的视频添加videoId字段
    if (mediaItem.platform === 'douyin' && mediaItem.url) {
      const videoId = this.extractVideoId(mediaItem.url, mediaItem.platform);
      if (videoId) {
        return { ...mediaItem, videoId };
      }
    }
    return mediaItem;
  }

  /**
   * Extract video ID from URL based on platform
   * @param {string} url - Video URL
   * @param {string} platform - Platform name
   * @returns {string|null} Video ID or null
   */
  extractVideoId(url, platform) {
    if (!url || !platform) return null;

    // For Douyin platform, try to extract video ID from URL
    if (platform === 'douyin') {
      // Handle different Douyin URL formats
      // Example: https://example.com/tutorial-1.mp4 -> extract from filename or path
      // Example: https://v.douyin.com/video/7475781431025798411/ -> extract ID

      // Try to match common video ID patterns
      const patterns = [
        /\/(\d{19})\/?/,  // 19-digit video ID in path
        /\/(\d{18})\/?/,  // 18-digit video ID in path
        /\/(\d{17})\/?/,  // 17-digit video ID in path
        /video[\/=](\d+)/i, // video/ID or video=ID format
        /v[\/=](\d+)/i,     // v/ID or v=ID format
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }

      // If no pattern matches, try to extract from filename
      const filename = url.split('/').pop();
      if (filename) {
        const filenameMatch = filename.match(/(\d{17,19})/);
        if (filenameMatch) {
          return filenameMatch[1];
        }
      }
    }

    return null;
  }


}

// Create singleton instance
const apiService = new ApiService();
export default apiService;
