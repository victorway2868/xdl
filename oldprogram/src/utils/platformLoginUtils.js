/**
 * Utilities for handling multi-platform login functionality
 */
import { loadDouyinUserData } from './douyinLoginUtils';

// 用户数据缓存
const userDataCache = {
  data: null,
  timestamp: null,
  platform: null,
  // 缓存有效期：5分钟
  CACHE_DURATION: 5 * 60 * 1000
};

/**
 * 检查缓存是否有效
 * @param {string} platform - 平台名称
 * @returns {boolean} 缓存是否有效
 */
const isCacheValid = (platform) => {
  if (!userDataCache.data || !userDataCache.timestamp || userDataCache.platform !== platform) {
    return false;
  }

  const now = Date.now();
  const cacheAge = now - userDataCache.timestamp;
  return cacheAge < userDataCache.CACHE_DURATION;
};

/**
 * 设置用户数据缓存
 * @param {Object} userData - 用户数据
 * @param {string} platform - 平台名称
 */
const setCacheData = (userData, platform) => {
  userDataCache.data = userData;
  userDataCache.timestamp = Date.now();
  userDataCache.platform = platform;
  console.log(`[CACHE] 已缓存 ${platform} 用户数据:`, userData?.user?.nickname);
};

/**
 * 获取缓存的用户数据
 * @param {string} platform - 平台名称
 * @returns {Object|null} 缓存的用户数据或null
 */
const getCacheData = (platform) => {
  if (isCacheValid(platform)) {
    console.log(`[CACHE] 使用缓存的 ${platform} 用户数据:`, userDataCache.data?.user?.nickname);
    return userDataCache.data;
  }
  return null;
};

/**
 * 清除用户数据缓存
 * @param {string} platform - 平台名称（可选，如果不提供则清除所有缓存）
 */
const clearCache = (platform = null) => {
  if (!platform || userDataCache.platform === platform) {
    userDataCache.data = null;
    userDataCache.timestamp = null;
    userDataCache.platform = null;
    console.log(`[CACHE] 已清除 ${platform || '所有'} 缓存数据`);
  }
};

/**
 * Load user data based on selected platform
 * @param {string} platform - The selected platform
 * @param {boolean} forceRefresh - 是否强制刷新，跳过缓存
 * @returns {Promise<Object|null>} User data or null if not found
 */
export const loadPlatformUserData = async (platform, forceRefresh = false) => {
  try {
    console.log(`[PLATFORM-LOGIN] 加载 ${platform} 用户数据, forceRefresh: ${forceRefresh}`);

    // 如果不是强制刷新，先检查缓存
    if (!forceRefresh) {
      const cachedData = getCacheData(platform);
      if (cachedData) {
        console.log(`[PLATFORM-LOGIN] 使用缓存数据: ${cachedData.user?.nickname}`);
        return cachedData;
      }
      console.log(`[PLATFORM-LOGIN] 缓存无效或不存在，从API获取数据`);
    } else {
      console.log(`[PLATFORM-LOGIN] 强制刷新，跳过缓存`);
    }

    switch (platform) {
      case '抖音':
        // 优先使用 getDouyinUserStats API 获取最新用户数据
        if (window.electron && window.electron.getDouyinUserStats) {
          console.log('[PLATFORM-LOGIN] Using getDouyinUserStats API for Douyin platform');
          try {
            const result = await window.electron.getDouyinUserStats({ verbose: false });
            if (result.success && result.data) {
              // 转换数据格式以匹配现有的用户数据结构
              const userData = {
                user: {
                  id: result.data.uid || `douyin_${result.data.nickname}_${Date.now()}`,
                  nickname: result.data.nickname,
                  avatar_url: result.data.avatar_url,
                  // 添加额外的统计信息
                  follower_count: result.data.follower_count,
                  following_count: result.data.following_count,
                  total_favorited: result.data.total_favorited,
                  aweme_count: result.data.aweme_count,
                  unique_id: result.data.unique_id,
                  signature: result.data.signature,
                  live_status: result.data.live_status,
                  room_id: result.data.room_id
                },
                source: result.data.source,
                timestamp: result.data.timestamp
              };
              console.log('[PLATFORM-LOGIN] Successfully loaded Douyin user data from API:', userData.user.nickname);

              // 缓存用户数据
              setCacheData(userData, platform);

              return userData;
            } else {
              // 根据错误类型决定是否需要用户重新登录
              if (result.errorCode && (
                result.errorCode === 'COOKIE_FILE_NOT_FOUND' ||
                result.errorCode === 'COOKIE_FILE_EMPTY' ||
                result.errorCode === 'COOKIE_CONTENT_INVALID'
              )) {
                console.log('[PLATFORM-LOGIN] Cookie相关错误，需要用户重新登录:', result.error);
                // 这些错误表示需要重新登录，返回 null 而不是抛出错误
                return null;
              } else {
                console.log('[PLATFORM-LOGIN] getDouyinUserStats API failed, falling back to localStorage:', result.error);
              }
            }
          } catch (apiError) {
            console.error('[PLATFORM-LOGIN] getDouyinUserStats API error:', apiError.message);
            // 如果是需要重新登录的错误，返回 null
            if (apiError.message.includes("Cookie文件") || apiError.message.includes("重新登录")) {
              console.log('[PLATFORM-LOGIN] Cookie相关错误，返回 null');
              return null;
            }
            console.log('[PLATFORM-LOGIN] Falling back to localStorage');
          }
        }
        // 如果API调用失败，回退到原来的localStorage方法
        const fallbackData = loadDouyinUserData();
        if (fallbackData) {
          // 缓存回退数据
          setCacheData(fallbackData, platform);
        }
        return fallbackData;
      case 'Bilibili':
        // 从本地存储加载B站用户数据
        const bilibiliData = localStorage.getItem('bilibiliAuth');
        const parsedBilibiliData = bilibiliData ? JSON.parse(bilibiliData) : null;
        if (parsedBilibiliData) {
          // 缓存B站数据
          setCacheData(parsedBilibiliData, platform);
        }
        return parsedBilibiliData;
      default:
        console.warn(`Unsupported platform: ${platform}`);
        return null;
    }
  } catch (error) {
    console.error(`Failed to load ${platform} user data:`, error);
    return null;
  }
};

/**
 * Check if user is logged in for the specified platform
 * @param {string} platform - The platform to check
 * @returns {boolean} Whether the user is logged in
 */
export const isPlatformLoggedIn = (platform) => {
  const userData = loadPlatformUserData(platform);
  return !!userData;
};

/**
 * Clear user data for the specified platform
 * @param {string} platform - The platform to clear data for
 */
export const clearPlatformUserData = (platform) => {
  try {
    // 清除缓存
    clearCache(platform);

    switch (platform) {
      case '抖音':
        // 导入并使用抖音的清除函数
        const { clearDouyinUserData } = require('./douyinLoginUtils');
        clearDouyinUserData();
        break;
      case 'Bilibili':
        // 清除B站用户数据
        localStorage.removeItem('bilibiliAuth');
        break;
      default:
        console.warn(`Unsupported platform: ${platform}`);
    }
  } catch (error) {
    console.error(`Failed to clear ${platform} user data:`, error);
  }
};

/**
 * 强制刷新用户数据（跳过缓存）
 * @param {string} platform - 平台名称
 * @returns {Promise<Object|null>} 用户数据
 */
export const refreshPlatformUserData = async (platform) => {
  console.log(`[PLATFORM-LOGIN] 强制刷新 ${platform} 用户数据`);
  return await loadPlatformUserData(platform, true);
};
