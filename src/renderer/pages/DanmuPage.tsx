import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Gift, Heart, Users, MessageCircle, ThumbsUp, Crown, Settings, X, Volume2, VolumeX, Keyboard, Plus, Trash2 } from 'lucide-react';

import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { Message } from '../store/features/danmakuSlice';


import '../styles/themes.css';

const DanmuPage = () => {
  // 从Redux store中获取状态
  const {
    roomInfo,
    messages,
    audienceList,
    messageStats
  } = useSelector((state: RootState) => state.danmaku);

  // 本地UI状态
  const [showSettings, setShowSettings] = useState(false);
  const [hotkeyModalOpen, setHotkeyModalOpen] = useState(false);
  const [currentHotkeyEdit, setCurrentHotkeyEdit] = useState<{type: 'gift' | 'keyword', index: number} | null>(null);

  // 语音播报设置状态
  const [voiceSettings, setVoiceSettings] = useState(() => {
    const saved = localStorage.getItem('voiceSettings');
    return saved ? JSON.parse(saved) : {
      enabled: false,
      voice: 0, // 声音选择索引
      rate: 1, // 语速 0.1-10
      pitch: 1, // 音调 0-2
      volume: 1, // 音量 0-1
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
      giftTriggers: [], // { giftName: string, keys: string[] }[]
      keywordTriggers: [] // { keyword: string, keys: string[] }[]
    };
  });

  // 语音合成相关
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const speechSynthesis = window.speechSynthesis;

  // 类型定义
  interface VoiceEventConfig {
    enabled: boolean;
    prefix: string;
  }

  // 消息过滤器状态
  const [messageFilters, setMessageFilters] = useState(() => {
    const saved = localStorage.getItem('messageFilters');
    return saved ? JSON.parse(saved) : {
      chat: true,
      gift: true,
      follow: true,
      like: true,
      member: true
    };
  });

  const allMessagesScrollRef = useRef<HTMLDivElement>(null);
  const socialMessagesScrollRef = useRef<HTMLDivElement>(null);

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

  // 语音测试函数（仅用于设置测试，不干扰全局播报）
  const speakText = useCallback((text: string) => {
    if (!voiceSettings.enabled || !text.trim()) return;
    
    // 创建单独的语音实例，不使用cancel()避免干扰全局播报
    const utterance = new SpeechSynthesisUtterance(text);
    
    if (voices.length > 0 && voices[voiceSettings.voice]) {
      utterance.voice = voices[voiceSettings.voice];
    }
    
    utterance.rate = voiceSettings.rate;
    utterance.pitch = voiceSettings.pitch;
    utterance.volume = voiceSettings.volume;
    
    // 直接播放，不调用cancel()
    speechSynthesis.speak(utterance);
  }, [voiceSettings, voices, speechSynthesis]);



  // 保存设置到localStorage
  const saveVoiceSettings = useCallback((newSettings: typeof voiceSettings) => {
    setVoiceSettings(newSettings);
    localStorage.setItem('voiceSettings', JSON.stringify(newSettings));
    // 通知全局更新
    window.dispatchEvent(new CustomEvent('voiceSettingsUpdated'));
  }, []);

  const saveHotkeySettings = useCallback((newSettings: typeof hotkeySettings) => {
    setHotkeySettings(newSettings);
    localStorage.setItem('hotkeySettings', JSON.stringify(newSettings));
    // 通知全局更新
    window.dispatchEvent(new CustomEvent('hotkeySettingsUpdated'));
  }, []);

  // 处理快捷键录制
  const handleSetHotkey = useCallback((hotkey: string) => {
    if (!currentHotkeyEdit) return;
    
    const { type, index } = currentHotkeyEdit;
    const keys = hotkey.split('+').filter(key => key.trim());
    
    if (type === 'gift') {
      const newTriggers = [...hotkeySettings.giftTriggers];
      newTriggers[index].keys = keys;
      saveHotkeySettings({ ...hotkeySettings, giftTriggers: newTriggers });
    } else if (type === 'keyword') {
      const newTriggers = [...hotkeySettings.keywordTriggers];
      newTriggers[index].keys = keys;
      saveHotkeySettings({ ...hotkeySettings, keywordTriggers: newTriggers });
    }
    
    setCurrentHotkeyEdit(null);
  }, [currentHotkeyEdit, hotkeySettings, saveHotkeySettings]);









  // 处理消息过滤器变化
    const handleFilterChange = useCallback((filterType: keyof typeof messageFilters, enabled: boolean) => {
    const newFilters = { ...messageFilters, [filterType]: enabled };
    setMessageFilters(newFilters);
    localStorage.setItem('messageFilters', JSON.stringify(newFilters));
  }, [messageFilters]);

  // 从 Redux state 过滤消息
  const filteredAllMessages = useMemo(() => {
    return messages
      .filter(msg => {
        if (msg.type === 'chat') return messageFilters.chat;
        if (msg.type === 'gift') return messageFilters.gift;
        return false;
      })
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }, [messages, messageFilters]);

  const filteredSocialMessages = useMemo(() => {
    return messages.filter(msg => {
      if (msg.type === 'follow') return messageFilters.follow;
      if (msg.type === 'like') return messageFilters.like;
      if (msg.type === 'member') return messageFilters.member;
      return false;
    });
  }, [messages, messageFilters]);





  // 自动滚动到底部
  useEffect(() => {
    if (allMessagesScrollRef.current) {
      allMessagesScrollRef.current.scrollTop = allMessagesScrollRef.current.scrollHeight;
    }
  }, [filteredAllMessages]);

  // 社交消息自动滚动到底部
  useEffect(() => {
    if (socialMessagesScrollRef.current) {
      socialMessagesScrollRef.current.scrollTop = socialMessagesScrollRef.current.scrollHeight;
    }
  }, [filteredSocialMessages]);





  return (
    <div className="h-full flex flex-col overflow-hidden theme-page transition-colors duration-300">
      
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0 theme-card-secondary border-b">
        <div className="flex items-center">
          <div className="flex items-center space-x-4 text-sm">
            <label className="flex items-center cursor-pointer text-blue-400 hover:text-blue-300 transition-colors">
              <input type="checkbox" checked={messageFilters.chat} onChange={(e) => handleFilterChange('chat', e.target.checked)} className="mr-2 w-4 h-4 text-blue-600 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500" />
              <MessageCircle size={16} className="mr-1" />
              聊天: {messageStats.chatCount}
            </label>
            <label className="flex items-center cursor-pointer text-pink-400 hover:text-pink-300 transition-colors">
              <input type="checkbox" checked={messageFilters.gift} onChange={(e) => handleFilterChange('gift', e.target.checked)} className="mr-2 w-4 h-4 text-pink-600 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-pink-500" />
              <Gift size={16} className="mr-1" />
              礼物: {messageStats.giftCount}
            </label>
            <label className="flex items-center cursor-pointer text-red-400 hover:text-red-300 transition-colors">
              <input type="checkbox" checked={messageFilters.follow} onChange={(e) => handleFilterChange('follow', e.target.checked)} className="mr-2 w-4 h-4 text-red-600 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-red-500" />
              <Heart size={16} className="mr-1" />
              关注: {messageStats.followCount}
            </label>
            <label className="flex items-center cursor-pointer text-yellow-400 hover:text-yellow-300 transition-colors">
              <input type="checkbox" checked={messageFilters.like} onChange={(e) => handleFilterChange('like', e.target.checked)} className="mr-2 w-4 h-4 text-yellow-600 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-yellow-500" />
              <ThumbsUp size={16} className="mr-1" />
              点赞: {messageStats.likeActionCount}
            </label>
            <label className="flex items-center cursor-pointer text-green-400 hover:text-green-300 transition-colors">
              <input type="checkbox" checked={messageFilters.member} onChange={(e) => handleFilterChange('member', e.target.checked)} className="mr-2 w-4 h-4 text-green-600 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-green-500" />
              <Users size={16} className="mr-1" />
              进入: {messageStats.memberCount}
            </label>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => setShowSettings(true)} className="flex items-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors px-3 py-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600" title="设置">
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0 overflow-hidden p-6">
        <div className="col-span-3 flex flex-col space-y-4 h-full overflow-hidden">
          <div className="theme-card rounded-lg p-4">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-slate-200 dark:bg-slate-600 rounded-full mx-auto mb-2 flex items-center justify-center border border-slate-300 dark:border-slate-500">
                {roomInfo.avatar ? <img src={roomInfo.avatar} alt="头像" className="w-full h-full rounded-full" /> : <span className="text-slate-500 dark:text-slate-400">头像</span>}
              </div>
              <h3 className="font-medium text-slate-800 dark:text-white">{roomInfo.nickname}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{roomInfo.title}</p>
            </div>
            <div className="border-b border-slate-200 dark:border-slate-700 my-4"></div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-center"><div className="text-slate-600 dark:text-slate-300">关注</div><div className="font-medium text-slate-800 dark:text-white">{roomInfo.followCount}</div></div>
              <div className="text-center"><div className="text-slate-600 dark:text-slate-300">观众</div><div className="font-medium text-slate-800 dark:text-white">{roomInfo.memberCount}</div></div>
              <div className="text-center"><div className="text-slate-600 dark:text-slate-300">总观看</div><div className="font-medium text-slate-800 dark:text-white">{roomInfo.userCount}</div></div>
              <div className="text-center"><div className="text-slate-600 dark:text-slate-300">点赞</div><div className="font-medium text-slate-800 dark:text-white">{roomInfo.likeCount}</div></div>
            </div>
          </div>
          <div className="theme-card rounded-lg p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium flex items-center"><Crown size={18} className="mr-2 text-purple-400" />观众榜</h3>
              <span className="text-sm text-slate-500 dark:text-slate-400">{audienceList.length} 人</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 min-h-0 custom-scrollbar">
              {audienceList.slice(0, 100).map((audience, index) => (
                <div key={`audience-${audience.nickname || 'anonymous'}-${audience.rank || index + 1}-${index}`} className="text-sm text-slate-600 dark:text-slate-300">
                  {audience.rank || index + 1}. {audience.nickname || '匿名观众'}
                </div>
              ))}
              {audienceList.length === 0 && <div className="text-center text-slate-500 dark:text-slate-400 py-8">暂无观众数据</div>}
            </div>
          </div>
        </div>

        <div className="col-span-6 flex flex-col h-full overflow-hidden">
          <div className="theme-card rounded-lg p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium flex items-center"><MessageCircle size={18} className="mr-2 text-blue-400" />弹幕消息</h3>
              <div className="flex items-center space-x-4 text-sm">
                <span className="text-blue-400">聊天: {messageStats.chatCount}</span>
                <span className="text-pink-400">礼物: {messageStats.giftCount}</span>
                <span className="text-slate-600 dark:text-slate-400">显示: {filteredAllMessages.length}</span>
              </div>
            </div>
            <div ref={allMessagesScrollRef} className="flex-1 overflow-y-auto space-y-1 min-h-0 custom-scrollbar">
                            {filteredAllMessages.map((msg: Message) => (
                <div key={msg.id} className="flex items-start space-x-1.5">
                  {msg.type === 'chat' ? (
                    <>
                      <div className="w-6 h-6 bg-blue-100 dark:bg-blue-500 text-blue-600 dark:text-white rounded-full flex-shrink-0 flex items-center justify-center text-xs">{msg.user.name[0]}</div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-blue-400 text-sm font-medium">{msg.user.name}</span>
                          <span className="text-slate-500 dark:text-slate-400 text-xs">{new Date(msg.time).toLocaleTimeString()}</span>
                        </div>
                        <div className="text-slate-800 dark:text-white">{msg.content}</div>
                      </div>
                    </>
                  ) : msg.type === 'gift' ? (
                    <>
                      <div className="w-6 h-6 bg-pink-100 dark:bg-pink-500 text-pink-600 dark:text-white rounded-full flex-shrink-0 flex items-center justify-center text-xs"><Gift size={12} /></div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-pink-400 text-sm font-medium">{msg.user.name}</span>
                          <span className="text-slate-500 dark:text-slate-400 text-xs">{new Date(msg.time).toLocaleTimeString()}</span>
                        </div>
                        <div className="text-slate-800 dark:text-white">送出了 <span className="text-pink-300">{msg.gift.name}</span> x{msg.gift.count}<span className="text-yellow-400 ml-2">({msg.gift.price} 抖币)</span></div>
                      </div>
                    </>
                  ) : null}
                </div>
              ))}
              {filteredAllMessages.length === 0 && <div className="text-center text-slate-500 dark:text-slate-400 py-8">{messages.length === 0 ? '暂无弹幕消息' : '没有符合过滤条件的弹幕消息'}</div>}
            </div>
          </div>
        </div>

        <div className="col-span-3 flex flex-col h-full overflow-hidden">
          <div className="theme-card rounded-lg p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center mb-3"><h3 className="text-lg font-medium flex items-center"><Users size={18} className="mr-2 text-green-400" />社交信息</h3></div>
            <div ref={socialMessagesScrollRef} className="flex-1 overflow-y-auto space-y-1 min-h-0 custom-scrollbar">
                            {filteredSocialMessages.map((msg: Message) => (
                <div key={msg.id} className="flex items-start space-x-1.5">
                  <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs ${
                    msg.type === 'follow' 
                      ? 'bg-red-100 dark:bg-red-500 text-red-600 dark:text-white'
                      : msg.type === 'like' 
                      ? 'bg-yellow-100 dark:bg-yellow-500 text-yellow-600 dark:text-white'
                      : msg.type === 'member' 
                      ? 'bg-green-100 dark:bg-green-500 text-green-600 dark:text-white'
                      : 'bg-gray-100 dark:bg-gray-500 text-gray-600 dark:text-white'
                  }`}>
                    {msg.type === 'follow' ? <Heart size={12} /> : msg.type === 'like' ? <ThumbsUp size={12} /> : msg.type === 'member' ? <Users size={12} /> : '?'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-1.5">
                      <span className={`text-sm font-medium ${msg.type === 'follow' ? 'text-red-400' : msg.type === 'like' ? 'text-yellow-400' : msg.type === 'member' ? 'text-green-400' : 'text-slate-400'}`}>{msg.user.name}</span>
                      <span className="text-slate-500 dark:text-slate-400 text-xs">{new Date(msg.time).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-slate-800 dark:text-white">{'content' in msg && msg.content}</div>
                  </div>
                </div>
              ))}
              {filteredSocialMessages.length === 0 && <div className="text-center text-slate-500 dark:text-slate-400 py-8">{messages.filter(m => ['follow', 'like', 'member'].includes(m.type)).length === 0 ? '暂无社交消息' : '没有符合过滤条件的社交消息'}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* 设置弹窗 */}
      {showSettings && (
        <div className="modal-overlay" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
          <div className="modal-content" style={{ maxWidth: '900px', width: '95vw', maxHeight: '85vh', padding: '0', borderRadius: '12px' }}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center">
                <Settings size={24} className="mr-3" style={{color: 'var(--btn-primary-bg)'}} />
                设置
              </h3>
              <button 
                onClick={() => setShowSettings(false)} 
                className="modal-close-btn"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="h-[600px]">
              {/* 内容区域 - 合并设置到一个页面 */}
              
                             <div className="p-6 overflow-y-auto h-full custom-scrollbar">
                <div className="space-y-8">
                  {/* 语音播报设置区域 */}
                  <div className="theme-card rounded-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-3">
                        <Volume2 size={24} className="text-blue-500" />
                        <h4 className="text-xl font-medium text-primary">语音播报设置</h4>
                  </div>
                        <button
                          onClick={() => saveVoiceSettings({ ...voiceSettings, enabled: !voiceSettings.enabled })}
                        className={`btn-base ${
                            voiceSettings.enabled
                              ? 'btn-primary'
                              : 'btn-secondary'
                          }`}
                        >
                          {voiceSettings.enabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                        </button>
                    </div>
                    
                    {voiceSettings.enabled && (
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium mb-3 text-primary">声音选择</label>
                          <select
                            value={voiceSettings.voice}
                            onChange={(e) => saveVoiceSettings({ ...voiceSettings, voice: parseInt(e.target.value) })}
                            className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 theme-card"
                          >
                            {voices.map((voice, index) => (
                              <option key={index} value={index}>
                                {voice.name} ({voice.lang})
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-6">
                          <div>
                            <label className="block text-sm font-medium mb-3 text-primary">语速: {voiceSettings.rate.toFixed(1)}</label>
                            <input
                              type="range"
                              min="0.1"
                              max="2"
                              step="0.1"
                              value={voiceSettings.rate}
                              onChange={(e) => saveVoiceSettings({ ...voiceSettings, rate: parseFloat(e.target.value) })}
                              className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer"
                              style={{
                                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(voiceSettings.rate - 0.1) / (2 - 0.1) * 100}%, #e2e8f0 ${(voiceSettings.rate - 0.1) / (2 - 0.1) * 100}%, #e2e8f0 100%)`
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-3 text-primary">音调: {voiceSettings.pitch.toFixed(1)}</label>
                            <input
                              type="range"
                              min="0"
                              max="2"
                              step="0.1"
                              value={voiceSettings.pitch}
                              onChange={(e) => saveVoiceSettings({ ...voiceSettings, pitch: parseFloat(e.target.value) })}
                              className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer"
                              style={{
                                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${voiceSettings.pitch / 2 * 100}%, #e2e8f0 ${voiceSettings.pitch / 2 * 100}%, #e2e8f0 100%)`
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-3 text-primary">音量: {Math.round(voiceSettings.volume * 100)}%</label>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.01"
                              value={voiceSettings.volume}
                              onChange={(e) => saveVoiceSettings({ ...voiceSettings, volume: parseFloat(e.target.value) })}
                              className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer"
                              style={{
                                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${voiceSettings.volume * 100}%, #e2e8f0 ${voiceSettings.volume * 100}%, #e2e8f0 100%)`,
                                WebkitAppearance: 'none',
                                outline: 'none'
                              }}
                            />
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="text-lg font-medium mb-4 text-primary">播报内容设置</h5>
                          <div className="grid grid-cols-2 gap-4">
                            {(Object.entries(voiceSettings.events) as [string, VoiceEventConfig][]).map(([eventType, config]) => (
                              <div key={eventType} className="theme-card-secondary p-4 rounded-lg">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-sm font-medium text-primary">
                                    {eventType === 'chat' && '聊天消息'}
                                    {eventType === 'gift' && '礼物'}
                                    {eventType === 'follow' && '关注'}
                                    {eventType === 'like' && '点赞'}
                                    {eventType === 'member' && '进入直播间'}
                                  </span>
                                  <input
                                    type="checkbox"
                                    checked={config.enabled}
                                    onChange={(e) => saveVoiceSettings({
                                      ...voiceSettings,
                                      events: {
                                        ...voiceSettings.events,
                                        [eventType]: { ...config, enabled: e.target.checked }
                                      }
                                    })}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                  />
                                </div>
                                {config.enabled && (
                                  <input
                                    type="text"
                                    value={config.prefix}
                                    onChange={(e) => saveVoiceSettings({
                                      ...voiceSettings,
                                      events: {
                                        ...voiceSettings.events,
                                        [eventType]: { ...config, prefix: e.target.value }
                                      }
                                    })}
                                    placeholder="前缀词"
                                    className="w-full px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 theme-card"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex justify-center">
                          <button
                            onClick={() => speakText('这是语音播报测试')}
                            className="btn-base btn-primary flex items-center"
                          >
                            <Volume2 size={18} className="mr-2" />
                            测试语音
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* 分隔线 */}
                  <div className="flex items-center my-8">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent"></div>
                    <span className="px-4 text-sm rounded-full border theme-card text-secondary">
                      ⚙️ 快捷键设置
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent"></div>
                  </div>
                  
                  {/* 快捷键触控设置区域 */}
                  <div className="theme-card rounded-lg p-6">
                    <div className="flex items-center space-x-3 mb-6">
                      <Keyboard size={24} className="text-blue-500" />
                      <h4 className="text-xl font-medium text-primary">快捷键触控设置</h4>
                    </div>
                    
                  <div className="space-y-6">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                          <h5 className="text-lg font-medium text-primary">礼物触发快捷键</h5>
                        <button
                          onClick={() => {
                            const newTrigger = { giftName: '', keys: [] };
                            saveHotkeySettings({
                              ...hotkeySettings,
                              giftTriggers: [...hotkeySettings.giftTriggers, newTrigger]
                            });
                          }}
                            className="btn-base btn-primary flex items-center text-sm"
                        >
                            <Plus size={16} className="mr-2" />
                          添加
                        </button>
                      </div>
                        <div className="space-y-3">
                        {hotkeySettings.giftTriggers.map((trigger: any, index: number) => (
                            <div key={index} className="theme-card-secondary p-4 rounded-lg">
                              <div className="flex items-center space-x-3">
                              <input
                                type="text"
                                value={trigger.giftName}
                                onChange={(e) => {
                                  const newTriggers = [...hotkeySettings.giftTriggers];
                                  newTriggers[index].giftName = e.target.value;
                                  saveHotkeySettings({ ...hotkeySettings, giftTriggers: newTriggers });
                                }}
                                placeholder="礼物名称"
                                  className="flex-1 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 theme-card"
                              />
                              <span className="text-secondary px-2">→</span>
                              <input
                                type="text"
                                value={trigger.keys.join('+')}
                                readOnly
                                onClick={() => {
                                  setCurrentHotkeyEdit({ type: 'gift', index });
                                  setHotkeyModalOpen(true);
                                }}
                                placeholder="点击录制快捷键"
                                  className="flex-1 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 theme-card cursor-pointer transition-colors"
                              />
                              <button
                                onClick={() => {
                                  const newTriggers = hotkeySettings.giftTriggers.filter((_: any, i: number) => i !== index);
                                  saveHotkeySettings({ ...hotkeySettings, giftTriggers: newTriggers });
                                }}
                                  className="p-2 text-red-500 hover:text-red-700 rounded-md transition-colors btn-ghost"
                              >
                                  <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                        <div className="flex items-center justify-between mb-4">
                          <h5 className="text-lg font-medium text-primary">关键词触发快捷键</h5>
                        <button
                          onClick={() => {
                            const newTrigger = { keyword: '', keys: [] };
                            saveHotkeySettings({
                              ...hotkeySettings,
                              keywordTriggers: [...hotkeySettings.keywordTriggers, newTrigger]
                            });
                          }}
                            className="btn-base btn-primary flex items-center text-sm"
                        >
                            <Plus size={16} className="mr-2" />
                          添加
                        </button>
                      </div>
                        <div className="space-y-3">
                        {hotkeySettings.keywordTriggers.map((trigger: any, index: number) => (
                            <div key={index} className="theme-card-secondary p-4 rounded-lg">
                              <div className="flex items-center space-x-3">
                              <input
                                type="text"
                                value={trigger.keyword}
                                onChange={(e) => {
                                  const newTriggers = [...hotkeySettings.keywordTriggers];
                                  newTriggers[index].keyword = e.target.value;
                                  saveHotkeySettings({ ...hotkeySettings, keywordTriggers: newTriggers });
                                }}
                                placeholder="关键词"
                                  className="flex-1 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 theme-card"
                              />
                              <span className="text-secondary px-2">→</span>
                              <input
                                type="text"
                                value={trigger.keys.join('+')}
                                readOnly
                                onClick={() => {
                                  setCurrentHotkeyEdit({ type: 'keyword', index });
                                  setHotkeyModalOpen(true);
                                }}
                                placeholder="点击录制快捷键"
                                  className="flex-1 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 theme-card cursor-pointer transition-colors"
                              />
                              <button
                                onClick={() => {
                                  const newTriggers = hotkeySettings.keywordTriggers.filter((_: any, i: number) => i !== index);
                                  saveHotkeySettings({ ...hotkeySettings, keywordTriggers: newTriggers });
                                }}
                                  className="p-2 text-red-500 hover:text-red-700 rounded-md transition-colors btn-ghost"
                              >
                                  <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 快捷键录制模态框 */}
      <HotkeyRecordingModal
        isOpen={hotkeyModalOpen}
        onClose={() => {
          setHotkeyModalOpen(false);
          setCurrentHotkeyEdit(null);
        }}
        onApply={handleSetHotkey}
      />
    </div>
  );
};

// 快捷键录制模态框组件
interface HotkeyRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (hotkey: string) => void;
}

const HotkeyRecordingModal: React.FC<HotkeyRecordingModalProps> = ({ isOpen, onClose, onApply }) => {
  const [currentHotkey, setCurrentHotkey] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  // 打开模态框时自动开始录制
  useEffect(() => {
    if (isOpen) {
      setIsRecording(true);
      setCurrentHotkey('');
    }
  }, [isOpen]);

  // 使用全局键盘事件监听
  useEffect(() => {
    if (!isRecording || !isOpen) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // 忽略单独的修饰键
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
        return;
      }

      const keys: string[] = [];

      // 按固定顺序添加修饰键
      if (e.ctrlKey) keys.push('Ctrl');
      if (e.altKey) keys.push('Alt');
      if (e.shiftKey) keys.push('Shift');
      if (e.metaKey) keys.push('Meta');

      // 处理主键
      let keyName = e.key;
      
      // 处理小键盘按键
      if (e.code.startsWith('Numpad')) {
        if (e.code === 'NumpadEnter') keyName = 'NumpadEnter';
        else if (e.code === 'NumpadAdd') keyName = 'NumpadAdd';
        else if (e.code === 'NumpadSubtract') keyName = 'NumpadSubtract';
        else if (e.code === 'NumpadMultiply') keyName = 'NumpadMultiply';
        else if (e.code === 'NumpadDivide') keyName = 'NumpadDivide';
        else if (e.code === 'NumpadDecimal') keyName = 'NumpadDecimal';
        else if (e.code.match(/^Numpad\d$/)) {
          // Numpad0-Numpad9
          keyName = e.code; // 保持 Numpad0, Numpad1, ... Numpad9
        }
      }
      // 处理其他特殊键
      else if (keyName === ' ') keyName = 'Space';
      else if (keyName === 'ArrowUp') keyName = 'Up';
      else if (keyName === 'ArrowDown') keyName = 'Down';
      else if (keyName === 'ArrowLeft') keyName = 'Left';
      else if (keyName === 'ArrowRight') keyName = 'Right';
      else if (keyName === 'Enter') keyName = 'Enter';
      else if (keyName === 'Escape') keyName = 'Escape';
      else if (keyName === 'Tab') keyName = 'Tab';
      else if (keyName === 'Backspace') keyName = 'Backspace';
      else if (keyName === 'Delete') keyName = 'Delete';
      else if (keyName.startsWith('F') && keyName.length <= 3) keyName = keyName; // F1-F12
      else if (keyName.length === 1) keyName = keyName.toUpperCase();

      keys.push(keyName);

      const hotkeyString = keys.join('+');
      setCurrentHotkey(hotkeyString);

      // 自动停止录制
      setIsRecording(false);
    };

    // 添加全局事件监听器，使用 capture 模式确保优先捕获
    document.addEventListener('keydown', handleGlobalKeyDown, { capture: true });

    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
    };
  }, [isRecording, isOpen]);

  const resetState = () => {
    setCurrentHotkey('');
    setIsRecording(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="theme-card rounded-lg p-4 w-96 max-w-full transition-colors">
        <h3 className="modal-title">设置快捷键</h3>
        <div className="mb-3">
          <div className="mb-3">
            <div className={`p-4 rounded border text-center transition-colors theme-card ${
                isRecording ? 'border-blue-500' : ''
              }`}>
              {currentHotkey ? (
                <div className="text-lg font-medium">{currentHotkey}</div>
              ) : (
                <div className="text-secondary">
                  {isRecording ? "按下任意键盘组合键..." : "等待录制..."}
                </div>
              )}
            </div>
          </div>

          {isRecording && (
            <div className="text-xs text-blue-500 mb-2 animate-pulse text-center">
              🎯 正在录制快捷键，请按下键盘组合键...
            </div>
          )}

          <div className="text-xs text-secondary text-center">
            <div>💡 支持：F1-F12, Ctrl+A, Alt+F1, Shift+Space, 小键盘 等</div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            className="btn-base btn-secondary"
            onClick={() => {
              resetState();
              onClose();
            }}
          >
            取消
          </button>
          <button
            className="btn-base btn-primary"
            disabled={!currentHotkey.trim()}
            onClick={() => {
              onApply(currentHotkey.trim());
              resetState();
              onClose();
            }}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
};

export default DanmuPage;
