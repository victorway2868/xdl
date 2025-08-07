import React from 'react';

interface WorkCardProps {
  // 服务器数据字段 - 直接对应服务器返回的数据
  id?: string | number;              // 数据ID
  title?: string;           // 标题
  description?: string;     // 描述
  type?: string;            // 媒体类型 (video, image)
  url?: string;             // 链接地址
  platform?: string;        // 平台 (douyin, kuaishou, etc.)
  playType?: string;        // 播放类型 (manual, autoplay, etc.)
  viewCount?: number;       // 观看次数
  isHot?: boolean;           // 是否热门
  coverurl?: string;        // 封面图片URL (注意是coverurl不是coverImage)

  // 可选的服务器字段
  thumbnail?: string;       // 缩略图 (备用封面)
  duration?: number;        // 时长
  level?: string;           // 等级 (tutorial专用)
  deviceModel?: string;     // 设备型号 (device专用)
  downloadUrl?: string;     // 下载链接 (plugin专用)
  clickUrl?: string;        // 点击链接 (advertisement专用)
  version?: string;         // 版本号 (plugin专用)
  rating?: number;          // 评分

  // 交互
  onClick?: () => void;         // 点击事件
  onSecondaryAction?: () => void; // 次要操作
  secondaryActionText?: string; // 次要操作按钮文字

  // 样式定制
  size?: 'small' | 'medium' | 'large'; // 尺寸: 'small', 'medium', 'large'
  variant?: 'default' | 'compact' | 'featured'; // 变体: 'default', 'compact', 'featured'
  className?: string;  // 自定义CSS类

  // 状态
  isLoading?: boolean;
  isDisabled?: boolean;
  showActions?: boolean; // 是否显示操作按钮
}

/**
 * 通用作品封面组件
 * 可用于视频教程、插件、设备推荐等各种内容的展示
 */
const WorkCard: React.FC<WorkCardProps> = ({
  // 服务器数据字段 - 直接对应服务器返回的数据
  id,              // 数据ID
  title,           // 标题
  description,     // 描述
  type,            // 媒体类型 (video, image)
  url,             // 链接地址
  platform,        // 平台 (douyin, kuaishou, etc.)
  playType,        // 播放类型 (manual, autoplay, etc.)
  viewCount,       // 观看次数
  isHot,           // 是否热门
  coverurl,        // 封面图片URL (注意是coverurl不是coverImage)

  // 可选的服务器字段
  thumbnail,       // 缩略图 (备用封面)
  duration,        // 时长
  level,           // 等级 (tutorial专用)
  deviceModel,     // 设备型号 (device专用)
  downloadUrl,     // 下载链接 (plugin专用)
  clickUrl,        // 点击链接 (advertisement专用)
  version,         // 版本号 (plugin专用)
  rating,          // 评分

  // 交互
  onClick,         // 点击事件
  onSecondaryAction, // 次要操作
  secondaryActionText = '查看详情', // 次要操作按钮文字

  // 样式定制
  size = 'medium', // 尺寸: 'small', 'medium', 'large'
  variant = 'default', // 变体: 'default', 'compact', 'featured'
  className = '',  // 自定义CSS类

  // 状态
  isLoading = false,
  isDisabled = false,
  showActions = true, // 是否显示操作按钮
}) => {
  // 根据尺寸设置样式
  const sizeClasses = {
    small: {
      container: 'h-48',
      image: 'h-32',
      title: 'text-sm',
      description: 'text-xs',
      padding: 'p-2'
    },
    medium: {
      container: 'h-64',
      image: 'h-32',
      title: 'text-base',
      description: 'text-sm',
      padding: 'p-3'
    },
    large: {
      container: 'h-80',
      image: 'h-48',
      title: 'text-lg',
      description: 'text-base',
      padding: 'p-4'
    }
  };

  // 根据变体设置样式
  const variantClasses = {
    default: 'bg-gradient-to-br from-gray-800 to-gray-900 border-indigo-900/30 hover:border-indigo-700/50',
    compact: 'bg-slate-700/50 border-slate-600/40 hover:bg-slate-700',
    featured: 'bg-gradient-to-br from-blue-800 to-purple-900 border-blue-700/50 hover:border-blue-500/70'
  };

  const currentSize = sizeClasses[size];
  const currentVariant = variantClasses[variant];

  // 处理图片加载错误
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzc0MTUxIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlDQTNBRiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuaXoOWbvueJhzwvdGV4dD48L3N2Zz4=';
  };

  // 获取封面图片URL - 优先使用coverurl，然后是thumbnail
  const getCoverImage = () => {
    return coverurl || thumbnail || null;
  };

  // 获取分类显示文本
  const getCategory = () => {
    // 根据不同的数据类型返回相应的分类
    if (deviceModel) return '设备推荐';
    if (level) return '教程';
    if (downloadUrl || version) return '插件';
    if (clickUrl) return '广告';
    return type || '其他';
  };

  // 格式化观看次数
  const formatViewCount = (count?: number) => {
    if (!count) return '';
    if (count >= 10000) {
      return `${(count / 10000).toFixed(1)}万次观看`;
    }
    return `${count}次观看`;
  };

  return (
    <div
      className={`
        ${currentSize.container}
        ${currentVariant}
        rounded-lg border shadow-lg overflow-hidden transition-all duration-300
        ${onClick ? 'cursor-pointer hover:shadow-xl hover:scale-[1.02]' : ''}
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      onClick={!isDisabled && onClick ? onClick : undefined}
    >
      {/* 封面图片区域 */}
      <div className={`${currentSize.image} bg-gray-800 overflow-hidden relative`}>
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : getCoverImage() ? (
          <img
            src={getCoverImage()}
            alt={title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
            {title || '暂无封面'}
          </div>
        )}

        {/* 分类标签 */}
        <div className="absolute top-2 left-2">
          <span className="inline-block bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
            {getCategory()}
          </span>
        </div>

        {/* 热门标签 */}
        {isHot && (
          <div className="absolute top-2 right-2">
            <span className="inline-block bg-red-500/90 text-white text-xs px-2 py-1 rounded font-medium">
              🔥 热门
            </span>
          </div>
        )}

        {/* 评分 */}
        {rating && (
          <div className="absolute top-10 right-2">
            <span className="inline-block bg-yellow-500/90 text-black text-xs px-2 py-1 rounded font-medium">
              ⭐ {rating}
            </span>
          </div>
        )}
      </div>

      {/* 内容区域 */}
      <div className={`${currentSize.padding} flex flex-col min-h-16`}>
        {/* 标题和版本 */}
        <div className="flex justify-between items-start mb-1">
          <div className="flex-1 mr-2">
            <div className="flex items-baseline gap-2">
              <h3 className={`${currentSize.title} font-semibold text-white leading-tight flex-1`}
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                {title}
              </h3>
              {/* 显示观看次数在标题右侧 */}
              {viewCount && (
                <span className="text-xs text-gray-400 shrink-0">
                  {formatViewCount(viewCount)}
                </span>
              )}
            </div>
          </div>
          {version && (
            <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded shrink-0">
              v{version}
            </span>
          )}
        </div>

        {/* 底部信息和操作 */}
        <div className="flex justify-between items-end mt-auto">
          <div className="flex flex-col">
            {/* 显示平台信息 */}
            {platform && (
              <span className="text-xs text-gray-400">
                {platform}
              </span>
            )}
          </div>

          {showActions && onSecondaryAction && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSecondaryAction();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 rounded text-xs transition-colors"
              disabled={isDisabled}
            >
              {secondaryActionText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkCard;
