// 布局组件
import React from 'react';
import { Layout as AntLayout, Menu, Button, Space, Typography } from 'antd';
import {
  SettingOutlined,
//   PluginOutlined,
  FileTextOutlined,
  MinusOutlined,
  BorderOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const { Header, Sider, Content } = AntLayout;
const { Title } = Typography;

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleWindowControl = async (action: 'minimize' | 'maximize' | 'close') => {
    try {
      switch (action) {
        case 'minimize':
          await window.electronAPI.minimizeWindow();
          break;
        case 'maximize':
          await window.electronAPI.maximizeWindow();
          break;
        case 'close':
          await window.electronAPI.closeWindow();
          break;
      }
    } catch (error) {
      console.error(`Failed to ${action} window:`, error);
    }
  };
  
  const menuItems = [
    {
      key: '/',
      icon: <FileTextOutlined />,
      label: '首页',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '设置',
    },
    {
      key: '/plugins',
    //   icon: <PluginOutlined />,
      label: '插件',
    },
  ];
  
  return (
    <AntLayout style={{ height: '100vh' }}>
      <Header
        style={{
          padding: '0 16px',
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          Electron Framework App
        </Title>
        
        <Space>
          <Button
            type="text"
            icon={<MinusOutlined />}
            onClick={() => handleWindowControl('minimize')}
          />
          <Button
            type="text"
            icon={<BorderOutlined />}
            onClick={() => handleWindowControl('maximize')}
          />
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={() => handleWindowControl('close')}
            danger
          />
        </Space>
      </Header>
      
      <AntLayout>
        <Sider width={200} style={{ background: '#fff' }}>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ height: '100%', borderRight: 0 }}
          />
        </Sider>
        
        <AntLayout style={{ padding: '24px' }}>
          <Content
            style={{
              background: '#fff',
              padding: 24,
              margin: 0,
              minHeight: 280,
              borderRadius: 8,
            }}
          >
            {children}
          </Content>
        </AntLayout>
      </AntLayout>
    </AntLayout>
  );
};