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
    <div className="bg-slate-800 text-white h-10 flex items-center justify-between select-none drag">
      {/* 应用标题 */}
      <div className="px-3 font-medium text-base flex items-center">
        <img
          src={iconPath}
          alt="小斗笠直播助手"
          className="w-6 h-6 mr-3 flex-shrink-0"
          onLoad={() => {
            console.log('图标加载成功:', iconPath);
          }}
          onError={(e) => {
            console.error('图标加载失败:', iconPath);
            // 如果加载失败，尝试使用备用图标
            if (iconPath !== '/favicon.ico') {
              setIconPath('/favicon.ico');
            }
          }}
        />
        <span>小斗笠直播助手</span>
        <span className="ml-2 text-xs text-gray-400">v{appVersion}</span>
      </div>

      {/* 拖动区域 - 大部分标题栏区域可用于拖动窗口 */}
      <div className="flex-grow drag"></div>

      {/* 功能按钮 */}
      <div className="flex no-drag">
        {/* 音乐按钮 */}
        <button
          onClick={() => navigate('/app/audio-settings')}
          className="hover:bg-slate-700 focus:outline-none px-3 h-10 flex items-center justify-center"
          title={isMuted ? "打开音效" : "关闭音效"}
        >
          <Music size={18} className={isMuted ? "text-gray-500" : "text-blue-400"} />
        </button>

        {/* 会员按钮 */}
        <button
          onClick={() => navigate('/app/membership')}
          className="hover:bg-slate-700 focus:outline-none px-3 h-10 flex items-center justify-center"
          title="会员中心"
        >
          <UserCheck size={18} className="text-yellow-400" />
        </button>

        {/* 主题切换按钮 */}
        <button
          onClick={toggleTheme}
          className="hover:bg-slate-700 focus:outline-none px-3 h-10 flex items-center justify-center"
          title={isDarkTheme ? "切换到亮色主题" : "切换到暗色主题"}
        >
          {isDarkTheme ?
            <Sun size={18} className="text-yellow-300" /> :
            <Moon size={18} className="text-blue-300" />
          }
        </button>

        {/* 最小化按钮 */}
        <button
          onClick={handleMinimize}
          className="hover:bg-slate-700 focus:outline-none px-3 h-10 flex items-center justify-center"
          title="最小化"
        >
          <Minus size={18} />
        </button>

        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          className="hover:bg-red-600 focus:outline-none px-4 h-10 flex items-center justify-center"
          title="关闭应用"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
