import React from 'react';
import { X, ExternalLink, Play } from 'lucide-react';
import { ContentItem } from '../../store/features/contentSlice';

interface ContentModalProps {
  item: ContentItem | null;
  isOpen: boolean;
  onClose: () => void;
}

const ContentModal: React.FC<ContentModalProps> = ({ item, isOpen, onClose }) => {
  if (!isOpen || !item) return null;

  const handleExternalLink = (url: string) => {
    window.electronAPI?.openExternal?.(url);
  };

  const handleVideoPlay = (videoUrl: string) => {
    // 根据平台调用相应的播放器
    if (videoUrl.includes('douyin.com') || videoUrl.includes('dy.com')) {
      // 抖音视频
      handleExternalLink(videoUrl);
    } else if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      // YouTube视频
      handleExternalLink(videoUrl);
    } else if (videoUrl.includes('bilibili.com')) {
      // Bilibili视频
      handleExternalLink(videoUrl);
    } else {
      // 其他视频链接
      handleExternalLink(videoUrl);
    }
  };



  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        backdropFilter: 'blur(5px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#1E293B',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'hidden',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ flex: 1 }}>
            <h2
              style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#F1F5F9',
                margin: '0 0 8px 0',
                lineHeight: '1.3',
              }}
            >
              {item.title}
            </h2>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {item.platform && (
                <span
                  style={{
                    fontSize: '12px',
                    color: '#94A3B8',
                    backgroundColor: 'rgba(148, 163, 184, 0.1)',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                  }}
                >
                  {item.platform}
                </span>
              )}
              {item.category && (
                <span
                  style={{
                    fontSize: '12px',
                    color: '#93C5FD',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                  }}
                >
                  {item.category}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
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
            <X size={20} />
          </button>
        </div>

        {/* 内容区域 */}
        <div
          style={{
            padding: '20px',
            maxHeight: '400px',
            overflowY: 'auto',
          }}
        >
          {/* 封面图片 */}
          {item.coverUrl && (
            <div
              style={{
                marginBottom: '16px',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: '#334155',
              }}
            >
              <img
                src={item.coverUrl}
                alt={item.title}
                style={{
                  width: '100%',
                  height: '200px',
                  objectFit: 'cover',
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}

          {/* 描述内容 */}
          <div
            style={{
              fontSize: '14px',
              color: '#CBD5E1',
              lineHeight: '1.6',
              marginBottom: '20px',
              whiteSpace: 'pre-wrap',
            }}
          >
            {item.description}
          </div>
        </div>

        {/* 底部操作区域 */}
        <div
          style={{
            padding: '20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
          }}
        >
          {item.category === 'Video' && item.videoUrl && (
            <button
              onClick={() => handleVideoPlay(item.videoUrl!)}
              style={{
                backgroundColor: '#EF4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#DC2626';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#EF4444';
              }}
            >
              <Play size={16} />
              播放视频
            </button>
          )}

          {item.externalUrl && (
            <button
              onClick={() => handleExternalLink(item.externalUrl!)}
              style={{
                backgroundColor: '#3B82F6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2563EB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#3B82F6';
              }}
            >
              <ExternalLink size={16} />
              {item.action || '查看详情'}
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              color: '#94A3B8',
              border: '1px solid rgba(148, 163, 184, 0.3)',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
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
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContentModal;