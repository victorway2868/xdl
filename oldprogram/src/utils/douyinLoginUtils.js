/**
 * Utilities for handling Douyin login functionality
 */

/**
 * Open a browser window for Douyin web login
 * @returns {Promise<Object>} User information and cookies
 */
export const loginWithDouyinWeb = async () => {
  try {
    // Check if electron is available
    if (!window.electron) {
      throw new Error('Electron API not available');
    }

    // 打开浏览器窗口并等待用户登录
    // 这个过程可能需要一段时间，因为用户需要手动登录
    console.log('正在打开抖音网页登录窗口...');
    const result = await window.electron.loginDouyinWeb();

    if (result.success) {
      console.log('抖音网页登录成功');
      // 注意：用户数据现在通过 getdouyinUserStats() 动态获取，不再保存到 localStorage
      return result;
    } else {
      console.log('抖音网页登录失败:', result.error);
      throw new Error(result.error || '登录失败');
    }
  } catch (error) {
    console.error('Douyin web login failed:', error);
    throw error;
  }
};

/**
 * Login with Douyin Companion app
 * @returns {Promise<Object>} User information and cookies
 */
export const loginWithDouyinCompanion = async () => {
  try {
    // Check if electron is available
    if (!window.electron) {
      throw new Error('Electron API not available');
    }

    // 检查直播伴侣是否安装并启动它
    console.log('正在检查直播伴侣...');
    const result = await window.electron.loginDouyinCompanion();

    if (result.success) {
      console.log('直播伴侣登录成功');
      // 注意：用户数据现在通过 getdouyinUserStats() 动态获取，不再保存到 localStorage
      return result;
    } else {
      console.log('直播伴侣登录失败:', result.error);
      throw new Error(result.error || '登录失败');
    }
  } catch (error) {
    console.error('Douyin companion login failed:', error);
    throw error;
  }
};

// 注意：saveDouyinUserData 函数已移除
// 用户数据现在通过 getdouyinUserStats() 动态获取，不再保存到 localStorage

/**
 * Load Douyin user data from localStorage (仅作为回退机制)
 * 注意：主要的用户数据现在通过 getdouyinUserStats() 动态获取
 * @returns {Object|null} User data or null if not found
 */
export const loadDouyinUserData = () => {
  try {
    const userData = localStorage.getItem('douyinAuth');
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Failed to load Douyin user data:', error);
    return null;
  }
};

/**
 * Clear Douyin user data from localStorage
 */
export const clearDouyinUserData = () => {
  try {
    localStorage.removeItem('douyinAuth');
  } catch (error) {
    console.error('Failed to clear Douyin user data:', error);
  }
};
