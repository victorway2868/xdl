import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { ArrowLeft, Play, Square, Wifi, WifiOff, Gift, Heart, Users, MessageCircle, ThumbsUp, Crown, Settings, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DyCast, CastMethod } from '../core/danmu/dycast.ts';

const DanmuPage = () => {
  const navigate = useNavigate();

  // 连接状态 0-未连接 1-已连接 2-连接失败 3-已断开
  const [connectStatus, setConnectStatus] = useState(0);
  // 房间号
  const [roomNum, setRoomNum] = useState('');
  // 设置弹窗状态
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

  // DyCast 实例
  const dycastRef = useRef(null);

  // 直播间信息
  const [cover, setCover] = useState('');
  const [title, setTitle] = useState('*****');
  const [avatar, setAvatar] = useState('');
  const [nickname, setNickname] = useState('***');
  const [followCount, setFollowCount] = useState('*****');
  const [memberCount, setMemberCount] = useState('*****');
  const [userCount, setUserCount] = useState('*****');
  const [likeCount, setLikeCount] = useState('*****');

  // 弹幕消息列表
  const [chatMessages, setChatMessages] = useState([]);
  // 合并的消息列表（聊天+礼物）
  const [allMessages, setAllMessages] = useState([]);
  // 社交消息列表
  const [socialMessages, setSocialMessages] = useState([]);

  // 观众列表数据
  const [audienceList, setAudienceList] = useState([]);

  // 消息统计
  const [messageStats, setMessageStats] = useState({
    totalMessages: 0,
    chatCount: 0,
    giftCount: 0,
    followCount: 0,  // 关注数量
    likeActionCount: 0,   // 点赞数量
    memberCount: 0,   // 进入数量
    audienceCount: 0  // 观众榜单更新数量
  });

  // 滚动引用
  const allMessagesScrollRef = useRef(null);
  const socialMessagesScrollRef = useRef(null);

  // 验证房间号
  const verifyRoomNumber = useCallback((value) => {
    const roomNumRegex = /^\d+$/;
    const flag = roomNumRegex.test(value) && value.length > 0;
    if (flag) return { flag, message: '' };
    else {
      return { flag, message: '房间号错误' };
    }
  }, []);

  // 连接房间
  const connectLive = useCallback(async () => {
    const validation = verifyRoomNumber(roomNum);
    if (!validation.flag) {
      alert(validation.message);
      return;
    }

    try {
      setConnectStatus(1);

      // 创建 DyCast 实例
      const dycast = new DyCast(roomNum);
      dycastRef.current = dycast;

      // 监听连接打开
      dycast.on('open', (ev, info) => {
        console.log('弹幕连接已打开', info);
        setConnectStatus(1);

        if (info) {
          setTitle(info.title || '直播间');
          setNickname(info.nickname || '主播');
          setAvatar(info.avatar || '');
          setCover(info.cover || '');
        }
      });

      // 监听弹幕消息
      dycast.on('message', (messages) => {
        console.log('收到弹幕消息', messages);

        messages.forEach(msg => {
          const messageId = Date.now() + Math.random();
          const time = new Date();

          // 调试：打印观众榜单相关消息
          if (msg.method === CastMethod.ROOM_USER_SEQ || msg.method === CastMethod.ROOM_RANK) {
            console.log('收到观众榜单消息:', msg.method, msg);
          }

          switch (msg.method) {
            case CastMethod.CHAT:
              const chatMsg = {
                id: messageId.toString(),
                type: 'chat',
                user: {
                  name: msg.user?.name || '匿名用户',
                  avatar: msg.user?.avatar || ''
                },
                content: msg.content || '',
                time
              };
              setChatMessages(prev => [...prev, chatMsg]);
              setAllMessages(prev => [...prev, chatMsg]);
              setMessageStats(prev => ({
                ...prev,
                chatCount: prev.chatCount + 1,
                totalMessages: prev.totalMessages + 1
              }));
              break;

            case CastMethod.GIFT:
              const giftMsg = {
                id: messageId.toString(),
                type: 'gift',
                user: {
                  name: msg.user?.name || '匿名用户',
                  avatar: msg.user?.avatar || ''
                },
                gift: {
                  name: msg.gift?.name || '礼物',
                  count: msg.gift?.count || 1,
                  price: msg.gift?.price || 0
                },
                time
              };
              setAllMessages(prev => [...prev, giftMsg]);
              setMessageStats(prev => ({
                ...prev,
                giftCount: prev.giftCount + 1,
                totalMessages: prev.totalMessages + 1
              }));
              break;

            case CastMethod.MEMBER:
            case CastMethod.SOCIAL:
            case CastMethod.LIKE:
              const socialMsg = {
                id: messageId.toString(),
                user: {
                  name: msg.user?.name || '匿名用户',
                  avatar: msg.user?.avatar || ''
                },
                content: msg.method === CastMethod.MEMBER ? '进入直播间' :
                        msg.method === CastMethod.SOCIAL ? '关注了主播' :
                        '为主播点赞',
                type: msg.method === CastMethod.MEMBER ? 'member' :
                      msg.method === CastMethod.SOCIAL ? 'follow' : 'like',
                time
              };
              setSocialMessages(prev => [...prev, socialMsg]);

              // 分别统计不同类型的社交行为
              setMessageStats(prev => {
                const newStats = { ...prev, totalMessages: prev.totalMessages + 1 };
                if (msg.method === CastMethod.MEMBER) {
                  newStats.memberCount = prev.memberCount + 1;
                } else if (msg.method === CastMethod.SOCIAL) {
                  newStats.followCount = prev.followCount + 1;
                } else if (msg.method === CastMethod.LIKE) {
                  newStats.likeActionCount = prev.likeActionCount + 1;
                }
                return newStats;
              });
              break;

            case CastMethod.ROOM_USER_SEQ:
            case CastMethod.ROOM_RANK:
              // 处理观众列表/排行榜数据
              if (msg.rank && Array.isArray(msg.rank)) {
                console.log('收到观众榜单数据:', msg.rank.length, '个观众');
                console.log('观众数据示例:', msg.rank.slice(0, 3));
                setAudienceList(msg.rank);
                setMessageStats(prev => ({
                  ...prev,
                  audienceCount: prev.audienceCount + 1
                }));
              }
              break;
          }

          // 更新直播间统计信息
          if (msg.room) {
            if (msg.room.audienceCount) setMemberCount(msg.room.audienceCount.toString());
            if (msg.room.likeCount) setLikeCount(msg.room.likeCount.toString());
            if (msg.room.followCount) setFollowCount(msg.room.followCount.toString());
            if (msg.room.totalUserCount) setUserCount(msg.room.totalUserCount.toString());
          }
        });
      });

      // 监听连接关闭
      dycast.on('close', (code, reason) => {
        console.log('弹幕连接已关闭', code, reason);
        setConnectStatus(3);
      });

      // 监听错误
      dycast.on('error', (error) => {
        console.error('弹幕连接错误', error);
        setConnectStatus(2);
        alert('连接失败: ' + error.message);
      });

      // 开始连接
      await dycast.connect();

    } catch (err) {
      console.error('连接失败:', err);
      setConnectStatus(2);
      alert('连接失败: ' + err.message);
    }
  }, [roomNum, verifyRoomNumber]);

  // 断开连接
  const disconnectLive = useCallback(() => {
    if (dycastRef.current) {
      dycastRef.current.close();
      dycastRef.current = null;
    }
    setConnectStatus(3);
    setTitle('*****');
    setNickname('***');
    setFollowCount('*****');
    setMemberCount('*****');
    setUserCount('*****');
    setLikeCount('*****');
    // 清空观众列表
    setAudienceList([]);
    // 清空社交消息
    setSocialMessages([]);
  }, []);







  // 处理消息过滤器变化
  const handleFilterChange = useCallback((filterType, enabled) => {
    const newFilters = { ...messageFilters, [filterType]: enabled };
    setMessageFilters(newFilters);
    localStorage.setItem('messageFilters', JSON.stringify(newFilters));
  }, [messageFilters]);

  // 过滤后的聊天消息列表（仅聊天消息）
  const filteredChatMessages = useMemo(() => {
    return chatMessages.filter(msg => {
      if (msg.type === 'chat') return messageFilters.chat;
      return false;
    });
  }, [chatMessages, messageFilters]);

  // 过滤后的礼物消息列表
  const filteredGiftMessages = useMemo(() => {
    return allMessages.filter(msg => {
      if (msg.type === 'gift') return messageFilters.gift;
      return false;
    });
  }, [allMessages, messageFilters]);

  // 过滤后的社交消息列表（仅社交消息）
  const filteredSocialMessages = useMemo(() => {
    return socialMessages.filter(msg => {
      if (msg.type === 'follow') return messageFilters.follow;
      if (msg.type === 'like') return messageFilters.like;
      if (msg.type === 'member') return messageFilters.member;
      return false;
    });
  }, [socialMessages, messageFilters]);

  // 合并所有过滤后的消息
  const filteredAllMessages = useMemo(() => {
    return [...filteredChatMessages, ...filteredGiftMessages].sort((a, b) => a.time - b.time);
  }, [filteredChatMessages, filteredGiftMessages]);

  // 组件卸载时清理连接
  useEffect(() => {
    return () => {
      if (dycastRef.current) {
        dycastRef.current.close();
      }
    };
  }, []);

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

  const statusDisplay = getStatusDisplay();
  const StatusIcon = statusDisplay.icon;

  return (
    <div className="h-[calc(100vh-40px)] bg-gray-900 text-white flex flex-col overflow-hidden">
      <style jsx>{`
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
            {/* 聊天过滤器 */}
            <label className="flex items-center cursor-pointer text-blue-400 hover:text-blue-300 transition-colors">
              <input
                type="checkbox"
                checked={messageFilters.chat}
                onChange={(e) => handleFilterChange('chat', e.target.checked)}
                className="mr-2 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              />
              <MessageCircle size={16} className="mr-1" />
              聊天: {messageStats.chatCount}
            </label>

            {/* 礼物过滤器 */}
            <label className="flex items-center cursor-pointer text-pink-400 hover:text-pink-300 transition-colors">
              <input
                type="checkbox"
                checked={messageFilters.gift}
                onChange={(e) => handleFilterChange('gift', e.target.checked)}
                className="mr-2 w-4 h-4 text-pink-600 bg-gray-700 border-gray-600 rounded focus:ring-pink-500"
              />
              <Gift size={16} className="mr-1" />
              礼物: {messageStats.giftCount}
            </label>

            {/* 关注过滤器 */}
            <label className="flex items-center cursor-pointer text-red-400 hover:text-red-300 transition-colors">
              <input
                type="checkbox"
                checked={messageFilters.follow}
                onChange={(e) => handleFilterChange('follow', e.target.checked)}
                className="mr-2 w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
              />
              <Heart size={16} className="mr-1" />
              关注: {messageStats.followCount}
            </label>

            {/* 点赞过滤器 */}
            <label className="flex items-center cursor-pointer text-yellow-400 hover:text-yellow-300 transition-colors">
              <input
                type="checkbox"
                checked={messageFilters.like}
                onChange={(e) => handleFilterChange('like', e.target.checked)}
                className="mr-2 w-4 h-4 text-yellow-600 bg-gray-700 border-gray-600 rounded focus:ring-yellow-500"
              />
              <ThumbsUp size={16} className="mr-1" />
              点赞: {messageStats.likeActionCount}
            </label>

            {/* 进入过滤器 */}
            <label className="flex items-center cursor-pointer text-green-400 hover:text-green-300 transition-colors">
              <input
                type="checkbox"
                checked={messageFilters.member}
                onChange={(e) => handleFilterChange('member', e.target.checked)}
                className="mr-2 w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500"
              />
              <Users size={16} className="mr-1" />
              进入: {messageStats.memberCount}
            </label>
          </div>
        </div>

        {/* 右侧设置按钮 */}
        <div className="flex items-center">
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-md hover:bg-slate-700"
            title="设置"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0 overflow-hidden px-4 pb-4">
        {/* 左侧：直播间信息和控制 */}
        <div className="col-span-3 flex flex-col space-y-4 h-full overflow-hidden">
          {/* 直播间信息卡片 */}
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-gray-600 rounded-full mx-auto mb-2 flex items-center justify-center">
                {avatar ? (
                  <img src={avatar} alt="头像" className="w-full h-full rounded-full" />
                ) : (
                  <span className="text-gray-400">头像</span>
                )}
              </div>
              <h3 className="font-medium">{nickname}</h3>
              <p className="text-sm text-gray-400 truncate">{title}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-center">
                <div className="text-gray-400">关注</div>
                <div className="font-medium">{followCount}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400">观众</div>
                <div className="font-medium">{memberCount}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400">总观看</div>
                <div className="font-medium">{userCount}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400">点赞</div>
                <div className="font-medium">{likeCount}</div>
              </div>
            </div>
          </div>

          {/* 观众榜 */}
          <div className="bg-slate-800 rounded-lg p-2 flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium flex items-center">
                <Crown size={18} className="mr-2 text-purple-400" />
                观众榜
              </h3>
              <span className="text-sm text-gray-400">{audienceList.length} 人</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 min-h-0 custom-scrollbar">
              {audienceList.slice(0, 100).map((audience, index) => (
                <div key={`audience-${audience.nickname || 'anonymous'}-${audience.rank || index + 1}-${index}`} className="text-sm text-gray-300">
                  {audience.rank || index + 1}. {audience.nickname || '匿名观众'}
                </div>
              ))}
              {audienceList.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  暂无观众数据
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 中间：合并消息区域 */}
        <div className="col-span-6 flex flex-col h-full overflow-hidden">
          <div className="bg-slate-800 rounded-lg p-2 flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium flex items-center">
                <MessageCircle size={18} className="mr-2 text-blue-400" />
                弹幕消息
              </h3>
              <div className="flex items-center space-x-4 text-sm">
                <span className="text-blue-400">聊天: {messageStats.chatCount}</span>
                <span className="text-pink-400">礼物: {messageStats.giftCount}</span>
                <span className="text-gray-400">显示: {filteredAllMessages.length}</span>
              </div>
            </div>
            <div ref={allMessagesScrollRef} className="flex-1 overflow-y-auto space-y-1 min-h-0 custom-scrollbar">
              {filteredAllMessages.map((msg) => (
                <div key={msg.id} className="flex items-start space-x-1.5">
                  {msg.type === 'chat' ? (
                    <>
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex-shrink-0 flex items-center justify-center text-xs">
                        {msg.user.name[0]}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-blue-400 text-sm font-medium">{msg.user.name}</span>
                          <span className="text-gray-500 text-xs">
                            {msg.time.toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-white">{msg.content}</div>
                      </div>
                    </>
                  ) : msg.type === 'gift' ? (
                    <>
                      <div className="w-6 h-6 bg-pink-500 rounded-full flex-shrink-0 flex items-center justify-center text-xs">
                        <Gift size={12} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-pink-400 text-sm font-medium">{msg.user.name}</span>
                          <span className="text-gray-500 text-xs">
                            {msg.time.toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-white">
                          送出了 <span className="text-pink-300">{msg.gift.name}</span> x{msg.gift.count}
                          <span className="text-yellow-400 ml-2">({msg.gift.price} 抖币)</span>
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              ))}
              {filteredAllMessages.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  {allMessages.length === 0 && filteredChatMessages.length === 0 ? '暂无弹幕消息' : '没有符合过滤条件的弹幕消息'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右侧：社交信息区域 */}
        <div className="col-span-3 flex flex-col h-full overflow-hidden">
          <div className="bg-slate-800 rounded-lg p-2 flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center mb-2">
              <h3 className="text-lg font-medium flex items-center">
                <Users size={18} className="mr-2 text-green-400" />
                社交信息
              </h3>
            </div>
            <div ref={socialMessagesScrollRef} className="flex-1 overflow-y-auto space-y-1 min-h-0 custom-scrollbar">
              {filteredSocialMessages.map((msg) => (
                <div key={msg.id} className="flex items-start space-x-1.5">
                  <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs ${
                    msg.type === 'follow' ? 'bg-red-500' :
                    msg.type === 'like' ? 'bg-yellow-500' :
                    msg.type === 'member' ? 'bg-green-500' : 'bg-gray-500'
                  }`}>
                    {msg.type === 'follow' ? <Heart size={12} /> :
                     msg.type === 'like' ? <ThumbsUp size={12} /> :
                     msg.type === 'member' ? <Users size={12} /> : '?'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-1.5">
                      <span className={`text-sm font-medium ${
                        msg.type === 'follow' ? 'text-red-400' :
                        msg.type === 'like' ? 'text-yellow-400' :
                        msg.type === 'member' ? 'text-green-400' : 'text-gray-400'
                      }`}>{msg.user.name}</span>
                      <span className="text-gray-500 text-xs">
                        {msg.time.toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-white">{msg.content}</div>
                  </div>
                </div>
              ))}
              {filteredSocialMessages.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  {socialMessages.length === 0 ?
                    '暂无社交消息' : '没有符合过滤条件的社交消息'}
                </div>
              )}
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
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* 房间号输入 */}
              <div>
                <label className="block text-sm font-medium mb-2">房间号</label>
                <input
                  type="text"
                  value={roomNum}
                  onChange={(e) => setRoomNum(e.target.value)}
                  placeholder="请输入房间号"
                  className="w-full bg-slate-700 text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 连接状态显示 */}
              <div className={`flex items-center text-sm ${statusDisplay.color}`}>
                <StatusIcon size={16} className="mr-2" />
                {statusDisplay.text}
              </div>

              {/* 连接控制按钮 */}
              <div className="flex space-x-2">
                {connectStatus === 1 ? (
                  <button
                    onClick={disconnectLive}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors flex items-center justify-center"
                  >
                    <Square size={16} className="mr-2" />
                    断开
                  </button>
                ) : (
                  <button
                    onClick={connectLive}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors flex items-center justify-center"
                  >
                    <Play size={16} className="mr-2" />
                    连接
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
