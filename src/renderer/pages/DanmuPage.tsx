import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, Play, Square, Wifi, WifiOff, Gift, Heart, Users, MessageCircle, ThumbsUp, Crown, Settings, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { connect, disconnect, setRoomNum as setStoreRoomNum, Message } from '../store/features/danmakuSlice';

const DanmuPage = () => {
  const navigate = useNavigate();
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
  const [localRoomNum, setLocalRoomNum] = useState('');
  const [showSettings, setShowSettings] = useState(false);

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

  // 验证房间号
    const verifyRoomNumber = useCallback((value: string) => {
    const roomNumRegex = /^\d+$/;
    const flag = roomNumRegex.test(value) && value.length > 0;
    return flag ? { flag, message: '' } : { flag, message: '房间号错误' };
  }, []);

  // 连接房间
  const connectLive = useCallback(() => {
    const validation = verifyRoomNumber(localRoomNum);
    if (!validation.flag) {
      alert(validation.message);
      return;
    }
    dispatch(setStoreRoomNum(localRoomNum));
    dispatch(connect(localRoomNum));
  }, [localRoomNum, dispatch, verifyRoomNumber]);

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
    <div className="h-[calc(100vh-40px)] bg-gray-900 text-white flex flex-col overflow-hidden">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
          margin: 0;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #64748b;
          border-radius: 1px;
          margin: 0;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .custom-scrollbar::-webkit-scrollbar-corner {
          background: transparent;
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #64748b transparent;
          margin-right: 0;
          padding-right: 0;
        }
      `}</style>
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/app')}
            className="flex items-center text-gray-300 hover:text-white transition-colors mr-4"
          >
            <ArrowLeft size={20} className="mr-2" />
            返回主页
          </button>
          <div className="flex items-center space-x-4 text-sm">
            <label className="flex items-center cursor-pointer text-blue-400 hover:text-blue-300 transition-colors">
              <input type="checkbox" checked={messageFilters.chat} onChange={(e) => handleFilterChange('chat', e.target.checked)} className="mr-2 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500" />
              <MessageCircle size={16} className="mr-1" />
              聊天: {messageStats.chatCount}
            </label>
            <label className="flex items-center cursor-pointer text-pink-400 hover:text-pink-300 transition-colors">
              <input type="checkbox" checked={messageFilters.gift} onChange={(e) => handleFilterChange('gift', e.target.checked)} className="mr-2 w-4 h-4 text-pink-600 bg-gray-700 border-gray-600 rounded focus:ring-pink-500" />
              <Gift size={16} className="mr-1" />
              礼物: {messageStats.giftCount}
            </label>
            <label className="flex items-center cursor-pointer text-red-400 hover:text-red-300 transition-colors">
              <input type="checkbox" checked={messageFilters.follow} onChange={(e) => handleFilterChange('follow', e.target.checked)} className="mr-2 w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500" />
              <Heart size={16} className="mr-1" />
              关注: {messageStats.followCount}
            </label>
            <label className="flex items-center cursor-pointer text-yellow-400 hover:text-yellow-300 transition-colors">
              <input type="checkbox" checked={messageFilters.like} onChange={(e) => handleFilterChange('like', e.target.checked)} className="mr-2 w-4 h-4 text-yellow-600 bg-gray-700 border-gray-600 rounded focus:ring-yellow-500" />
              <ThumbsUp size={16} className="mr-1" />
              点赞: {messageStats.likeActionCount}
            </label>
            <label className="flex items-center cursor-pointer text-green-400 hover:text-green-300 transition-colors">
              <input type="checkbox" checked={messageFilters.member} onChange={(e) => handleFilterChange('member', e.target.checked)} className="mr-2 w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500" />
              <Users size={16} className="mr-1" />
              进入: {messageStats.memberCount}
            </label>
          </div>
        </div>
        <div className="flex items-center">
          <button onClick={() => setShowSettings(true)} className="flex items-center text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-md hover:bg-slate-700" title="设置">
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0 overflow-hidden px-4 pb-4">
        <div className="col-span-3 flex flex-col space-y-4 h-full overflow-hidden">
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-gray-600 rounded-full mx-auto mb-2 flex items-center justify-center">
                {roomInfo.avatar ? <img src={roomInfo.avatar} alt="头像" className="w-full h-full rounded-full" /> : <span className="text-gray-400">头像</span>}
              </div>
              <h3 className="font-medium">{roomInfo.nickname}</h3>
              <p className="text-sm text-gray-400 truncate">{roomInfo.title}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-center"><div className="text-gray-400">关注</div><div className="font-medium">{roomInfo.followCount}</div></div>
              <div className="text-center"><div className="text-gray-400">观众</div><div className="font-medium">{roomInfo.memberCount}</div></div>
              <div className="text-center"><div className="text-gray-400">总观看</div><div className="font-medium">{roomInfo.userCount}</div></div>
              <div className="text-center"><div className="text-gray-400">点赞</div><div className="font-medium">{roomInfo.likeCount}</div></div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-lg p-2 flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium flex items-center"><Crown size={18} className="mr-2 text-purple-400" />观众榜</h3>
              <span className="text-sm text-gray-400">{audienceList.length} 人</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 min-h-0 custom-scrollbar">
              {audienceList.slice(0, 100).map((audience, index) => (
                <div key={`audience-${audience.nickname || 'anonymous'}-${audience.rank || index + 1}-${index}`} className="text-sm text-gray-300">
                  {audience.rank || index + 1}. {audience.nickname || '匿名观众'}
                </div>
              ))}
              {audienceList.length === 0 && <div className="text-center text-gray-500 py-8">暂无观众数据</div>}
            </div>
          </div>
        </div>

        <div className="col-span-6 flex flex-col h-full overflow-hidden">
          <div className="bg-slate-800 rounded-lg p-2 flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium flex items-center"><MessageCircle size={18} className="mr-2 text-blue-400" />弹幕消息</h3>
              <div className="flex items-center space-x-4 text-sm">
                <span className="text-blue-400">聊天: {messageStats.chatCount}</span>
                <span className="text-pink-400">礼物: {messageStats.giftCount}</span>
                <span className="text-gray-400">显示: {filteredAllMessages.length}</span>
              </div>
            </div>
            <div ref={allMessagesScrollRef} className="flex-1 overflow-y-auto space-y-1 min-h-0 custom-scrollbar">
                            {filteredAllMessages.map((msg: Message) => (
                <div key={msg.id} className="flex items-start space-x-1.5">
                  {msg.type === 'chat' ? (
                    <>
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex-shrink-0 flex items-center justify-center text-xs">{msg.user.name[0]}</div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-blue-400 text-sm font-medium">{msg.user.name}</span>
                          <span className="text-gray-500 text-xs">{new Date(msg.time).toLocaleTimeString()}</span>
                        </div>
                        <div className="text-white">{msg.content}</div>
                      </div>
                    </>
                  ) : msg.type === 'gift' ? (
                    <>
                      <div className="w-6 h-6 bg-pink-500 rounded-full flex-shrink-0 flex items-center justify-center text-xs"><Gift size={12} /></div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-pink-400 text-sm font-medium">{msg.user.name}</span>
                          <span className="text-gray-500 text-xs">{new Date(msg.time).toLocaleTimeString()}</span>
                        </div>
                        <div className="text-white">送出了 <span className="text-pink-300">{msg.gift.name}</span> x{msg.gift.count}<span className="text-yellow-400 ml-2">({msg.gift.price} 抖币)</span></div>
                      </div>
                    </>
                  ) : null}
                </div>
              ))}
              {filteredAllMessages.length === 0 && <div className="text-center text-gray-500 py-8">{messages.length === 0 ? '暂无弹幕消息' : '没有符合过滤条件的弹幕消息'}</div>}
            </div>
          </div>
        </div>

        <div className="col-span-3 flex flex-col h-full overflow-hidden">
          <div className="bg-slate-800 rounded-lg p-2 flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center mb-2"><h3 className="text-lg font-medium flex items-center"><Users size={18} className="mr-2 text-green-400" />社交信息</h3></div>
            <div ref={socialMessagesScrollRef} className="flex-1 overflow-y-auto space-y-1 min-h-0 custom-scrollbar">
                            {filteredSocialMessages.map((msg: Message) => (
                <div key={msg.id} className="flex items-start space-x-1.5">
                  <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs ${msg.type === 'follow' ? 'bg-red-500' : msg.type === 'like' ? 'bg-yellow-500' : msg.type === 'member' ? 'bg-green-500' : 'bg-gray-500'}`}>
                    {msg.type === 'follow' ? <Heart size={12} /> : msg.type === 'like' ? <ThumbsUp size={12} /> : msg.type === 'member' ? <Users size={12} /> : '?'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-1.5">
                      <span className={`text-sm font-medium ${msg.type === 'follow' ? 'text-red-400' : msg.type === 'like' ? 'text-yellow-400' : msg.type === 'member' ? 'text-green-400' : 'text-gray-400'}`}>{msg.user.name}</span>
                      <span className="text-gray-500 text-xs">{new Date(msg.time).toLocaleTimeString()}</span>
                    </div>
                                        <div className="text-white">{'content' in msg && msg.content}</div>
                  </div>
                </div>
              ))}
              {filteredSocialMessages.length === 0 && <div className="text-center text-gray-500 py-8">{messages.filter(m => ['follow', 'like', 'member'].includes(m.type)).length === 0 ? '暂无社交消息' : '没有符合过滤条件的社交消息'}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* 设置弹窗 */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-96 max-w-[90vw]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">设置</h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">房间号</label>
                <input
                  type="text"
                  value={localRoomNum}
                  onChange={(e) => setLocalRoomNum(e.target.value)}
                  placeholder="请输入房间号"
                  className="w-full bg-slate-700 text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className={`flex items-center text-sm ${statusDisplay.color}`}>
                <StatusIcon size={16} className="mr-2" />
                {statusDisplay.text}
              </div>
              <div className="flex space-x-2">
                {connectStatus === 1 ? (
                  <button onClick={disconnectLive} className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors flex items-center justify-center">
                    <Square size={16} className="mr-2" />断开
                  </button>
                ) : (
                  <button onClick={connectLive} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors flex items-center justify-center">
                    <Play size={16} className="mr-2" />连接
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DanmuPage;
