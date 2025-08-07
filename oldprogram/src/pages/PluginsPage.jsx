import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import WorkCard from '../components/WorkCard';
import apiService from '../services/apiService';

function PluginsPage() {
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState('');
  const [currentPlugin, setCurrentPlugin] = useState(null);

  // 状态管理
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 获取插件数据
  const fetchPlugins = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('开始获取插件数据...');

      // 获取所有媒体数据
      const allMediaData = await apiService.getAllMediaManifest();
      console.log('获取到的所有媒体数据:', allMediaData);

      // 获取插件类型的数据
      const pluginData = apiService.getMediaByType(allMediaData, 'plugin');
      console.log('获取到的插件数据:', pluginData);

      // 为抖音视频添加videoId字段
      const pluginsWithVideoId = pluginData.map(item =>
        apiService.addVideoId(item)
      );

      console.log('处理后的插件数据:', pluginsWithVideoId);
      setPlugins(pluginsWithVideoId);

    } catch (err) {
      console.error('获取插件数据失败:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时获取数据
  useEffect(() => {
    fetchPlugins();
  }, []);

  // 处理插件点击事件
  const handlePluginClick = (plugin) => {
    console.log('点击插件:', plugin.title);

    // 如果是抖音平台的视频，使用videoId打开弹窗
    if (plugin.platform === 'douyin' && plugin.videoId) {
      setCurrentVideoId(plugin.videoId);
      setCurrentPlugin(plugin);
      setShowVideoModal(true);
    } else if (plugin.url) {
      // 其他平台或有URL的情况，打开外部链接
      if (window.electron) {
        window.electron.openExternal(plugin.url);
      } else {
        window.open(plugin.url, '_blank');
      }
    } else {
      console.log('无可用的插件链接');
    }
  };

  // 关闭视频弹窗
  const closeVideoModal = () => {
    setShowVideoModal(false);
    setCurrentVideoId('');
    setCurrentPlugin(null);
  };

  // 处理立即使用按钮点击
  const handleUsePlugin = (plugin) => {
    console.log('立即使用插件:', plugin.title);

    // 优先使用downloadUrl，否则使用url
    const useUrl = plugin.downloadUrl || plugin.url;
    if (useUrl) {
      if (window.electron) {
        window.electron.openExternal(useUrl);
      } else {
        window.open(useUrl, '_blank');
      }
    }

    // 关闭弹窗
    closeVideoModal();
  };

  // 抖音视频播放弹窗组件
  const VideoModal = ({ isOpen, videoId, plugin, onClose, onUsePlugin }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
        <div className="relative w-full max-w-6xl h-full max-h-[95vh] bg-gray-900 rounded-lg overflow-hidden flex flex-col">
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={onClose}
              className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-full transition-colors shadow-lg"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <iframe
              src={`https://open.douyin.com/player/video?vid=${videoId}&autoplay=0`}
              className="w-full h-full border-0"
              allowFullScreen
              title="抖音视频播放器"
              style={{ minHeight: '500px' }}
            />
          </div>
          {/* 底部按钮区域 */}
          <div className="p-4 bg-gray-800 border-t border-gray-700">
            <div className="flex justify-center">
              <button
                onClick={() => onUsePlugin(plugin)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors shadow-lg"
              >
                立即使用
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-full bg-gray-900 text-white p-2 flex flex-col h-full gap-2">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-indigo-400">插件中心</h1>
        <Link to="/app" className="text-indigo-400 hover:text-indigo-300 text-sm">返回首页</Link>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          <span className="ml-3 text-gray-400">正在加载插件数据...</span>
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
                onClick={fetchPlugins}
                className="mt-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                重试
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 插件列表 */}
      {!loading && !error && (
        <>
          {plugins.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <div className="text-4xl mb-4">🔌</div>
              <p>暂无插件数据</p>
              <button
                onClick={fetchPlugins}
                className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition-colors"
              >
                刷新数据
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {plugins.map(plugin => (
                <WorkCard
                  key={plugin.id}
                  id={plugin.id}
                  title={plugin.title}
                  description={plugin.description}
                  type={plugin.type}
                  url={plugin.url}
                  platform={plugin.platform}
                  playType={plugin.playType}
                  viewCount={plugin.viewCount}
                  isHot={plugin.isHot}
                  coverurl={plugin.coverurl}
                  thumbnail={plugin.thumbnail}
                  duration={plugin.duration}
                  level={plugin.level}
                  deviceModel={plugin.deviceModel}
                  downloadUrl={plugin.downloadUrl}
                  clickUrl={plugin.clickUrl}
                  version={plugin.version}
                  rating={plugin.rating}
                  videoId={plugin.videoId}
                  size="small"
                  variant="compact"
                  onClick={() => handlePluginClick(plugin)}
                  onSecondaryAction={() => handlePluginClick(plugin)}
                  secondaryActionText="插件详情"
                  showActions={true}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* 视频播放弹窗 */}
      <VideoModal
        isOpen={showVideoModal}
        videoId={currentVideoId}
        plugin={currentPlugin}
        onClose={closeVideoModal}
        onUsePlugin={handleUsePlugin}
      />
    </div>
  );
}

export default PluginsPage;