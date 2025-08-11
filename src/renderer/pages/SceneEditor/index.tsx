/**
 * 场景编辑器页面
 * 当前为开发中的占位符页面
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Monitor, Settings, Play } from 'lucide-react';
import { Button, Card, Typography, Space } from 'antd';
import { useSceneData } from '../../hooks/useLiveData';

const { Title, Paragraph } = Typography;

const SceneEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    connectionStatus, 
    roomInfo, 
    stats, 
    isConnected,
    getWidgetData 
  } = useSceneData();

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
          <Title level={4} className="text-white m-0">
            <Monitor className="inline mr-2" size={20} />
            场景编辑器
          </Title>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            type="text"
            icon={<Settings size={20} />}
            className="text-gray-300 hover:text-white"
          >
            设置
          </Button>
          <Button
            type="primary"
            icon={<Play size={16} />}
            disabled={!isConnected}
          >
            预览
          </Button>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 p-6">
        <div className="grid grid-cols-12 gap-6 h-full">
          {/* 左侧：工具面板 */}
          <div className="col-span-3 space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <Title level={5} className="text-white">挂件库</Title>
              <Space direction="vertical" className="w-full">
                <Button block className="text-left">💬 弹幕挂件</Button>
                <Button block className="text-left">🎁 礼物挂件</Button>
                <Button block className="text-left">👥 观众榜挂件</Button>
                <Button block className="text-left">⏰ 倒计时挂件</Button>
                <Button block className="text-left">📊 统计挂件</Button>
              </Space>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <Title level={5} className="text-white">图层面板</Title>
              <Paragraph className="text-gray-400">
                拖拽挂件到画布中开始编辑
              </Paragraph>
            </Card>
          </div>

          {/* 中间：画布区域 */}
          <div className="col-span-6">
            <Card className="bg-gray-800 border-gray-700 h-full">
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Monitor size={64} className="mx-auto mb-4 text-gray-500" />
                  <Title level={3} className="text-gray-400">场景编辑器开发中</Title>
                  <Paragraph className="text-gray-500">
                    这个功能正在开发中，敬请期待！
                  </Paragraph>
                  
                  {/* 显示当前直播数据状态 */}
                  {isConnected && roomInfo && (
                    <div className="mt-6 p-4 bg-gray-700 rounded-lg">
                      <Title level={5} className="text-green-400">
                        ✅ 已连接到直播间
                      </Title>
                      <Paragraph className="text-white mb-2">
                        房间：{roomInfo.title}
                      </Paragraph>
                      <Paragraph className="text-white mb-2">
                        主播：{roomInfo.nickname}
                      </Paragraph>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>聊天消息: {stats.chatCount}</div>
                        <div>礼物消息: {stats.giftCount}</div>
                        <div>关注数: {stats.followCount}</div>
                        <div>点赞数: {stats.likeCount}</div>
                      </div>
                    </div>
                  )}
                  
                  {!isConnected && (
                    <div className="mt-6 p-4 bg-gray-700 rounded-lg">
                      <Paragraph className="text-yellow-400">
                        💡 提示：请先在弹幕助手中连接直播间，然后回到这里使用场景编辑器
                      </Paragraph>
                      <Button 
                        type="primary" 
                        onClick={() => navigate('/danmu')}
                        className="mt-2"
                      >
                        前往弹幕助手
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* 右侧：属性面板 */}
          <div className="col-span-3 space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <Title level={5} className="text-white">属性面板</Title>
              <Paragraph className="text-gray-400">
                选择挂件后在这里编辑属性
              </Paragraph>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <Title level={5} className="text-white">预览控制</Title>
              <Space direction="vertical" className="w-full">
                <Button block disabled>启动预览服务</Button>
                <Button block disabled>在OBS中添加</Button>
                <Button block disabled>保存布局</Button>
              </Space>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SceneEditorPage;