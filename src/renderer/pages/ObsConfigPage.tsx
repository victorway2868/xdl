import { useState, useEffect, useMemo } from 'react';
// import { useNavigate } from 'react-router-dom'; // 暂时未使用
import { Settings } from 'lucide-react';
import '../styles/themes.css';
import { tabletModels, phoneModels, Device } from '@renderer/data/deviceModels';
import { SystemInfo } from '@main/utils/hardwareInfo';
import { useSelector } from 'react-redux';
import { RootState } from '@renderer/store/store';

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
  // const navigate = useNavigate(); // 暂时未使用
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

  // Backup and restore state
  const [backupStatus, setBackupStatus] = useState<'idle' | 'backing-up' | 'success' | 'error'>('idle');
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'restoring' | 'success' | 'error'>('idle');
  const [selectedBackup, setSelectedBackup] = useState<string>('');
  const [backupMessage, setBackupMessage] = useState<string>('');
  const [restoreMessage, setRestoreMessage] = useState<string>('');

  // Authing Redux
  const authUser = (useSelector((s: RootState) => s.authing.user) || undefined) as any;
  const restoreSlots = [authUser?.given_name, authUser?.family_name, authUser?.middle_name].filter(Boolean) as string[];

  const [restoreSteps, setRestoreSteps] = useState<any[]>([]);

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
    // 会员校验
    try {
      const ok = await (await import('../utils/ensureMember')).ensureMemberOrPrompt();
      if (!ok) return;
    } catch (e) {
      console.error('会员校验失败', e);
      return;
    }
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

  const handleBackupConfig = async () => {
    setBackupStatus('backing-up');
    setBackupMessage('');

    try {
      const result = await window.electronAPI.backupObsConfig();
      if (result.success) {
        setBackupStatus('success');
        setBackupMessage(result.message);
      } else {
        setBackupStatus('error');
        setBackupMessage(result.message);
      }
    } catch (error: any) {
      setBackupStatus('error');
      setBackupMessage(`备份失败: ${error.message}`);
    }
  };

  const handleRestoreConfig = async () => {
    // 使用 Redux 中的三个名称作为“备份列表”
    const slots = restoreSlots;
    if (slots.length === 0 || !authUser?.website || !authUser?.sub) {
      alert('没有可用的恢复选项或用户信息缺失');
      return;
    }
    const slotName = selectedBackup || slots[0]; // 若未选择，默认第一个

    setRestoreStatus('restoring');
    setRestoreMessage('');
    setRestoreSteps([]);

    try {
      const website = String(authUser.website);
      const base = website.endsWith('/') ? website.slice(0, -1) : website;
      const url = `${base}/obsbak/${authUser.sub}/${encodeURIComponent(slotName)}.zip`;
      const result = await window.electronAPI.restoreObsConfigFromUrl(url);
      setRestoreSteps(result.steps || []);
      if (result.success) {
        setRestoreStatus('success');
        setRestoreMessage(result.message);
      } else {
        setRestoreStatus('error');
        setRestoreMessage(result.message);
      }
    } catch (error: any) {
      setRestoreStatus('error');
      setRestoreMessage(`恢复失败: ${error.message}`);
    }
  };

  // --- Render Logic ---

  const renderDeviceOptions = (models: Device[]) => models.map(device => (
    <option key={device.id} value={device.id}>
      {`${device.name} - ${device.resolution}`}
    </option>
  ));

  return (
    <div className="theme-page p-4 flex flex-col h-full gap-4 transition-colors duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <Settings size={28} className="text-indigo-500" />
            <h1 className="text-3xl font-bold m-0 bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
              OBS配置
            </h1>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-container">
        {['tablet', 'phone', 'computer', 'custom'].map(type => (
          <button
            key={type}
            className={`tab-button ${deviceType === type ? 'tab-active' : ''}`}
            onClick={() => setDeviceType(type as any)}
          >
            { { tablet: '平板', phone: '手机', computer: '电脑', custom: '自定义' }[type] }
          </button>
        ))}
      </div>

      {/* Device Selection Area */}
      <div className="mt-6 flex flex-col md:flex-row gap-8">
        <div className="flex-1 theme-card-secondary p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 theme-text-primary">设备选择</h3>
          <div className="flex flex-col gap-4">
          {deviceType === 'tablet' && (
            <>
              <div>
                <label className="theme-label">苹果 iPad:</label>
                <select value={appleiPadId} onChange={e => handleDeviceSelect(e.target.value, 'apple-tablet')} className="w-full theme-select">
                  <option value="">请选择机型</option>
                  {renderDeviceOptions(tabletModels.filter(d => d.brand === 'Apple'))}
                </select>
              </div>
              <div>
                <label className="theme-label">安卓平板:</label>
                <select value={androidTabletId} onChange={e => handleDeviceSelect(e.target.value, 'android-tablet')} className="w-full theme-select">
                  <option value="">请选择机型</option>
                  {renderDeviceOptions(tabletModels.filter(d => d.brand !== 'Apple'))}
                </select>
              </div>
            </>
          )}
          {deviceType === 'phone' && (
             <>
              <div>
                <label className="theme-label">苹果 手机:</label>
                <select value={applePhoneId} onChange={e => handleDeviceSelect(e.target.value, 'apple-phone')} className="w-full theme-select">
                  <option value="">请选择机型</option>
                  {renderDeviceOptions(phoneModels.filter(d => d.brand === 'Apple'))}
                </select>
              </div>
              <div>
                <label className="theme-label">安卓 手机:</label>
                <select value={androidPhoneId} onChange={e => handleDeviceSelect(e.target.value, 'android-phone')} className="w-full theme-select">
                  <option value="">请选择机型</option>
                  {renderDeviceOptions(phoneModels.filter(d => d.brand !== 'Apple'))}
                </select>
              </div>
            </>
          )}
          {deviceType === 'computer' && (
            <div className="theme-card-secondary rounded-md p-4 space-y-3">
              <h3 className="text-lg font-medium text-indigo-600 dark:text-indigo-300 mb-4">硬件信息</h3>
              {hardwareInfo ? (
                <>
                  <div className="flex justify-between items-center"><span className="theme-text-secondary text-sm">CPU:</span><span className="theme-text-primary text-sm font-medium">{hardwareInfo.cpu}</span></div>
                  <div className="flex justify-between items-center"><span className="theme-text-secondary text-sm">显卡:</span><span className="theme-text-primary text-sm font-medium">{hardwareInfo.gpu}</span></div>
                  <div className="flex justify-between items-center"><span className="theme-text-secondary text-sm">内存:</span><span className="theme-text-primary text-sm font-medium">{hardwareInfo.memory}</span></div>
                  <div className="flex justify-between items-center"><span className="theme-text-secondary text-sm">主显示器:</span><span className="theme-text-primary text-sm font-medium">{hardwareInfo.resolution}</span></div>
                </>
              ) : <p>正在加载硬件信息...</p>}
            </div>
          )}
          {deviceType === 'custom' && (
            <div className="theme-card-secondary rounded-md p-4 space-y-4">
              <div>
                <label className="theme-label">设备名称:</label>
                <input type="text" value={customName} onChange={e => setCustomName(e.target.value)} className="w-full theme-input" />
              </div>
              <div>
                <label className="theme-label">分辨率 (宽x高):</label>
                <input type="text" value={customResolution} onChange={e => setCustomResolution(e.target.value)} className="w-full theme-input" />
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Preview Box */}
        <div className="md:w-1/3 theme-card-secondary p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 theme-text-primary">设备预览</h3>
          <div className="flex items-center justify-center h-48">
          {selectedDevice ? (
            <div className={`theme-card rounded-lg flex flex-col items-center justify-center p-4 transition-colors ${deviceType === 'phone' ? 'w-[100px] h-[180px]' : 'w-[240px] h-[180px]'}`}>
              <div className="text-center w-full overflow-hidden px-2">
                <div className="theme-text-secondary text-xs mb-2 truncate">{selectedDevice.brand} ({selectedDevice.os}/{selectedDevice.screenSize})</div>
                <div className="text-indigo-600 dark:text-indigo-300 font-semibold text-sm mb-2 truncate">{selectedDevice.name}</div>
                <div className="theme-text-muted text-xs truncate">{selectedDevice.resolution}</div>
              </div>
            </div>
          ) : <div className="theme-text-muted text-sm">请选择设备以查看预览</div>}
          </div>
        </div>
      </div>

      {/* Action Area */}
      <div className="theme-card-secondary p-6 rounded-lg mt-6 space-y-6">
        {/* 一键配置 */}
        <div>
          <h3 className="text-lg font-semibold mb-4 theme-text-primary">配置操作</h3>
          <button onClick={handleConfigureOBS} disabled={!selectedDevice || configStatus === 'configuring'} className="w-full px-6 py-3 theme-btn-primary rounded-md disabled:opacity-50 disabled:cursor-not-allowed">
            {configStatus === 'configuring' ? '配置中...' : '一键配置OBS'}
          </button>
          {configSteps.length > 0 && (
            <div className="mt-4 theme-card-secondary rounded-md p-4 space-y-2">
              <h4 className="text-sm font-medium theme-text-secondary mb-2">配置日志:</h4>
              {configSteps.map((step, index) => (
                <div key={index} className="flex items-start text-xs">
                  <span className={`mr-2 ${step.success ? 'text-green-400' : 'text-red-400'}`}>{step.success ? '✔' : '✖'}</span>
                  <div className="flex-1">
                    <span className={`font-semibold ${step.success ? 'text-green-400' : 'text-red-400'}`}>{step.name}</span>
                    {step.message && <p className="theme-text-muted mt-0.5">{step.message}</p>}
                  </div>
                </div>
              ))}
              {configStatus === 'success' && <p className='text-green-400 text-sm mt-2'>✓ 配置成功完成！</p>}
              {configStatus === 'error' && <p className='text-red-400 text-sm mt-2'>✗ 配置中遇到错误。</p>}
            </div>
          )}
        </div>

        {/* 备份和恢复 */}
        <div className="theme-divider"></div>
        <div>
          <h3 className="text-lg font-semibold mb-4 theme-text-primary">配置备份与恢复</h3>

          {/* 备份区域 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <button
                onClick={handleBackupConfig}
                disabled={backupStatus === 'backing-up'}
                className="w-full px-4 py-2 theme-btn-secondary rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {backupStatus === 'backing-up' ? '备份中...' : '备份当前配置'}
              </button>
              {backupMessage && (
                <p className={`text-xs mt-2 ${backupStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                  {backupMessage}
                </p>
              )}
            </div>

            {/* 恢复区域 */}
            <div>
              <div className="space-y-2">
                <select
                  value={selectedBackup}
                  onChange={(e) => setSelectedBackup(e.target.value)}
                  className="w-full theme-select text-xs"
                >
                  <option value="">选择恢复项（given/family/middle）</option>
                  {restoreSlots.map((slot, index) => (
                    <option key={index} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleRestoreConfig}
                  disabled={restoreStatus === 'restoring' || restoreSlots.length === 0}
                  className="w-full px-4 py-2 theme-btn-secondary rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {restoreStatus === 'restoring' ? '恢复中...' : '恢复配置'}
                </button>
              </div>
              {restoreMessage && (
                <p className={`text-xs mt-2 ${restoreStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                  {restoreMessage}
                </p>
              )}
              {restoreSteps.length > 0 && (
                <div className="mt-2 theme-card-secondary rounded-md p-2 space-y-1">
                  <h5 className="text-xs font-medium theme-text-secondary mb-1">恢复步骤:</h5>
                  {restoreSteps.map((step, index) => (
                    <div key={index} className="flex items-start text-xs">
                      <span className={`mr-1 ${step.success ? 'text-green-400' : 'text-red-400'}`}>
                        {step.success ? '✔' : '✖'}
                      </span>
                      <div className="flex-1">
                        <span className={`font-medium ${step.success ? 'text-green-400' : 'text-red-400'}`}>
                          {step.name}
                        </span>
                        {step.message && <p className="theme-text-muted mt-0.5">{step.message}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ObsConfigPage;

