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
  template: string;
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
    const defaultSettings = {
      enabled: false,
      voice: 0,
      rate: 1,
      pitch: 1,
      volume: 1,
      events: {
        chat: { enabled: true, template: '{usr}说' },
        gift: { enabled: true, template: '感谢 {usr} 送出的' },
        follow: { enabled: true, template: '感谢{usr}的关注' },
        like: { enabled: true, template: '来自{usr}的赞赞' },
        member: { enabled: true, template: '欢迎{usr}来到直播间' }
      }
    };

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // 兼容旧版本的prefix格式，转换为template格式
        if (parsed.events) {
          Object.keys(parsed.events).forEach(eventType => {
            const event = parsed.events[eventType];
            // 如果存在旧的prefix字段但没有template字段，进行转换
            if (event.prefix !== undefined && event.template === undefined) {
              // 将旧的prefix转换为新的template格式
              switch (eventType) {
                case 'chat':
                  event.template = event.prefix || '{usr}说';
                  break;
                case 'gift':
                  event.template = event.prefix || '感谢 {usr} 送出的';
                  break;
                case 'follow':
                  event.template = event.prefix || '感谢{usr}的关注';
                  break;
                case 'like':
                  event.template = event.prefix || '来自{usr}的赞赞';
                  break;
                case 'member':
                  event.template = event.prefix || '欢迎{usr}来到直播间';
                  break;
              }
              delete event.prefix; // 删除旧的prefix字段
            }
            // 如果template为空或undefined，使用默认值
            if (!event.template) {
              event.template = defaultSettings.events[eventType as keyof typeof defaultSettings.events]?.template || '';
            }
          });
        }
        return { ...defaultSettings, ...parsed };
      } catch (e) {
        console.warn('解析语音设置失败，使用默认设置:', e);
        return defaultSettings;
      }
    }
    return defaultSettings;
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

  // 模板变量解析函数
  const parseTemplate = useCallback((template: string, variables: Record<string, any>): string => {
    if (!template || typeof template !== 'string') {
      return '';
    }
    
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      // 确保 value 不为 undefined 或 null
      const safeValue = value != null ? String(value) : '';
      result = result.replace(regex, safeValue);
    });
    return result;
  }, []);

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
    if (voiceSettings.enabled && latestMessage?.user?.name) {
      const eventConfig = voiceSettings.events[latestMessage.type as keyof typeof voiceSettings.events] as VoiceEventConfig;
      if (eventConfig?.enabled && eventConfig.template) {
        let textToSpeak = '';
        
        switch (latestMessage.type) {
          case 'chat': {
            const templateText = parseTemplate(eventConfig.template, { usr: latestMessage.user.name });
            const content = latestMessage.content || '';
            textToSpeak = `${templateText}${content}`;
            break;
          }
          case 'gift': {
            const templateText = parseTemplate(eventConfig.template, { usr: latestMessage.user.name });
            const giftCount = latestMessage.gift?.count || 1;
            const giftName = latestMessage.gift?.name || '礼物';
            textToSpeak = `${templateText}${giftCount}个${giftName}`;
            break;
          }
          case 'follow': {
            textToSpeak = parseTemplate(eventConfig.template, { usr: latestMessage.user.name });
            break;
          }
          case 'like': {
            textToSpeak = parseTemplate(eventConfig.template, { usr: latestMessage.user.name });
            break;
          }
          case 'member': {
            textToSpeak = parseTemplate(eventConfig.template, { usr: latestMessage.user.name });
            break;
          }
        }
        
        if (textToSpeak.trim()) {
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
  }, [messages, voiceSettings, hotkeySettings, speakText, triggerHotkeys, parseTemplate]);

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
      // 发出全局音频状态变化事件
      window.dispatchEvent(new CustomEvent('globalAudioStateChange', { 
        detail: { effectId: null, isPlaying: false } 
      }));
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

      // 发出播放开始事件
      window.dispatchEvent(new CustomEvent('globalAudioStateChange', { 
        detail: { effectId: effect.id, isPlaying: true } 
      }));

      audio.onended = () => {
        globalAudioRef.current = null;
        // 发出播放结束事件
        window.dispatchEvent(new CustomEvent('globalAudioStateChange', { 
          detail: { effectId: null, isPlaying: false } 
        }));
      };

      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        globalAudioRef.current = null;
        // 发出播放错误事件
        window.dispatchEvent(new CustomEvent('globalAudioStateChange', { 
          detail: { effectId: null, isPlaying: false } 
        }));
      };

      // 开始播放
      await audio.play();

    } catch (error) {
      console.error('Failed to play sound:', error);
      globalAudioRef.current = null;
      // 发出播放错误事件
      window.dispatchEvent(new CustomEvent('globalAudioStateChange', { 
        detail: { effectId: null, isPlaying: false } 
      }));
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

  // 监听来自AudioSettingsPage的播放请求
  useEffect(() => {
    const handlePlaySoundRequest = (event: CustomEvent) => {
      const { effect } = event.detail;
      handlePlaySound(effect);
    };

    window.addEventListener('playSound', handlePlaySoundRequest as EventListener);

    return () => {
      window.removeEventListener('playSound', handlePlaySoundRequest as EventListener);
    };
  }, []);

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
