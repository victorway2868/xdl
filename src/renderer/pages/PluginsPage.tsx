import React, { useState } from 'react';
import { ContentItem } from '../store/features/contentSlice';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import ContentCard from '../components/common/ContentCard';
import ContentModal from '../components/common/ContentModal';
import { ArrowLeft, Puzzle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PluginsPage: React.FC = () => {
  const navigate = useNavigate();

  const { data, loading, error } = useSelector((state: RootState) => state.content);
  

  
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCardAction = (item: ContentItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const plugins = data?.OBSPlugins || [];

  return (
    <div style={{ 
      padding: '24px', 
      minHeight: '100vh',
      backgroundColor: '#0F172A',
      color: '#F1F5F9'
    }}>
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
            <Puzzle size={28} color="#10B981" />
            <h1 style={{ 
              fontSize: '28px', 
              fontWeight: '700', 
              margin: 0,
              background: 'linear-gradient(to right, #10B981, #3B82F6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              OBS插件
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
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(16, 185, 129, 0.3)',
            borderTop: '3px solid #10B981',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ color: '#94A3B8', fontSize: '16px' }}>正在加载插件数据...</p>
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
          <button
            onClick={refresh}
            style={{
              backgroundColor: '#EF4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            重试
          </button>
        </div>
      ) : plugins.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          color: '#94A3B8'
        }}>
          <Puzzle size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <p style={{ fontSize: '18px', marginBottom: '8px' }}>暂无插件内容</p>
          <p style={{ fontSize: '14px' }}>请稍后再试或联系管理员</p>
        </div>
      ) : (
        <>
          {/* 统计信息 */}
          <div style={{ 
            marginBottom: '24px',
            padding: '16px 20px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '12px'
          }}>
            <p style={{ 
              margin: 0, 
              color: '#6EE7B7', 
              fontSize: '14px' 
            }}>
              共找到 <strong>{plugins.length}</strong> 个插件
            </p>
          </div>

          {/* 插件网格 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '24px',
            marginBottom: '40px'
          }}>
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