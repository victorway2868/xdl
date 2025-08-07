// 首页组件
import React, { useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, Space, Button } from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { loadSettings } from '../store/features/settings/settingsSlice';
import { loadPlugins } from '../store/features/plugins/pluginsSlice';
import { useLogger } from '../hooks/useLogger';

const { Title, Paragraph } = Typography;

export const Home: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { settings } = useSelector((state: RootState) => state.settings);
  const { plugins } = useSelector((state: RootState) => state.plugins);
  const logger = useLogger();
  
  useEffect(() => {
    // 加载初始数据
    dispatch(loadSettings());
    dispatch(loadPlugins());
    
    logger.info('Home page loaded');
  }, [dispatch, logger]);
  
  const enabledPlugins = plugins.filter(p => p.enabled);
  const disabledPlugins = plugins.filter(p => !p.enabled);
  
  const handleTestLog = () => {
    logger.info('Test log message from Home page', { timestamp: Date.now() });
  };
  
  return (
    <div>
      <Title level={2}>欢迎使用 Electron Framework App</Title>
      
      <Paragraph>
        这是一个基于现代 Electron 架构的应用程序，采用了分层设计和插件化架构。
      </Paragraph>
      
      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="当前主题"
              value={settings.theme === 'light' ? '浅色' : '深色'}
            />
          </Card>
        </Col>
        
        <Col span={6}>
          <Card>
            <Statistic
              title="语言设置"
              value={settings.language}
            />
          </Card>
        </Col>
        
        <Col span={6}>
          <Card>
            <Statistic
              title="已启用插件"
              value={enabledPlugins.length}
              suffix={`/ ${plugins.length}`}
            />
          </Card>
        </Col>
        
        <Col span={6}>
          <Card>
            <Statistic
              title="已禁用插件"
              value={disabledPlugins.length}
            />
          </Card>
        </Col>
      </Row>
      
      <Card title="系统信息" style={{ marginTop: 24 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Paragraph>
              <strong>窗口尺寸:</strong> {settings.windowBounds.width} x {settings.windowBounds.height}
            </Paragraph>
            <Paragraph>
              <strong>自动启动:</strong> {settings.autoStart ? '已启用' : '已禁用'}
            </Paragraph>
          </Col>
          
          <Col span={12}>
            <Paragraph>
              <strong>插件总数:</strong> {plugins.length}
            </Paragraph>
            <Paragraph>
              <strong>运行状态:</strong> 正常
            </Paragraph>
          </Col>
        </Row>
      </Card>
      
      <Card title="快速操作" style={{ marginTop: 24 }}>
        <Space>
          <Button type="primary" onClick={handleTestLog}>
            测试日志记录
          </Button>
          <Button onClick={() => window.location.reload()}>
            刷新页面
          </Button>
        </Space>
      </Card>
    </div>
  );
};