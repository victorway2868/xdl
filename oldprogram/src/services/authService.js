/**
 * Authentication Service - Handles user authentication and session management
 */

class AuthService {
  constructor() {
    this.currentUser = null;
    this.token = null;
    this.platform = null;
    
    // Try to load saved auth data on initialization
    this.loadAuthData();
  }

  /**
   * Load authentication data from localStorage
   */
  loadAuthData() {
    try {
      const savedAuth = localStorage.getItem('auth');
      if (savedAuth) {
        const authData = JSON.parse(savedAuth);
        this.currentUser = authData.user;
        this.token = authData.token;
        this.platform = authData.platform;
      }
    } catch (error) {
      console.error('Failed to load auth data:', error);
      // Clear potentially corrupted data
      this.clearAuthData();
    }
  }

  /**
   * Save authentication data to localStorage
   */
  saveAuthData() {
    try {
      const authData = {
        user: this.currentUser,
        token: this.token,
        platform: this.platform
      };
      localStorage.setItem('auth', JSON.stringify(authData));
    } catch (error) {
      console.error('Failed to save auth data:', error);
    }
  }

  /**
   * Clear authentication data
   */
  clearAuthData() {
    this.currentUser = null;
    this.token = null;
    this.platform = null;
    localStorage.removeItem('auth');
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} Authentication status
   */
  isAuthenticated() {
    return !!this.token && !!this.currentUser;
  }

  /**
   * Get current user information
   * @returns {Object|null} User information or null if not authenticated
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Get authentication token
   * @returns {string|null} Authentication token or null if not authenticated
   */
  getToken() {
    return this.token;
  }

  /**
   * Get current platform
   * @returns {string|null} Current platform or null if not set
   */
  getPlatform() {
    return this.platform;
  }

  /**
   * Initiate OAuth login flow for Douyin
   * @returns {Promise<boolean>} Login success status
   */
  async loginDouyin() {
    try {
      if (window.electron) {
        const result = await window.electron.loginDouyin();
        
        if (result.success) {
          this.currentUser = result.user;
          this.token = result.token;
          this.platform = '抖音';
          this.saveAuthData();
          return true;
        }
      }
      
      // Mock login for development
      this.currentUser = {
        id: 'douyin_user_123',
        nickname: '抖音用户',
        avatar: null,
        followCount: 100,
        fansCount: 500,
        likeCount: 1000
      };
      this.token = 'mock_douyin_token_' + Date.now();
      this.platform = '抖音';
      this.saveAuthData();
      
      return true;
    } catch (error) {
      console.error('Douyin login failed:', error);
      return false;
    }
  }

  /**
   * Initiate OAuth login flow for Bilibili
   * @returns {Promise<boolean>} Login success status
   */
  async loginBilibili() {
    try {
      if (window.electron) {
        const result = await window.electron.loginBilibili();
        
        if (result.success) {
          this.currentUser = result.user;
          this.token = result.token;
          this.platform = 'Bilibili';
          this.saveAuthData();
          return true;
        }
      }
      
      // Mock login for development
      this.currentUser = {
        id: 'bilibili_user_456',
        nickname: 'B站用户',
        avatar: null,
        followCount: 200,
        fansCount: 600,
        likeCount: 2000
      };
      this.token = 'mock_bilibili_token_' + Date.now();
      this.platform = 'Bilibili';
      this.saveAuthData();
      
      return true;
    } catch (error) {
      console.error('Bilibili login failed:', error);
      return false;
    }
  }

  /**
   * Login to a specific platform
   * @param {string} platform - Platform to login to
   * @returns {Promise<boolean>} Login success status
   */
  async login(platform) {
    switch (platform) {
      case '抖音':
        return await this.loginDouyin();
      case 'Bilibili':
        return await this.loginBilibili();
      default:
        console.error(`Unsupported platform: ${platform}`);
        return false;
    }
  }

  /**
   * Logout current user
   * @returns {boolean} Logout success status
   */
  logout() {
    try {
      this.clearAuthData();
      return true;
    } catch (error) {
      console.error('Logout failed:', error);
      return false;
    }
  }
}

// Create singleton instance
const authService = new AuthService();
export default authService;
