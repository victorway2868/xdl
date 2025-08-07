import React from 'react';
import { Link } from 'react-router-dom';

function MorePage() {
  // 检查更新函数
  const checkForUpdates = async () => {
    if (window.electron) {
      try {
        console.log('正在检查更新...');
        await window.electron.checkForUpdates();
        console.log('检查更新完成');
      } catch (error) {
        console.error('检查更新失败:', error);
      }
    } else {
      console.log('非Electron环境，无法检查更新');
      alert('只有在桌面应用中才能检查更新');
    }
  };

  // 功能卡片数据
  const features = [
    {
      id: 1,
      name: '检查更新',
      icon: '🔄',
      description: '检查软件是否有新版本可用',
      color: 'from-green-500 to-emerald-600',
      onClick: checkForUpdates
    },
    {
      id: 2,
      name: '数据分析',
      icon: '📊',
      description: '查看您的直播数据分析和观众统计信息',
      color: 'from-blue-500 to-indigo-600'
    },
    {
      id: 3,
      name: '社区论坛',
      icon: '👥',
      description: '加入直播社区，分享经验和技巧',
      color: 'from-purple-500 to-indigo-600'
    },
    {
      id: 4,
      name: '直播日历',
      icon: '📅',
      description: '安排和管理您的直播计划',
      color: 'from-pink-500 to-rose-600'
    },
    {
      id: 5,
      name: '咨询服务',
      icon: '💬',
      description: '获取专业的直播咨询和指导',
      color: 'from-emerald-500 to-teal-600'
    },
    {
      id: 6,
      name: '个性化设置',
      icon: '⚙️',
      description: '自定义您的直播软件设置和界面',
      color: 'from-amber-500 to-orange-600'
    },
    {
      id: 7,
      name: '资源下载',
      icon: '📥',
      description: '下载直播素材、模板和工具',
      color: 'from-cyan-500 to-blue-600'
    },
    {
      id: 8,
      name: '合作伙伴',
      icon: '🤝',
      description: '探索与品牌和商家的合作机会',
      color: 'from-lime-500 to-green-600'
    }
  ];

  return (
    <div className="min-h-full bg-gray-900 text-white p-2 flex flex-col h-full gap-2">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-indigo-400">更多功能</h1>
        <Link to="/app" className="text-indigo-400 hover:text-indigo-300 text-sm">返回首页</Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map(feature => (
          <div
            key={feature.id}
            className={`bg-gradient-to-br ${feature.color} rounded-xl p-4 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 cursor-pointer`}
          >
            <div className="text-4xl mb-3">{feature.icon}</div>
            <h2 className="text-xl font-bold text-white mb-2">{feature.name}</h2>
            <p className="text-white/80 text-sm">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* 用户反馈区域 */}
      <div className="mt-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 border border-indigo-900/30">
        <h2 className="text-lg font-semibold text-indigo-300 mb-3">我们需要您的反馈</h2>
        <p className="text-gray-300 text-sm mb-4">
          请告诉我们您对软件的想法和建议，帮助我们不断改进直播体验。
        </p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="请输入您的反馈或建议..."
            className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 border border-gray-600"
          />
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
            提交反馈
          </button>
        </div>
      </div>
    </div>
  );
}

export default MorePage;