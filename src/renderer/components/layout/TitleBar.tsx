import React, { useState, useEffect } from 'react';
import { X, Music, UserCheck, Sun, Moon, Minus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TitleBar: React.FC = () => {
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [appVersion, setAppVersion] = useState('');
  const [iconPath, setIconPath] = useState('/xdllogo.ico');
  const [isProduction, setIsProduction] = useState(false);
  const navigate = useNavigate();

  // 检查 electron 对象是否可用并获取应用版本和图标路径
  useEffect(() => {
    console.log('Window.electron:', (window as any).electron);
    if (!(window as any).electron) {
      console.warn('Electron API 不可用，窗口控制功能将不起作用');
      // 从package.json获取版本号作为备用
      setAppVersion('1.3.5');
    } else {
      console.log('Electron API 可用');

      // 获取应用版本
      (window as any).electron.getAppVersion()
        .then((version: string) => {
          console.log('应用版本:', version);
          setAppVersion(version);
        })
        .catch((error: any) => {
          console.error('获取应用版本时出错:', error);
          setAppVersion('1.3.5');
        });

      // 检查是否为生产环境（打包后的应用）
      if ((window as any).electron && (window as any).electron.getIconPath) {
        setIsProduction(true);
        // 在生产环境中，获取图标的绝对路径
        (window as any).electron.getIconPath()
          .then((path: string) => {
            console.log('生产环境图标路径:', path);
            setIconPath(path);
          })
          .catch((error: any) => {
            console.error('获取生产环境图标路径失败:', error);
            // 保持默认路径
          });
      } else {
        // 开发环境，使用相对路径
        console.log('开发环境，使用相对路径');
      }
    }
  }, []);

  // 处理窗口最小化
  const handleMinimize = () => {
    console.log('点击了最小化按钮');
    if ((window as any).electron) {
      console.log('调用 electron.minimizeWindow()');
      try {
        (window as any).electron.minimizeWindow();
      } catch (error) {
        console.error('最小化窗口时出错:', error);
      }
    } else {
      console.warn('electron 对象不可用，无法最小化窗口');
    }
  };

  // 处理窗口关闭
  const handleClose = () => {
    console.log('点击了关闭按钮');
    if ((window as any).electron) {
      console.log('调用 electron.closeWindow()');
      try {
        (window as any).electron.closeWindow();
      } catch (error) {
        console.error('关闭窗口时出错:', error);
      }
    } else {
      console.warn('electron 对象不可用，无法关闭窗口');
      window.close();
    }
  };

  // 主题切换
  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
    // 这里可以添加实际的主题切换逻辑
  };

  // 音效切换
  const toggleMute = () => {
    setIsMuted(!isMuted);
    // 这里可以添加实际的音效控制逻辑
  };

  return (
    <div className="text-white flex items-center justify-between select-none drag" style={{
      height: '38px',
      background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))',
      borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
      backdropFilter: 'blur(10px)'
    }}>
      {/* 应用标题 */}
      <div className="font-medium flex items-center" style={{ padding: '0 10px', fontSize: '15px' }}>
        <img
          src={iconPath}
          alt="小斗笠直播助手"
          className="flex-shrink-0"
          style={{ width: '20px', height: '20px', marginRight: '6px' }}
          onLoad={() => {
            console.log('图标加载成功:', iconPath);
          }}
          onError={() => {
            console.error('图标加载失败:', iconPath);
            // 如果加载失败，尝试使用备用图标
            if (iconPath !== '/favicon.ico') {
              setIconPath('/favicon.ico');
            }
          }}
        />
        <span style={{ color: 'white' }}>小斗笠直播助手</span>
        <span style={{ marginLeft: '6px', fontSize: '11px', color: '#9ca3af' }}>v{appVersion}</span>
      </div>

      {/* 拖动区域 - 大部分标题栏区域可用于拖动窗口 */}
      <div className="flex-grow drag"></div>

      {/* 功能按钮 */}
      <div className="flex items-center no-drag">
        {/* 音乐按钮 */}
        <button
          onClick={() => navigate('/app/audio-settings')}
          className="flex items-center justify-center"
          style={{
            padding: '0 10px',
            height: '30px',
            borderRadius: '5px',
            transition: 'all 0.3s ease',
            border: '1px solid transparent',
            backgroundColor: 'transparent',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = 'transparent';
          }}
          title={isMuted ? "打开音效" : "关闭音效"}
        >
          <Music size={16} color={isMuted ? "#6b7280" : "#60a5fa"} />
        </button>

        {/* 会员按钮 */}
        <button
          onClick={() => navigate('/app/membership')}
          className="flex items-center justify-center"
          style={{
            padding: '0 10px',
            height: '30px',
            borderRadius: '5px',
            transition: 'all 0.3s ease',
            border: '1px solid transparent',
            backgroundColor: 'transparent',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = 'transparent';
          }}
          title="会员中心"
        >
          <UserCheck size={16} color="#fbbf24" />
        </button>

        {/* 主题切换按钮 */}
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center"
          style={{
            padding: '0 10px',
            height: '30px',
            borderRadius: '5px',
            transition: 'all 0.3s ease',
            border: '1px solid transparent',
            backgroundColor: 'transparent',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(168, 85, 247, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = 'transparent';
          }}
          title={isDarkTheme ? "切换到亮色主题" : "切换到暗色主题"}
        >
          {isDarkTheme ?
            <Sun size={16} color="#fde047" /> :
            <Moon size={16} color="#93c5fd" />
          }
        </button>

        {/* 最小化按钮 */}
        <button
          onClick={handleMinimize}
          className="flex items-center justify-center"
          style={{
            padding: '0 10px',
            height: '30px',
            borderRadius: '5px',
            transition: 'all 0.3s ease',
            border: '1px solid transparent',
            backgroundColor: 'transparent',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(107, 114, 128, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = 'transparent';
          }}
          title="最小化"
        >
          <Minus size={16} color="#d1d5db" />
        </button>

        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          className="flex items-center justify-center"
          style={{
            padding: '0 12px',
            height: '30px',
            borderRadius: '5px',
            transition: 'all 0.3s ease',
            border: '1px solid transparent',
            backgroundColor: 'transparent',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = 'transparent';
          }}
          title="关闭应用"
        >
          <X size={16} color="#f87171" />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
