import React from 'react';
import { X } from 'lucide-react';

interface VideoModalProps {
  isOpen: boolean;
  videoUrl?: string;
  platform?: string;
  title?: string;
  onClose: () => void;
}

/**
 * 视频播放弹窗组件
 * 根据平台自动生成播放器URL
 */
const VideoModal: React.FC<VideoModalProps> = ({
  isOpen,
  videoUrl,
  platform,
  title,
  onClose
}) => {
  if (!isOpen) return null;

  // 从URL中提取视频ID
  const extractVideoId = (url: string, platformType: string): string | null => {
    if (!url || !platformType) return null;

    // 抖音平台
    if (platformType === 'douyin') {
      const patterns = [
        /\/(\d{19})\/?/,  // 19位数字ID
        /\/(\d{18})\/?/,  // 18位数字ID
        /\/(\d{17})\/?/,  // 17位数字ID
        /video[\/=](\d+)/i, // video/ID 或 video=ID 格式
        /v[\/=](\d+)/i,     // v/ID 或 v=ID 格式
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }

      // 尝试从文件名提取
      const filename = url.split('/').pop();
      if (filename) {
        const filenameMatch = filename.match(/(\d{17,19})/);
        if (filenameMatch) {
          return filenameMatch[1];
        }
      }
    }

    return null;
  };

  // 生成播放器URL
  const getPlayerUrl = (): string | null => {
    if (!videoUrl) return null;

    // 智能检测：优先根据URL内容判断平台，而不是platform字段
    let detectedPlatform = platform;
    
    // 根据URL自动检测平台
    if (videoUrl.includes('douyin.com') || videoUrl.includes('dy.com')) {
      detectedPlatform = 'douyin';
    } else if (videoUrl.includes('kuaishou.com')) {
      detectedPlatform = 'kuaishou';
    } else if (videoUrl.includes('bilibili.com')) {
      detectedPlatform = 'bilibili';
    } else if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      detectedPlatform = 'youtube';
    }

    console.log('原始platform:', platform);
    console.log('检测到的platform:', detectedPlatform);
    console.log('videoUrl:', videoUrl);

    const videoId = extractVideoId(videoUrl, detectedPlatform || 'douyin');
    console.log('提取的videoId:', videoId);
    
    if (!videoId) return null;

    // 抖音平台
    if (detectedPlatform === 'douyin') {
      return `https://open.douyin.com/player/video?vid=${videoId}&autoplay=0`;
    }

    // 其他平台可以在这里添加
    // if (detectedPlatform === 'kuaishou') {
    //   return `https://live.kuaishou.com/profile/${videoId}`;
    // }

    return null;
  };

  const playerUrl = getPlayerUrl();

  // 如果无法生成播放器URL，显示错误信息
  if (!playerUrl) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
        <div className="relative w-full max-w-md bg-gray-900 rounded-lg p-6">
          <div className="absolute top-4 right-4">
            <button
              onClick={onClose}
              className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-full transition-colors shadow-lg"
            >
              <X size={20} />
            </button>
          </div>
          <div className="text-center text-white">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold mb-2">无法播放视频</h3>
            <p className="text-gray-400 text-sm">
              无法从视频URL中提取播放信息，或暂不支持该平台的视频播放
            </p>
            <div className="mt-4 text-xs text-gray-500">
              <p>Platform: {platform}</p>
              <p>VideoUrl: {videoUrl}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="relative w-full max-w-6xl h-full max-h-[95vh] bg-gray-900 rounded-lg overflow-hidden flex flex-col">
        {/* 关闭按钮 */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={onClose}
            className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-full transition-colors shadow-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* 标题栏（可选） */}
        {title && (
          <div className="bg-gray-800 px-6 py-3 border-b border-gray-700">
            <h3 className="text-white font-semibold truncate">{title}</h3>
          </div>
        )}

        {/* 视频播放区域 */}
        <div className="flex-1 min-h-0">
          <iframe
            src={playerUrl}
            className="w-full h-full border-0"
            allowFullScreen
            title={title || '视频播放器'}
            style={{ minHeight: '500px' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        </div>

        {/* 底部信息栏（可选） */}
        {platform && (
          <div className="bg-gray-800 px-6 py-2 border-t border-gray-700">
            <span className="text-xs text-gray-400">
              来源: {platform === 'douyin' ? '抖音' : platform}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoModal;
