import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { fetchSoftwareVersion } from '../store/features/softwareSlice';
import { fetchDouyinUserInfo, logout, loginWithDouyinWeb, loginWithDouyinCompanion } from '../store/features/user/userSlice';
import { User, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LoginModal from '../components/LoginModal';

const HomePage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  // Global state from Redux
  const { checks } = useSelector((state: RootState) => state.software);
  const { douyinUserInfo, isLoggedIn, loading: userLoading, error: userError } = useSelector((state: RootState) => state.user);

  // Local component state

  const [platform, setPlatform] = useState('抖音');
  const [streamMethod, setStreamMethod] = useState('直播伴侣');
  const [streamUrl, setStreamUrl] = useState('');
  const [streamKey, setStreamKey] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // For stream actions, not user login
  const [streamInfoSuccess, setStreamInfoSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null); // For stream actions
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [copied, setCopied] = useState(''); // Can be 'url' or 'key'

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

  // Derived state
  const obsVersion = checks['OBS Studio']?.version || '未检测到';
  const companionVersion = checks['直播伴侣']?.version || '未检测到';

  // Ad and recommendation data (remains local state)
  const [advertisements] = useState<any[]>([
    {
      id: 'baidu-ad-1',
      type: 'banner',
      title: '百度',
      description: '百度广告',
      backgroundColor: '#4285f4',
      textColor: 'white',
      brandName: '百度',
      clickUrl: 'https://www.baidu.com'
    }
  ]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [recommendedWorks] = useState<any[]>([]);
  const [hotDataLoading, setHotDataLoading] = useState(false);

  // Handlers

  const handlePlatformChange = (newPlatform: string) => setPlatform(newPlatform);
  const handleMethodChange = (newMethod: string) => setStreamMethod(newMethod);

  const handleStartStreaming = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (platform !== '抖音' || streamMethod !== '直播伴侣') {
        setError('当前仅支持 抖音-直播伴侣 路线');
        setIsLoading(false);
        return;
      }

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
      setStreamInfoSuccess(true);
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
    } catch (e: any) {
      setError(e?.message || String(e));
      setIsLoading(false);
    }
  };

  const handleStopStreaming = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 1) 触发直播伴侣的“结束直播”热键（Shift+L）
      try {
        const hkRes = await window.electronAPI.endLiveHotkey();
        if (!hkRes?.success) {
          console.warn('结束直播热键发送失败: ', hkRes?.message);
        }
      } catch (e) {
        console.warn('结束直播热键调用异常: ', e);
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
        setStreamInfoSuccess(false);
        setStreamUrl('');
        setStreamKey('');
        setIsLoading(false);
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
        <div className="w-2/3 rounded-2xl p-6 border border-blue-500/20 overflow-auto relative backdrop-blur-sm transition-all duration-300 bg-white dark:bg-slate-800 shadow-xl text-slate-800 dark:text-white">
          <div className="stream-header" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <button onClick={() => navigate('/app/obs-config')} className="btn-base btn-ghost" style={{ padding: '4px 8px', fontSize: '12px' }}>OBS一键配置</button>
            <div className="version-info">
              <span>obs:</span>
              <span className={`version-number ${obsVersion === '未检测到' ? '' : ''}`} style={{ color: obsVersion === '未检测到' ? '#fca5a5' : '#fbbf24', marginLeft: '4px' }}>
                {obsVersion}
              </span>
            </div>
            <div className="version-info">
              <span>伴侣:</span>
              <span className={`version-number ${companionVersion === '未检测到' ? '' : ''}`} style={{ color: companionVersion === '未检测到' ? '#fca5a5' : '#fbbf24', marginLeft: '4px' }}>
                {companionVersion}
              </span>
            </div>
            <button onClick={() => navigate('/danmu')} className="btn-base btn-ghost" style={{ padding: '4px 8px', fontSize: '12px' }}>打开弹幕</button>
          </div>

          <div className="stream-control">
            {!isStreaming ? (
              <button
                onClick={handleStartStreaming}
                disabled={isLoading}
                style={{
                  pointerEvents: 'auto',
                  width: '320px',
                  padding: '16px 32px',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  fontSize: '20px',
                  transition: 'all 0.3s ease',
                  background: 'linear-gradient(to right, #3b82f6, #4f46e5)',
                  color: 'white',
                  border: 'none',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1,
                  outline: 'none',
                  position: 'relative'
                }}
              >
                {isLoading ? '获取中...' : '开始直播'}
              </button>
            ) : (
              <div style={{ pointerEvents: 'auto', width: '100%', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ position: 'relative' }}>
                    <input type="text" value={streamUrl} readOnly placeholder="推流地址" style={{ width: '100%', backgroundColor: 'rgba(30, 41, 59, 0.9)', color: 'white', padding: '6px 36px 6px 12px', borderRadius: '6px', border: '1px solid rgba(71, 85, 105, 0.5)', fontSize: '14px', outline: 'none' }} />
                    <button onClick={() => copyToClipboard(streamUrl, 'url')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: copied === 'url' ? '#10b981' : '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }} title="复制推流地址">
                      {copied === 'url' ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input type="text" value={streamKey ? '********' : ''} readOnly placeholder="推流密钥" style={{ width: '100%', backgroundColor: 'rgba(30, 41, 59, 0.9)', color: 'white', padding: '6px 36px 6px 12px', borderRadius: '6px', border: '1px solid rgba(71, 85, 105, 0.5)', fontSize: '14px', outline: 'none' }} />
                    <button onClick={() => copyToClipboard(streamKey, 'key')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: copied === 'key' ? '#10b981' : '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }} title="复制推流密钥">
                      {copied === 'key' ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleStopStreaming}
                  style={{
                    padding: '16px 32px',
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    fontSize: '20px',
                    background: 'linear-gradient(to right, #ef4444, #dc2626)',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <div className="platform-header">
                    <label>选择平台</label>
                    {(platform === '抖音' && (streamMethod === '手机开播' || streamMethod === '自动开播')) && (
                      <button onClick={handleLoginClick} style={{ backgroundColor: isLoggedIn ? '#dc2626' : '#2563eb', color: 'white', padding: '6px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.3s ease', outline: 'none' }}>
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
                    <label style={{ display: 'block', color: '#d1d5db', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>直播方式</label>
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
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '12px', paddingBottom: '12px' }}>
                    <p className="login-prompt">正在加载...</p>
                  </div>
                ) : isLoggedIn && douyinUserInfo ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '60px', height: '64px', borderRadius: '50%', background: 'linear-gradient(to right, #60a5fa, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '2px solid rgba(255, 255, 255, 0.2)', marginBottom: '12px' }}>
                      {douyinUserInfo.avatarUrl ? (
                        <img src={douyinUserInfo.avatarUrl} alt="用户头像" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <User size={32} color="white" />
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <p style={{ color: 'white', fontWeight: '500', fontSize: '14px', marginBottom: '8px' }}>
                        {douyinUserInfo.nickname || '未知用户'}
                      </p>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {douyinUserInfo.followerCount > 0 && (
                          <div style={{ backgroundColor: 'rgba(71, 85, 105, 0.6)', borderRadius: '8px', padding: '4px 12px', textAlign: 'center', border: '1px solid rgba(71, 85, 105, 0.3)' }}>
                            <p style={{ fontSize: '12px', color: '#bfdbfe' }}>粉丝: {douyinUserInfo.followerCount}</p>
                          </div>
                        )}
                        {douyinUserInfo.followingCount > 0 && (
                          <div style={{ backgroundColor: 'rgba(71, 85, 105, 0.6)', borderRadius: '8px', padding: '4px 12px', textAlign: 'center', border: '1px solid rgba(71, 85, 105, 0.3)' }}>
                            <p style={{ fontSize: '12px', color: '#bfdbfe' }}>关注: {douyinUserInfo.followingCount}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '12px', paddingBottom: '12px' }}>
                    <div className="user-avatar-placeholder"><User size={32} color="#94a3b8" /></div>
                    <p className="login-prompt">{userError || '请先登录'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Middle: Ad section */}
      <div className="w-full my-2 rounded-2xl border-2 border-blue-500/30 overflow-hidden relative backdrop-blur-sm transition-all duration-300 bg-blue-50 dark:bg-blue-900/20 shadow-lg text-slate-800 dark:text-white">
        <div className="ad-content">
          {advertisements.length > 0 ? (
            <>
              {advertisements.map((ad, index) => (
                <div key={ad.id} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: index === currentAdIndex ? 1 : 0, transition: 'opacity 1s' }}>
                  {ad.type === 'banner' ? (
                    <div style={{ width: '100%', height: '100%', backgroundColor: ad.backgroundColor || '#4285f4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ad.textColor || 'white', fontSize: '24px', fontWeight: 'bold', fontFamily: 'Arial, sans-serif' }}>
                      {ad.brandName || ad.title}
                    </div>
                  ) : (
                    <img src={ad.url} alt={ad.title || '广告内容'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                  {ad.clickUrl && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, cursor: 'pointer' }} onClick={() => window.open(ad.clickUrl, '_blank')} />
                  )}
                </div>
              ))}
              {/* Carousel indicators */}
              {advertisements.length > 1 && (
                <div style={{ position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '4px' }}>
                  {advertisements.map((_, index) => (
                    <button
                      key={index}
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: index === currentAdIndex ? 'white' : 'rgba(255, 255, 255, 0.5)',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background-color 0.3s'
                      }}
                      onClick={() => setCurrentAdIndex(index)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="ad-loading"><span style={{ color: '#9ca3af', fontSize: '14px' }}>暂无广告</span></div>
          )}
        </div>
      </div>

      {/* Bottom: Recommendations */}
      <div className="flex-1 rounded-2xl p-6 border border-blue-500/20 overflow-auto backdrop-blur-sm transition-all duration-300 bg-white dark:bg-slate-800 shadow-xl text-slate-800 dark:text-white">
        <div className="recommendations-header">
          <h2>热门推荐</h2>
          <nav style={{ display: 'flex', gap: '16px' }}>
            <button onClick={() => navigate('/app/plugins')} className="btn-base btn-ghost">插件</button>
            <button onClick={() => navigate('/app/devices')} className="btn-base btn-ghost">设备推荐</button>
            <button onClick={() => navigate('/app/tutorials')} className="btn-base btn-ghost">直播教程</button>
            <button onClick={() => navigate('/app/more')} className="btn-base btn-ghost">更多</button>
          </nav>
        </div>
        {hotDataLoading ? (
          <div className="recommendations-loading"><div className="spinner"></div><span>正在加载热门推荐...</span></div>
        ) : (
          <>
            {recommendedWorks.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#9ca3af', padding: '32px 0' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔥</div>
                <p>暂无热门推荐</p>
                <button onClick={() => setHotDataLoading(true)} className="btn-base btn-refresh" style={{ marginTop: '16px' }}>刷新数据</button>
              </div>
            ) : (
              <div className="recommendations-grid">
                {recommendedWorks.slice(0, 7).map((work, index) => (
                  <div key={index} className="recommendation-card">
                    <div className="card-thumbnail"><span className="card-thumbnail-text">预览图</span></div>
                    <h3 className="card-title">{work.title || '推荐内容'}</h3>
                    <p className="card-description">{work.description || '暂无描述'}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default HomePage;