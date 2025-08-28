import React, { useState, useEffect } from 'react';
import imageCacheService from '../../utils/ImageCacheService';

/**
 * 图片缓存调试组件 - 用于开发调试
 */
const ImageCacheDebug: React.FC = () => {
  const [stats, setStats] = useState({ loaded: 0, failed: 0, loading: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(imageCacheService.getStats());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          padding: '5px 8px',
          fontSize: '12px',
          cursor: 'pointer',
          zIndex: 9999,
        }}
      >
        🖼️ Cache
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '8px',
        padding: '10px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 9999,
        minWidth: '150px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
        <span>图片缓存状态</span>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: '0',
          }}
        >
          ×
        </button>
      </div>
      <div>✅ 已缓存: {stats.loaded}</div>
      <div>❌ 失败: {stats.failed}</div>
      <div>🔄 加载中: {stats.loading}</div>
      <button
        onClick={() => imageCacheService.clearCache()}
        style={{
          marginTop: '5px',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: 'white',
          borderRadius: '4px',
          padding: '3px 6px',
          fontSize: '11px',
          cursor: 'pointer',
          width: '100%',
        }}
      >
        清除缓存记录
      </button>
    </div>
  );
};

export default ImageCacheDebug;
