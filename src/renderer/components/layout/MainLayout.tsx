import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import TitleBar from './TitleBar';
import { RootState } from '../../store/store';
import { fetchContentData } from '../../store/features/contentSlice';
import { Message } from '../../store/features/danmakuSlice';

interface SoundEffect {
  id: string;
  name: string;
  hotkey: string;
  position: number;
  filePath?: string;
}

// 语音事件配置接口
interface VoiceEventConfig {
  enabled: boolean;
  prefix: string;
}

const MainLayout: React.FC = () => {
  // Redux状态管理
  const dispatch = useDispatch();
  const { data: contentData, loading: contentLoading } = useSelector((state: RootState) => state.content);
  const { messages } = useSelector((state: RootState) => state.danmaku);
  
  const [soundEffects, setSoundEffects] = useState<SoundEffect[]>([]);
  const globalAudioRef = useRef<HTMLAudioElement | null>(null); // 重命名以避免冲突
  const contentInitialized = useRef(false);

  // 语音播报设置状态
  const [voiceSettings, setVoiceSettings] = useState(() => {
    const saved = localStorage.getItem('voiceSettings');
    return saved ? JSON.parse(saved) : {
      enabled: false,
      voice: 0,
      rate: 1,
      pitch: 1,
      volume: 1,
      events: {
        chat: { enabled: true, prefix: '聊天消息：' },
        gift: { enabled: true, prefix: '感谢' },
        follow: { enabled: true, prefix: '感谢' },
        like: { enabled: true, prefix: '感谢点赞：' },
        member: { enabled: true, prefix: '欢迎' }
      }
    };
  });

  // 快捷键设置状态
  const [hotkeySettings, setHotkeySettings] = useState(() => {
    const saved = localStorage.getItem('hotkeySettings');
    return saved ? JSON.parse(saved) : {
      giftTriggers: [],
      keywordTriggers: []
    };
  });

  // 语音合成相关
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const speechSynthesis = window.speechSynthesis;

  // 初始化语音列表
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      setVoices(availableVoices);
    };
    
    loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [speechSynthesis]);

  // 语音播报函数
  const speakText = useCallback((text: string) => {
    if (!voiceSettings.enabled || !text.trim()) return;
    
    // 停止当前播放
    speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    if (voices.length > 0 && voices[voiceSettings.voice]) {
      utterance.voice = voices[voiceSettings.voice];
    }
    
    utterance.rate = voiceSettings.rate;
    utterance.pitch = voiceSettings.pitch;
    utterance.volume = voiceSettings.volume;
    
    speechSynthesis.speak(utterance);
  }, [voiceSettings, voices, speechSynthesis]);

  // 触发快捷键函数
  const triggerHotkeys = useCallback(async (keys: string[]) => {
    if (keys.length === 0) return;
    
    try {
      await window.electronAPI?.executeCustomHotkey?.(keys);
    } catch (error) {
      console.error('Failed to execute hotkey:', error);
    }
  }, []);

  // 监听设置变化
  useEffect(() => {
    const handleVoiceSettingsUpdate = () => {
      const saved = localStorage.getItem('voiceSettings');
      if (saved) {
        setVoiceSettings(JSON.parse(saved));
      }
    };

    const handleHotkeySettingsUpdate = () => {
      const saved = localStorage.getItem('hotkeySettings');
      if (saved) {
        setHotkeySettings(JSON.parse(saved));
      }
    };

    window.addEventListener('voiceSettingsUpdated', handleVoiceSettingsUpdate);
    window.addEventListener('hotkeySettingsUpdated', handleHotkeySettingsUpdate);

    return () => {
      window.removeEventListener('voiceSettingsUpdated', handleVoiceSettingsUpdate);
      window.removeEventListener('hotkeySettingsUpdated', handleHotkeySettingsUpdate);
    };
  }, []);

  // 监听新消息进行语音播报和快捷键触发
  useEffect(() => {
    if (messages.length === 0) return;
    
    const latestMessage = messages[messages.length - 1];
    
    // 语音播报
    if (voiceSettings.enabled) {
      const eventConfig = voiceSettings.events[latestMessage.type as keyof typeof voiceSettings.events] as VoiceEventConfig;
      if (eventConfig?.enabled) {
        let textToSpeak = '';
        
        switch (latestMessage.type) {
          case 'chat':
            textToSpeak = `${eventConfig.prefix}${latestMessage.user.name}说：${latestMessage.content}`;
            break;
          case 'gift':
            textToSpeak = `${eventConfig.prefix}${latestMessage.user.name}送出了${latestMessage.gift.name}`;
            break;
          case 'follow':
            textToSpeak = `${eventConfig.prefix}${latestMessage.user.name}关注了直播间`;
            break;
          case 'like':
            textToSpeak = `${eventConfig.prefix}${latestMessage.user.name}`;
            break;
          case 'member':
            textToSpeak = `${eventConfig.prefix}${latestMessage.user.name}进入了直播间`;
            break;
        }
        
        if (textToSpeak) {
          speakText(textToSpeak);
        }
      }
    }
    
    // 快捷键触发
    if (latestMessage.type === 'gift') {
      const giftTrigger = hotkeySettings.giftTriggers.find(
        (trigger: any) => trigger.giftName === latestMessage.gift.name
      );
      if (giftTrigger) {
        triggerHotkeys(giftTrigger.keys);
      }
    } else if (latestMessage.type === 'chat') {
      const keywordTrigger = hotkeySettings.keywordTriggers.find(
        (trigger: any) => latestMessage.content.includes(trigger.keyword)
      );
      if (keywordTrigger) {
        triggerHotkeys(keywordTrigger.keys);
      }
    }
  }, [messages, voiceSettings, hotkeySettings, speakText, triggerHotkeys]);

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
      if (globalAudioRef.current) {
        globalAudioRef.current.pause();
        globalAudioRef.current.currentTime = 0;
        globalAudioRef.current = null;
      }
      return;
    }

    if (!effect.filePath) return;

    try {
      // 停止当前播放的音频
      if (globalAudioRef.current) {
        globalAudioRef.current.pause();
        globalAudioRef.current.currentTime = 0;
        globalAudioRef.current = null;
      }

      // 获取音频文件的完整路径
      const audioUrl = await window.electronAPI?.getAudioFileUrl?.(effect.filePath);
      if (!audioUrl) {
        console.error('Failed to get audio file URL:', effect.filePath);
        return;
      }

      // 创建新的音频对象
      const audio = new Audio(audioUrl);
      globalAudioRef.current = audio;

      audio.onended = () => {
        globalAudioRef.current = null;
      };

      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        globalAudioRef.current = null;
      };

      // 开始播放
      await audio.play();

    } catch (error) {
      console.error('Failed to play sound:', error);
      globalAudioRef.current = null;
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
      if (globalAudioRef.current) {
        globalAudioRef.current.pause();
        globalAudioRef.current = null;
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
