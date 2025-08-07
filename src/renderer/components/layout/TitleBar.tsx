import React, { useState, useEffect } from 'react';
import { X, Music, UserCheck, Sun, Moon, Minus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

const TitleBar: React.FC = () => {
  const { themeType, toggleTheme } = useTheme();
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

  // 音效切换
  const toggleMute = () => {
    setIsMuted(!isMuted);
    // 这里可以添加实际的音效控制逻辑
  };

  return (
    <div className="flex items-center justify-between select-none drag h-[38px]
                    bg-slate-100 dark:bg-slate-800
                    border-b border-slate-300 dark:border-slate-600
                    text-slate-800 dark:text-white
                    transition-all duration-300">
      {/* 应用标题 */}
      <div className="font-medium flex items-center px-2.5 text-[15px]">
        <img
          src={iconPath}
          alt="小斗笠直播助手"
          className="flex-shrink-0 w-5 h-5 mr-1.5"
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
        <span className="text-slate-800 dark:text-white">小斗笠直播助手</span>
        <span className="ml-1.5 text-[11px] text-slate-500 dark:text-slate-400">v{appVersion}</span>
      </div>

      {/* 拖动区域 - 大部分标题栏区域可用于拖动窗口 */}
      <div className="flex-grow drag"></div>

      {/* 功能按钮 */}
      <div className="flex items-center no-drag">
        {/* 音乐按钮 */}
        <button
          onClick={() => navigate('/app/audio-settings')}
          className="flex items-center justify-center px-2.5 h-[30px] rounded-md
                     border border-transparent bg-transparent
                     hover:bg-blue-500/20 hover:border-blue-500/30
                     transition-all duration-300 outline-none"
          title={isMuted ? "打开音效" : "关闭音效"}
        >
          <Music
            size={16}
            className={isMuted ? "text-gray-500" : "text-blue-400"}
          />
        </button>

        {/* 会员按钮 */}
        <button
          onClick={() => navigate('/app/membership')}
          className="flex items-center justify-center px-2.5 h-[30px] rounded-md
                     border border-transparent bg-transparent
                     hover:bg-amber-500/20 hover:border-amber-500/30
                     transition-all duration-300 outline-none"
          title="会员中心"
        >
          <UserCheck size={16} className="text-amber-400" />
        </button>

        {/* 主题切换按钮 */}
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center px-2.5 h-[30px] rounded-md
                     border border-transparent bg-transparent
                     hover:bg-purple-500/20 hover:border-purple-500/30
                     transition-all duration-300 outline-none"
          title={themeType === 'dark' ? "切换到亮色主题" : "切换到暗色主题"}
        >
          {themeType === 'dark' ?
            <Sun size={16} className="text-yellow-300" /> :
            <Moon size={16} className="text-blue-300" />
          }
        </button>

        {/* 最小化按钮 */}
        <button
          onClick={handleMinimize}
          className="flex items-center justify-center px-2.5 h-[30px] rounded-md
                     border border-transparent bg-transparent
                     hover:bg-gray-500/20 hover:border-gray-500/30
                     transition-all duration-300 outline-none"
          title="最小化"
        >
          <Minus size={16} className="text-gray-300" />
        </button>

        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          className="flex items-center justify-center px-3 h-[30px] rounded-md
                     border border-transparent bg-transparent
                     hover:bg-red-500/20 hover:border-red-500/30
                     transition-all duration-300 outline-none"
          title="关闭应用"
        >
          <X size={16} className="text-red-400" />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
