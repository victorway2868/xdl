// 设置页面组件
import React, { useEffect } from 'react';
import {
  Card,
  Form,
  Select,
  Switch,
  Button,
  Space,
  message,
  Divider,
  Typography,
  InputNumber,
} from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import {
  loadSettings,
  saveSettings,
  resetSettings,
  updateLocalSettings,
} from '../store/features/settings/settingsSlice';
import { useLogger } from '../hooks/useLogger';

const { Title } = Typography;
const { Option } = Select;

export const Settings: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { settings, loading, error, hasUnsavedChanges } = useSelector(
    (state: RootState) => state.settings
  );
  const [form] = Form.useForm();
  const logger = useLogger();
  
  useEffect(() => {
    dispatch(loadSettings());
    logger.info('Settings page loaded');
  }, [dispatch, logger]);
  
  useEffect(() => {
    form.setFieldsValue(settings);
  }, [settings, form]);
  
  useEffect(() => {
    if (error) {
      message.error(error);
    }
  }, [error]);
  
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      await dispatch(saveSettings(values)).unwrap();
      message.success('设置已保存');
      logger.info('Settings saved', values);
    } catch (error) {
      message.error('保存设置失败');
      logger.error('Failed to save settings', { error });
    }
  };
  
  const handleReset = async () => {
    try {
      await dispatch(resetSettings()).unwrap();
      form.resetFields();
      message.success('设置已重置为默认值');
      logger.info('Settings reset to defaults');
    } catch (error) {
      message.error('重置设置失败');
      logger.error('Failed to reset settings', { error });
    }
  };
  
  const handleFormChange = () => {
    const values = form.getFieldsValue();
    dispatch(updateLocalSettings(values));
  };
  
  return (
    <div>
      <Title level={2}>应用设置</Title>
      
      <Card title="外观设置" style={{ marginBottom: 16 }}>
        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleFormChange}
          initialValues={settings}
        >
          <Form.Item
            name="theme"
            label="主题"
            tooltip="选择应用程序的外观主题"
          >
            <Select>
              <Option value="light">浅色主题</Option>
              <Option value="dark">深色主题</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="language"
            label="语言"
            tooltip="选择应用程序的显示语言"
          >
            <Select>
              <Option value="zh-CN">简体中文</Option>
              <Option value="en-US">English</Option>
            </Select>
          </Form.Item>
        </Form>
      </Card>
      
      <Card title="窗口设置" style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical" onValuesChange={handleFormChange}>
          <Form.Item label="窗口尺寸">
            <Space>
              <Form.Item
                name={['windowBounds', 'width']}
                noStyle
                rules={[{ required: true, message: '请输入宽度' }]}
              >
                <InputNumber
                  min={800}
                  max={2560}
                  placeholder="宽度"
                  addonAfter="px"
                />
              </Form.Item>
              <span>×</span>
              <Form.Item
                name={['windowBounds', 'height']}
                noStyle
                rules={[{ required: true, message: '请输入高度' }]}
              >
                <InputNumber
                  min={600}
                  max={1440}
                  placeholder="高度"
                  addonAfter="px"
                />
              </Form.Item>
            </Space>
          </Form.Item>
        </Form>
      </Card>
      
      <Card title="系统设置" style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical" onValuesChange={handleFormChange}>
          <Form.Item
            name="autoStart"
            label="开机自启动"
            valuePropName="checked"
            tooltip="是否在系统启动时自动启动应用程序"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Card>
      
      <Divider />
      
      <Space>
        <Button
          type="primary"
          onClick={handleSave}
          loading={loading}
          disabled={!hasUnsavedChanges}
        >
          保存设置
        </Button>
        
        <Button onClick={handleReset} loading={loading}>
          重置为默认值
        </Button>
        
        {hasUnsavedChanges && (
          <span style={{ color: '#faad14' }}>有未保存的更改</span>
        )}
      </Space>
    </div>
  );
};