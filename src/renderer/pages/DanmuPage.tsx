import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Square, Wifi, WifiOff, Gift, Heart, Users, MessageCircle, ThumbsUp, Crown, Settings, X, Volume2, VolumeX, Keyboard, Plus, Trash2 } from 'lucide-react';

import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { disconnect, Message } from '../store/features/danmakuSlice';


import '../styles/themes.css';

const DanmuPage = () => {
  const dispatch: AppDispatch = useDispatch();

  // 从Redux store中获取状态
  const {
    connectStatus,
    roomInfo,
    messages,
    audienceList,
    messageStats
  } = useSelector((state: RootState) => state.danmaku);

  // 本地UI状态
  const [showSettings, setShowSettings] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState('voice'); // 'connection', 'voice', 'hotkey'
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

  // 断开连接
  const disconnectLive = useCallback(() => {
    dispatch(disconnect());
  }, [dispatch]);







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



  // 获取连接状态显示
  const getStatusDisplay = () => {
    switch (connectStatus) {
      case 0: return { text: '未连接', color: 'text-gray-400', icon: WifiOff };
      case 1: return { text: '已连接', color: 'text-green-400', icon: Wifi };
      case 2: return { text: '连接失败', color: 'text-red-400', icon: WifiOff };
      case 3: return { text: '已断开', color: 'text-yellow-400', icon: WifiOff };
      default: return { text: '未知', color: 'text-gray-400', icon: WifiOff };
    }
  };

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



  const statusDisplay = getStatusDisplay();
  const StatusIcon = statusDisplay.icon;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white dark:bg-slate-900 text-slate-800 dark:text-white transition-colors duration-300">
      
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-600">
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
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm p-4">
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
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium flex items-center text-slate-800 dark:text-white"><Crown size={18} className="mr-2 text-purple-400" />观众榜</h3>
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
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium flex items-center text-slate-800 dark:text-white"><MessageCircle size={18} className="mr-2 text-blue-400" />弹幕消息</h3>
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
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center mb-3"><h3 className="text-lg font-medium flex items-center text-slate-800 dark:text-white"><Users size={18} className="mr-2 text-green-400" />社交信息</h3></div>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg w-[800px] max-w-[90vw] max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-medium text-slate-800 dark:text-white">设置</h3>
              <button onClick={() => setShowSettings(false)} className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex h-[600px]">
              {/* 侧边栏选项卡 */}
              <div className="w-48 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 p-4">
                <nav className="space-y-2">
                  <button
                    onClick={() => setActiveSettingsTab('connection')}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center ${
                      activeSettingsTab === 'connection'
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Wifi size={16} className="mr-2" />
                    自动连接
                  </button>
                  <button
                    onClick={() => setActiveSettingsTab('voice')}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center ${
                      activeSettingsTab === 'voice'
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Volume2 size={16} className="mr-2" />
                    语音播报
                  </button>
                  <button
                    onClick={() => setActiveSettingsTab('hotkey')}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center ${
                      activeSettingsTab === 'hotkey'
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Keyboard size={16} className="mr-2" />
                    快捷键触控
                  </button>
                </nav>
              </div>
              
              {/* 内容区域 */}
              <div className="flex-1 overflow-y-auto p-6">
                {activeSettingsTab === 'connection' && (
                  <div className="space-y-4">
                    <div className="text-center py-8">
                      <div className="mb-4">
                        <Wifi size={48} className="mx-auto text-blue-500 dark:text-blue-400" />
                      </div>
                      <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-2">自动弹幕连接</h3>
                      <p className="text-slate-600 dark:text-slate-400 mb-4">弹幕系统已升级为自动连接模式</p>
                      <div className={`inline-flex items-center px-3 py-2 rounded-md text-sm ${statusDisplay.color}`}>
                        <StatusIcon size={16} className="mr-2" />
                        {statusDisplay.text}
                      </div>
                      {connectStatus === 1 && (
                        <div className="mt-4">
                          <button onClick={disconnectLive} className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors flex items-center justify-center mx-auto">
                            <Square size={16} className="mr-2" />手动断开
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">自动连接说明</h4>
                      <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                        <li>• 开始直播时自动连接弹幕（延迟12秒）</li>
                        <li>• 停止直播时自动断开弹幕</li>
                        <li>• 使用您的抖音用户信息自动获取房间号</li>
                      </ul>
                    </div>
                  </div>
                )}
                
                {activeSettingsTab === 'voice' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-medium text-slate-800 dark:text-white">语音播报设置</h4>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => saveVoiceSettings({ ...voiceSettings, enabled: !voiceSettings.enabled })}
                          className={`p-2 rounded-md transition-colors ${
                            voiceSettings.enabled
                              ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {voiceSettings.enabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                        </button>
                      </div>
                    </div>
                    
                    {voiceSettings.enabled && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2 text-slate-800 dark:text-white">声音选择</label>
                          <select
                            value={voiceSettings.voice}
                            onChange={(e) => saveVoiceSettings({ ...voiceSettings, voice: parseInt(e.target.value) })}
                            className="w-full bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 border border-slate-300 dark:border-slate-600"
                          >
                            {voices.map((voice, index) => (
                              <option key={index} value={index}>
                                {voice.name} ({voice.lang})
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2 text-slate-800 dark:text-white">语速: {voiceSettings.rate.toFixed(1)}</label>
                            <input
                              type="range"
                              min="0.1"
                              max="2"
                              step="0.1"
                              value={voiceSettings.rate}
                              onChange={(e) => saveVoiceSettings({ ...voiceSettings, rate: parseFloat(e.target.value) })}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2 text-slate-800 dark:text-white">音调: {voiceSettings.pitch.toFixed(1)}</label>
                            <input
                              type="range"
                              min="0"
                              max="2"
                              step="0.1"
                              value={voiceSettings.pitch}
                              onChange={(e) => saveVoiceSettings({ ...voiceSettings, pitch: parseFloat(e.target.value) })}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2 text-slate-800 dark:text-white">音量: {Math.round(voiceSettings.volume * 100)}%</label>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={voiceSettings.volume}
                              onChange={(e) => saveVoiceSettings({ ...voiceSettings, volume: parseFloat(e.target.value) })}
                              className="w-full"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="text-md font-medium mb-3 text-slate-800 dark:text-white">播报内容设置</h5>
                          <div className="space-y-3">
                            {(Object.entries(voiceSettings.events) as [string, VoiceEventConfig][]).map(([eventType, config]) => (
                              <div key={eventType} className="bg-slate-50 dark:bg-slate-700 p-3 rounded-md">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-slate-800 dark:text-white">
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
                                    className="w-4 h-4 text-blue-600 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500"
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
                                    className="w-full bg-white dark:bg-slate-600 text-slate-800 dark:text-white px-2 py-1 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 border border-slate-300 dark:border-slate-500"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <button
                            onClick={() => speakText('这是语音播报测试')}
                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
                          >
                            测试语音
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {activeSettingsTab === 'hotkey' && (
                  <div className="space-y-6">
                    <h4 className="text-lg font-medium text-slate-800 dark:text-white">快捷键触控设置</h4>
                    
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-md font-medium text-slate-800 dark:text-white">礼物触发快捷键</h5>
                        <button
                          onClick={() => {
                            const newTrigger = { giftName: '', keys: [] };
                            saveHotkeySettings({
                              ...hotkeySettings,
                              giftTriggers: [...hotkeySettings.giftTriggers, newTrigger]
                            });
                          }}
                          className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors flex items-center text-sm"
                        >
                          <Plus size={14} className="mr-1" />
                          添加
                        </button>
                      </div>
                      <div className="space-y-2">
                        {hotkeySettings.giftTriggers.map((trigger: any, index: number) => (
                          <div key={index} className="bg-slate-50 dark:bg-slate-700 p-3 rounded-md">
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={trigger.giftName}
                                onChange={(e) => {
                                  const newTriggers = [...hotkeySettings.giftTriggers];
                                  newTriggers[index].giftName = e.target.value;
                                  saveHotkeySettings({ ...hotkeySettings, giftTriggers: newTriggers });
                                }}
                                placeholder="礼物名称"
                                className="flex-1 bg-white dark:bg-slate-600 text-slate-800 dark:text-white px-2 py-1 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 border border-slate-300 dark:border-slate-500"
                              />
                              <span className="text-slate-600 dark:text-slate-400 px-2">→</span>
                              <input
                                type="text"
                                value={trigger.keys.join('+')}
                                readOnly
                                onClick={() => {
                                  setCurrentHotkeyEdit({ type: 'gift', index });
                                  setHotkeyModalOpen(true);
                                }}
                                placeholder="点击录制快捷键"
                                className="flex-1 bg-white dark:bg-slate-600 text-slate-800 dark:text-white px-2 py-1 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 border border-slate-300 dark:border-slate-500 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-500"
                              />
                              <button
                                onClick={() => {
                                  const newTriggers = hotkeySettings.giftTriggers.filter((_: any, i: number) => i !== index);
                                  saveHotkeySettings({ ...hotkeySettings, giftTriggers: newTriggers });
                                }}
                                className="p-1 text-red-500 hover:text-red-700 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-md font-medium text-slate-800 dark:text-white">关键词触发快捷键</h5>
                        <button
                          onClick={() => {
                            const newTrigger = { keyword: '', keys: [] };
                            saveHotkeySettings({
                              ...hotkeySettings,
                              keywordTriggers: [...hotkeySettings.keywordTriggers, newTrigger]
                            });
                          }}
                          className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors flex items-center text-sm"
                        >
                          <Plus size={14} className="mr-1" />
                          添加
                        </button>
                      </div>
                      <div className="space-y-2">
                        {hotkeySettings.keywordTriggers.map((trigger: any, index: number) => (
                          <div key={index} className="bg-slate-50 dark:bg-slate-700 p-3 rounded-md">
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={trigger.keyword}
                                onChange={(e) => {
                                  const newTriggers = [...hotkeySettings.keywordTriggers];
                                  newTriggers[index].keyword = e.target.value;
                                  saveHotkeySettings({ ...hotkeySettings, keywordTriggers: newTriggers });
                                }}
                                placeholder="关键词"
                                className="flex-1 bg-white dark:bg-slate-600 text-slate-800 dark:text-white px-2 py-1 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 border border-slate-300 dark:border-slate-500"
                              />
                              <span className="text-slate-600 dark:text-slate-400 px-2">→</span>
                              <input
                                type="text"
                                value={trigger.keys.join('+')}
                                readOnly
                                onClick={() => {
                                  setCurrentHotkeyEdit({ type: 'keyword', index });
                                  setHotkeyModalOpen(true);
                                }}
                                placeholder="点击录制快捷键"
                                className="flex-1 bg-white dark:bg-slate-600 text-slate-800 dark:text-white px-2 py-1 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 border border-slate-300 dark:border-slate-500 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-500"
                              />
                              <button
                                onClick={() => {
                                  const newTriggers = hotkeySettings.keywordTriggers.filter((_: any, i: number) => i !== index);
                                  saveHotkeySettings({ ...hotkeySettings, keywordTriggers: newTriggers });
                                }}
                                className="p-1 text-red-500 hover:text-red-700 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 w-96 max-w-full transition-colors border border-slate-200 dark:border-slate-700">
        <h3 className="text-slate-900 dark:text-white font-medium mb-3">设置快捷键</h3>
        <div className="mb-3">
          <div className="mb-3">
            <div className={`p-4 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded border text-center transition-colors ${isRecording ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-300 dark:border-slate-600'
              }`}>
              {currentHotkey ? (
                <div className="text-lg font-medium">{currentHotkey}</div>
              ) : (
                <div className="text-slate-500 dark:text-slate-400">
                  {isRecording ? "按下任意键盘组合键..." : "等待录制..."}
                </div>
              )}
            </div>
          </div>

          {isRecording && (
            <div className="text-xs text-blue-500 dark:text-blue-400 mb-2 animate-pulse text-center">
              🎯 正在录制快捷键，请按下键盘组合键...
            </div>
          )}

          <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
            <div>💡 支持：F1-F12, Ctrl+A, Alt+F1, Shift+Space, 小键盘 等</div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            className="bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-white px-4 py-1 rounded hover:bg-slate-400 dark:hover:bg-slate-600 transition-colors"
            onClick={() => {
              resetState();
              onClose();
            }}
          >
            取消
          </button>
          <button
            className="bg-blue-600 text-white px-4 py-1 rounded disabled:bg-slate-400 dark:disabled:bg-slate-600 hover:bg-blue-700 transition-colors"
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
