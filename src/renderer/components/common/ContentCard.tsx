import React, { useState } from 'react';
import { Play, ExternalLink, Download, Eye, Settings, Globe } from 'lucide-react';
import { ContentItem } from '../../store/features/contentSlice';

interface ContentCardProps {
  item: ContentItem;
  size?: 'small' | 'medium' | 'large';
  onAction?: (item: ContentItem) => void;
}

// 平台图标和颜色配置
const platformConfig = {
  YouTube: {
    icon: Play,
    color: '#FF0000',
    bgColor: 'rgba(255, 0, 0, 0.1)',
  },
  Douyin: {
    icon: Play,
    color: '#FE2C55',
    bgColor: 'rgba(254, 44, 85, 0.1)',
  },
  Bilibili: {
    icon: Play,
    color: '#00A1D6',
    bgColor: 'rgba(0, 161, 214, 0.1)',
  },
  default: {
    icon: Globe,
    color: '#6B7280',
    bgColor: 'rgba(107, 114, 128, 0.1)',
  },
};

// 操作按钮配置
const actionConfig = {
  '查看': { icon: Eye, color: '#3B82F6' },
  '下载': { icon: Download, color: '#10B981' },
  '应用': { icon: Settings, color: '#8B5CF6' },
  default: { icon: ExternalLink, color: '#6B7280' },
};

const ContentCard: React.FC<ContentCardProps> = ({ item, size = 'medium', onAction }) => {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const platform = platformConfig[item.platform as keyof typeof platformConfig] || platformConfig.default;
  const action = actionConfig[item.action as keyof typeof actionConfig] || actionConfig.default;
  const PlatformIcon = platform.icon;
  const ActionIcon = action.icon;

  // 尺寸配置
  const sizeConfig = {
    small: {
      width: '200px',
      height: '140px',
      imageHeight: '110px', // 增加封面图高度
      titleSize: '14px',
      descLines: 2,
    },
    medium: {
      width: '280px',
      height: '200px',
      imageHeight: '160px', // 增加封面图高度
      titleSize: '16px',
      descLines: 3,
    },
    large: {
      width: '320px',
      height: '240px',
      imageHeight: '200px', // 增加封面图高度
      titleSize: '18px',
      descLines: 4,
    },
  };

  const config = sizeConfig[size];

  const handleClick = () => {
    if (onAction) {
      onAction(item);
    } else {
      // 默认行为：根据内容类型处理
      if (item.category === 'Video' && item.videoUrl) {
        window.electronAPI?.openExternal?.(item.videoUrl);
      } else if (item.externalUrl) {
        window.electronAPI?.openExternal?.(item.externalUrl);
      }
    }
  };

  const truncateText = (text: string, lines: number) => {
    const maxLength = lines * 30; // 估算每行30个字符
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div
      className="content-card"
      style={{
        width: config.width,
        height: config.height,
        borderRadius: '12px',
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        transform: isHovered ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)',
        boxShadow: isHovered 
          ? '0 20px 40px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.2)' 
          : '0 4px 12px rgba(0, 0, 0, 0.15)',
        backdropFilter: 'blur(10px)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      {/* 封面图片区域 */}
      <div
        style={{
          height: config.imageHeight,
          backgroundColor: '#1E293B',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {!imageError && item.coverUrl ? (
          <img
            src={item.coverUrl}
            alt={item.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.3s ease',
              transform: isHovered ? 'scale(1.1)' : 'scale(1)',
            }}
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)',
              color: '#64748B',
            }}
          >
            <PlatformIcon size={32} />
          </div>
        )}


      </div>

      {/* 内容区域 */}
      <div style={{ padding: '8px', height: `calc(100% - ${config.imageHeight})` }}>
        <h3
          style={{
            fontSize: config.titleSize,
            fontWeight: '600',
            color: '#F1F5F9',
            margin: '0',
            lineHeight: '1.2',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.title}
        </h3>
        



      </div>
    </div>
  );
};

export default ContentCard;