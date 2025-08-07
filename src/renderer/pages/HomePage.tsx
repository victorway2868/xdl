import React, { useState, useEffect } from 'react';
import { User, Check, AlertCircle, Link, Key, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HomePage = () => {
  const navigate = useNavigate();

  // 状态管理
  const [autoMode, setAutoMode] = useState(true);
  const [platform, setPlatform] = useState('抖音');
  const [streamMethod, setStreamMethod] = useState('直播伴侣');
  const [streamUrl, setStreamUrl] = useState('');
  const [streamKey, setStreamKey] = useState('');
  const [obsVersion, setObsVersion] = useState('31.0.3');
  const [companionVersion, setCompanionVersion] = useState('10.1.4');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [streamInfoSuccess, setStreamInfoSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState<{nickname: string; follower_count: number; avatar_url?: string} | null>(null);

  // 广告数据
  const [advertisements, setAdvertisements] = useState<{
    id: string;
    type: string;
    url: string;
    title: string;
    description: string;
    clickUrl?: string;
  }[]>([
    {
      id: 'test-ad-1',
      type: 'image',
      url: 'https://fastly.picsum.photos/id/537/200/300.jpg?hmac=LG3kZs5AdrMmsgeVOdrfP0C5KT3WmP-q5TauEZdR4vk',
      title: '图片广告',
      description: '测试图片广告'
    }
  ]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

  // 热门推荐数据
  const [recommendedWorks, setRecommendedWorks] = useState<{title?: string; description?: string}[]>([]);
  const [hotDataLoading, setHotDataLoading] = useState(false);

  // 处理模式切换
  const toggleMode = () => setAutoMode(!autoMode);

  // 处理平台变更
  const handlePlatformChange = (newPlatform: string) => {
    setPlatform(newPlatform);
  };

  // 处理直播方式变更
  const handleMethodChange = (newMethod: string) => {
    setStreamMethod(newMethod);
  };

  // 获取推流信息
  const getStreamInfo = async () => {
    setIsLoading(true);
    setError(null);

    // 模拟获取推流信息
    setTimeout(() => {
      setStreamUrl('rtmp://push-rtmp-l1.douyincdn.com/live/');
      setStreamKey('stream_123456789');
      setStreamInfoSuccess(true);
      setIsLoading(false);
    }, 2000);
  };

  // 开始直播
  const startAutoStreaming = async () => {
    if (isStreaming) {
      setIsStreaming(false);
      setStreamInfoSuccess(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // 模拟开始直播
    setTimeout(() => {
      setIsStreaming(true);
      setStreamInfoSuccess(true);
      setIsLoading(false);
    }, 2000);
  };

  // 复制到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        console.log('复制成功');
      })
      .catch(err => {
        console.error('复制失败:', err);
      });
  };

  // 处理登录
  const handleLoginClick = () => {
    if (isLoggedIn) {
      setIsLoggedIn(false);
      setUserInfo(null);
    } else {
      // 模拟登录
      setIsLoggedIn(true);
      setUserInfo({ nickname: '测试用户', follower_count: 1000 });
    }
  };

  return (
    <div className="home-page-container">
      {/* 上部区域：直播设置 */}
      <div className="top-section">
        {/* 左侧功能区域 - 自动推流组件 */}
        <div className="stream-section">
          {/* 顶部控制区域 */}
          <div className="stream-header">
            <div className="version-info">
              <span>OBS：</span>
              <span className={`version-number ${obsVersion === '未检测到' ? '' : ''}`} style={{ color: obsVersion === '未检测到' ? '#fca5a5' : '#fbbf24' }}>
                {obsVersion}
              </span>
            </div>

            <div className="version-info">
              <span>伴侣：</span>
              <span className={`version-number ${companionVersion === '未检测到' ? '' : ''}`} style={{ color: companionVersion === '未检测到' ? '#fca5a5' : '#fbbf24' }}>
                {companionVersion}
              </span>
            </div>

            <div className="toggle-switch" onClick={toggleMode}>
              <div className="toggle-bg" style={{ backgroundColor: autoMode ? '#3b82f6' : '#475569' }}>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    transition: 'transform 0.3s',
                    transform: autoMode ? 'translateX(24px)' : 'translateX(0px)',
                    position: 'absolute',
                    top: '0px',
                    left: '2px'
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* 中央显示区域 - 自动推流按钮或推流码显示 */}
          <div className="stream-control">
            {autoMode ? (
              <button
                onClick={startAutoStreaming}
                className="stream-button"
                style={{
                  backgroundColor: isStreaming ? '#b91c1c' : isLoading ? '#2563eb' : '',
                  color: '#e2e8f0'
                }}
              >
                {isLoading ? '获取中...' : isStreaming ? '停止直播' : '开始直播'}

                {/* 成功图标 */}
                {streamInfoSuccess && !isLoading && (
                  <span style={{ position: 'absolute', top: '-8px', right: '-8px', backgroundColor: '#10b981', borderRadius: '50%', padding: '4px' }}>
                    <Check size={16} />
                  </span>
                )}

                {/* 加载动画 */}
                {isLoading && (
                  <span style={{ position: 'absolute', top: '4px', right: '4px', display: 'flex' }}>
                    <span className="spinner" style={{ width: '8px', height: '8px', backgroundColor: '#3b82f6' }}></span>
                  </span>
                )}
              </button>
            ) : (
              <div style={{ pointerEvents: 'auto', width: '340px', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', marginBottom: '40px' }}>
                {/* 推流地址输入框 */}
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>
                    <Link size={14} />
                  </div>
                  <input
                    type="text"
                    value={streamUrl}
                    readOnly
                    placeholder="推流地址"
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(30, 41, 59, 0.9)',
                      color: 'white',
                      paddingLeft: '36px',
                      paddingRight: '36px',
                      paddingTop: '6px',
                      paddingBottom: '6px',
                      borderRadius: '6px',
                      border: '1px solid rgba(71, 85, 105, 0.5)',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                  <button
                    onClick={() => copyToClipboard(streamUrl)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}
                    title="复制推流地址"
                  >
                    <Copy size={14} />
                  </button>
                </div>

                {/* 推流密钥输入框 */}
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>
                    <Key size={14} />
                  </div>
                  <input
                    type="text"
                    value={streamKey ? '********' : ''}
                    readOnly
                    placeholder="推流密钥"
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(30, 41, 59, 0.9)',
                      color: 'white',
                      paddingLeft: '36px',
                      paddingRight: '36px',
                      paddingTop: '6px',
                      paddingBottom: '6px',
                      borderRadius: '6px',
                      border: '1px solid rgba(71, 85, 105, 0.5)',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                  <button
                    onClick={() => copyToClipboard(streamKey)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}
                    title="复制推流密钥"
                  >
                    <Copy size={14} />
                  </button>
                </div>

                {/* 获取推流码按钮 */}
                <button
                  onClick={getStreamInfo}
                  style={{
                    width: '100%',
                    paddingTop: '6px',
                    paddingBottom: '6px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    backgroundColor: isLoading ? '#3b82f6' : '#2563eb',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  {isLoading ? '获取中...' : '获取推流码'}

                  {/* 成功图标 */}
                  {streamInfoSuccess && !isLoading && (
                    <span style={{ position: 'absolute', top: '-8px', right: '-8px', backgroundColor: '#10b981', borderRadius: '50%', padding: '4px' }}>
                      <Check size={16} />
                    </span>
                  )}

                  {/* 加载动画 */}
                  {isLoading && (
                    <span style={{ position: 'absolute', top: '50%', right: '16px', transform: 'translateY(-50%)', display: 'flex' }}>
                      <span className="spinner" style={{ width: '8px', height: '8px', backgroundColor: 'white' }}></span>
                    </span>
                  )}
                </button>
                {error && (
                  <div style={{ marginTop: '8px', color: '#f87171', fontSize: '14px', display: 'flex', alignItems: 'center' }}>
                    <AlertCircle size={14} style={{ marginRight: '4px' }} />
                    {error}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 底部控制区域 */}
          <div className="stream-footer">
            <button
              className="footer-button"
              onClick={() => navigate('/app/obs-config')}
            >
              OBS一键配置
            </button>

            <button
              className="footer-button"
              onClick={() => navigate('/app/danmu')}
            >
              打开弹幕
            </button>
          </div>
        </div>

        {/* 右侧区域：直播设置和平台信息 */}
        <div className="settings-section">
          {/* 包装两个主要部分在水平布局中 */}
          <div className="settings-content">
            {/* 左侧：平台和直播方式选择 */}
            <div className="platform-selection">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <div className="platform-header">
                    <label>选择平台</label>
                    {(platform === '抖音' && (streamMethod === '手机开播' || streamMethod === '自动开播')) && (
                      <button
                        onClick={handleLoginClick}
                        className="login-button"
                        style={{
                          backgroundColor: isLoggedIn ? '#dc2626' : '#2563eb',
                          color: 'white'
                        }}
                      >
                        <span>{isLoggedIn ? '退出登录' : '登录平台'}</span>
                      </button>
                    )}
                  </div>
                  <select
                    value={platform}
                    onChange={(e) => handlePlatformChange(e.target.value)}
                    className="platform-select"
                  >
                    <option value="抖音">抖音</option>
                    <option value="Bilibili">Bilibili</option>
                  </select>
                </div>

                {platform === '抖音' && (
                  <div>
                    <label style={{ display: 'block', color: '#d1d5db', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>直播方式</label>
                    <select
                      value={streamMethod}
                      onChange={(e) => handleMethodChange(e.target.value)}
                      className="platform-select"
                    >
                      <option value="直播伴侣">直播伴侣</option>
                      <option value="手机开播">手机开播</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* 右侧：平台信息和用户信息 */}
            <div className="user-info-section">
              <div className="user-info-content">
                {isLoggedIn && userInfo ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      width: '60px',
                      height: '64px',
                      borderRadius: '50%',
                      background: 'linear-gradient(to right, #60a5fa, #a855f7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      border: '2px solid rgba(255, 255, 255, 0.2)',
                      marginBottom: '12px'
                    }}>
                      {userInfo.avatar_url ? (
                        <img
                          src={userInfo.avatar_url}
                          alt="用户头像"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <User size={32} color="white" />
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <p style={{ color: 'white', fontWeight: '500', fontSize: '14px', marginBottom: '8px' }}>
                        {userInfo.nickname || '未知用户'}
                      </p>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {userInfo.follower_count && (
                          <div style={{
                            backgroundColor: 'rgba(71, 85, 105, 0.6)',
                            borderRadius: '8px',
                            padding: '4px 12px',
                            textAlign: 'center',
                            border: '1px solid rgba(71, 85, 105, 0.3)'
                          }}>
                            <p style={{ fontSize: '12px', color: '#bfdbfe' }}>粉丝: {userInfo.follower_count}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '12px', paddingBottom: '12px' }}>
                    <div className="user-avatar-placeholder">
                      <User size={32} color="#94a3b8" />
                    </div>
                    <p className="login-prompt">请先登录</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/*中间区域：广告位置*/}
      <div className="ad-section">
        {/* 广告容器 - 固定宽高比例 */}
        <div className="ad-content">
          {advertisements.length > 0 ? (
            // 广告轮播
            <>
              {advertisements.map((ad, index) => (
                <div
                  key={ad.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    opacity: index === currentAdIndex ? 1 : 0,
                    transition: 'opacity 1s'
                  }}
                >
                  {ad.type === 'video' ? (
                    <video
                      src={ad.url}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      controls={false}
                      autoPlay
                      muted
                      loop
                      onError={() => {
                        console.error('视频广告加载失败:', ad.url);
                      }}
                    >
                      您的浏览器不支持视频播放
                    </video>
                  ) : (
                    <img
                      src={ad.url}
                      alt={ad.title || '广告内容'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={() => {
                        console.error('图片广告加载失败:', ad.url);
                      }}
                    />
                  )}

                  {/* 广告点击区域 */}
                  {ad.clickUrl && (
                    <div
                      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, cursor: 'pointer' }}
                      onClick={() => {
                        if ((window as any).electron) {
                          (window as any).electron.openExternal(ad.clickUrl);
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
            // 无广告时的默认显示
            <div className="ad-loading">
              <span style={{ color: '#9ca3af', fontSize: '14px' }}>暂无广告</span>
            </div>
          )}
        </div>
      </div>

      {/* 下部区域：主页热门推荐 */}
      <div className="recommendations-section">
        {/* 导航栏 */}
        <div className="recommendations-header">
          <h2>热门推荐</h2>
          <nav>
            <button onClick={() => navigate('/app/plugins')}>插件</button>
            <button onClick={() => navigate('/app/devices')}>设备推荐</button>
            <button onClick={() => navigate('/app/tutorials')}>直播教程</button>
            <button onClick={() => navigate('/app/more')}>更多</button>
          </nav>
        </div>

        {/* 加载状态 */}
        {hotDataLoading && (
          <div className="recommendations-loading">
            <div className="spinner"></div>
            <span>正在加载热门推荐...</span>
          </div>
        )}

        {/* 热门推荐列表 */}
        {!hotDataLoading && (
          <>
            {recommendedWorks.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#9ca3af', paddingTop: '32px', paddingBottom: '32px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔥</div>
                <p>暂无热门推荐</p>
                <button
                  onClick={() => setHotDataLoading(true)}
                  style={{
                    marginTop: '16px',
                    backgroundColor: '#4f46e5',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.3s'
                  }}
                  onMouseOver={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#4338ca'}
                  onMouseOut={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#4f46e5'}
                >
                  刷新数据
                </button>
              </div>
            ) : (
              <div className="recommendations-grid">
                {recommendedWorks.slice(0, 7).map((work, index) => (
                  <div
                    key={index}
                    style={{
                      backgroundColor: 'rgba(71, 85, 105, 0.5)',
                      borderRadius: '8px',
                      padding: '12px',
                      border: '1px solid rgba(71, 85, 105, 0.5)',
                      transition: 'border-color 0.3s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.borderColor = '#64748b'}
                    onMouseOut={(e) => e.currentTarget.style.borderColor = 'rgba(71, 85, 105, 0.5)'}
                  >
                    <div style={{
                      aspectRatio: '16/9',
                      backgroundColor: '#475569',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span style={{ color: '#94a3b8', fontSize: '12px' }}>预览图</span>
                    </div>
                    <h3 style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: 'white',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {work.title || '推荐内容'}
                    </h3>
                    <p style={{
                      fontSize: '12px',
                      color: '#94a3b8',
                      marginTop: '4px',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {work.description || '暂无描述'}
                    </p>
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