import React, { useState } from 'react';
import { ContentItem } from '../store/features/contentSlice';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import ContentCard from '../components/common/ContentCard';
import ContentModal from '../components/common/ContentModal';
import VideoModal from '../components/common/VideoModal';
import { Puzzle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../styles/themes.css';

const PluginsPage: React.FC = () => {
  const navigate = useNavigate();

  const { data, loading, error } = useSelector((state: RootState) => state.content);
  

  
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [currentVideoItem, setCurrentVideoItem] = useState<ContentItem | null>(null);

  const handleCardAction = (item: ContentItem) => {
    console.log('点击插件项目:', item);
    console.log('category:', item.category);
    console.log('workType:', item.workType);
    console.log('platform:', item.platform);
    console.log('videoUrl:', item.videoUrl);

    if (item.workType === 'Video') {
      console.log('打开视频播放弹窗');
      setCurrentVideoItem(item);
      setIsVideoModalOpen(true);
    } else {
      console.log('打开内容详情弹窗');
      setSelectedItem(item);
      setIsModalOpen(true);
    }
  };

  const closeVideoModal = () => {
    setIsVideoModalOpen(false);
    setCurrentVideoItem(null);
  };

  const plugins = data?.OBSPlugins || [];

  return (
    <div className="p-6 theme-page transition-colors duration-300">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <Puzzle size={28} className="text-emerald-500" />
            <h1 className="text-3xl font-bold m-0 bg-gradient-to-r from-emerald-500 to-blue-500 bg-clip-text text-transparent">
              OBS插件
            </h1>
          </div>
        </div>


      </div>

      {/* 内容区域 */}
      {loading && !data ? (
        <div className="flex flex-col items-center justify-center min-h-96 gap-4">
          <div className="w-10 h-10 border-3 border-emerald-300 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-gray-500 dark:text-gray-400 text-base">正在加载插件数据...</p>
        </div>
      ) : error && !data ? (
        <div className="text-center py-15 px-5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <p className="text-red-400 dark:text-red-300 text-base mb-4">
            加载失败: {error}
          </p>
          <button
            onClick={refresh}
            className="bg-red-500 hover:bg-red-600 text-white border-none rounded-lg px-5 py-2.5 text-sm font-medium cursor-pointer transition-colors"
          >
            重试
          </button>
        </div>
      ) : plugins.length === 0 ? (
        <div className="text-center py-15 px-5 text-gray-500 dark:text-gray-400">
          <Puzzle size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">暂无插件内容</p>
          <p className="text-sm">请稍后再试或联系管理员</p>
        </div>
      ) : (
        <>
          {/* 统计信息 */}
          <div className="mb-6 py-4 px-5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
            <p className="m-0 text-emerald-300 dark:text-emerald-400 text-sm">
              共找到 <strong>{plugins.length}</strong> 个插件
            </p>
          </div>

          {/* 插件网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-10">
            {plugins.map((plugin) => (
              <ContentCard
                key={plugin.id}
                item={plugin}
                size="medium"
                onAction={handleCardAction}
              />
            ))}
          </div>
        </>
      )}

      {/* 内容详情弹窗 */}
      <ContentModal
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedItem(null);
        }}
      />

      {/* 视频播放弹窗 */}
      <VideoModal
        isOpen={isVideoModalOpen}
        videoUrl={currentVideoItem?.videoUrl}
        platform={currentVideoItem?.platform}
        title={currentVideoItem?.title}
        onClose={closeVideoModal}
      />

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default PluginsPage;