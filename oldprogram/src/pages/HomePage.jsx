import React, { useState, useEffect } from 'react';
import { User, Check, AlertCircle, Link, Key, Copy } from 'lucide-react';
import LoginModal from '../components/LoginModal';
import AuthNotification from '../components/AuthNotification';
import StatusPrompt from '../components/StatusPrompt';
import WorkCard from '../components/WorkCard';
import { useNavigate } from 'react-router-dom';
import { loginWithDouyinWeb, loginWithDouyinCompanion } from '../utils/douyinLoginUtils';
import { loadPlatformUserData, clearPlatformUserData, refreshPlatformUserData } from '../utils/platformLoginUtils';
import apiService from '../services/apiService';
// import { useStreaming } from '../context/StreamingContext';
// import { workspaceStreamInfo, configureAndStartOBS } from '../utils/obsUtils';

// 使用真实的 Electron API 获取软件版本


const HomePage = () => {
  const navigate = useNavigate();

  // 从本地存储加载用户之前的选择

  const [autoMode, setAutoMode] = useState(true);
  const [platform, setPlatform] = useState(() => {
    return localStorage.getItem('selectedPlatform') || '抖音';
  });
  const [streamMethod, setStreamMethod] = useState(() => {
    return localStorage.getItem('selectedStreamMethod') || '直播伴侣';
  });
  const [streamUrl, setStreamUrl] = useState('');
  const [streamKey, setStreamKey] = useState('');

  // Add missing state variables for OBS and companion versions
  const [obsVersion, setObsVersion] = useState('检测中');
  const [companionVersion, setCompanionVersion] = useState('检测中');

  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [streamInfoSuccess, setStreamInfoSuccess] = useState(false);
  const [error, setError] = useState(null);

  // 用于跟踪操作是否可以被中止
  const [abortController, setAbortController] = useState(null);
  const [operationInProgress, setOperationInProgress] = useState(false);

  // 用于存储重试定时器的引用
  const [retryTimer, setRetryTimer] = useState(null);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // 安全认证相关状态
  const [showAuthNotification, setShowAuthNotification] = useState(false);
  const [authMessage, setAuthMessage] = useState('');

  // 状态提示相关状态
  const [showStatusPrompt, setShowStatusPrompt] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState('info');

  // 本地状态
  const [showObsSettings, setShowObsSettings] = useState(false);
  const [obsConfigs, setObsConfigs] = useState(['配置1.json', '配置2.json', '配置3.json']);
  const [selectedConfig, setSelectedConfig] = useState('OBS备份');
  const [obsSettings, setObsSettings] = useState({
    deviceType: 'phone',
    deviceSize: '11寸'
  });

  // 热门推荐数据状态
  const [recommendedWorks, setRecommendedWorks] = useState([]);
  const [hotDataLoading, setHotDataLoading] = useState(true);
  const [hotDataError, setHotDataError] = useState(null);

  // 广告轮播相关状态
  const [advertisements, setAdvertisements] = useState([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [adLoading, setAdLoading] = useState(true);
  const [adError, setAdError] = useState(null);

  // 清除重试定时器的函数
  const clearRetryTimer = () => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      setRetryTimer(null);
    }
  };

  // 获取热门推荐数据
  const fetchHotRecommendations = async () => {
    try {
      setHotDataLoading(true);
      setHotDataError(null);

      console.log('开始获取热门推荐数据...');

      // 获取热门媒体数据
      const hotMediaData = await apiService.getHotMediaManifest();
      console.log('获取到的热门媒体数据:', hotMediaData);

      // 将所有类型的热门数据合并到一个数组中
      const allHotItems = [];

      // 遍历所有类型，收集热门数据
      Object.keys(hotMediaData).forEach(type => {
        if (Array.isArray(hotMediaData[type])) {
          const itemsWithVideoId = hotMediaData[type].map(item =>
            apiService.addVideoId(item)
          );
          allHotItems.push(...itemsWithVideoId);
        }
      });

      console.log('合并后的热门数据:', allHotItems);
      setRecommendedWorks(allHotItems);

    } catch (err) {
      console.error('获取热门推荐数据失败:', err);
      setHotDataError(err.message);
    } finally {
      setHotDataLoading(false);
    }
  };

  // 获取广告数据
  const fetchAdvertisements = async () => {
    try {
      setAdLoading(true);
      setAdError(null);

      console.log('开始获取广告数据...');

      // 获取广告数据
      const adData = await apiService.getAdvertisementData();
      console.log('获取到的广告数据:', adData);

      // 如果返回的是数组，直接使用；如果是对象，提取advertisement字段
      let adItems = [];
      if (Array.isArray(adData)) {
        adItems = adData;
      } else if (adData && Array.isArray(adData.advertisement)) {
        adItems = adData.advertisement;
      }

      // 如果没有广告数据，使用默认的测试数据
      if (adItems.length === 0) {
        adItems = [
          {
            id: 'test-ad-1',
            type: 'image',
            url: 'https://fastly.picsum.photos/id/537/200/300.jpg?hmac=LG3kZs5AdrMmsgeVOdrfP0C5KT3WmP-q5TauEZdR4vk',
            title: '图片广告',
            description: '测试图片广告'
          },
          {
            id: 'test-ad-2',
            type: 'image',
            url: 'https://cdn.pixabay.com/animation/2024/07/23/19/52/19-52-56-478_512.gif',
            title: '动图广告',
            description: '测试动图广告'
          },
          {
            id: 'test-ad-3',
            type: 'video',
            url: 'https://www.w3schools.com/html/movie.mp4',
            title: '视频广告',
            description: '测试视频广告'
          }
        ];
      }

      console.log('处理后的广告数据:', adItems);
      setAdvertisements(adItems);

    } catch (err) {
      console.error('获取广告数据失败:', err);
      setAdError(err.message);

      // 出错时使用默认测试数据
      setAdvertisements([
        {
          id: 'test-ad-1',
          type: 'image',
          url: 'https://fastly.picsum.photos/id/537/200/300.jpg?hmac=LG3kZs5AdrMmsgeVOdrfP0C5KT3WmP-q5TauEZdR4vk',
          title: '图片广告',
          description: '测试图片广告'
        },
        {
          id: 'test-ad-2',
          type: 'image',
          url: 'https://cdn.pixabay.com/animation/2024/07/23/19/52/19-52-56-478_512.gif',
          title: '动图广告',
          description: '测试动图广告'
        },
        {
          id: 'test-ad-3',
          type: 'video',
          url: 'https://www.w3schools.com/html/movie.mp4',
          title: '视频广告',
          description: '测试视频广告'
        }
      ]);
    } finally {
      setAdLoading(false);
    }
  };

  // 组件卸载时清除定时器
  useEffect(() => {
    return () => {
      clearRetryTimer();
    };
  }, []);

  // 页面加载时自动检测OBS和伴侣版本
  useEffect(() => {
    // 定义异步函数
    const fetchVersions = async () => {
      try {
        // 显示"检测中"状态
        setObsVersion('检测中');
        setCompanionVersion('检测中');

        // 检查 Electron 环境
        if (typeof window !== 'undefined' && window.electron) {
          // 获取OBS版本 - 每次进入主页都重新检测
          const obsVer = await window.electron.getOBSVersion();
          setObsVersion(obsVer || '未检测到');

          // 获取伴侣版本 - 每次进入主页都重新检测
          const compVer = await window.electron.getCompanionVersion();
          setCompanionVersion(compVer || '未检测到');

          console.log('版本检测完成 - OBS:', obsVer || '未检测到', ', 伴侣:', compVer || '未检测到');
        } else {
          // 如果不在 Electron 环境中，显示未检测到
          setObsVersion('未检测到');
          setCompanionVersion('未检测到');
          console.log('非Electron环境，版本显示为未检测到');
        }
      } catch (error) {
        // 发生错误时显示未检测到
        console.error('版本检测出错:', error);
        setObsVersion('未检测到');
        setCompanionVersion('未检测到');
      }
    };

    // 执行异步函数
    fetchVersions();

    // 获取热门推荐数据
    fetchHotRecommendations();

    // 获取广告数据
    fetchAdvertisements();
  }, []); // 空依赖数组确保只在组件挂载时执行一次

  // 处理用户选择变更并保存到本地存储
  const toggleMode = () => setAutoMode(!autoMode);

  const handlePlatformChange = async (newPlatform) => {
    setPlatform(newPlatform);
    // 保存到本地存储
    localStorage.setItem('selectedPlatform', newPlatform);

    // 根据新选择的平台加载用户信息
    try {
      const platformUserData = await loadPlatformUserData(newPlatform);
      if (platformUserData && platformUserData.user && platformUserData.user.nickname) {
        setIsLoggedIn(true);
        setUserInfo(platformUserData.user);
      } else {
        // 如果没有找到该平台的用户信息，则设置为未登录状态
        console.log('未找到有效的平台用户数据');
        setIsLoggedIn(false);
        setUserInfo(null);
      }
    } catch (error) {
      console.error(`Failed to load platform user data for ${newPlatform}:`, error);
      setIsLoggedIn(false);
      setUserInfo(null);
    }
  };

  const handleMethodChange = (newMethod) => {
    setStreamMethod(newMethod);
    // 保存到本地存储
    localStorage.setItem('selectedStreamMethod', newMethod);
  };

  // 获取推流码按钮点击处理
  const getStreamInfo = async () => {
    // 如果操作正在进行中，则中止当前操作
    if (operationInProgress && abortController) {
      abortController.abort();
      setOperationInProgress(false);
      setIsLoading(false);
      setError(null);
      // 清除可能存在的重试定时器
      clearRetryTimer();
      return;
    }

    // 创建新的 AbortController
    const controller = new AbortController();
    setAbortController(controller);
    setOperationInProgress(true);
    setIsLoading(true);
    setError(null);
    setStreamInfoSuccess(false);

    // 清除可能存在的重试定时器
    clearRetryTimer();

    // 定义获取推流信息的函数，以便可以重复调用
    const fetchStreamInfo = async (isRetry = false) => {
      try {
        let result;

        // 根据平台和直播方式获取推流信息
        if (platform === '抖音') {
          if (window.electron) {
            // 根据直播方式选择不同的API
            if (streamMethod === '直播伴侣') {
              // 从roomStore.json获取抖音直播伴侣的推流信息
              console.log(`${isRetry ? '重试' : '开始'}从roomStore.json获取抖音直播伴侣的推流信息`);

              // 调用electron方法获取roomStore.json中的rtmp_push_url
              result = await window.electron.getDouyinCompanionInfo();
            }
            else if (streamMethod === '手机开播') {
              // 获取最新的直播间信息（getLatestRoomInfo）
              console.log(`${isRetry ? '重试' : '开始'}获取抖音最新直播间信息`);

              // 调用electron方法获取最新直播间信息
              result = await window.electron.getDouyinApiInfo(null, 'get');
            }
            else if (streamMethod === '自动开播') {
              // 创建新的直播间（createLiveRoom）
              console.log(`${isRetry ? '重试' : '开始'}创建抖音直播间`);

              // 调用electron方法创建新直播间
              result = await window.electron.getDouyinApiInfo(null, 'create');
            }
            else {
              throw new Error(`不支持的直播方式: ${streamMethod}`);
            }

            if (result.error) {
              // 检查是否是 cookie 相关错误
              const errorMessage = result.error;
              const isCookieError = errorMessage.includes('No cookie data available') ||
                                   errorMessage.includes('cookie') ||
                                   errorMessage.includes('Cookie') ||
                                   errorMessage.includes('登录') ||
                                   errorMessage.includes('认证失败') ||
                                   errorMessage.includes('未登录');

              if (isCookieError) {
                console.log('检测到 cookie 错误，停止获取推流信息并弹出登录窗口');
                setError('需要登录平台账号才能获取推流信息');
                setOperationInProgress(false);
                setIsLoading(false);
                setAbortController(null);

                // 自动弹出登录窗口
                setTimeout(() => {
                  setShowLoginModal(true);
                }, 1000); // 延迟1秒弹出，让用户看到错误信息

                return false;
              }

              throw new Error(result.error);
            }

            // 检查是否需要安全认证
            if (result.requiresAuth && result.authUrl) {
              console.log('需要进行安全认证，打开认证页面...');

              try {
                // 打开认证URL - 检查是否已经在处理中
                const authResult = await window.electron.openAuthUrl(result.authUrl);

                // 只有在首次打开认证URL时才显示通知
                if (!authResult.alreadyInProgress) {
                  // 显示简洁的认证通知
                  setAuthMessage('直播安全认证，请完成后重试！');
                  setShowAuthNotification(true);
                } else {
                  console.log('安全认证已在进行中，不重复显示通知');
                }

                // 清除重试定时器
                clearRetryTimer();

                // 重置状态
                setOperationInProgress(false);
                setIsLoading(false);
                setAbortController(null);

                // 返回 false 表示获取失败，但不再自动重试
                return false;
              } catch (error) {
                console.error('打开认证URL失败:', error);
                // 继续处理错误，不重试
                setError(`安全认证失败: ${error.message}`);
                setOperationInProgress(false);
                setIsLoading(false);
                setAbortController(null);
                return false;
              }
            }

            // 检查是否需要重试（手机开播模式下，状态不为2）
            if (result.needsRetry) {
              console.log(`直播间未准备好，当前状态: ${result.currentStatus}，期望状态: ${result.expectedStatus}`);

              // 显示状态提示给用户
              if (result.statusMessage) {
                console.log('显示状态提示:', result.statusMessage);
                setStatusMessage(result.statusMessage);
                setStatusType(result.currentStatus === 4 ? 'warning' : 'info');
                setShowStatusPrompt(true);
              }

              // 继续重试获取推流信息
              throw new Error('直播间准备中');
            }

            // 检查是否获取到了有效的推流地址
            if (!result.streamUrl || !result.streamKey) {
              throw new Error('未获取到有效的推流地址');
            }
          } else {
            // 如果不在Electron环境中，抛出错误
            throw new Error('无法获取推流信息：不在Electron环境中');
          }
        } else {
          // 其他平台暂不支持
          throw new Error('暂不支持该平台');
        }

        // 清除重试定时器
        clearRetryTimer();

        // 设置推流信息
        setStreamUrl(result.streamUrl);
        setStreamKey(result.streamKey);
        setStreamInfoSuccess(true);

        console.log('===== 获取推流信息成功，开始维持直播状态... =====');
        console.log('推流地址:', result.streamUrl);
        console.log('房间ID:', result.room_id);
        console.log('流ID:', result.stream_id);
        console.log('直播方式:', streamMethod);

        // 如果是手机开播模式，并且获取到了房间ID和流ID，则维持直播状态
        if (streamMethod === '手机开播' && result.room_id && result.stream_id) {
          try {
            console.log('开始维持直播状态...');
            const maintainResult = await window.electron.maintainDouyinStream(
              result.room_id,
              result.stream_id,
              'phone'
            );

            if (maintainResult.success) {
              console.log('直播状态维持已启动');
            } else {
              console.warn('直播状态维持启动失败:', maintainResult.error);
            }
          } catch (error) {
            console.error('启动直播状态维持时出错:', error);
          }
        }

        // 如果在Electron环境中，确保OBS WebSocket服务已启用
        if (window.electron && autoMode) {
          try {
            console.log('确保 OBS WebSocket 服务已启用...');
            // 确保 OBS WebSocket 服务已启用
            const websocketEnabled = await window.electron.ensureOBSWebSocketEnabled();
            if (!websocketEnabled) {
              console.log('OBS WebSocket 服务启用失败，但仍然可以获取推流信息');
            } else {
              console.log('OBS WebSocket 服务已启用，可以随时开始推流');
            }
          } catch (error) {
            console.error('检查 OBS WebSocket 服务时出错:', error);
            // 这里不抛出错误，因为我们只是获取推流信息，不需要立即推流
          }
        }

        setOperationInProgress(false);
        setIsLoading(false);
        setAbortController(null);

        return true; // 表示成功获取
      } catch (err) {
        // 如果是用户取消操作，则不重试
        if (err.message === '操作已被用户取消') {
          clearRetryTimer();
          return false;
        }

        // 如果是抖音平台且获取失败，则设置重试
        if (platform === '抖音') {
          // 检查是否是因为状态为2而停止重试
          if (err.message === '直播间准备中' && result && result.currentStatus === 2) {
            console.log('状态为2，停止重试并显示推流信息');

            // 清除重试定时器
            clearRetryTimer();

            // 设置推流信息
            if (result.streamUrl && result.streamKey) {
              setStreamUrl(result.streamUrl);
              setStreamKey(result.streamKey);
              setStreamInfoSuccess(true);

              // 如果有房间ID和流ID，则维持直播状态
              if (result.room_id && result.stream_id) {
                try {
                  console.log('开始维持直播状态...');
                  window.electron.maintainDouyinStream(
                    result.room_id,
                    result.stream_id,
                    'phone'
                  ).then(maintainResult => {
                    if (maintainResult.success) {
                      console.log('直播状态维持已启动');
                    } else {
                      console.warn('直播状态维持启动失败:', maintainResult.error);
                    }
                  }).catch(error => {
                    console.error('启动直播状态维持时出错:', error);
                  });
                } catch (error) {
                  console.error('启动直播状态维持时出错:', error);
                }
              }

              // 重置状态
              setOperationInProgress(false);
              setIsLoading(false);
              setAbortController(null);

              return true;
            }
          }

          // 只在控制台记录错误，不在UI上显示
          console.log(`获取推流信息失败: ${err.message}，2秒后重试...`);
          // 不设置错误消息，保持UI干净
          setError(null);

          // 如果控制器已经被中止，则不再重试
          if (controller.signal.aborted) {
            return false;
          }

          // 设置2秒后重试
          const timer = setTimeout(() => {
            if (!controller.signal.aborted) {
              fetchStreamInfo(true);
            }
          }, 2000);

          setRetryTimer(timer);
          return false;
        } else {
          // 其他情况显示错误并结束
          setError(`获取推流信息失败: ${err.message}`);
          setOperationInProgress(false);
          setIsLoading(false);
          setAbortController(null);
          return false;
        }
      }
    };

    // 开始获取推流信息
    fetchStreamInfo();
  };



  // 自动推流按钮点击处理
  const startAutoStreaming = async () => {
    // 如果已经在推流中，则停止推流
    if (isStreaming) {
      await stopStreaming();
      return;
    }

    // 如果操作正在进行中，则中止当前操作
    if (operationInProgress && abortController) {
      abortController.abort();
      setOperationInProgress(false);
      setIsLoading(false);
      setError(null);
      // 清除可能存在的重试定时器
      clearRetryTimer();
      return;
    }

    // 创建新的 AbortController
    const controller = new AbortController();
    setAbortController(controller);
    setOperationInProgress(true);
    setIsLoading(true);
    setError(null);
    setStreamInfoSuccess(false);

    // 清除可能存在的重试定时器
    clearRetryTimer();

    // 定义获取推流信息的函数，以便可以重复调用
    const fetchStreamInfo = async (isRetry = false) => {
      try {
        let result;

        // 根据平台和直播方式获取推流信息
        if (platform === '抖音') {
          if (window.electron) {
            // 根据直播方式选择不同的API
            if (streamMethod === '直播伴侣') {
              // 从roomStore.json获取抖音直播伴侣的推流信息
              console.log(`${isRetry ? '重试' : '开始'}从roomStore.json获取抖音直播伴侣的推流信息`);

              // 调用electron方法获取roomStore.json中的rtmp_push_url
              result = await window.electron.getDouyinCompanionInfo();
            }
            else if (streamMethod === '手机开播') {
              // 获取最新的直播间信息（getLatestRoomInfo）
              console.log(`${isRetry ? '重试' : '开始'}获取抖音最新直播间信息`);

              // 调用electron方法获取最新直播间信息
              result = await window.electron.getDouyinApiInfo(null, 'get');
            }
            else if (streamMethod === '自动开播') {
              // 创建新的直播间（createLiveRoom）
              console.log(`${isRetry ? '重试' : '开始'}创建抖音直播间`);

              // 调用electron方法创建新直播间
              result = await window.electron.getDouyinApiInfo(null, 'create');
            }
            else {
              throw new Error(`不支持的直播方式: ${streamMethod}`);
            }

            if (result.error) {
              // 检查是否是 cookie 相关错误
              const errorMessage = result.error;
              const isCookieError = errorMessage.includes('No cookie data available') ||
                                   errorMessage.includes('cookie') ||
                                   errorMessage.includes('Cookie') ||
                                   errorMessage.includes('登录') ||
                                   errorMessage.includes('认证失败') ||
                                   errorMessage.includes('未登录');

              if (isCookieError) {
                console.log('检测到 cookie 错误，停止直播并弹出登录窗口');
                setError('需要登录平台账号才能获取推流信息');
                setOperationInProgress(false);
                setIsLoading(false);
                setAbortController(null);

                // 自动弹出登录窗口
                setTimeout(() => {
                  setShowLoginModal(true);
                }, 1000); // 延迟1秒弹出，让用户看到错误信息

                return false;
              }

              throw new Error(result.error);
            }

            // 检查是否需要安全认证
            if (result.requiresAuth && result.authUrl) {
              console.log('需要进行安全认证，打开认证页面...');

              try {
                // 打开认证URL - 检查是否已经在处理中
                const authResult = await window.electron.openAuthUrl(result.authUrl);

                // 只有在首次打开认证URL时才显示通知
                if (!authResult.alreadyInProgress) {
                  // 显示简洁的认证通知
                  setAuthMessage('直播安全认证，请完成后重试！');
                  setShowAuthNotification(true);
                } else {
                  console.log('安全认证已在进行中，不重复显示通知');
                }

                // 清除重试定时器
                clearRetryTimer();

                // 重置状态
                setOperationInProgress(false);
                setIsLoading(false);
                setAbortController(null);

                // 返回 false 表示获取失败，但不再自动重试
                return false;
              } catch (error) {
                console.error('打开认证URL失败:', error);
                // 继续处理错误，不重试
                setError(`安全认证失败: ${error.message}`);
                setOperationInProgress(false);
                setIsLoading(false);
                setAbortController(null);
                return false;
              }
            }

            // 检查是否需要重试（手机开播模式下，状态不为2）
            if (result.needsRetry) {
              console.log(`直播间未准备好，当前状态: ${result.currentStatus}，期望状态: ${result.expectedStatus}`);

              // 不显示状态信息，只在控制台记录
              console.log(`直播间准备中，当前状态: ${result.currentStatus}，等待状态变为2`);

              // 继续重试获取推流信息，但不显示错误消息
              throw new Error('直播间准备中');
            }

            // 检查是否获取到了有效的推流地址
            if (!result.streamUrl || !result.streamKey) {
              throw new Error('未获取到有效的推流地址');
            }
          } else {
            // 如果不在Electron环境中，抛出错误
            throw new Error('无法获取推流信息：不在Electron环境中');
          }
        } else {
          // 其他平台暂不支持
          throw new Error('暂不支持该平台');
        }

        // 清除重试定时器
        clearRetryTimer();

        // 设置推流信息
        setStreamUrl(result.streamUrl);
        setStreamKey(result.streamKey);
        setStreamInfoSuccess(true);

        // 如果是手机开播模式，并且获取到了房间ID和流ID，则维持直播状态
        if (streamMethod === '手机开播' && result.room_id && result.stream_id) {
          try {
            console.log('开始维持直播状态...');
            const maintainResult = await window.electron.maintainDouyinStream(
              result.room_id,
              result.stream_id,
              'phone'
            );

            if (maintainResult.success) {
              console.log('直播状态维持已启动');
            } else {
              console.warn('直播状态维持启动失败:', maintainResult.error);
            }
          } catch (error) {
            console.error('启动直播状态维持时出错:', error);
          }
        }

        // 配置 OBS 并启动推流
        if (window.electron) {
          try {
            // console.log('确保 OBS WebSocket 服务已启用...');
            // // 确保 OBS WebSocket 服务已启用
            // const websocketEnabled = await window.electron.ensureOBSWebSocketEnabled();
            // if (!websocketEnabled) {
            //   throw new Error('无法启用 OBS WebSocket 服务，请检查 OBS 安装');
            // }

            console.log('设置 OBS 推流参数...');
            // 设置OBS推流参数
            const settingsResult = await window.electron.setOBSStreamSettings(result.streamUrl, result.streamKey);
            if (!settingsResult.success) {
              throw new Error(settingsResult.message || '设置 OBS 推流参数失败');
            }

            console.log('启动 OBS 推流...');
            // 启动OBS推流
            const streamResult = await window.electron.startOBSStreaming();
            if (!streamResult.success) {
              throw new Error(streamResult.message || '启动 OBS 推流失败');
            }

            console.log('OBS 推流已成功启动');

            // 检测并杀死MediaSDK_Server.exe进程
            console.log('检测并杀死MediaSDK_Server.exe进程...');

            // 第一次杀死进程
            try {
              const killResult = await window.electron.killMediaSDKServer();
              console.log('第一次杀死MediaSDK_Server.exe结果:', killResult);

              // 3秒后再次杀死进程
              setTimeout(async () => {
                try {
                  const secondKillResult = await window.electron.killMediaSDKServer();
                  console.log('第二次杀死MediaSDK_Server.exe结果:', secondKillResult);
                } catch (killError) {
                  console.error('第二次杀死MediaSDK_Server.exe进程失败:', killError);
                }
              }, 3000);
            } catch (killError) {
              console.error('第一次杀死MediaSDK_Server.exe进程失败:', killError);
            }
          } catch (error) {
            console.error('OBS 推流设置失败:', error);
            setError(`OBS 推流设置失败: ${error.message}`);
            setOperationInProgress(false);
            setIsLoading(false);
            setAbortController(null);
            return false;
          }
        } else {
          // 在非Electron环境中模拟延迟
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        setIsStreaming(true);
        setOperationInProgress(false);
        setIsLoading(false);
        setAbortController(null);

        return true; // 表示成功获取
      } catch (err) {
        // 如果是用户取消操作，则不重试
        if (err.message === '操作已被用户取消') {
          clearRetryTimer();
          return false;
        }

        // 如果是抖音平台且获取失败，则设置重试
        if (platform === '抖音') {
          // 检查是否是因为状态为2而停止重试
          if (err.message === '直播间准备中' && result && result.currentStatus === 2) {
            console.log('状态为2，停止重试并显示推流信息');

            // 清除重试定时器
            clearRetryTimer();

            // 设置推流信息
            if (result.streamUrl && result.streamKey) {
              setStreamUrl(result.streamUrl);
              setStreamKey(result.streamKey);
              setStreamInfoSuccess(true);

              // 继续执行自动推流的后续步骤
              // 不需要return，让代码继续执行

              // 配置 OBS 并启动推流
              if (window.electron) {
                try {
                  console.log('设置 OBS 推流参数...');
                  // 设置OBS推流参数
                  window.electron.setOBSStreamSettings(result.streamUrl, result.streamKey)
                    .then(settingsResult => {
                      if (!settingsResult.success) {
                        console.error('设置 OBS 推流参数失败:', settingsResult.message);
                        return;
                      }

                      console.log('启动 OBS 推流...');
                      // 启动OBS推流
                      window.electron.startOBSStreaming()
                        .then(streamResult => {
                          if (!streamResult.success) {
                            console.error('启动 OBS 推流失败:', streamResult.message);
                            return;
                          }

                          console.log('OBS 推流已成功启动');
                          setIsStreaming(true);

                          // 检测并杀死MediaSDK_Server.exe进程
                          console.log('检测并杀死MediaSDK_Server.exe进程...');
                          window.electron.killMediaSDKServer()
                            .then(killResult => {
                              console.log('第一次杀死MediaSDK_Server.exe结果:', killResult);

                              // 3秒后再次杀死进程
                              setTimeout(() => {
                                window.electron.killMediaSDKServer()
                                  .then(secondKillResult => {
                                    console.log('第二次杀死MediaSDK_Server.exe结果:', secondKillResult);
                                  })
                                  .catch(killError => {
                                    console.error('第二次杀死MediaSDK_Server.exe进程失败:', killError);
                                  });
                              }, 3000);
                            })
                            .catch(killError => {
                              console.error('第一次杀死MediaSDK_Server.exe进程失败:', killError);
                            });
                        })
                        .catch(error => {
                          console.error('OBS 推流设置失败:', error);
                        });
                    })
                    .catch(error => {
                      console.error('OBS 推流设置失败:', error);
                    });
                } catch (error) {
                  console.error('OBS 推流设置失败:', error);
                }
              }

              // 重置状态
              setOperationInProgress(false);
              setIsLoading(false);
              setAbortController(null);

              return true;
            }
          }

          // 只在控制台记录错误，不在UI上显示
          console.log(`获取推流信息失败: ${err.message}，2秒后重试...`);
          // 不设置错误消息，保持UI干净
          setError(null);

          // 如果控制器已经被中止，则不再重试
          if (controller.signal.aborted) {
            return false;
          }

          // 设置2秒后重试
          const timer = setTimeout(() => {
            if (!controller.signal.aborted) {
              fetchStreamInfo(true);
            }
          }, 2000);

          setRetryTimer(timer);
          return false;
        } else {
          // 其他情况显示错误并结束
          setError(`自动推流失败: ${err.message}`);
          setOperationInProgress(false);
          setIsLoading(false);
          setAbortController(null);
          return false;
        }
      }
    };

    // 开始获取推流信息
    fetchStreamInfo();
  };

  const stopStreaming = async () => {
    setIsLoading(true);
    setError(null);

    // 清除可能存在的重试定时器
    clearRetryTimer();

    // 如果有正在进行的操作，中止它
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }

    // 如果在Electron环境中，调用停止推流方法
    if (window.electron) {
      try {
        console.log('正在停止 OBS 推流...');
        const result = await window.electron.stopOBSStreaming();

        if (!result.success) {
          console.warn('停止 OBS 推流返回警告:', result.message);
          // 即使停止失败，我们也继续重置UI状态，因为用户已经明确要求停止
        } else {
          console.log('成功停止 OBS 推流');
        }

        // 如果是抖音平台，停止定期的ping/anchor请求
        if (platform === '抖音') {
          try {
            console.log('正在停止抖音定期ping/anchor请求...');
            await window.electron.stopDouyinPingAnchor();
            console.log('成功停止抖音定期ping/anchor请求');
          } catch (pingError) {
            console.error('停止抖音定期ping/anchor请求失败:', pingError);
          }
        }
      } catch (error) {
        console.error('停止 OBS 推流失败:', error);
        // 显示错误但继续重置UI状态
        setError(`停止推流时出错: ${error.message}`);
      }
    }

    // 无论停止是否成功，都重置UI状态
    setTimeout(() => {
      setIsStreaming(false);
      setStreamInfoSuccess(false); // 移除成功图标
      setIsLoading(false);
      setOperationInProgress(false);
    }, 1000);
  };

  // 检查是否已登录
  useEffect(() => {
    // 根据当前选择的平台从本地存储中加载用户数据
    const loadUserData = async () => {
      try {
        const userData = await loadPlatformUserData(platform);
        if (userData && userData.user && userData.user.nickname) {
          setIsLoggedIn(true);
          setUserInfo(userData.user);
        } else {
          console.log('未找到有效的用户数据');
          setIsLoggedIn(false);
          setUserInfo(null);
        }
      } catch (error) {
        console.error(`Failed to load user data for platform ${platform}:`, error);
        setIsLoggedIn(false);
        setUserInfo(null);
      }
    };

    loadUserData();
  }, [platform]); // 当平台变化时重新加载用户信息

  // 监听安全认证通知和状态通知
  useEffect(() => {
    let removeAuthListener = null;
    let removeStatusListener = null;

    // 只在Electron环境中添加事件监听
    if (typeof window !== 'undefined' && window.electron) {
      console.log('Setting up notification listeners...');

      // 设置认证通知监听器
      if (window.electron.onAuthNotification) {
        const handleAuthNotification = (data) => {
          console.log('收到安全认证通知:', data);

          if (data && data.message) {
            console.log('Processing auth notification:', data.message);
            setAuthMessage(data.message);
            setShowAuthNotification(true);
          } else {
            console.warn('Auth notification data is invalid:', data);
          }
        };

        try {
          removeAuthListener = window.electron.onAuthNotification(handleAuthNotification);
          console.log('Auth notification listener registered');
        } catch (error) {
          console.error('Failed to setup auth notification listener:', error);
        }
      }

      // 设置状态通知监听器
      if (window.electron.onStatusNotification) {
        const handleStatusNotification = (data) => {
          console.log('收到状态通知:', data);

          if (data && data.message) {
            console.log('Processing status notification:', data.message, 'status:', data.status);
            setStatusMessage(data.message);

            // 根据状态值设置不同的提示类型
            if (data.status === 4) {
              setStatusType('warning'); // 状态4: 请在手机上开播
            } else if (data.status === 2) {
              setStatusType('info');    // 状态2: 请打开手机飞行模式或清退APP
            } else {
              setStatusType('info');    // 其他状态
            }

            setShowStatusPrompt(true);
          } else {
            console.warn('Status notification data is invalid:', data);
          }
        };

        try {
          removeStatusListener = window.electron.onStatusNotification(handleStatusNotification);
          console.log('Status notification listener registered');
        } catch (error) {
          console.error('Failed to setup status notification listener:', error);
        }
      } else {
        console.warn('window.electron.onStatusNotification is not available');
      }

      // 同时保留原有的DOM事件监听作为备用方案
      const handleDomAuthNotification = (event) => {
        console.log('收到DOM安全认证通知:', event.detail);
        if (event.detail && event.detail.message) {
          setAuthMessage(event.detail.message);
          setShowAuthNotification(true);
        }
      };

      const handleDomStatusNotification = (event) => {
        console.log('收到DOM状态通知:', event.detail);
        if (event.detail && event.detail.message) {
          setStatusMessage(event.detail.message);
          setStatusType(event.detail.status === 4 ? 'warning' : 'info');
          setShowStatusPrompt(true);
        }
      };

      // 添加DOM事件监听
      window.addEventListener('auth-notification', handleDomAuthNotification);
      window.addEventListener('status-notification', handleDomStatusNotification);

      // 清理函数
      return () => {
        console.log('Cleaning up notification listeners...');

        // 移除IPC事件监听器
        if (removeAuthListener && typeof removeAuthListener === 'function') {
          try {
            removeAuthListener();
            console.log('Auth notification listener removed');
          } catch (error) {
            console.error('Error removing auth notification listener:', error);
          }
        }

        if (removeStatusListener && typeof removeStatusListener === 'function') {
          try {
            removeStatusListener();
            console.log('Status notification listener removed');
          } catch (error) {
            console.error('Error removing status notification listener:', error);
          }
        }

        // 移除DOM事件监听器
        window.removeEventListener('auth-notification', handleDomAuthNotification);
        window.removeEventListener('status-notification', handleDomStatusNotification);
      };
    } else {
      console.warn('Electron environment not detected, notification listeners not set up');
    }
  }, []);



  // 广告轮播逻辑
  useEffect(() => {
    if (advertisements.length > 1) {
      const interval = setInterval(() => {
        setCurrentAdIndex((prevIndex) =>
          (prevIndex + 1) % advertisements.length
        );
      }, 5000); // 每5秒切换一次

      return () => clearInterval(interval);
    }
  }, [advertisements]);

  // 抖音网页登录
  const handleDouyinWebLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 先关闭模态框，然后再打开浏览器窗口
      setShowLoginModal(false);

      // 显示正在登录的提示
      console.log('正在打开抖音网页登录...');

      // 调用登录函数，这个过程可能需要一段时间
      // 因为用户需要在浏览器窗口中手动登录
      const result = await loginWithDouyinWeb();

      if (result.success) {
        // 登录成功后，强制刷新用户数据（跳过缓存）
        const userData = await refreshPlatformUserData(platform);
        if (userData && userData.user && userData.user.nickname) {
          setIsLoggedIn(true);
          setUserInfo(userData.user);
        } else {
          console.log('登录成功但无法获取有效的用户信息');
          setError('登录成功但无法获取用户信息，请重试');
        }
      } else {
        setError(result.error || '登录失败');
      }
    } catch (error) {
      console.error('抖音网页登录失败:', error);
      setError(`登录失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 抖音直播伴侣登录
  const handleDouyinCompanionLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 先关闭模态框
      setShowLoginModal(false);

      // 显示正在检查直播伴侣的提示
      console.log('正在检查直播伴侣...');

      // 调用直播伴侣登录函数
      // 这个过程会检查直播伴侣是否安装，并尝试启动它
      const result = await loginWithDouyinCompanion();

      if (result.success) {
        // 登录成功后，强制刷新用户数据（跳过缓存）
        const userData = await refreshPlatformUserData(platform);
        if (userData && userData.user && userData.user.nickname) {
          setIsLoggedIn(true);
          setUserInfo(userData.user);
        } else {
          console.log('登录成功但无法获取有效的用户信息');
          setError('登录成功但无法获取用户信息，请重试');
        }
      } else {
        setError(result.error || '登录失败');
      }
    } catch (error) {
      console.error('抖音直播伴侣登录失败:', error);
      setError(`登录失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 退出登录
  const logout = () => {
    // 根据当前选择的平台清除用户数据
    clearPlatformUserData(platform);
    setIsLoggedIn(false);
    setUserInfo(null);
  };

  // 复制文本到剪贴板
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        // 可以添加一个提示，表示复制成功
        console.log('复制成功');
      })
      .catch(err => {
        console.error('复制失败:', err);
      });
  };






  // 处理登录/退出按钮点击
  const handleLoginClick = async () => {
    if (isLoggedIn) {
      logout();
    } else {
      // 显示登录选择模态框
      setShowLoginModal(true);
    }
  };

  return (
    <div className="min-h-full bg-gray-900 text-white p-2 flex flex-col h-full gap-1">
      {/* 登录选择模态框 */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onWebLogin={handleDouyinWebLogin}
        onCompanionLogin={handleDouyinCompanionLogin}
      />

      {/* 安全认证通知 */}
      <AuthNotification
        message={authMessage}
        isVisible={showAuthNotification}
        onClose={() => setShowAuthNotification(false)}
      />

      {/* 状态提示 */}
      <StatusPrompt
        message={statusMessage}
        isVisible={showStatusPrompt}
        onClose={() => setShowStatusPrompt(false)}
        type={statusType}
      />
      {/* 上部区域：直播设置 */}
      <div className="flex flex-row gap-3">
        {/* 左侧功能区域 - 自动推流组件 */}
        <div className="w-2/3 h-45 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700 shadow-lg overflow-auto relative">
          {/* 顶部控制区域 */}
          <div className="flex justify-between items-start">

            <div className="flex flex-row items-center">
              <span className="text-slate-300 text-xs">OBS：</span>
              <span className={`text-sm font-medium ${obsVersion === '检测中' ? 'text-blue-300 animate-pulse' : obsVersion === '未检测到' ? 'text-red-300' : 'text-yellow-300'}`}>
                {obsVersion}
              </span>
            </div>

            <div className="flex flex-row items-center">
              <span className="text-slate-300 text-xs">伴侣：</span>
              <span className={`text-sm font-medium ${companionVersion === '检测中' ? 'text-blue-300 animate-pulse' : companionVersion === '未检测到' ? 'text-red-300' : 'text-yellow-300'}`}>
                {companionVersion}
              </span>
            </div>

            <div className="flex flex-row items-center">
              <div className="relative inline-flex items-center cursor-pointer" onClick={toggleMode}>
                <input type="checkbox" value="" className="sr-only peer" checked={autoMode} readOnly />
                <div className="w-10 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </div>
            </div>
          </div>

          {/* 中央显示区域 - 自动推流按钮或推流码显示 */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: '40px' }}>
            {autoMode ? (
              <button
                onClick={startAutoStreaming}
                className={`pointer-events-auto w-[340px] py-1.5 rounded-md border border-slate-600/50 text-lg font-bold text-slate-200 transition-colors relative mb-10
                  ${isStreaming ? 'bg-red-700/70 hover:bg-red-600/90' :
                    operationInProgress ? 'bg-blue-600/70 hover:bg-blue-500/90' :
                      'bg-slate-800/90 hover:bg-slate-700/90'}`}
              >
                {operationInProgress ? '获取中...' : isStreaming ? '停止直播' : '开始直播'}

                {/* 成功图标 */}
                {streamInfoSuccess && !operationInProgress && (
                  <span className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1">
                    <Check size={16} />
                  </span>
                )}

                {/* 加载动画 */}
                {operationInProgress && (
                  <span className="absolute top-1 right-1 flex">
                    <span className="animate-ping absolute h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                )}
              </button>


            ) : (
              <div className="pointer-events-auto w-[340px] flex flex-col gap-1.5 max-h-[140px] mb-10">
                {/* 推流地址输入框 */}
                <div className="relative">
                  <div className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <Link size={14} />
                  </div>
                  <input
                    type="text"
                    value={streamUrl}
                    readOnly
                    placeholder="推流地址"
                    className="w-full bg-slate-800/90 text-white pl-9 pr-9 py-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 border border-slate-600/50 text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(streamUrl)}
                    className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    title="复制推流地址"
                  >
                    <Copy size={14} />
                  </button>
                </div>

                {/* 推流密钥输入框 */}
                <div className="relative">
                  <div className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <Key size={14} />
                  </div>
                  <input
                    type="text"
                    value={streamKey ? '********' : ''}
                    readOnly
                    placeholder="推流密钥"
                    className="w-full bg-slate-800/90 text-white pl-9 pr-9 py-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 border border-slate-600/50 text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(streamKey)}
                    className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    title="复制推流密钥"
                  >
                    <Copy size={14} />
                  </button>
                </div>

                {/* 获取推流码按钮 */}
                <button
                  onClick={getStreamInfo}
                  className={`w-full py-1.5 rounded-md text-sm font-medium transition-colors relative
                    ${operationInProgress ? 'bg-blue-500 hover:bg-blue-400' : 'bg-blue-600 hover:bg-blue-500'} text-white`}
                >
                  {operationInProgress ? '获取中...' : '获取推流码'}

                  {/* 成功图标 */}
                  {streamInfoSuccess && !operationInProgress && (
                    <span className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1">
                      <Check size={16} />
                    </span>
                  )}

                  {/* 加载动画 */}
                  {operationInProgress && (
                    <span className="absolute top-1/2 right-4 transform -translate-y-1/2 flex">
                      <span className="animate-ping absolute h-2 w-2 rounded-full bg-white opacity-75"></span>
                      <span className="relative rounded-full h-2 w-2 bg-white"></span>
                    </span>
                  )}
                </button>
                {error && (
                  <div className="mt-2 text-red-400 text-sm flex items-center">
                    <AlertCircle size={14} className="mr-1" />
                    {error}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 底部控制区域 - 绝对定位在左下角和右下角 */}
          <div className="absolute bottom-3 left-3 z-10">
            <button
              className="w-auto py-1 px-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-center text-xs font-medium transition-colors border border-slate-600"
              onClick={() => navigate('/app/obs-config')}
            >
              OBS一键配置
            </button>
          </div>

          <div className="absolute bottom-3 right-3 z-10">
            <button
              className="w-auto bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg px-3 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 border border-slate-600 transition-colors"
              onClick={() => {
                navigate('/app/danmu');
              }}
            >
              打开弹幕
            </button>
          </div>
        </div>

        {/* 右侧区域：直播设置和平台信息 */}
        <div className="w-2/3 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700 shadow-lg overflow-auto">
          {/* 包装两个主要部分在水平布局中 */}
          <div className="flex flex-row gap-4">
            {/* 左侧：平台和直播方式选择 */}
            <div className="w-1/2">
              <div className="flex flex-col gap-4 mb-4">
                <div>
                  <div className="flex flex-row justify-between items-center mb-2">
                    <label className="text-gray-300 text-sm font-medium">选择平台</label>
                    {(platform === '抖音' && (streamMethod === '手机开播' || streamMethod === '自动开播')) && (
                      <button
                        onClick={handleLoginClick}
                        className={`py-1 px-3 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${isLoggedIn ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                      >
                        <span>{isLoggedIn ? '退出登录' : '登录平台'}</span>
                      </button>
                    )}
                  </div>
                  <select
                    value={platform}
                    onChange={(e) => handlePlatformChange(e.target.value)}
                    className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 border border-slate-600"
                  >
                    <option value="抖音">抖音</option>
                    <option value="Bilibili">Bilibili</option>
                  </select>
                </div>

                {platform === '抖音' && (
                  <div>
                    <label className="block text-gray-300 mb-2 text-sm font-medium">直播方式</label>
                    <select
                      value={streamMethod}
                      onChange={(e) => handleMethodChange(e.target.value)}
                      className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 border border-slate-600"
                    >
                      <option value="直播伴侣">直播伴侣</option>
                      <option value="手机开播">手机开播</option>
                      {/* <option value="自动开播">自动开播</option> */}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* 右侧：平台信息和用户信息 */}
            <div className="w-1/2 bg-slate-700/30 rounded-lg p-2 pt-1 border border-slate-600/40 backdrop-blur-sm">
              <div className="flex items-center justify-center mt-0">
                {isLoggedIn && userInfo ? (
                  <div className="flex flex-col items-center">
                    <div className="w-15 h-16 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden border-2 border-white/20 mb-3">
                      {userInfo.avatar_url ? (
                        <img
                          src={userInfo.avatar_url}
                          alt="用户头像"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-8 h-8 text-white" />
                      )}
                    </div>

                    <div className="flex flex-col items-center">
                      <p className="text-white font-medium text-sm mb-2">{userInfo.nickname || '未知用户'}</p>
                      <div className="flex gap-2">
                        {userInfo.follower_count && (
                          <div className="bg-slate-600/60 rounded-lg px-3 py-1 text-center border border-slate-500/30">
                            <p className="text-xs text-blue-200">粉丝: {userInfo.follower_count}</p>
                          </div>
                        )}
                        {userInfo.following_count && (
                          <div className="bg-slate-600/60 rounded-lg px-3 py-1 text-center border border-slate-500/30">
                            <p className="text-xs text-blue-200">关注: {userInfo.following_count}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-3">
                    <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600">
                      <User className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-slate-300 text-sm mt-2 font-medium">请先登录</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/*中间区域：广告位置*/}
      <div className="w-full my-1 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-indigo-900/30 shadow-lg overflow-hidden relative">
        {/* 广告容器 - 固定宽高比例 */}
        <div className="w-full" style={{ height: '100px' }}>
          {adLoading ? (
            // 加载状态
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
              <span className="ml-2 text-gray-400 text-sm">加载广告中...</span>
            </div>
          ) : adError ? (
            // 错误状态
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <span className="text-red-400 text-sm">广告加载失败</span>
            </div>
          ) : advertisements.length > 0 ? (
            // 广告轮播
            <>
              {advertisements.map((ad, index) => (
                <div
                  key={ad.id}
                  className={`absolute inset-0 transition-opacity duration-1000 ${
                    index === currentAdIndex ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  {ad.type === 'video' ? (
                    <video
                      src={ad.url}
                      className="w-full h-full object-cover"
                      controls={false}
                      autoPlay
                      muted
                      loop
                      onError={(e) => {
                        console.error('视频广告加载失败:', ad.url);
                      }}
                    >
                      您的浏览器不支持视频播放
                    </video>
                  ) : (
                    <img
                      src={ad.url}
                      alt={ad.title || '广告内容'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error('图片广告加载失败:', ad.url);
                      }}
                    />
                  )}

                  {/* 广告点击区域 */}
                  {ad.clickUrl && (
                    <div
                      className="absolute inset-0 cursor-pointer"
                      onClick={() => {
                        if (window.electron) {
                          window.electron.openExternal(ad.clickUrl);
                        } else {
                          window.open(ad.clickUrl, '_blank');
                        }
                      }}
                    />
                  )}
                </div>
              ))}

              {/* 轮播指示器 */}
              {advertisements.length > 1 && (
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
                  {advertisements.map((_, index) => (
                    <button
                      key={index}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentAdIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                      onClick={() => setCurrentAdIndex(index)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            // 无广告时的默认显示
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <span className="text-gray-400 text-sm">暂无广告</span>
            </div>
          )}
        </div>
      </div>

      {/* 下部区域：主页热门推荐 */}
      <div className="flex-1 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4  border border-slate-700 shadow-lg overflow-hidden">
        {/* 导航栏 进一步减小顶部边距，可以使用负边距，*/}
        <div className="flex justify-between items-center mt-[-10px] mb-2">
          <h2 className="text-lg font-semibold text-blue-300">热门推荐</h2>
          <nav className="flex space-x-4">
            <button
              className="text-sm text-gray-300 hover:text-white"
              onClick={() => navigate('/app/plugins')}
            >
              插件
            </button>
            <button
              className="text-sm text-gray-300 hover:text-white"
              onClick={() => navigate('/app/devices')}
            >
              设备推荐
            </button>
            <button
              className="text-sm text-gray-300 hover:text-white"
              onClick={() => navigate('/app/tutorials')}
            >
              直播教程
            </button>
            <button
              className="text-sm text-gray-300 hover:text-white"
              onClick={() => navigate('/app/more')}
            >
              更多
            </button>
          </nav>
        </div>
        {/* 加载状态 */}
        {hotDataLoading && (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            <span className="ml-3 text-gray-400">正在加载热门推荐...</span>
          </div>
        )}

        {/* 错误状态 */}
        {hotDataError && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <div className="text-red-400 mr-3">⚠️</div>
              <div>
                <h3 className="text-red-400 font-semibold">加载失败</h3>
                <p className="text-red-300 text-sm mt-1">{hotDataError}</p>
                <button
                  onClick={fetchHotRecommendations}
                  className="mt-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  重试
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 热门推荐列表 */}
        {!hotDataLoading && !hotDataError && (
          <>
            {recommendedWorks.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <div className="text-3xl mb-2">🔥</div>
                <p>暂无热门推荐</p>
                <button
                  onClick={fetchHotRecommendations}
                  className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition-colors"
                >
                  刷新数据
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7 gap-3">
                {recommendedWorks.slice(0, 7).map((work) => (
                  <WorkCard
                    key={work.id}
                    id={work.id}
                    title={work.title}
                    description={work.description}
                    type={work.type}
                    url={work.url}
                    platform={work.platform}
                    playType={work.playType}
                    viewCount={work.viewCount}
                    isHot={work.isHot}
                    coverurl={work.coverurl}
                    thumbnail={work.thumbnail}
                    duration={work.duration}
                    level={work.level}
                    deviceModel={work.deviceModel}
                    downloadUrl={work.downloadUrl}
                    clickUrl={work.clickUrl}
                    version={work.version}
                    rating={work.rating}
                    videoId={work.videoId}
                    size="small"
                    variant="compact"
                    onClick={() => {
                      // 根据数据中的字段判断类型并导航
                      if (work.downloadUrl || work.version) {
                        navigate('/app/plugins');
                      } else if (work.deviceModel) {
                        navigate('/app/devices');
                      } else if (work.level || work.duration) {
                        navigate('/app/tutorials');
                      } else {
                        // 默认根据平台或其他信息导航
                        navigate('/app/more');
                      }
                    }}
                    onSecondaryAction={() => {
                      console.log('查看详情:', work.title);
                    }}
                    secondaryActionText="详情"
                    showActions={false} // 在首页不显示操作按钮，保持简洁
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* OBS Settings Modal - 只有在需要时才显示 */}
      {showObsSettings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 w-full max-w-md border border-slate-700 shadow-2xl">
            <h2 className="text-xl font-semibold mb-4 text-blue-300">参数设置</h2>

            <div className="mb-4">
              <h3 className="text-gray-300 mb-2 font-medium">直播设备</h3>
              <div className="grid grid-cols-3 gap-2">
                <button
                  className={`py-2 rounded-lg font-medium transition-colors ${obsSettings.deviceType === 'phone' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600'}`}
                >
                  手机
                </button>
                <button
                  className={`py-2 rounded-lg font-medium transition-colors ${obsSettings.deviceType === 'tablet' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600'}`}
                >
                  平板
                </button>
                <button
                  className={`py-2 rounded-lg font-medium transition-colors ${obsSettings.deviceType === 'computer' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600'}`}
                >
                  电脑
                </button>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-gray-300 mb-2 font-medium">设备尺寸</h3>
              <div className="grid grid-cols-4 gap-2 mb-4">
                <button
                  className={`py-2 rounded-lg font-medium transition-colors ${obsSettings.deviceSize === '11寸' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600'}`}
                >
                  11寸
                </button>
                <button
                  className={`py-2 rounded-lg font-medium transition-colors ${obsSettings.deviceSize === '12.9寸' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600'}`}
                >
                  12.9寸
                </button>
                <button
                  className={`py-2 rounded-lg font-medium transition-colors ${obsSettings.deviceSize === '1080x1920' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600'}`}
                >
                  1080x1920
                </button>
                <button
                  className={`py-2 rounded-lg font-medium transition-colors ${obsSettings.deviceSize === 'custom' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600'}`}
                >
                  自定义
                </button>
              </div>

              {obsSettings.deviceSize === 'custom' && (
                <div className="flex space-x-3 mb-4">
                  <div>
                    <label className="block text-gray-300 text-sm mb-1 font-medium">宽度</label>
                    <input
                      type="number"
                      value={1080}
                      readOnly
                      className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border border-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm mb-1 font-medium">高度</label>
                    <input
                      type="number"
                      value={1920}
                      readOnly
                      className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border border-slate-600"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 hover:text-white font-medium transition-colors border border-slate-600"
              >
                取消
              </button>
              <button
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
              >
                应用
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;