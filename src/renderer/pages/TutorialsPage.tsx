import React, { useState, useEffect } from 'react';
import { ContentItem } from '../store/features/contentSlice';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import ContentCard from '../components/common/ContentCard';
import ContentModal from '../components/common/ContentModal';
import VideoModal from '../components/common/VideoModal';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TutorialsPage: React.FC = () => {
  const navigate = useNavigate();

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

  // 加载动画样式
  const spinnerStyle: React.CSSProperties = {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(59, 130, 246, 0.3)',
    borderTop: '3px solid #3B82F6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  };

  return (
    <div style={{ 
      padding: '24px', 
      minHeight: '100vh',
      backgroundColor: '#0F172A',
      color: '#F1F5F9'
    }}>
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
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '32px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/app')}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid rgba(148, 163, 184, 0.3)',
              borderRadius: '8px',
              padding: '8px',
              color: '#94A3B8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(148, 163, 184, 0.1)';
              e.currentTarget.style.color = '#F1F5F9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#94A3B8';
            }}
          >
            <ArrowLeft size={20} />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BookOpen size={28} color="#3B82F6" />
            <h1 style={{ 
              fontSize: '28px', 
              fontWeight: '700', 
              margin: 0,
              background: 'linear-gradient(to right, #3B82F6, #8B5CF6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              直播教程
            </h1>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      {loading && !data ? (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: '400px',
          gap: '16px'
        }}>
          <div style={spinnerStyle} />
          <p style={{ color: '#94A3B8', fontSize: '16px' }}>正在加载教程数据...</p>
        </div>
      ) : error && !data ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '12px'
        }}>
          <p style={{ color: '#FCA5A5', fontSize: '16px', marginBottom: '16px' }}>
            加载失败: {error}
          </p>
          <p style={{ color: '#94A3B8', fontSize: '14px' }}>
            数据由系统统一管理，请重启应用重新加载
          </p>
        </div>
      ) : tutorials.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          color: '#94A3B8'
        }}>
          <BookOpen size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <p style={{ fontSize: '18px', marginBottom: '8px' }}>暂无教程内容</p>
          <p style={{ fontSize: '14px' }}>请稍后再试或联系管理员</p>
        </div>
      ) : (
        <>
          {/* 统计信息 */}
          <div style={{ 
            marginBottom: '24px',
            padding: '16px 20px',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: '12px'
          }}>
            <p style={{ 
              margin: 0, 
              color: '#93C5FD', 
              fontSize: '14px' 
            }}>
              共找到 <strong>{tutorials.length}</strong> 个教程
            </p>
          </div>

          {/* 教程网格 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '24px',
            marginBottom: '40px'
          }}>
            {tutorials.map((tutorial) => (
              <ContentCard
                key={tutorial.id}
                item={tutorial}
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
    </div>
  );
};

export default TutorialsPage;
