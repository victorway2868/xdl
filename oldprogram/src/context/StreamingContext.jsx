import React, { createContext, useState, useEffect, useContext } from 'react';
import authService from '../services/authService';
import { workspaceStreamInfo } from '../utils/obsUtils';
import obsService from '../services/obsService';

// Create context
const StreamingContext = createContext();

// Custom hook to use the streaming context
export const useStreaming = () => useContext(StreamingContext);

// Provider component
export const StreamingProvider = ({ children }) => {
  // OBS and companion versions
  const [obsVersion, setObsVersion] = useState(null);
  const [companionVersion, setCompanionVersion] = useState(null);

  // Streaming settings
  const [autoMode, setAutoMode] = useState(true);
  const [platform, setPlatform] = useState('抖音');
  const [streamMethod, setStreamMethod] = useState('直播伴侣');
  const [streamUrl, setStreamUrl] = useState('');
  const [streamKey, setStreamKey] = useState('');

  // Status flags
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [streamInfoSuccess, setStreamInfoSuccess] = useState(false);
  const [error, setError] = useState(null);

  // User information
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  // 只在应用启动时加载OBS和伴侣版本，使用会话存储避免重复获取
  useEffect(() => {
    const loadVersions = async () => {
      // 检查是否已经在当前会话中获取过版本信息
      const versionChecked = sessionStorage.getItem('versionChecked');
      const sessionObsVersion = sessionStorage.getItem('sessionObsVersion');
      const sessionCompanionVersion = sessionStorage.getItem('sessionCompanionVersion');

      // 如果当前会话已经检查过版本，直接使用会话中存储的版本
      if (versionChecked === 'true' && sessionObsVersion && sessionCompanionVersion) {
        console.log('StreamingContext: 使用会话中已获取的版本信息');
        setObsVersion(sessionObsVersion);
        setCompanionVersion(sessionCompanionVersion);
        return;
      }

      // 首次启动应用，显示"检测中"状态
      setObsVersion('检测中');
      setCompanionVersion('检测中');

      // 获取真实版本信息
      const obsVer = await obsService.detectOBSVersion();
      const compVer = await obsService.detectCompanionVersion();

      setObsVersion(obsVer);
      setCompanionVersion(compVer);

      // 将版本信息存储在会话存储中，以便在页面切换后使用
      sessionStorage.setItem('versionChecked', 'true');
      sessionStorage.setItem('sessionObsVersion', obsVer || '未检测到');
      sessionStorage.setItem('sessionCompanionVersion', compVer || '未检测到');
    };

    // 只在组件挂载时执行一次
    loadVersions();
  }, []);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = () => {
      const isAuth = authService.isAuthenticated();
      setIsLoggedIn(isAuth);

      if (isAuth) {
        setUserInfo(authService.getCurrentUser());
      }
    };

    checkAuth();
  }, []);

  // Toggle between auto and manual modes
  const toggleMode = () => {
    setAutoMode(!autoMode);
    // Reset stream info success flag when changing modes
    setStreamInfoSuccess(false);
  };

  // Handle platform change
  const handlePlatformChange = (newPlatform) => {
    setPlatform(newPlatform);
    // Reset stream method if changing from Douyin to another platform
    if (newPlatform !== '抖音') {
      setStreamMethod('');
    } else if (!streamMethod) {
      // Set default method for Douyin if none selected
      setStreamMethod('直播伴侣');
    }
    // Reset stream info success flag when changing platform
    setStreamInfoSuccess(false);
  };

  // Handle stream method change
  const handleMethodChange = (newMethod) => {
    setStreamMethod(newMethod);
    // Reset stream info success flag when changing method
    setStreamInfoSuccess(false);
  };

  // Get streaming information
  const getStreamInfo = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await workspaceStreamInfo(platform, streamMethod);

      if (result.success) {
        setStreamUrl(result.streamUrl);
        setStreamKey(result.streamKey);
        setStreamInfoSuccess(true);
      } else {
        setError(result.message);
        setStreamInfoSuccess(false);
      }
    } catch (err) {
      setError('获取推流信息失败: ' + err.message);
      setStreamInfoSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Start automatic streaming
  const startAutoStreaming = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // First get stream info
      const result = await workspaceStreamInfo(platform, streamMethod);

      if (!result.success) {
        setError(result.message);
        return;
      }

      // Set stream info
      setStreamUrl(result.streamUrl);
      setStreamKey(result.streamKey);
      setStreamInfoSuccess(true);

      // Configure OBS and start streaming
      const obsResult = await obsService.configureStreamSettings(result.streamUrl, result.streamKey);
      if (!obsResult) {
        setError('无法配置OBS推流设置');
        return;
      }

      const streamResult = await obsService.startStreaming();
      if (!streamResult) {
        setError('无法启动OBS推流');
        return;
      }

      setIsStreaming(true);
    } catch (err) {
      setError('自动推流失败: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Stop streaming
  const stopStreaming = async () => {
    setIsLoading(true);

    try {
      const result = await obsService.stopStreaming();
      if (result) {
        setIsStreaming(false);
      } else {
        setError('无法停止OBS推流');
      }
    } catch (err) {
      setError('停止推流失败: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle login
  const login = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const success = await authService.login(platform);

      if (success) {
        setIsLoggedIn(true);
        setUserInfo(authService.getCurrentUser());
      } else {
        setError('登录失败');
      }
    } catch (err) {
      setError('登录失败: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle logout
  const logout = () => {
    authService.logout();
    setIsLoggedIn(false);
    setUserInfo(null);
    // Reset stream info success flag when logging out
    setStreamInfoSuccess(false);
  };

  // Context value
  const value = {
    // OBS and companion versions
    obsVersion,
    companionVersion,

    // Streaming settings
    autoMode,
    platform,
    streamMethod,
    streamUrl,
    streamKey,

    // Status flags
    isStreaming,
    isLoading,
    streamInfoSuccess,
    error,

    // User information
    isLoggedIn,
    userInfo,

    // Actions
    toggleMode,
    handlePlatformChange,
    handleMethodChange,
    getStreamInfo,
    startAutoStreaming,
    stopStreaming,
    login,
    logout
  };

  return (
    <StreamingContext.Provider value={value}>
      {children}
    </StreamingContext.Provider>
  );
};

export default StreamingContext;
