import React, { useEffect, useState, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import TitleBar from './TitleBar';
import { RootState } from '../../store/store';
import { fetchContentData } from '../../store/features/contentSlice';

interface SoundEffect {
  id: string;
  name: string;
  hotkey: string;
  position: number;
  filePath?: string;
}

const MainLayout: React.FC = () => {
  // Redux状态管理
  const dispatch = useDispatch();
  const { data: contentData, loading: contentLoading } = useSelector((state: RootState) => state.content);
  
  const [soundEffects, setSoundEffects] = useState<SoundEffect[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const contentInitialized = useRef(false);

  // 内容数据初始化 - 软件启动时执行一次
  useEffect(() => {
    if (!contentInitialized.current && !contentData && !contentLoading) {
      console.log('🏠 [MainLayout] 软件启动检测');
      console.log('📊 [MainLayout] 当前状态 - 数据:', !!contentData, '加载中:', contentLoading, '已初始化:', contentInitialized.current);
      console.log('🚀 [MainLayout] 开始初始化内容数据...');
      contentInitialized.current = true;
      
      // 直接获取最新数据，失败时自动fallback到缓存（在contentSlice中处理）
      dispatch(fetchContentData());
    } else {
      console.log('🏠 [MainLayout] 跳过数据初始化');
      console.log('📊 [MainLayout] 当前状态 - 数据:', !!contentData, '加载中:', contentLoading, '已初始化:', contentInitialized.current);
    }
  }, [dispatch, contentData, contentLoading]);

  // 加载音效配置
  useEffect(() => {
    const loadSoundEffects = () => {
      const savedEffects = localStorage.getItem('soundEffects');
      if (savedEffects) {
        setSoundEffects(JSON.parse(savedEffects));
      }
    };

    // 初始加载
    loadSoundEffects();

    // 监听自定义事件（当音效页面更新配置时）
    const handleSoundEffectsUpdate = () => {
      loadSoundEffects();
    };

    window.addEventListener('soundEffectsUpdated', handleSoundEffectsUpdate);

    return () => {
      window.removeEventListener('soundEffectsUpdated', handleSoundEffectsUpdate);
    };
  }, []);

  // 音效播放处理
  const handlePlaySound = async (effect: SoundEffect) => {
    // 如果是停止音效，只停止当前播放
    if (effect.id === 'stop-effect') {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current = null;
      }
      return;
    }

    if (!effect.filePath) return;

    try {
      // 停止当前播放的音频
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current = null;
      }

      // 获取音频文件的完整路径
      const audioUrl = await window.electronAPI?.getAudioFileUrl?.(effect.filePath);
      if (!audioUrl) {
        console.error('Failed to get audio file URL:', effect.filePath);
        return;
      }

      // 创建新的音频对象
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      audio.onended = () => {
        currentAudioRef.current = null;
      };

      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        currentAudioRef.current = null;
      };

      // 开始播放
      await audio.play();

    } catch (error) {
      console.error('Failed to play sound:', error);
      currentAudioRef.current = null;
    }
  };

  // 全局快捷键监听
  useEffect(() => {
    const unsubscribe = window.electronAPI?.onHotkeyTriggered?.((payload) => {
      const { hotkey } = payload;
      // 找到对应的音效并播放（包括停止音效）
      const effect = soundEffects.find(e => e.hotkey === hotkey);
      if (effect) {
        handlePlaySound(effect);
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [soundEffects]);

  // 更新全局快捷键
  useEffect(() => {
    if (soundEffects.length > 0) {
      window.electronAPI?.updateGlobalHotkeys?.(soundEffects);
    }
  }, [soundEffects]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      // 清理音频
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      // 清理全局快捷键
      window.electronAPI?.clearAllGlobalHotkeys?.();
    };
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* 自定义标题栏 */}
      <TitleBar />

      {/* 主内容区域 */}
      <div className="flex-1 overflow-auto bg-white dark:bg-slate-900 transition-colors duration-300">
        <Outlet />
      </div>
    </div>
  );
};

export default MainLayout;
