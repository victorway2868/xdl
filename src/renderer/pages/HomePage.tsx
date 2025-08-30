import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { fetchSoftwareVersion } from '../store/features/softwareSlice';
import { fetchDouyinUserInfo, logout, loginWithDouyinWeb, loginWithDouyinCompanion } from '../store/features/user/userSlice';
import { User, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LoginModal from '../components/LoginModal';
import '../styles/themes.css';
import ContentCard from '../components/common/ContentCard';
import ContentModal from '../components/common/ContentModal';
import VideoModal from '../components/common/VideoModal';
import { ContentItem } from '../store/features/contentSlice';

const HomePage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  // Global state from Redux
  const { checks } = useSelector((state: RootState) => state.software);
  const { douyinUserInfo, isLoggedIn, loading: userLoading, error: userError } = useSelector((state: RootState) => state.user);
  // 内容数据状态 - 现在由MainLayout统一管理
  const { data: contentData, loading: contentLoading } = useSelector((state: RootState) => state.content);

  // 页面加载时记录数据来源
  useEffect(() => {
    console.log('🏡 [HomePage] 页面加载');
    if (contentData) {
      console.log('📊 [HomePage] 从Redux状态获取数据');
      console.log('📋 [HomePage] 可用数据分类:', Object.keys(contentData));
    } else if (contentLoading) {
      console.log('⏳ [HomePage] 数据正在加载中...');
    } else {
      console.log('❌ [HomePage] 没有可用数据');
    }
  }, [contentData, contentLoading]);

  // Local component state

  const [platform, setPlatform] = useState('抖音');
  const [streamMethod, setStreamMethod] = useState('直播伴侣');
  const [streamUrl, setStreamUrl] = useState('');
  const [streamKey, setStreamKey] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // For stream actions, not user login

  const [error, setError] = useState<string | null>(null); // For stream actions
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [copied, setCopied] = useState(''); // Can be 'url' or 'key'
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [currentVideoItem, setCurrentVideoItem] = useState<ContentItem | null>(null);


  // 手机开播轮询控制（前端）
  const pollingTimer = React.useRef<number | null>(null);
  const pollingRunning = React.useRef(false);
  const inFlight = React.useRef(false);
  const shownStatus4Hint = React.useRef(false);
  const shownAuthOnce = React.useRef(false);
  const [showStatus4Image, setShowStatus4Image] = React.useState(false);
  const [showStatus2Image, setShowStatus2Image] = React.useState(false);

  const initialized = React.useRef(false);

  useEffect(() => {
    // This effect runs only once on mount
    if (!initialized.current) {
      initialized.current = true;
      dispatch(fetchSoftwareVersion('OBS Studio'));
      dispatch(fetchSoftwareVersion('直播伴侣'));
      // Fetch user info on startup if not already loaded
      if (!douyinUserInfo) {
        dispatch(fetchDouyinUserInfo());
      }
    }
  }, [dispatch, douyinUserInfo]);

  // 注意：内容数据获取逻辑已移至MainLayout统一管理

  // 监听认证/状态通知（可选增强）
  useEffect(() => {
    const offAuth = window.electronAPI.onAuthNotification?.((p: any) => {
      if (p?.message) console.warn(p.message);
      if (p?.url) {
        window.electronAPI.openAuthUrl({ url: p.url });
        setError('需要进行直播安全认证，请在浏览器完成后返回应用继续。');
      }
    });
    const offStatus = window.electronAPI.onStatusNotification?.((p: any) => {
      if (p?.message) console.log('状态通知:', p.message);
    });
    return () => {
      try { offAuth && offAuth(); } catch {}
      try { offStatus && offStatus(); } catch {}
    };
  }, []);

  // 组件卸载时清理：停止轮询并尝试停止心跳
  useEffect(() => {
    return () => {
      try { /* 停止前端轮询 */ stopPolling(); } catch {}
      try { /* 尝试停止心跳 */ window.electronAPI.getDouyinApiInfo('stop'); } catch {}
    };
  }, []);

  // Derived state
  const obsVersion = checks['OBS Studio']?.version || '未检测到';
  const companionVersion = checks['直播伴侣']?.version || '未检测到';

  // Ad and recommendation data
  const advertisements = contentData?.Ads || [];
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

  // 广告轮播
  useEffect(() => {
    if (advertisements.length > 1) {
      const interval = setInterval(() => {
        setCurrentAdIndex((prev) => (prev + 1) % advertisements.length);
      }, 5000); // 5秒切换一次
      return () => clearInterval(interval);
    }
  }, [advertisements.length]);
  
  // Get mixed recommendations from all categories
  const getRecommendations = () => {
    if (!contentData) return [];
    const allItems = [
      ...(contentData.Tutorials || []).slice(0, 2),
      ...(contentData.OBSPlugins || []).slice(0, 2),
      ...(contentData.DeviceRecommendations || []).slice(0, 3),
    ];
    return allItems.slice(0, 7);
  };
  
  const recommendedWorks = getRecommendations();

  // Handlers

  const handlePlatformChange = (newPlatform: string) => setPlatform(newPlatform);
  const handleMethodChange = (newMethod: string) => setStreamMethod(newMethod);

  // 手机开播轮询逻辑（前端控制）
  const pollOnce = async () => {
    if (!pollingRunning.current || inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await window.electronAPI.getDouyinApiInfo('get');
      if (!pollingRunning.current) return;

      // 需要认证（仅首次自动打开）
      if (res?.requiresAuth && res?.authUrl && !shownAuthOnce.current) {
        shownAuthOnce.current = true;
        try { await window.electronAPI.openAuthUrl({ url: res.authUrl }); } catch {}
      }

      // 就绪：展示 status2 引导图、配置 OBS、启动推流、维持心跳并停止轮询
      if (res?.streamUrl && res?.streamKey) {
        setShowStatus2Image(true);
        setShowStatus4Image(false);
        setStreamUrl(res.streamUrl);
        setStreamKey(res.streamKey);
        setIsStreaming(true);
        // 配置 OBS
        try {
          const setRes = await window.electronAPI.setOBSStreamSettings(res.streamUrl, res.streamKey);
          if (!setRes?.success) {
            console.warn('OBS 参数设置失败:', setRes?.message);
          } else {
            const startRes = await window.electronAPI.startOBSStreaming();
            if (!startRes?.success) {
              console.warn('OBS 启动推流失败:', startRes?.message);
            }
          }
        } catch (e) {
          console.warn('OBS 配置/启动异常:', e);
        }
        // 维持心跳
        if (res?.room_id && res?.stream_id) {
          try { await window.electronAPI.maintainDouyinStream(res.room_id, res.stream_id, 'phone'); } catch {}
        }
        setIsLoading(false);
        stopPolling();
        return;
      }

      // 未就绪：status=4 首次显示提示图
      if (res?.currentStatus === 4 && !shownStatus4Hint.current) {
        shownStatus4Hint.current = true;
        setShowStatus4Image(true);
      }
    } catch (e) {
      console.warn('轮询异常:', e);
    } finally {
      inFlight.current = false;
      if (pollingRunning.current) {
        pollingTimer.current = window.setTimeout(pollOnce, 3000);
      }
    }
  };

  const startPolling = () => {
    stopPolling();
    shownStatus4Hint.current = false;
    shownAuthOnce.current = false;
    setShowStatus4Image(false);
    setShowStatus2Image(false);
    pollingRunning.current = true;
    pollingTimer.current = window.setTimeout(pollOnce, 0);
  };

  const stopPolling = () => {
    pollingRunning.current = false;
    if (pollingTimer.current) {
      clearTimeout(pollingTimer.current);
      pollingTimer.current = null;
    }
    inFlight.current = false;
  };

  const handleStartStreaming = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (platform !== '抖音') {
        setError('当前仅支持抖音平台');
        setIsLoading(false);
        return;
      }

      if (streamMethod === '直播伴侣') {
        // 1) 从抖音直播伴侣读取 RTMP
        const info = await window.electronAPI.getDouyinCompanionInfo();
        if (!info || info.error) {
          setError(info?.error || '获取推流信息失败');
          setIsLoading(false);
          return;
        }
        if (!info.streamUrl || !info.streamKey) {
          setError('未获取到有效的推流地址，请确认直播伴侣已开播且状态为2');
          setIsLoading(false);
          return;
        }

        // --- 关键改动：拿到推流码后，立刻更新UI ---
        setStreamUrl(info.streamUrl);
        setStreamKey(info.streamKey);
        setIsStreaming(true); // 立即切换到显示推流码的界面
        // ----------------------------------------

        // 后续步骤继续在后台执行
        // 2) 配置 OBS 推流参数
        const setRes = await window.electronAPI.setOBSStreamSettings(info.streamUrl, info.streamKey);
        if (!setRes?.success) {
          setError(`OBS 参数设置失败: ${setRes?.message || '未知错误'}`);
          // 此时 UI 已显示推流码，仅在错误区域提示 OBS 问题
          setIsLoading(false);
          return; // 流程中断，但 UI 保持显示推流码
        }

        // 3) 启动 OBS 推流
        const startRes = await window.electronAPI.startOBSStreaming();
        if (!startRes?.success) {
          setError(`OBS 启动推流失败: ${startRes?.message || '未知错误'}`);
          setIsLoading(false);
          return;
        }

        // 4) 杀掉 MediaSDK_Server.exe 避免冲突（两次，间隔3秒）
        try {
          await window.electronAPI.killMediaSDKServer();
          setTimeout(() => { window.electronAPI.killMediaSDKServer().catch(() => {}); }, 3000);
        } catch {}

        // 所有流程成功，结束 loading 状态
        setIsLoading(false);
        return;
      }

      // 手机开播：前端开启轮询（在拿到推流码前，按钮保持"获取中..."）
      startPolling();
    } catch (e: any) {
      setError(e?.message || String(e));
      setIsLoading(false);
    }
  };

  const handleStopStreaming = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 停止前端轮询
      stopPolling();

      if (streamMethod === '直播伴侣') {
        // 1) 触发直播伴侣的"结束直播"热键（Shift+L）
        try {
          const hkRes = await window.electronAPI.endLiveHotkey();
          if (!hkRes?.success) {
            console.warn('结束直播热键发送失败: ', hkRes?.message);
          }
        } catch (e) {
          console.warn('结束直播热键调用异常: ', e);
        }
      } else {
        // API 路线：停止心跳
        try { await window.electronAPI.getDouyinApiInfo('stop'); } catch {}
      }

      // 2) 停止 OBS 推流
      const res = await window.electronAPI.stopOBSStreaming();
      if (!res?.success) {
        // 即使失败也重置 UI 状态
        console.warn('停止 OBS 推流失败: ', res?.message);
      }
    } catch (e) {
      console.warn('停止 OBS 推流异常: ', e);
    } finally {
      setTimeout(() => {
        setIsStreaming(false);
        setStreamUrl('');
        setStreamKey('');
        setIsLoading(false);
        setShowStatus4Image(false);
        setShowStatus2Image(false);
      }, 800);
    }
  };

  const copyToClipboard = (text: string, type: 'url' | 'key') => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(''), 2000);
    }).catch(err => console.error('复制失败:', err));
  };




  const handleLoginClick = () => {
    if (isLoggedIn) {
      dispatch(logout());
    } else {
      setShowLoginModal(true);
    }
  };

  const handleWebLogin = async () => {
    await dispatch(loginWithDouyinWeb());
    setShowLoginModal(false);
  };

  const handleCompanionLogin = async () => {
    await dispatch(loginWithDouyinCompanion());
    setShowLoginModal(false);
  };

  const handleContentAction = (item: ContentItem) => {
    console.log('点击推荐作品:', item);
    console.log('category:', item.category);
    console.log('workType:', item.workType);
    console.log('platform:', item.platform);
    console.log('videoUrl:', item.videoUrl);

    if (item.workType === 'Video') {
      console.log('打开视频播放弹窗');
      setCurrentVideoItem(item);
      setIsVideoModalOpen(true);
    } else {
      console.log('打开内容详情弹窗');
      setSelectedContent(item);
      setIsContentModalOpen(true);
    }
  };

  const closeVideoModal = () => {
    setIsVideoModalOpen(false);
    setCurrentVideoItem(null);
  };

  // 注意：手动刷新功能已移除，数据由MainLayout统一管理


  return (
    <div className="home-page-container">
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onWebLogin={handleWebLogin}
        onCompanionLogin={handleCompanionLogin}
      />
      {/* Top Section: Stream Settings */}
      <div className="top-section">
        {/* Left: Auto-streaming component */}
        <div className="w-2/3 rounded-2xl p-6 border border-blue-500/20 overflow-auto relative backdrop-blur-sm transition-all duration-300 theme-card shadow-xl">
          <div className="stream-header flex items-center gap-4 mb-4">
            <button onClick={() => navigate('/app/obs-config')} className="btn-base btn-ghost text-xs px-2 py-1">OBS一键配置</button>
            <div className="version-info">
              <span>OBS:</span>
              <span className={`version-number ml-1 ${obsVersion === '未检测到' ? 'text-red-300' : 'text-yellow-400'}`}>
                {obsVersion}
              </span>
            </div>
            <div className="version-info">
              <span>伴侣:</span>
              <span className={`version-number ml-1 ${companionVersion === '未检测到' ? 'text-red-300' : 'text-yellow-400'}`}>
                {companionVersion}
              </span>
            </div>
            <button onClick={() => navigate('/app/danmu')} className="btn-base btn-ghost text-xs px-2 py-1">打开弹幕</button>
          </div>



          <div className="stream-control">
            {!isStreaming ? (
              <>
                <button
                onClick={handleStartStreaming}
                disabled={isLoading}
                className="btn-start-stream"
              >
                {isLoading ? '获取中...' : '开始直播'}
              </button>

              {/* 错误提示 */}
              {error && (
                <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                  {error}
                </div>
              )}

              {/* 手机开播状态提示图（已废弃，使用模态框方式） */}

              </>




            ) : (
              <div className="pointer-events-auto w-full flex items-center gap-3">
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="relative">
                    <input 
                      type="text" 
                      value={streamUrl} 
                      readOnly 
                      placeholder="推流地址" 
                      className="w-full bg-slate-800/90 text-white px-3 pr-9 py-1.5 rounded-md border border-slate-600/50 text-sm outline-none" 
                    />
                    <button 
                      onClick={() => copyToClipboard(streamUrl, 'url')} 
                      className={`absolute right-2.5 top-1/2 transform -translate-y-1/2 transition-colors ${
                        copied === 'url' ? 'text-green-400' : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="复制推流地址"
                    >
                      {copied === 'url' ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={streamKey ? '********' : ''} 
                      readOnly 
                      placeholder="推流密钥" 
                      className="w-full bg-slate-800/90 text-white px-3 pr-9 py-1.5 rounded-md border border-slate-600/50 text-sm outline-none"
                    />
                    <button 
                      onClick={() => copyToClipboard(streamKey, 'key')} 
                      className={`absolute right-2.5 top-1/2 transform -translate-y-1/2 transition-colors ${
                        copied === 'key' ? 'text-green-400' : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="复制推流密钥"
                    >
                      {copied === 'key' ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleStopStreaming}
                  className="px-8 py-4 rounded-xl font-bold text-xl bg-gradient-to-r from-red-500 to-red-600 text-white border-0 cursor-pointer outline-none hover:from-red-600 hover:to-red-700 transition-all"
                >
                  停止直播
                </button>
              </div>
            )}
          </div>


        </div>

        {/* Right: Settings and User Info */}
        <div className="settings-section">
          <div className="settings-content">
            <div className="platform-selection">
              <div className="flex flex-col gap-4 mb-4">
                <div>
                  <div className="platform-header">
                    <label>选择平台</label>
                    {(platform === '抖音' && (streamMethod === '手机开播' || streamMethod === '自动开播')) && (
                      <button 
                        onClick={handleLoginClick} 
                        className={`btn-base px-3 py-1.5 text-xs font-medium transition-all ${
                          isLoggedIn ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                        } text-white`}
                      >
                        <span>{isLoggedIn ? '退出登录' : '登录平台'}</span>
                      </button>
                    )}
                  </div>
                  <select value={platform} onChange={(e) => handlePlatformChange(e.target.value)} className="platform-select">
                    <option value="抖音">抖音</option>
                    <option value="Bilibili">Bilibili</option>
                  </select>
                </div>
                {platform === '抖音' && (
                  <div>
                    <label className="theme-label">直播方式</label>
                    <select value={streamMethod} onChange={(e) => handleMethodChange(e.target.value)} className="platform-select">
                      <option value="直播伴侣">直播伴侣</option>
                      <option value="手机开播">手机开播</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* User Info Section (Powered by Redux) */}
            <div className="user-info-section">
              <div className="user-info-content">
                {userLoading ? (
                  <div className="flex flex-col items-center py-3">
                    <p className="login-prompt">正在加载...</p>
                  </div>
                ) : isLoggedIn && douyinUserInfo ? (
                  <div className="flex flex-col items-center">
                    <div className="avatar-placeholder w-15 h-16">
                      {douyinUserInfo.avatarUrl ? (
                        <img src={douyinUserInfo.avatarUrl} alt="用户头像" className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <User size={32} className="text-white" />
                      )}
                    </div>
                    <div className="flex flex-col items-center">
                      <p className="user-nickname">
                        {douyinUserInfo.nickname || '未知用户'}
                      </p>
                      <div className="flex gap-2">
                        {douyinUserInfo.followerCount > 0 && (
                          <div className="stats-card">
                            <p className="user-stats-text">粉丝: {douyinUserInfo.followerCount}</p>
                          </div>
                        )}
                        {douyinUserInfo.followingCount > 0 && (
                          <div className="stats-card">
                            <p className="user-stats-text">关注: {douyinUserInfo.followingCount}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-3">
                    <div className="user-avatar-placeholder"><User size={32} className="text-slate-400" /></div>
                    <p className="login-prompt">{userError || '请先登录'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Middle: Ad section */}
      <div className="w-full my-2 rounded-2xl border-2 border-blue-500/30 overflow-hidden relative backdrop-blur-sm transition-all duration-300 bg-blue-50 dark:bg-blue-900/20 shadow-lg theme-text-primary">
        <div className="ad-content">
          {advertisements.length > 0 ? (
            <>
              {advertisements.map((ad, index) => (
                <div key={ad.id} className="absolute inset-0 transition-opacity duration-1000" style={{ opacity: index === currentAdIndex ? 1 : 0 }}>
                  {ad.coverUrl ? (
                    <img 
                      src={ad.coverUrl} 
                      alt={ad.title || '广告内容'} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // 如果图片加载失败，显示文字广告
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className={`w-full h-full bg-blue-500 ${ad.coverUrl ? 'hidden' : 'flex'} items-center justify-center text-white text-2xl font-bold`}>
                    {ad.title}
                  </div>
                  {ad.externalUrl && (
                    <div 
                      className="absolute inset-0 cursor-pointer" 
                      onClick={() => ad.externalUrl && window.electronAPI?.openExternal?.(ad.externalUrl)} 
                    />
                  )}
                </div>
              ))}
              {/* Carousel indicators */}
              {advertisements.length > 1 && (
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                  {advertisements.map((_, index) => (
                    <button
                      key={index}
                      className={`w-2 h-2 rounded-full border-0 cursor-pointer transition-colors duration-300 ${
                        index === currentAdIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                      onClick={() => setCurrentAdIndex(index)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="ad-loading"><span className="text-slate-400 text-sm">暂无广告</span></div>
          )}
        </div>
      </div>

      {/* Bottom: Recommendations */}
      <div className="flex-1 rounded-2xl p-6 border border-blue-500/20 overflow-auto backdrop-blur-sm transition-all duration-300 theme-card shadow-xl">
        <div className="recommendations-header">
          <h2>热门推荐</h2>
          <nav style={{ display: 'flex', gap: '16px' }}>
            <button onClick={() => navigate('/app/tutorials')} className="btn-base btn-ghost">直播教程</button>
            <button onClick={() => navigate('/app/plugins')} className="btn-base btn-ghost">插件</button>
            <button onClick={() => navigate('/app/devices')} className="btn-base btn-ghost">设备推荐</button>
          </nav>
        </div>
        {contentLoading && !contentData ? (
          <div className="flex flex-col items-center justify-center min-h-[200px] gap-4">
            <div className="w-8 h-8 border-3 border-blue-400/30 border-t-blue-500 rounded-full animate-spin" />
            <span className="text-slate-400">正在加载热门推荐...</span>
          </div>
        ) : (
          <>
            {recommendedWorks.length === 0 ? (
              <div className="text-center text-slate-400 py-8">
                <p>暂无热门推荐</p>
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 mt-4">
                {recommendedWorks.map((work) => (
                  <ContentCard
                    key={work.id}
                    item={work}
                    size="small"
                    onAction={handleContentAction}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* 手机开播提示图 - 弹窗方式显示 */}
      {showStatus4Image && (
        <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center" onClick={() => setShowStatus4Image(false)}>
          <div className="bg-slate-900/95 border border-slate-400/20 rounded-xl p-4 w-full max-w-[540px] mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <img src="pngs/phonestatus4.png" alt="请在手机上点击开始直播" className="w-full h-auto block rounded-lg" />
            <div className="flex justify-end mt-3">
              <button onClick={() => setShowStatus4Image(false)} className="btn-base btn-ghost px-4 py-1.5">我知道了</button>
            </div>
          </div>
        </div>
      )}

      {showStatus2Image && (
        <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center" onClick={() => setShowStatus2Image(false)}>
          <div className="bg-slate-900/95 border border-slate-400/20 rounded-xl p-4 w-full max-w-[540px] mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <img src="pngs/phonestatus2.png" alt="请打开飞行模式或清退抖音App" className="w-full h-auto block rounded-lg" />
            <div className="flex justify-end mt-3">
              <button onClick={() => setShowStatus2Image(false)} className="btn-base btn-ghost px-4 py-1.5">我已完成</button>
            </div>
          </div>
        </div>
      )}

      {/* 内容详情弹窗 */}
      <ContentModal
        item={selectedContent}
        isOpen={isContentModalOpen}
        onClose={() => {
          setIsContentModalOpen(false);
          setSelectedContent(null);
        }}
      />

      {/* 视频播放弹窗 */}
      <VideoModal
        isOpen={isVideoModalOpen}
        videoUrl={currentVideoItem?.videoUrl}
        platform={currentVideoItem?.platform}
        title={currentVideoItem?.title}
        onClose={closeVideoModal}
      />

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `
      }} />

    </div>
  );
};

export default HomePage;


