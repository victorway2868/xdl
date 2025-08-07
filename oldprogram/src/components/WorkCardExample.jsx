import React from 'react';
import WorkCard from './WorkCard';

/**
 * WorkCard 组件使用示例
 * 展示不同尺寸、变体和配置的 WorkCard 组件
 */
const WorkCardExample = () => {
  // 示例数据
  const exampleWorks = [
    {
      id: 1,
      title: '直播间互动特效',
      description: '增强观众互动体验的特效插件，支持多种动画效果和自定义配置',
      category: '插件',
      coverImage: '/images/plugin1.jpg',
      version: '2.1.0',
      rating: 4.8,
      tags: ['特效', '互动', '热门'],
      author: '小斗笠工作室'
    },
    {
      id: 2,
      title: 'iPhone 15 Pro Max',
      description: '专业直播设备，支持4K录制，ProRes视频格式，适合专业内容创作',
      category: '设备推荐',
      coverImage: '/images/iphone15.jpg',
      price: '¥9,999',
      rating: 4.9,
      tags: ['手机', '4K', '专业'],
      author: 'Apple'
    },
    {
      id: 3,
      title: 'OBS配置完全指南',
      description: '从零开始学会OBS直播配置，包含场景设置、音频调试、推流优化等',
      category: '教程',
      coverImage: '/images/obs-tutorial.jpg',
      tags: ['OBS', '配置', '新手'],
      author: '直播学院'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-blue-400">
          WorkCard 组件示例
        </h1>
        
        {/* 不同尺寸示例 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-gray-300">不同尺寸</h2>
          
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4 text-gray-400">小尺寸 (Small)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {exampleWorks.map(work => (
                <WorkCard
                  key={`small-${work.id}`}
                  {...work}
                  size="small"
                  variant="compact"
                  showActions={false}
                  onClick={() => console.log('点击:', work.title)}
                />
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4 text-gray-400">中等尺寸 (Medium)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {exampleWorks.map(work => (
                <WorkCard
                  key={`medium-${work.id}`}
                  {...work}
                  size="medium"
                  variant="default"
                  showActions={true}
                  onClick={() => console.log('点击:', work.title)}
                  onSecondaryAction={() => console.log('次要操作:', work.title)}
                />
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4 text-gray-400">大尺寸 (Large)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {exampleWorks.slice(0, 2).map(work => (
                <WorkCard
                  key={`large-${work.id}`}
                  {...work}
                  size="large"
                  variant="featured"
                  showActions={true}
                  onClick={() => console.log('点击:', work.title)}
                  onSecondaryAction={() => console.log('次要操作:', work.title)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* 不同变体示例 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-gray-300">不同变体</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-4 text-gray-400">默认变体 (Default)</h3>
              <WorkCard
                {...exampleWorks[0]}
                size="medium"
                variant="default"
                showActions={true}
                onClick={() => console.log('默认变体点击')}
                onSecondaryAction={() => console.log('默认变体次要操作')}
              />
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4 text-gray-400">紧凑变体 (Compact)</h3>
              <WorkCard
                {...exampleWorks[1]}
                size="medium"
                variant="compact"
                showActions={true}
                onClick={() => console.log('紧凑变体点击')}
                onSecondaryAction={() => console.log('紧凑变体次要操作')}
              />
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4 text-gray-400">特色变体 (Featured)</h3>
              <WorkCard
                {...exampleWorks[2]}
                size="medium"
                variant="featured"
                showActions={true}
                onClick={() => console.log('特色变体点击')}
                onSecondaryAction={() => console.log('特色变体次要操作')}
              />
            </div>
          </div>
        </section>

        {/* 状态示例 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-gray-300">不同状态</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-4 text-gray-400">加载状态</h3>
              <WorkCard
                {...exampleWorks[0]}
                size="medium"
                variant="default"
                isLoading={true}
                showActions={true}
              />
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4 text-gray-400">禁用状态</h3>
              <WorkCard
                {...exampleWorks[1]}
                size="medium"
                variant="default"
                isDisabled={true}
                showActions={true}
              />
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4 text-gray-400">无操作按钮</h3>
              <WorkCard
                {...exampleWorks[2]}
                size="medium"
                variant="default"
                showActions={false}
                onClick={() => console.log('无操作按钮点击')}
              />
            </div>
          </div>
        </section>

        {/* 使用说明 */}
        <section className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-300">使用说明</h2>
          <div className="text-gray-400 space-y-2">
            <p><strong>尺寸:</strong> small, medium, large</p>
            <p><strong>变体:</strong> default, compact, featured</p>
            <p><strong>必需属性:</strong> title</p>
            <p><strong>可选属性:</strong> description, category, coverImage, version, price, rating, tags, author</p>
            <p><strong>交互:</strong> onClick, onSecondaryAction, secondaryActionText</p>
            <p><strong>状态:</strong> isLoading, isDisabled, showActions</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default WorkCardExample;
