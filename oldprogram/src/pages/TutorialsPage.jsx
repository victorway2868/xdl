import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import WorkCard from '../components/WorkCard';
import apiService from '../services/apiService';

function TutorialsPage() {
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState('');

  // 状态管理
  const [tutorials, setTutorials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 获取教程数据
  const fetchTutorials = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('开始获取教程数据...');

      // 获取所有媒体数据
      const allMediaData = await apiService.getAllMediaManifest();
      console.log('获取到的所有媒体数据:', allMediaData);

      // 获取教程类型的数据
      const tutorialData = apiService.getMediaByType(allMediaData, 'tutorial');
      console.log('获取到的教程数据:', tutorialData);

      // 为抖音视频添加videoId字段
      const tutorialsWithVideoId = tutorialData.map(item =>
        apiService.addVideoId(item)
      );

      console.log('处理后的教程数据:', tutorialsWithVideoId);
      setTutorials(tutorialsWithVideoId);

    } catch (err) {
      console.error('获取教程数据失败:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时获取数据
  useEffect(() => {
    fetchTutorials();
  }, []);

  // 处理视频点击事件
  const handleVideoClick = (tutorial) => {
    console.log('点击教程:', tutorial.title);

    // 如果是抖音平台的视频，使用videoId打开弹窗
    if (tutorial.platform === 'douyin' && tutorial.videoId) {
      setCurrentVideoId(tutorial.videoId);
      setShowVideoModal(true);
    } else if (tutorial.url) {
      // 其他平台或有URL的情况，打开外部链接
      if (window.electron) {
        window.electron.openExternal(tutorial.url);
      } else {
        window.open(tutorial.url, '_blank');
      }
    } else {
      console.log('无可用的视频链接');
    }
  };

  // 关闭视频弹窗
  const closeVideoModal = () => {
    setShowVideoModal(false);
    setCurrentVideoId('');
  };

  // 抖音视频播放弹窗组件
  const VideoModal = ({ isOpen, videoId, onClose }) => {
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
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-full bg-gray-900 text-white p-2 flex flex-col h-full gap-2">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-indigo-400">直播教程</h1>
        <Link to="/app" className="text-indigo-400 hover:text-indigo-300 text-sm">返回首页</Link>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          <span className="ml-3 text-gray-400">正在加载教程数据...</span>
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
                onClick={fetchTutorials}
                className="mt-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                重试
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 教程列表 */}
      {!loading && !error && (
        <>
          {tutorials.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <div className="text-4xl mb-4">🎓</div>
              <p>暂无教程数据</p>
              <button
                onClick={fetchTutorials}
                className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition-colors"
              >
                刷新数据
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {tutorials.map(tutorial => (
                <WorkCard
                  key={tutorial.id}
                  id={tutorial.id}
                  title={tutorial.title}
                  description={tutorial.description}
                  type={tutorial.type}
                  url={tutorial.url}
                  platform={tutorial.platform}
                  playType={tutorial.playType}
                  viewCount={tutorial.viewCount}
                  isHot={tutorial.isHot}
                  coverurl={tutorial.coverurl}
                  thumbnail={tutorial.thumbnail}
                  duration={tutorial.duration}
                  level={tutorial.level}
                  deviceModel={tutorial.deviceModel}
                  downloadUrl={tutorial.downloadUrl}
                  clickUrl={tutorial.clickUrl}
                  version={tutorial.version}
                  rating={tutorial.rating}
                  videoId={tutorial.videoId}
                  size="small"
                  variant="compact"
                  onClick={() => handleVideoClick(tutorial)}
                  onSecondaryAction={() => handleVideoClick(tutorial)}
                  secondaryActionText="观看教程"
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
        onClose={closeVideoModal}
      />
    </div>
  );
}

export default TutorialsPage;
