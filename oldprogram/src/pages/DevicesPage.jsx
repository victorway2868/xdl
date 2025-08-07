import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import WorkCard from '../components/WorkCard';
import apiService from '../services/apiService';

function DevicesPage() {
  // 状态管理
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 获取设备数据
  const fetchDevices = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('开始获取设备数据...');

      // 获取所有媒体数据
      const allMediaData = await apiService.getAllMediaManifest();
      console.log('获取到的所有媒体数据:', allMediaData);

      // 获取设备类型的数据
      const deviceData = apiService.getMediaByType(allMediaData, 'device');
      console.log('获取到的设备数据:', deviceData);

      // 为抖音视频添加videoId字段
      const devicesWithVideoId = deviceData.map(item =>
        apiService.addVideoId(item)
      );

      console.log('处理后的设备数据:', devicesWithVideoId);
      setDevices(devicesWithVideoId);

    } catch (err) {
      console.error('获取设备数据失败:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时获取数据
  useEffect(() => {
    fetchDevices();
  }, []);

  // 处理设备点击事件
  const handleDeviceClick = (device) => {
    console.log('查看设备详情:', device.title);

    // 如果有URL，则打开链接
    if (device.url) {
      if (window.electron) {
        // 在Electron环境中打开外部链接
        window.electron.openExternal(device.url);
      } else {
        // 在浏览器环境中打开链接
        window.open(device.url, '_blank');
      }
    }
  };

  // 处理查看详情/次要操作
  const handleSecondaryAction = (device) => {
    console.log('查看设备详情:', device.title);

    // 如果有URL，则打开详情链接
    if (device.url) {
      if (window.electron) {
        window.electron.openExternal(device.url);
      } else {
        window.open(device.url, '_blank');
      }
    }
  };

  return (
    <div className="min-h-full bg-gray-900 text-white p-2 flex flex-col h-full gap-2">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-indigo-400">设备推荐</h1>
        <Link to="/app" className="text-indigo-400 hover:text-indigo-300 text-sm">返回首页</Link>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          <span className="ml-3 text-gray-400">正在加载设备数据...</span>
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <div className="text-red-400 mr-3">⚠️</div>
            <div>
              <h3 className="text-red-400 font-semibold">加载失败</h3>
              <p className="text-red-300 text-sm mt-1">{error}</p>
              <button
                onClick={fetchDevices}
                className="mt-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                重试
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 设备列表 */}
      {!loading && !error && (
        <>
          {devices.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <div className="text-4xl mb-4">📱</div>
              <p>暂无设备推荐数据</p>
              <button
                onClick={fetchDevices}
                className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition-colors"
              >
                刷新数据
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {devices.map(device => (
                <WorkCard
                  key={device.id}
                  id={device.id}
                  title={device.title}
                  description={device.description}
                  type={device.type}
                  url={device.url}
                  platform={device.platform}
                  playType={device.playType}
                  viewCount={device.viewCount}
                  isHot={device.isHot}
                  coverurl={device.coverurl}
                  thumbnail={device.thumbnail}
                  duration={device.duration}
                  level={device.level}
                  deviceModel={device.deviceModel}
                  downloadUrl={device.downloadUrl}
                  clickUrl={device.clickUrl}
                  version={device.version}
                  rating={device.rating}
                  videoId={device.videoId}
                  size="small"
                  variant="compact"
                  onClick={() => handleDeviceClick(device)}
                  onSecondaryAction={() => handleSecondaryAction(device)}
                  secondaryActionText="查看详情"
                  showActions={true}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default DevicesPage;