import React, { useState, useEffect } from 'react';
import { X, Music, UserCheck, Sun, Moon, Minus, Square, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import appIcon from '/icons/icon-32x32.ico';

const TitleBar: React.FC = () => {
  const { themeType, toggleTheme } = useTheme();
  const [isMuted, setIsMuted] = useState(false);
  const [appVersion, setAppVersion] = useState('');
  const navigate = useNavigate();

  // Get app version from main process
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getAppVersion()
        .then((result: { version: string; name: string; }) => {
          if (result && result.version) {
            setAppVersion(result.version);
          } else {
             setAppVersion('N/A');
          }
        })
        .catch((error: any) => {
          console.error('获取应用版本时出错:', error);
          setAppVersion('N/A');
        });
    } else {
        // Fallback for browser environment
        setAppVersion('2.0.0'); // Or get from package.json if possible
    }
  }, []);

  // Window control handlers
  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow();
  };

  const handleMaximize = () => {
    window.electronAPI?.maximizeWindow();
  };

  const handleClose = () => {
    window.electronAPI?.closeWindow();
  };

  return (
    <div className="flex items-center justify-between select-none drag h-[38px]
                    bg-slate-100 dark:bg-slate-800
                    border-b border-slate-300 dark:border-slate-600
                    text-slate-800 dark:text-white
                    transition-all duration-300">
      {/* App Title */}
      <div className="font-medium flex items-center px-2.5 text-[15px]">
        <img
          src={appIcon} // Use imported icon
          alt="小斗笠直播助手"
          className="flex-shrink-0 w-5 h-5 mr-1.5"
        />
        <span className="text-slate-800 dark:text-white">小斗笠直播助手</span>
        <span className="ml-1.5 text-[11px] text-slate-500 dark:text-slate-400">v{appVersion}</span>
      </div>

      {/* Drag Region */}
      <div className="flex-grow drag"></div>

      {/* Action Buttons */}
      <div className="flex items-center no-drag">
        {/* Home Button */}
        <button
          onClick={() => navigate('/app')}
          className="flex items-center justify-center px-2.5 h-[30px] rounded-md
                     border border-transparent bg-transparent
                     hover:bg-green-500/20 hover:border-green-500/30
                     transition-all duration-300 outline-none"
          title="返回主页"
        >
          <Home
            size={16}
            className="text-green-400"
          />
        </button>

        {/* Music Button */}
        <button
          onClick={() => navigate('/app/audio-settings')}
          className="flex items-center justify-center px-2.5 h-[30px] rounded-md
                     border border-transparent bg-transparent
                     hover:bg-blue-500/20 hover:border-blue-500/30
                     transition-all duration-300 outline-none"
                     title="音效助手"
        >
          <Music
            size={16}
            className={isMuted ? "text-gray-500" : "text-blue-400"}
          />
        </button>

        {/* Membership Button */}
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

        {/* Theme Toggle Button */}
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

        {/* Minimize Button */}
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

        {/* Maximize Button */}
        <button
          onClick={handleMaximize}
          className="flex items-center justify-center px-2.5 h-[30px] rounded-md
                     border border-transparent bg-transparent
                     hover:bg-gray-500/20 hover:border-gray-500/30
                     transition-all duration-300 outline-none"
          title="最大化"
        >
          <Square size={14} className="text-gray-300" />
        </button>

        {/* Close Button */}
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
