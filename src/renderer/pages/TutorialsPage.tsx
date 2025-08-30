import React, { useState, useEffect } from 'react';
import { ContentItem } from '../store/features/contentSlice';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import ContentCard from '../components/common/ContentCard';
import ContentModal from '../components/common/ContentModal';
import VideoModal from '../components/common/VideoModal';
import { BookOpen } from 'lucide-react';
import '../styles/themes.css';

const TutorialsPage: React.FC = () => {

  // 只读取数据，不进行任何数据获取操作
  const { data, loading, error } = useSelector((state: RootState) => state.content);
  
  // 页面加载时记录数据来源
  useEffect(() => {
    console.log('📚 [TutorialsPage] 页面加载');
    if (data) {
      console.log('📊 [TutorialsPage] 从Redux状态获取数据');
      console.log('📋 [TutorialsPage] 教程数量:', data.Tutorials?.length || 0);
    } else if (loading) {
      console.log('⏳ [TutorialsPage] 数据正在加载中...');
    } else if (error) {
      console.log('❌ [TutorialsPage] 数据加载错误:', error);
    } else {
      console.log('❓ [TutorialsPage] 没有可用数据');
    }
  }, [data, loading, error]);
  
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 视频播放相关状态
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [currentVideoItem, setCurrentVideoItem] = useState<ContentItem | null>(null);

  const handleCardAction = (item: ContentItem) => {
    console.log('点击教程项目:', item);
    console.log('category:', item.category);
    console.log('workType:', item.workType);
    console.log('platform:', item.platform);
    console.log('videoUrl:', item.videoUrl);
    
    // 根据workType值选择不同的弹窗
    if (item.workType === 'Video') {
      // 视频类型 - 使用VideoModal
      console.log('打开视频播放弹窗');
      setCurrentVideoItem(item);
      setIsVideoModalOpen(true);
    } else {
      // 文本类型或其他 - 使用ContentModal
      console.log('打开内容详情弹窗');
      setSelectedItem(item);
      setIsModalOpen(true);
    }
  };

  // 关闭视频弹窗
  const closeVideoModal = () => {
    setIsVideoModalOpen(false);
    setCurrentVideoItem(null);
  };

  const tutorials = data?.Tutorials || [];

  // 加载动画现在使用CSS类

  return (
    <div className="p-6 theme-page transition-colors duration-300">
      {/* CSS 动画定义 */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `
      }} />

      {/* 头部 */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <BookOpen size={28} className="text-blue-500" />
            <h1 className="text-3xl font-bold m-0 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
              直播教程
            </h1>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      {loading && !data ? (
        <div className="flex flex-col items-center justify-center min-h-96 gap-4">
          <div className="w-10 h-10 border-3 border-blue-400/30 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-slate-500 dark:text-slate-400 text-base">正在加载教程数据...</p>
        </div>
      ) : error && !data ? (
        <div className="text-center py-15 px-5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <p className="text-red-400 dark:text-red-300 text-base mb-4">
            加载失败: {error}
          </p>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            数据由系统统一管理，请重启应用重新加载
          </p>
        </div>
      ) : tutorials.length === 0 ? (
        <div className="text-center py-15 px-5 text-slate-500 dark:text-slate-400">
          <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">暂无教程内容</p>
          <p className="text-sm">请稍后再试或联系管理员</p>
        </div>
      ) : (
        <>
          {/* 教程网格 - 优化紧凑布局 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 mb-10">
            {tutorials.map((tutorial) => (
              <ContentCard
                key={tutorial.id}
                item={tutorial}
                size="small"
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
    </div>
  );
};

export default TutorialsPage;
