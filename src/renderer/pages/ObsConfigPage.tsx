import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tabletModels, phoneModels, Device } from '@renderer/data/deviceModels';
import { SystemInfo } from '@main/utils/hardwareInfo';

// Helper to calculate aspect ratio from a "WxH" string
const getAspectRatioFromResolution = (resolution: string): string => {
  try {
    const [width, height] = resolution.replace(/\s/g, '').split(/[xX×]/).map(Number);
    if (width && height) {
      const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
      const divisor = gcd(width, height);
      return `${width / divisor}:${height / divisor}`;
    }
  } catch (e) {
    console.error('Invalid resolution format', e);
  }
  return '16:9'; // Default aspect ratio
};


function ObsConfigPage() {
  const [deviceType, setDeviceType] = useState<'tablet' | 'phone' | 'computer' | 'custom'>('tablet');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  // State for each dropdown to avoid conflicts
  const [appleiPadId, setAppleiPadId] = useState('');
  const [androidTabletId, setAndroidTabletId] = useState('');
  const [applePhoneId, setApplePhoneId] = useState('');
  const [androidPhoneId, setAndroidPhoneId] = useState('');

  // Custom device state
  const [customResolution, setCustomResolution] = useState('1920x1080');
  const [customName, setCustomName] = useState('自定义设备');

  // OBS configuration process state
  const [configStatus, setConfigStatus] = useState<'idle' | 'configuring' | 'success' | 'error'>('idle');
  const [configSteps, setConfigSteps] = useState<any[]>([]);

  // Hardware info state
  const [hardwareInfo, setHardwareInfo] = useState<SystemInfo | null>(null);

  // --- Effects ---

  // Effect to fetch hardware info on component mount
  useEffect(() => {
    const fetchHardwareInfo = async () => {
      try {
        const info = await window.electronAPI.getSystemInfo();
        setHardwareInfo(info);
      } catch (error) {
        console.error('Failed to fetch hardware info:', error);
      }
    };
    fetchHardwareInfo();
  }, []);

  // Effect to update the selected device whenever the device type or selections change
  useEffect(() => {
    let device: Device | null = null;
    if (deviceType === 'tablet') {
      const selectedId = appleiPadId || androidTabletId;
      device = tabletModels.find(d => d.id === selectedId) || null;
    } else if (deviceType === 'phone') {
      const selectedId = applePhoneId || androidPhoneId;
      device = phoneModels.find(d => d.id === selectedId) || null;
    } else if (deviceType === 'computer' && hardwareInfo) {
      device = {
        id: 'computer',
        name: 'PC端游',
        brand: '电脑',
        resolution: hardwareInfo.resolution,
        aspectRatio: '16:9',
        os: 'Windows',
        screenSize: '自定义',
        category: 'tablet', // for display purposes
        popular: true,
      };
    } else if (deviceType === 'custom') {
      device = {
        id: 'custom',
        name: customName,
        brand: '自定义',
        resolution: customResolution,
        aspectRatio: getAspectRatioFromResolution(customResolution),
        os: '自定义',
        screenSize: '自定义',
        category: 'tablet', // for display purposes
        popular: true,
      };
    }
    setSelectedDevice(device);
  }, [deviceType, appleiPadId, androidTabletId, applePhoneId, androidPhoneId, customName, customResolution, hardwareInfo]);

  // --- Handlers ---

  const handleDeviceSelect = (deviceId: string, type: 'apple-tablet' | 'android-tablet' | 'apple-phone' | 'android-phone') => {
    // Reset all selections first
    setAppleiPadId('');
    setAndroidTabletId('');
    setApplePhoneId('');
    setAndroidPhoneId('');

    // Set the new selection
    switch (type) {
      case 'apple-tablet': setAppleiPadId(deviceId); break;
      case 'android-tablet': setAndroidTabletId(deviceId); break;
      case 'apple-phone': setApplePhoneId(deviceId); break;
      case 'android-phone': setAndroidPhoneId(deviceId); break;
    }
  };

  const handleConfigureOBS = async () => {
    if (!selectedDevice) {
      alert('请先选择一个设备');
      return;
    }

    setConfigStatus('configuring');
    setConfigSteps([]);

    try {
      const result = await window.electronAPI.oneClickConfigureObs({
        deviceName: selectedDevice.name,
        resolution: selectedDevice.resolution.replace(/\s/g, ''),
      });

      setConfigSteps(result.steps || []);
      if (result.success) {
        setConfigStatus('success');
      } else {
        setConfigStatus('error');
      }
    } catch (error: any) {
      setConfigStatus('error');
      setConfigSteps(prev => [...prev, { name: 'Fatal Error', success: false, message: error.message }]);
    }
  };

  // --- Render Logic ---

  const renderDeviceOptions = (models: Device[]) => models.map(device => (
    <option key={device.id} value={device.id}>
      {`${device.name} - ${device.resolution}`}
    </option>
  ));

  return (
    <div className="min-h-full bg-gray-900 text-white p-4 flex flex-col h-full gap-4">
      {/* Header and Tabs */}
      <div className="flex border-b border-gray-700">
        {['tablet', 'phone', 'computer', 'custom'].map(type => (
          <button
            key={type}
            className={`px-6 py-2 text-sm font-medium transition-colors ${
              deviceType === type
                ? 'bg-indigo-600 text-white rounded-t-lg'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
            onClick={() => setDeviceType(type as any)}
          >
            { { tablet: '平板', phone: '手机', computer: '电脑', custom: '自定义' }[type] }
          </button>
        ))}
        <Link to="/app" className="px-6 py-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 ml-auto">
          返回首页
        </Link>
      </div>

      {/* Device Selection Area */}
      <div className="mt-4 flex flex-col md:flex-row gap-6">
        <div className="flex-1 flex flex-col gap-4">
          {deviceType === 'tablet' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">苹果 iPad:</label>
                <select value={appleiPadId} onChange={e => handleDeviceSelect(e.target.value, 'apple-tablet')} className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">请选择机型</option>
                  {renderDeviceOptions(tabletModels.filter(d => d.brand === 'Apple'))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">安卓平板:</label>
                <select value={androidTabletId} onChange={e => handleDeviceSelect(e.target.value, 'android-tablet')} className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">请选择机型</option>
                  {renderDeviceOptions(tabletModels.filter(d => d.brand !== 'Apple'))}
                </select>
              </div>
            </>
          )}
          {deviceType === 'phone' && (
             <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">苹果 手机:</label>
                <select value={applePhoneId} onChange={e => handleDeviceSelect(e.target.value, 'apple-phone')} className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">请选择机型</option>
                  {renderDeviceOptions(phoneModels.filter(d => d.brand === 'Apple'))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">安卓 手机:</label>
                <select value={androidPhoneId} onChange={e => handleDeviceSelect(e.target.value, 'android-phone')} className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">请选择机型</option>
                  {renderDeviceOptions(phoneModels.filter(d => d.brand !== 'Apple'))}
                </select>
              </div>
            </>
          )}
          {deviceType === 'computer' && (
            <div className="p-4 bg-gray-800 rounded-md space-y-3">
              <h3 className="text-lg font-medium text-indigo-300 mb-4">硬件信息</h3>
              {hardwareInfo ? (
                <>
                  <div className="flex justify-between items-center"><span className="text-gray-300 text-sm">CPU:</span><span className="text-gray-100 text-sm font-medium">{hardwareInfo.cpu}</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-300 text-sm">显卡:</span><span className="text-gray-100 text-sm font-medium">{hardwareInfo.gpu}</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-300 text-sm">内存:</span><span className="text-gray-100 text-sm font-medium">{hardwareInfo.memory}</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-300 text-sm">主显示器:</span><span className="text-gray-100 text-sm font-medium">{hardwareInfo.resolution}</span></div>
                </>
              ) : <p>正在加载硬件信息...</p>}
            </div>
          )}
          {deviceType === 'custom' && (
            <div className="p-4 bg-gray-800 rounded-md space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">设备名称:</label>
                <input type="text" value={customName} onChange={e => setCustomName(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-gray-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">分辨率 (宽x高):</label>
                <input type="text" value={customResolution} onChange={e => setCustomResolution(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-gray-300" />
              </div>
            </div>
          )}
        </div>

        {/* Preview Box */}
        <div className="flex items-center justify-center md:w-1/3">
          {selectedDevice ? (
            <div className={`border border-gray-600 rounded-lg flex flex-col items-center justify-center p-4 bg-gray-800/50 ${deviceType === 'phone' ? 'w-[100px] h-[180px]' : 'w-[240px] h-[180px]'}`}>
              <div className="text-center w-full overflow-hidden px-2">
                <div className="text-gray-300 text-xs mb-2 truncate">{selectedDevice.brand} ({selectedDevice.os}/{selectedDevice.screenSize})</div>
                <div className="text-indigo-300 font-semibold text-sm mb-2 truncate">{selectedDevice.name}</div>
                <div className="text-gray-400 text-xs truncate">{selectedDevice.resolution}</div>
              </div>
            </div>
          ) : <div className="text-gray-500 text-sm">请选择设备以查看预览</div>}
        </div>
      </div>

      {/* Action Area */}
      <div className="bg-gray-800/50 p-4 rounded-lg mt-4">
        <button onClick={handleConfigureOBS} disabled={!selectedDevice || configStatus === 'configuring'} className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed">
          {configStatus === 'configuring' ? '配置中...' : '一键配置OBS'}
        </button>
        {configSteps.length > 0 && (
          <div className="mt-4 border border-gray-700 rounded-md p-3 bg-gray-900/50 space-y-2">
            <h4 className="text-sm font-medium text-gray-300 mb-2">配置日志:</h4>
            {configSteps.map((step, index) => (
              <div key={index} className="flex items-start text-xs">
                <span className={`mr-2 ${step.success ? 'text-green-400' : 'text-red-400'}`}>{step.success ? '✔' : '✖'}</span>
                <div className="flex-1">
                  <span className={`font-semibold ${step.success ? 'text-green-400' : 'text-red-400'}`}>{step.name}</span>
                  {step.message && <p className="text-gray-400 mt-0.5">{step.message}</p>}
                </div>
              </div>
            ))}
            {configStatus === 'success' && <p className='text-green-400 text-sm mt-2'>✓ 配置成功完成！</p>}
            {configStatus === 'error' && <p className='text-red-400 text-sm mt-2'>✗ 配置中遇到错误。</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export default ObsConfigPage;

