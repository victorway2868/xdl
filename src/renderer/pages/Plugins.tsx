// 插件管理页面
import React, { useEffect } from 'react';
import {
  Card,
  List,
  Switch,
  Button,
  Space,
  Tag,
  Typography,
  message,
  Popconfirm,
  Alert,
} from 'antd';
import {
  ReloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { usePlugins } from '../hooks/usePlugins';
import { useLogger } from '../hooks/useLogger';

const { Title, Text, Paragraph } = Typography;

export const Plugins: React.FC = () => {
  const {
    plugins,
    loading,
    error,
    operationLoading,
    refreshPlugins,
    togglePlugin,
    reloadPlugin,
    clearError,
  } = usePlugins();
  const logger = useLogger();
  
  useEffect(() => {
    refreshPlugins();
    logger.info('Plugins page loaded');
  }, [refreshPlugins, logger]);
  
  useEffect(() => {
    if (error) {
      message.error(error);
    }
  }, [error]);
  
  const handleTogglePlugin = async (pluginId: string, enabled: boolean) => {
    try {
      await togglePlugin(pluginId, enabled);
      message.success(`插件已${enabled ? '启用' : '禁用'}`);
      logger.info(`Plugin ${enabled ? 'enabled' : 'disabled'}`, { pluginId });
    } catch (error) {
      message.error(`${enabled ? '启用' : '禁用'}插件失败`);
      logger.error(`Failed to ${enabled ? 'enable' : 'disable'} plugin`, { pluginId, error });
    }
  };
  
  const handleReloadPlugin = async (pluginId: string) => {
    try {
      await reloadPlugin(pluginId);
      message.success('插件已重新加载');
      logger.info('Plugin reloaded', { pluginId });
    } catch (error) {
      message.error('重新加载插件失败');
      logger.error('Failed to reload plugin', { pluginId, error });
    }
  };
  
  const renderPluginItem = (plugin: any) => {
    const isLoading = operationLoading[plugin.id];
    
    return (
      <List.Item
        key={plugin.id}
        actions={[
          <Switch
            checked={plugin.enabled}
            loading={isLoading}
            onChange={(checked) => handleTogglePlugin(plugin.id, checked)}
          />,
          <Popconfirm
            title="确定要重新加载这个插件吗？"
            onConfirm={() => handleReloadPlugin(plugin.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="text"
              icon={<ReloadOutlined />}
              loading={isLoading}
              disabled={!plugin.loaded}
            >
              重新加载
            </Button>
          </Popconfirm>,
        ]}
      >
        <List.Item.Meta
          avatar={
            plugin.loaded ? (
              <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 24 }} />
            ) : (
              <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: 24 }} />
            )
          }
          title={
            <Space>
              <Text strong>{plugin.name}</Text>
              <Tag color={plugin.enabled ? 'green' : 'default'}>
                {plugin.enabled ? '已启用' : '已禁用'}
              </Tag>
              {!plugin.loaded && <Tag color="red">加载失败</Tag>}
            </Space>
          }
          description={
            <div>
              <Paragraph style={{ margin: 0 }}>
                {plugin.description}
              </Paragraph>
              <Space size="small" style={{ marginTop: 8 }}>
                <Text type="secondary">版本: {plugin.version}</Text>
                <Text type="secondary">作者: {plugin.author}</Text>
              </Space>
              {plugin.error && (
                <Alert
                  message="错误信息"
                  description={plugin.error}
                  type="error"
                  size="small"
                  style={{ marginTop: 8 }}
                />
              )}
            </div>
          }
        />
      </List.Item>
    );
  };
  
  const enabledPlugins = plugins.filter(p => p.enabled);
  const disabledPlugins = plugins.filter(p => !p.enabled);
  
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2}>插件管理</Title>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={refreshPlugins}
            loading={loading}
          >
            刷新列表
          </Button>
          {error && (
            <Button onClick={clearError}>
              清除错误
            </Button>
          )}
        </Space>
      </div>
      
      {error && (
        <Alert
          message="插件操作失败"
          description={error}
          type="error"
          closable
          onClose={clearError}
          style={{ marginBottom: 16 }}
        />
      )}
      
      <Card
        title={`已启用的插件 (${enabledPlugins.length})`}
        style={{ marginBottom: 16 }}
      >
        {enabledPlugins.length > 0 ? (
          <List
            dataSource={enabledPlugins}
            renderItem={renderPluginItem}
            loading={loading}
          />
        ) : (
          <Text type="secondary">暂无已启用的插件</Text>
        )}
      </Card>
      
      <Card title={`已禁用的插件 (${disabledPlugins.length})`}>
        {disabledPlugins.length > 0 ? (
          <List
            dataSource={disabledPlugins}
            renderItem={renderPluginItem}
            loading={loading}
          />
        ) : (
          <Text type="secondary">暂无已禁用的插件</Text>
        )}
      </Card>
    </div>
  );
};