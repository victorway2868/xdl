import React, { useState, useEffect } from 'react';
import { Button, Card, Typography, Space, Alert, Spin } from 'antd';
import { DownloadOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface UpdateCheckerProps {
  className?: string;
}

const UpdateChecker: React.FC<UpdateCheckerProps> = ({ className }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckResult, setLastCheckResult] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState<{ version: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 获取应用版本信息
  useEffect(() => {
    const fetchAppVersion = async () => {
      try {
        const versionInfo = await window.electronAPI.getAppVersion();
        setAppVersion(versionInfo);
      } catch (err) {
        console.error('Failed to get app version:', err);
        setError('无法获取应用版本信息');
      }
    };

    fetchAppVersion();
  }, []);

  // 手动检查更新
  const handleCheckForUpdates = async () => {
    setIsChecking(true);
    setError(null);
    setLastCheckResult(null);

    try {
      const result = await window.electronAPI.checkForUpdates();
      
      if (result.success) {
        setLastCheckResult('检查完成：' + result.message);
      } else {
        setError('检查更新失败：' + result.message);
      }
    } catch (err) {
      setError('检查更新时发生错误：' + (err as Error).message);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Card 
      className={className}
      title={
        <Space>
          <DownloadOutlined />
          <span>应用更新</span>
        </Space>
      }
      size="small"
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* 当前版本信息 */}
        {appVersion && (
          <div>
            <Text strong>当前版本：</Text>
            <Text code>{appVersion.version}</Text>
          </div>
        )}

        {/* 错误信息 */}
        {error && (
          <Alert
            message={error}
            type="error"
            icon={<ExclamationCircleOutlined />}
            closable
            onClose={() => setError(null)}
          />
        )}

        {/* 检查结果 */}
        {lastCheckResult && (
          <Alert
            message={lastCheckResult}
            type="success"
            icon={<CheckCircleOutlined />}
            closable
            onClose={() => setLastCheckResult(null)}
          />
        )}

        {/* 检查更新按钮 */}
        <Button
          type="primary"
          icon={isChecking ? <Spin size="small" /> : <DownloadOutlined />}
          loading={isChecking}
          onClick={handleCheckForUpdates}
          disabled={isChecking}
          block
        >
          {isChecking ? '正在检查更新...' : '检查更新'}
        </Button>

        {/* 说明文字 */}
        <Text type="secondary" style={{ fontSize: '12px' }}>
          应用会自动检查更新。如果发现新版本，将会自动下载并安装。
        </Text>
      </Space>
    </Card>
  );
};

export default UpdateChecker;
