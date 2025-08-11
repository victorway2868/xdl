/**
 * 弹幕页面
 * 从旧项目迁移并适配新的技术栈
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Play, 
  Square, 
  Wifi, 
  WifiOff, 
  Settings, 
  X,
  MessageCircle,
  Gift,
  Heart,
  ThumbsUp,
  Users,
  Crown
} from 'lucide-react';
import { Button, Input, Modal, Checkbox, Card, Statistic, Avatar, List } from 'antd';
import { useDanmuData } from '../../hooks/useLiveData';
import { MessageType } from '@shared/interfaces/liveData';

const DanmuPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    connectionStatus,
    roomInfo,
    filteredMessages,
    stats,
    audienceList,
    messageFilters,
    isLoading,
    error,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    updateFilters,
    getStatusDisplay
  } = useDanmuData();

  // 本地状态
  const [roomNum, setRoomNum] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // 滚动引用
  const allMessagesScrollRef = useRef<HTMLDivElement>(null);
  const socialMessagesScrollRef = useRef<HTMLDivElement>(null);

  // 获取状态显示
  const statusDisplay = getStatusDisplay();

  // 连接直播间
  const handleConnect = async () => {
    if (!roomNum.trim()) {
      Modal.error({ title: '错误', content: '请输入房间号' });
      return;
    }

    const roomNumRegex = /^\d+$/;
    if (!roomNumRegex.test(roomNum)) {
      Modal.error({ title: '错误', content: '房间号格式错误，请输入纯数字' });
      return;
    }

    try {
      await connect(roomNum);
    } catch (error) {
      Modal.error({ 
        title: '连接失败', 
        content: error instanceof Error ? error.message : '连接失败' 
      });
    }
  };

  // 断开连接
  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      Modal.error({ 
        title: '断开失败', 
        content: error instanceof Error ? error.message : '断开失败' 
      });
    }
  };

  // 处理消息过滤器变化
  const handleFilterChange = (filterType: keyof typeof messageFilters, checked: boolean) => {
    updateFilters({ [filterType]: checked });
  };

  // 自动滚动到底部
  useEffect(() => {
    if (allMessagesScrollRef.current) {
      allMessagesScrollRef.current.scrollTop = allMessagesScrollRef.current.scrollHeight;
    }
  }, [filteredMessages.all]);

  useEffect(() => {
    if (socialMessagesScrollRef.current) {
      socialMessagesScrollRef.current.scrollTop = socialMessagesScrollRef.current.scrollHeight;
    }
  }, [filteredMessages.social]);

  // 渲染消息项
  const renderMessage = (msg: any) => {
    const timeStr = new Date(msg.time).toLocaleTimeString();
    
    if (msg.type === MessageType.CHAT) {
      return (
        <div key={msg.id} className="flex items-start space-x-2 mb-2">
          <Avatar size="small" className="bg-blue-500 flex-shrink-0">
            {msg.user.name[0]}
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              <span className="text-blue-400 font-medium">{msg.user.name}</span>
              <span>{timeStr}</span>
            </div>
            <div className="text-white break-words">{msg.content}</div>
          </div>
        </div>
      );
    } else if (msg.type === MessageType.GIFT) {
      return (
        <div key={msg.id} className="flex items-start space-x-2 mb-2">
          <Avatar size="small" className="bg-pink-500 flex-shrink-0">
            <Gift size={12} />
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              <span className="text-pink-400 font-medium">{msg.user.name}</span>
              <span>{timeStr}</span>
            </div>
            <div className="text-white">
              送出了 <span className="text-pink-300">{msg.gift.name}</span> x{msg.gift.count}
              <span className="text-yellow-400 ml-2">({msg.gift.price} 抖币)</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // 渲染社交消息项
  const renderSocialMessage = (msg: any) => {
    const timeStr = new Date(msg.time).toLocaleTimeString();
    const iconMap = {
      [MessageType.FOLLOW]: <Heart size={12} />,
      [MessageType.LIKE]: <ThumbsUp size={12} />,
      [MessageType.MEMBER]: <Users size={12} />
    };
    const colorMap = {
      [MessageType.FOLLOW]: 'bg-red-500 text-red-400',
      [MessageType.LIKE]: 'bg-yellow-500 text-yellow-400',
      [MessageType.MEMBER]: 'bg-green-500 text-green-400'
    };

    return (
      <div key={msg.id} className="flex items-start space-x-2 mb-2">
        <Avatar size="small" className={`${colorMap[msg.type]} flex-shrink-0`}>
          {iconMap[msg.type]}
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <span className={`font-medium ${colorMap[msg.type].split(' ')[1]}`}>
              {msg.user.name}
            </span>
            <span>{timeStr}</span>
          </div>
          <div className="text-white">{msg.content}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center">
          <Button
            type="text"
            icon={<ArrowLeft size={20} />}
            onClick={() => navigate('/')}
            className="text-gray-300 hover:text-white mr-4"
          >
            返回主页
          </Button>
          
          {/* 消息过滤器 */}
          <div className="flex items-center space-x-4 text-sm">
            <Checkbox
              checked={messageFilters.chat}
              onChange={(e) => handleFilterChange('chat', e.target.checked)}
              className="text-blue-400"
            >
              <MessageCircle size={16} className="inline mr-1" />
              聊天: {stats.chatCount}
            </Checkbox>

            <Checkbox
              checked={messageFilters.gift}
              onChange={(e) => handleFilterChange('gift', e.target.checked)}
              className="text-pink-400"
            >
              <Gift size={16} className="inline mr-1" />
              礼物: {stats.giftCount}
            </Checkbox>

            <Checkbox
              checked={messageFilters.follow}
              onChange={(e) => handleFilterChange('follow', e.target.checked)}
              className="text-red-400"
            >
              <Heart size={16} className="inline mr-1" />
              关注: {stats.followCount}
            </Checkbox>

            <Checkbox
              checked={messageFilters.like}
              onChange={(e) => handleFilterChange('like', e.target.checked)}
              className="text-yellow-400"
            >
              <ThumbsUp size={16} className="inline mr-1" />
              点赞: {stats.likeCount}
            </Checkbox>

            <Checkbox
              checked={messageFilters.member}
              onChange={(e) => handleFilterChange('member', e.target.checked)}
              className="text-green-400"
            >
              <Users size={16} className="inline mr-1" />
              进入: {stats.memberCount}
            </Checkbox>
          </div>
        </div>

        <Button
          type="text"
          icon={<Settings size={20} />}
          onClick={() => setShowSettings(true)}
          className="text-gray-300 hover:text-white"
        />
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 grid grid-cols-12 gap-4 p-4 min-h-0">
        {/* 左侧：直播间信息和控制 */}
        <div className="col-span-3 flex flex-col space-y-4">
          {/* 直播间信息卡片 */}
          <Card className="bg-gray-800 border-gray-700">
            <div className="text-center mb-4">
              <Avatar size={64} src={roomInfo?.avatar} className="mb-2">
                {roomInfo?.nickname?.[0] || '头'}
              </Avatar>
              <h3 className="font-medium text-white">{roomInfo?.nickname || '***'}</h3>
              <p className="text-sm text-gray-400 truncate">{roomInfo?.title || '*****'}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Statistic
                title="关注"
                value={roomInfo?.followCount || 0}
                valueStyle={{ color: '#fff', fontSize: '14px' }}
                className="text-center"
              />
              <Statistic
                title="观众"
                value={roomInfo?.memberCount || 0}
                valueStyle={{ color: '#fff', fontSize: '14px' }}
                className="text-center"
              />
              <Statistic
                title="总观看"
                value={roomInfo?.userCount || 0}
                valueStyle={{ color: '#fff', fontSize: '14px' }}
                className="text-center"
              />
              <Statistic
                title="点赞"
                value={roomInfo?.likeCount || 0}
                valueStyle={{ color: '#fff', fontSize: '14px' }}
                className="text-center"
              />
            </div>
          </Card>

          {/* 观众榜 */}
          <Card 
            className="bg-gray-800 border-gray-700 flex-1"
            title={
              <div className="flex items-center text-white">
                <Crown size={18} className="mr-2 text-purple-400" />
                观众榜
                <span className="ml-auto text-sm text-gray-400">{audienceList.length} 人</span>
              </div>
            }
          >
            <div className="h-64 overflow-y-auto">
              <List
                dataSource={audienceList.slice(0, 100)}
                renderItem={(audience, index) => (
                  <List.Item className="border-none py-1">
                    <div className="text-sm text-gray-300">
                      {audience.rank || index + 1}. {audience.nickname || '匿名观众'}
                    </div>
                  </List.Item>
                )}
                locale={{ emptyText: '暂无观众数据' }}
              />
            </div>
          </Card>
        </div>

        {/* 中间：合并消息区域 */}
        <div className="col-span-6">
          <Card 
            className="bg-gray-800 border-gray-700 h-full flex flex-col"
            title={
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center">
                  <MessageCircle size={18} className="mr-2 text-blue-400" />
                  弹幕消息
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-blue-400">聊天: {stats.chatCount}</span>
                  <span className="text-pink-400">礼物: {stats.giftCount}</span>
                  <span className="text-gray-400">显示: {filteredMessages.all.length}</span>
                </div>
              </div>
            }
          >
            <div 
              ref={allMessagesScrollRef}
              className="flex-1 overflow-y-auto"
              style={{ maxHeight: 'calc(100vh - 200px)' }}
            >
              {filteredMessages.all.length > 0 ? (
                filteredMessages.all.map(renderMessage)
              ) : (
                <div className="text-center text-gray-500 py-8">
                  {stats.totalMessages === 0 ? '暂无弹幕消息' : '没有符合过滤条件的弹幕消息'}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* 右侧：社交信息区域 */}
        <div className="col-span-3">
          <Card 
            className="bg-gray-800 border-gray-700 h-full flex flex-col"
            title={
              <div className="flex items-center text-white">
                <Users size={18} className="mr-2 text-green-400" />
                社交信息
              </div>
            }
          >
            <div 
              ref={socialMessagesScrollRef}
              className="flex-1 overflow-y-auto"
              style={{ maxHeight: 'calc(100vh - 200px)' }}
            >
              {filteredMessages.social.length > 0 ? (
                filteredMessages.social.map(renderSocialMessage)
              ) : (
                <div className="text-center text-gray-500 py-8">
                  {stats.followCount + stats.likeCount + stats.memberCount === 0 ? 
                    '暂无社交消息' : '没有符合过滤条件的社交消息'}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* 设置弹窗 */}
      <Modal
        title="弹幕设置"
        open={showSettings}
        onCancel={() => setShowSettings(false)}
        footer={null}
        className="dark-modal"
      >
        <div className="space-y-4">
          {/* 房间号输入 */}
          <div>
            <label className="block text-sm font-medium mb-2">房间号</label>
            <Input
              value={roomNum}
              onChange={(e) => setRoomNum(e.target.value)}
              placeholder="请输入房间号"
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>

          {/* 连接状态显示 */}
          <div className={`flex items-center text-sm ${statusDisplay.color}`}>
            {statusDisplay.icon === 'Wifi' ? <Wifi size={16} className="mr-2" /> : <WifiOff size={16} className="mr-2" />}
            {statusDisplay.text}
            {error && <span className="ml-2 text-red-400">: {error}</span>}
          </div>

          {/* 连接控制按钮 */}
          <div className="flex space-x-2">
            {isConnected ? (
              <Button
                type="primary"
                danger
                icon={<Square size={16} />}
                onClick={handleDisconnect}
                loading={isLoading}
                className="flex-1"
              >
                断开
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<Play size={16} />}
                onClick={handleConnect}
                loading={isLoading}
                className="flex-1"
              >
                连接
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DanmuPage;