import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tabletModels, phoneModels } from '../data/deviceModels';

function ObsConfigPage() {
  const [deviceType, setDeviceType] = useState('tablet'); // 'tablet', 'computer', 'phone', 或 'custom'
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [appleiPadResolution, setAppleiPadResolution] = useState('');
  const [androidTabletResolution, setAndroidTabletResolution] = useState('');
  const [applePhoneResolution, setApplePhoneResolution] = useState('');
  const [androidPhoneResolution, setAndroidPhoneResolution] = useState('');
  const [customResolution, setCustomResolution] = useState('1920x1080');
  const [customName, setCustomName] = useState('自定义设备');

  // OBS配置状态
  const [configStatus, setConfigStatus] = useState('idle'); // 'idle', 'configuring', 'success', 'error'
  const [configMessage, setConfigMessage] = useState('');
  const [configError, setConfigError] = useState('');
  const [configSteps, setConfigSteps] = useState([]);

  // 硬件信息状态
  const [hardwareInfo, setHardwareInfo] = useState({
    cpu: '获取中...',
    memory: '获取中...',
    gpu: '获取中...',
    resolution: '获取中...'
  });

  // 备份还原弹窗状态
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [selectedBackupFile, setSelectedBackupFile] = useState('');

  // 初始化选择第一个设备
  useEffect(() => {
    // 重置所有选择框
    setAppleiPadResolution('');
    setAndroidTabletResolution('');
    setApplePhoneResolution('');
    setAndroidPhoneResolution('');

    if (deviceType === 'tablet' && tabletModels.length > 0) {
      const appleDevice = tabletModels.find(d => d.brand === 'Apple');
      if (appleDevice) {
        setSelectedDevice(appleDevice);
        setAppleiPadResolution(appleDevice.id); // 使用ID而不是分辨率
      } else {
        setSelectedDevice(tabletModels[0]);
      }
    } else if (deviceType === 'phone' && phoneModels.length > 0) {
      const applePhone = phoneModels.find(d => d.brand === 'Apple');
      const androidPhone = phoneModels.find(d => d.brand !== 'Apple');

      if (applePhone) {
        setSelectedDevice(applePhone);
        setApplePhoneResolution(applePhone.id); // 使用ID而不是分辨率
      } else if (androidPhone) {
        setSelectedDevice(androidPhone);
        setAndroidPhoneResolution(androidPhone.id); // 使用ID而不是分辨率
      } else {
        setSelectedDevice(phoneModels[0]);
      }
    } else if (deviceType === 'computer') {
      // 电脑模式使用硬件信息创建虚拟设备对象
      const computerDevice = {
        id: 'computer',
        name: 'PC端游',
        brand: '电脑',
        resolution: hardwareInfo.resolution || '1920x1080',
        aspectRatio: '16:9',
        os: 'Windows',
        screenSize: '自定义尺寸',
        category: 'computer'
      };
      setSelectedDevice(computerDevice);
    } else if (deviceType === 'custom') {
      // 创建自定义设备对象
      const customDevice = {
        id: 'custom',
        name: customName,
        brand: '自定义',
        resolution: customResolution,
        aspectRatio: getAspectRatioFromResolution(customResolution),
        os: '自定义系统',
        screenSize: '自定义尺寸',
        category: 'custom'
      };
      setSelectedDevice(customDevice);
    }

    // 添加日志，帮助调试
    console.log('设备类型变更:', deviceType);
  }, [deviceType, customName, customResolution]);

  // 获取硬件信息
  useEffect(() => {
    const getHardwareInfo = async () => {
      try {
        if (typeof window !== 'undefined' && window.electron) {
          const systemInfo = await window.electron.getSystemInfo();
          setHardwareInfo(systemInfo);
        }
      } catch (error) {
        console.error('获取硬件信息失败:', error);
        setHardwareInfo({
          cpu: '获取失败',
          memory: '获取失败',
          gpu: '获取失败',
          resolution: '获取失败'
        });
      }
    };

    getHardwareInfo();
  }, []);

  // 当硬件信息更新且当前是电脑设备类型时，更新selectedDevice
  useEffect(() => {
    if (deviceType === 'computer' && hardwareInfo.resolution !== '获取中...') {
      const computerDevice = {
        id: 'computer',
        name: 'PC端游',
        brand: '电脑',
        resolution: hardwareInfo.resolution,
        aspectRatio: '16:9',
        os: 'Windows',
        screenSize: '自定义尺寸',
        category: 'computer'
      };
      setSelectedDevice(computerDevice);
    }
  }, [deviceType, hardwareInfo]);



  // 从分辨率字符串计算宽高比
  const getAspectRatioFromResolution = (resolution) => {
    try {
      const [width, height] = resolution.split('x').map(Number);
      if (width && height) {
        // 计算最大公约数
        const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
        const divisor = gcd(width, height);
        return `${width/divisor}:${height/divisor}`;
      }
    } catch (e) {
      console.error('分辨率格式错误', e);
    }
    return '16:9'; // 默认宽高比
  };

  // 配置OBS的函数
  const configureOBS = async () => {
    // 对于电脑设备类型，不需要选择具体设备，直接使用硬件信息
    if (deviceType !== 'computer' && !selectedDevice) {
      setConfigStatus('error');
      setConfigError('请先选择一个设备');
      setConfigMessage('配置失败：未选择设备');
      return;
    }

    try {
      // 重置状态
      setConfigStatus('configuring');
      setConfigMessage('正在配置OBS...');
      setConfigError('');

      // 清空配置步骤
      setConfigSteps([]);

      let configOptions;

      // 根据设备类型确定配置选项
      if (deviceType === 'computer') {
        // 电脑设备使用硬件信息配置
        configOptions = {
          deviceName: 'PC端游',
          resolution: hardwareInfo.resolution
        };
      } else {
        // 其他设备类型使用选中的设备信息
        configOptions = {
          deviceName: selectedDevice.name,
          resolution: selectedDevice.resolution
        };
      }

      // 使用一键配置OBS功能
      console.log('配置OBS参数:', configOptions);
      const result = await window.electron.oneClickConfigureObs(configOptions);

      console.log('一键配置OBS结果:', result);

      // 处理配置结果
      if (result.success) {
        // 配置成功
        setConfigStatus('success');
        setConfigMessage('OBS配置完成！');

        // 更新配置步骤
        if (result.steps && Array.isArray(result.steps)) {
          setConfigSteps(result.steps);
        }

        // 3秒后重置状态
        setTimeout(() => {
          setConfigStatus('idle');
          setConfigMessage('');
        }, 3000);
      } else {
        // 配置失败
        if (result.steps && Array.isArray(result.steps)) {
          setConfigSteps(result.steps);
        }
        throw new Error(result.message || '配置OBS失败');
      }
    } catch (error) {
      console.error('OBS配置错误:', error);
      setConfigStatus('error');
      setConfigError(error.message || '未知错误');
      setConfigMessage('配置失败，请查看错误信息');
    }
  };



  // 获取Apple iPad选项
  const getAppleiPadOptions = () => {
    const appleDevices = tabletModels.filter(device => device.brand === 'Apple');
    return appleDevices.map(device => ({
      value: device.id,
      label: `${device.name} - ${device.resolution}`
    }));
  };

  // 获取Android平板选项
  const getAndroidTabletOptions = () => {
    const androidDevices = tabletModels.filter(device => device.brand !== 'Apple');
    return androidDevices.map(device => ({
      value: device.id,
      label: `${device.name} - ${device.resolution}`
    }));
  };

  // 获取Apple手机选项
  const getApplePhoneOptions = () => {
    const appleDevices = phoneModels.filter(device => device.brand === 'Apple');
    return appleDevices.map(device => ({
      value: device.id,
      label: `${device.name} - ${device.resolution}`
    }));
  };

  // 获取Android手机选项
  const getAndroidPhoneOptions = () => {
    const androidDevices = phoneModels.filter(device => device.brand !== 'Apple');
    return androidDevices.map(device => ({
      value: device.id,
      label: `${device.name} - ${device.resolution}`
    }));
  };

  // 处理机型选择
  const handleDeviceSelect = (deviceId, type) => {
    // 如果选择了空值，则不执行任何操作
    if (!deviceId) {
      return;
    }

    let device;

    // 根据设备类型和ID查找设备
    if (type === 'apple-tablet') {
      // 重置其他选择框
      setAndroidTabletResolution('');
      setApplePhoneResolution('');
      setAndroidPhoneResolution('');

      // 根据ID查找设备
      device = tabletModels.find(d => d.id === deviceId);
      if (device) {
        setAppleiPadResolution(deviceId);
      }
    } else if (type === 'android-tablet') {
      // 重置其他选择框
      setAppleiPadResolution('');
      setApplePhoneResolution('');
      setAndroidPhoneResolution('');

      // 根据ID查找设备
      device = tabletModels.find(d => d.id === deviceId);
      if (device) {
        setAndroidTabletResolution(deviceId);
      }
    } else if (type === 'apple-phone') {
      // 重置其他选择框
      setAppleiPadResolution('');
      setAndroidTabletResolution('');
      setAndroidPhoneResolution('');

      // 根据ID查找设备
      device = phoneModels.find(d => d.id === deviceId);
      if (device) {
        setApplePhoneResolution(deviceId);
      }
    } else if (type === 'android-phone') {
      // 重置其他选择框
      setAppleiPadResolution('');
      setAndroidTabletResolution('');
      setApplePhoneResolution('');

      // 根据ID查找设备
      device = phoneModels.find(d => d.id === deviceId);
      if (device) {
        setAndroidPhoneResolution(deviceId);
      }
    }

    // 设置选中的设备
    if (device) {
      console.log('选中设备:', device);
      setSelectedDevice(device);
    }
  };

  return (
    <div className="min-h-full bg-gray-900 text-white p-2 pt-0 flex flex-col h-full gap-2">
      <div className="flex justify-between items-center mb-1">
        <h1 className="text-xl font-bold text-indigo-400"></h1>
      </div>

      {/* 设备类型选择 - 标签页设计 */}
      <div className="mb-6">
        <div className="flex border-b border-gray-700">
          <button
            className={`px-6 py-2 text-sm font-medium transition-colors ${
              deviceType === 'tablet'
                ? 'bg-indigo-600 text-white rounded-t-lg'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
            onClick={() => {
              setDeviceType('tablet');
              // 重置所有选择框
              setAppleiPadResolution('');
              setAndroidTabletResolution('');
              setApplePhoneResolution('');
              setAndroidPhoneResolution('');
            }}
          >
            平板
          </button>
          <button
            className={`px-6 py-2 text-sm font-medium transition-colors ${
              deviceType === 'phone'
                ? 'bg-indigo-600 text-white rounded-t-lg'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
            onClick={() => {
              setDeviceType('phone');
              // 重置所有选择框
              setAppleiPadResolution('');
              setAndroidTabletResolution('');
              setApplePhoneResolution('');
              setAndroidPhoneResolution('');
            }}
          >
            手机
          </button>
          <button
            className={`px-6 py-2 text-sm font-medium transition-colors ${
              deviceType === 'computer'
                ? 'bg-indigo-600 text-white rounded-t-lg'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
            onClick={() => {
              setDeviceType('computer');
              // 重置所有选择框
              setAppleiPadResolution('');
              setAndroidTabletResolution('');
              setApplePhoneResolution('');
              setAndroidPhoneResolution('');
            }}
          >
            电脑
          </button>
          <button
            className={`px-6 py-2 text-sm font-medium transition-colors ${
              deviceType === 'custom'
                ? 'bg-indigo-600 text-white rounded-t-lg'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
            onClick={() => {
              setDeviceType('custom');
              // 重置所有选择框
              setAppleiPadResolution('');
              setAndroidTabletResolution('');
              setApplePhoneResolution('');
              setAndroidPhoneResolution('');
            }}
          >
            自定义
          </button>
          <Link
            to="/app"
            className="px-6 py-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 ml-auto"
          >
            返回首页
          </Link>
        </div>

        {/* 平板设备选择 */}
        {deviceType === 'tablet' && (
          <div className="mt-4 flex flex-col md:flex-row gap-6">
            {/* 左侧选择区域 */}
            <div className="flex-1 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">苹果 iPad:</label>
                <select
                  className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={appleiPadResolution}
                  onChange={(e) => handleDeviceSelect(e.target.value, 'apple-tablet')}
                >
                  <option value="">请选择机型</option>
                  {getAppleiPadOptions().map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">安卓平板:</label>
                <select
                  className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={androidTabletResolution}
                  onChange={(e) => handleDeviceSelect(e.target.value, 'android-tablet')}
                >
                  <option value="">请选择机型</option>
                  {getAndroidTabletOptions().map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 右侧预览框 - 简洁设计 - 平板样式 */}
            <div className="flex items-center justify-center md:w-1/3">
              {(appleiPadResolution || androidTabletResolution) && selectedDevice ? (
                <div
                  className="border border-gray-600 rounded-lg flex flex-col items-center justify-center p-4"
                  style={{
                    width: '240px',
                    height: '180px',
                    aspectRatio: selectedDevice.aspectRatio.replace(':', '/'),
                    background: 'rgba(22, 24, 29, 0.7)'
                  }}
                >
                  <div className="text-center w-full overflow-hidden px-2">
                    <div className="text-gray-300 text-xs mb-2 truncate">
                      {selectedDevice.brand}({selectedDevice.os}/{selectedDevice.screenSize})
                    </div>
                    <div className="text-indigo-300 font-semibold text-xs mb-2 truncate">
                      {selectedDevice.name}
                    </div>
                    <div className="text-gray-400 text-xs truncate">
                      {selectedDevice.resolution}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 text-sm">请选择设备以查看预览</div>
              )}
            </div>
          </div>
        )}

        {/* 电脑设备选择 */}
        {deviceType === 'computer' && (
          <div className="mt-4 flex flex-col md:flex-row gap-6">
            {/* 左侧选择区域 */}
            <div className="flex-1">
              <div className="p-4 bg-gray-800 rounded-md">
                <h3 className="text-lg font-medium text-indigo-300 mb-4">硬件信息</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 text-sm">CPU型号：</span>
                    <span className="text-gray-100 text-sm font-medium">{hardwareInfo.cpu}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 text-sm">显卡型号：</span>
                    <span className="text-gray-100 text-sm font-medium">{hardwareInfo.gpu}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 text-sm">内存大小：</span>
                    <span className="text-gray-100 text-sm font-medium">{hardwareInfo.memory}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 text-sm">主显示器：</span>
                    <span className="text-gray-100 text-sm font-medium">{hardwareInfo.resolution}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 右侧预览框 - 简洁设计 - 电脑样式 */}
            <div className="flex items-center justify-center md:w-1/3">
              <div
                className="border border-gray-600 rounded-lg flex flex-col items-center justify-center p-4"
                style={{
                  width: '240px',
                  height: '135px', // 16:9 宽高比
                  aspectRatio: '16/9',
                  background: 'rgba(22, 24, 29, 0.7)'
                }}
              >
                <div className="text-center w-full overflow-hidden px-2">
                  <div className="text-gray-300 text-xs mb-1 truncate">
                    电脑(Windows/自定义尺寸)
                  </div>
                  <div className="text-indigo-300 font-semibold text-xs mb-1 truncate">
                    PC端游
                  </div>
                  <div className="text-gray-400 text-xs truncate">
                    {hardwareInfo.resolution}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 自定义设备选择 */}
        {deviceType === 'custom' && (
          <div className="mt-4 flex flex-col md:flex-row gap-6">
            {/* 左侧选择区域 */}
            <div className="flex-1">
              <div className="p-4 bg-gray-800 rounded-md">
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">设备名称:</label>
                    <input
                      type="text"
                      className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="输入设备名称"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">分辨率 (宽x高):</label>
                    <input
                      type="text"
                      className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={customResolution}
                      onChange={(e) => setCustomResolution(e.target.value)}
                      placeholder="例如: 1920x1080"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 右侧预览框 - 简洁设计 - 自定义样式 */}
            <div className="flex items-center justify-center md:w-1/3">
              {customName && customResolution && selectedDevice ? (
                <div
                  className="border border-gray-600 rounded-lg flex flex-col items-center justify-center p-4"
                  style={{
                    width: '240px',
                    height: '180px',
                    aspectRatio: selectedDevice.aspectRatio.replace(':', '/'),
                    background: 'rgba(22, 24, 29, 0.7)'
                  }}
                >
                  <div className="text-center w-full overflow-hidden px-2">
                    <div className="text-gray-300 text-xs mb-2 truncate">
                      {selectedDevice.brand}({selectedDevice.os}/{selectedDevice.screenSize})
                    </div>
                    <div className="text-indigo-300 font-semibold text-xs mb-2 truncate">
                      {selectedDevice.name}
                    </div>
                    <div className="text-gray-400 text-xs truncate">
                      {selectedDevice.resolution}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 text-sm">请输入设备名称和分辨率以查看预览</div>
              )}
            </div>
          </div>
        )}

        {/* 手机设备选择 - 使用下拉选择框 */}
        {deviceType === 'phone' && (
          <div className="mt-4 flex flex-col md:flex-row gap-6">
            {/* 左侧选择区域 */}
            <div className="flex-1 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">苹果手机:</label>
                <select
                  className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={applePhoneResolution}
                  onChange={(e) => handleDeviceSelect(e.target.value, 'apple-phone')}
                >
                  <option value="">请选择机型</option>
                  {getApplePhoneOptions().map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">安卓手机:</label>
                <select
                  className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={androidPhoneResolution}
                  onChange={(e) => handleDeviceSelect(e.target.value, 'android-phone')}
                >
                  <option value="">请选择机型</option>
                  {getAndroidPhoneOptions().map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 右侧预览框 - 简洁设计 - 手机样式 */}
            <div className="flex items-center justify-center md:w-1/3">
              {(applePhoneResolution || androidPhoneResolution) && selectedDevice ? (
                <div
                  className="border border-gray-600 rounded-lg flex flex-col items-center justify-center p-3"
                  style={{
                    width: '100px',
                    height: '180px',
                    aspectRatio: selectedDevice.aspectRatio.replace(':', '/'),
                    background: 'rgba(22, 24, 29, 0.7)'
                  }}
                >
                  <div className="text-center w-full overflow-hidden px-1">
                    <div className="text-gray-300 text-[10px] mb-1 truncate">
                      {selectedDevice.brand}({selectedDevice.os}/{selectedDevice.screenSize})
                    </div>
                    <div className="text-indigo-300 font-semibold text-[10px] mb-1 truncate">
                      {selectedDevice.name}
                    </div>
                    <div className="text-gray-400 text-[10px] truncate">
                      {selectedDevice.resolution}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 text-sm">请选择设备以查看预览</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* OBS配置管理区域 */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 border border-indigo-900/30 shadow-lg mt-4">
        <h2 className="text-lg font-semibold text-indigo-300 mb-3">OBS配置管理</h2>

        {/* 左右布局容器 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 一键配置区域 - 左侧 */}
          <div>
            <h3 className="text-md font-medium text-indigo-200 mb-2">一键配置</h3>
            <div className="bg-gray-800/50 p-4 rounded-lg h-full">
              <p className="text-gray-300 text-sm mb-3">
                根据已选设备自动配置OBS场景、来源和设置，优化直播效果。
              </p>
              <div className="flex flex-col items-center">
                <button
                  className={`px-6 py-2 ${configStatus === 'idle' || configStatus === 'success' ? 'bg-indigo-600 hover:bg-indigo-700' : configStatus === 'error' ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 cursor-not-allowed'} text-white rounded-md transition-colors flex items-center`}
                  onClick={configureOBS}
                  disabled={configStatus !== 'idle' && configStatus !== 'success' && configStatus !== 'error'}
                >
                  {configStatus === 'idle' || configStatus === 'success' ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                      </svg>
                      一键配置OBS
                    </>
                  ) : configStatus === 'error' ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      重试配置
                    </>
                  ) : (
                    <>
                      <svg className="animate-spin h-5 w-5 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      配置中...
                    </>
                  )}
                </button>

                {/* 状态信息显示 */}
                {configStatus !== 'idle' && (
                  <div className={`mt-3 text-sm ${configStatus === 'error' ? 'text-red-400' : configStatus === 'success' ? 'text-green-400' : 'text-gray-300'}`}>
                    {configMessage}
                    {configStatus === 'error' && configError && (
                      <div className="text-red-400 mt-1">
                        错误: {configError}
                      </div>
                    )}

                    {/* 配置步骤显示 */}
                    {configSteps.length > 0 && (
                      <div className="mt-3 border border-gray-700 rounded-md p-2 bg-gray-800/50">
                        <h4 className="text-xs font-medium text-gray-400 mb-2">配置步骤:</h4>
                        <ul className="space-y-1">
                          {configSteps.map((step, index) => (
                            <li key={index} className="flex items-start">
                              <span className={`inline-block w-4 h-4 mr-2 rounded-full flex-shrink-0 mt-0.5 ${
                                step.success ? 'bg-green-500' : 'bg-red-500'
                              }`}>
                                {step.success ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </span>
                              <div>
                                <span className={`text-xs ${step.success ? 'text-green-400' : 'text-red-400'}`}>
                                  {step.name || `步骤 ${index + 1}`}
                                </span>
                                {step.message && (
                                  <p className="text-xs text-gray-400 mt-0.5">{step.message}</p>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 备份与还原区域 - 右侧 */}
          <div>
            <h3 className="text-md font-medium text-indigo-200 mb-2">备份与还原</h3>
            <div className="bg-gray-800/50 p-4 rounded-lg h-full">
              <p className="text-gray-300 text-sm mb-3">
                备份您的OBS配置文件，或从之前的备份中还原设置。
              </p>



              {/* 云备份和云还原按钮 */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors flex items-center justify-center text-sm"
                  onClick={() => {
                    // OBS云备份逻辑
                    alert('开始OBS云备份...');
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.5 17a4.5 4.5 0 01-1.44-8.765 4.5 4.5 0 018.302-3.046 3.5 3.5 0 014.504 4.272A4 4 0 0115 17H5.5zm3.75-2.75a.75.75 0 001.5 0V9.66l1.95 2.1a.75.75 0 101.1-1.02l-3.25-3.5a.75.75 0 00-1.1 0l-3.25 3.5a.75.75 0 101.1 1.02l1.95-2.1v4.59z" clipRule="evenodd" />
                  </svg>
                  OBS云备份
                </button>
                <button
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center justify-center text-sm"
                  onClick={() => {
                    // 显示备份还原弹窗
                    setShowBackupModal(true);
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.5 17a4.5 4.5 0 01-1.44-8.765 4.5 4.5 0 018.302-3.046 3.5 3.5 0 014.504 4.272A4 4 0 0115 17H5.5zm5.25-9.25a.75.75 0 00-1.5 0v4.59l-1.95-2.1a.75.75 0 10-1.1 1.02l3.25 3.5a.75.75 0 001.1 0l3.25-3.5a.75.75 0 10-1.1-1.02l-1.95 2.1V7.75z" clipRule="evenodd" />
                  </svg>
                  OBS云还原
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 备份还原弹窗 */}
      {showBackupModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 w-full max-w-md border border-slate-700 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-blue-300">选择备份文件</h2>
              <button
                onClick={() => setShowBackupModal(false)}
                className="text-gray-400 hover:text-white rounded-full p-1 hover:bg-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">备份文件列表:</label>
              <select
                className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedBackupFile}
                onChange={(e) => setSelectedBackupFile(e.target.value)}
              >
                <option value="">请选择备份文件</option>
                <option value="backup_20230601">备份 2023-06-01 (10:30)</option>
                <option value="backup_20230530">备份 2023-05-30 (15:45)</option>
                <option value="backup_20230525">备份 2023-05-25 (09:15)</option>
                <option value="backup_20230520">备份 2023-05-20 (14:20)</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                className="flex-1 py-2.5 bg-gray-600 hover:bg-gray-700 rounded-lg text-white font-medium transition-colors"
                onClick={() => setShowBackupModal(false)}
              >
                取消
              </button>
              <button
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                disabled={!selectedBackupFile}
                onClick={() => {
                  if (selectedBackupFile) {
                    alert(`开始还原备份文件: ${selectedBackupFile}`);
                    setShowBackupModal(false);
                    setSelectedBackupFile('');
                  }
                }}
              >
                确认还原
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ObsConfigPage;