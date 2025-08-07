import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, CreditCard, MessageSquare, Settings } from 'lucide-react';

function MembershipPage() {
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');

  // 软件会员信息（这里应该是软件本身的用户系统，不是抖音用户）
  const currentUser = {
    username: "用户001",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-1.2.1&auto=format&fit=crop&w=128&q=80",
    vipLevel: "高级会员",
    vipDaysLeft: 15,
    joinDate: "2024-01-15"
  };
  
  const handleRenew = () => {
    setShowRenewModal(true);
  };
  
  const selectPlan = (planDays) => {
    setSelectedPlan(planDays);
  };
  
  if (!currentUser) {
    return (
      <div className="min-h-full bg-gray-900 text-white p-4 flex items-center justify-center">
        <p>请先登录查看个人信息</p>
      </div>
    );
  }
  
  return (
    <div className="h-full bg-gray-900 text-white flex flex-col">
      <div className="flex justify-between items-center p-2 pb-1">
        <h1 className="text-base font-bold flex items-center">
          <User className="w-4 h-4 mr-1.5 text-blue-400" />
          个人中心
        </h1>
        <Link to="/app" className="text-indigo-400 hover:text-indigo-300 text-sm">返回首页</Link>
      </div>
      <div className="flex-1 p-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 h-full">
          <div className="bg-gray-800 rounded-lg p-2 flex flex-col border border-gray-700">
            <h2 className="text-sm font-semibold mb-1 flex items-center">
              <User className="w-3.5 h-3.5 mr-1 text-blue-400" />
              账号信息
            </h2>
            
            <div className="flex items-center mb-2">
              <img
                src={currentUser.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-1.2.1&auto=format&fit=crop&w=128&q=80"}
                alt="用户头像"
                className="w-20 h-20 rounded-full mr-2"
              />
              <div>
                <h3 className="font-medium text-xs"><span className="text-gray-400">用户名：</span>{currentUser.username}</h3>
                <p className="text-gray-400 text-xs">账号ID: 12345789</p>
              </div>
            </div>
            
            <h2 className="text-sm font-semibold mb-1 flex items-center">
              <CreditCard className="w-3.5 h-3.5 mr-1 text-yellow-400" />
              VIP会员状态
            </h2>
            <div className="bg-gray-700 rounded-lg p-2 mb-0 border border-gray-600">
              <div className="flex justify-between items-center mb-1">
                <span className="text-yellow-400 font-medium text-xs">高级会员</span>
                <span className="text-gray-400 text-xs">剩余: {currentUser.vipDaysLeft}天</span>
              </div>
              <div className="w-full h-1.5 bg-gray-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-500 rounded-full"
                  style={{ width: `${(currentUser.vipDaysLeft / 30) * 100}%` }}
                />
              </div>
            </div>
            
            <button 
              onClick={handleRenew}
              className="w-full py-1 bg-yellow-600 hover:bg-yellow-700 rounded flex items-center justify-center text-xs mt-1"
            >
              <CreditCard className="mr-1" size={12} />
              续费会员
            </button>
          </div>

          <div className="bg-gray-800 rounded-lg p-2 flex flex-col border border-gray-700">
            <h2 className="text-sm font-semibold mb-1 flex items-center">
              <MessageSquare className="w-3.5 h-3.5 mr-1 text-blue-400" />
              联系客服
            </h2>
            
            <div className="flex flex-col items-center mb-2">
              <div className="bg-white p-1 rounded-lg mb-1">
                <img 
                  src="https://images.unsplash.com/photo-1588336271629-1704e27ef8be?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80" 
                  alt="客服二维码" 
                  className="w-20 h-20 object-cover"
                />
              </div>
              <p className="text-center text-gray-400 text-xs">扫描二维码添加客服微信</p>
            </div>
            
            <button 
              className="w-full py-1 bg-blue-600 hover:bg-blue-700 rounded flex items-center justify-center text-xs mb-1"
            >
              <MessageSquare className="mr-1" size={12} />
              在线咨询
            </button>
            
            <h3 className="font-medium mb-1 text-xs flex items-center">
              <Settings className="w-3.5 h-3.5 mr-1 text-gray-400" />
              常见问题
            </h3>
            <div className="space-y-1 overflow-hidden">
              <div className="bg-gray-700 p-1.5 rounded border border-gray-600">
                <h4 className="font-medium text-xs">如何设置直播参数?</h4>
                <p className="text-xs text-gray-400 truncate">在主页的直播设置中，您可以设置平台、直播方式</p>
              </div>
              <div className="bg-gray-700 p-1.5 rounded border border-gray-600">
                <h4 className="font-medium text-xs">如何添加自定义音效?</h4>
                <p className="text-xs text-gray-400 truncate">在主播音效页面，点击+</p>
              </div>
              <div className="bg-gray-700 p-1.5 rounded border border-gray-600">
                <h4 className="font-medium text-xs">会员有哪些特权?</h4>
                <p className="text-xs text-gray-400 truncate">会员可以使用高级特效、无限量音效</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Renew Modal */}
      {showRenewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-3 w-full max-w-xs border border-gray-700 shadow-lg">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-semibold flex items-center">
                <CreditCard className="w-3.5 h-3.5 mr-1 text-yellow-400" />
                续费会员
              </h2>
              <button 
                onClick={() => setShowRenewModal(false)}
                className="text-gray-400 hover:text-white rounded-full p-0.5 hover:bg-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mb-2">
              <button 
                onClick={() => selectPlan('30')}
                className={`p-1 rounded-lg border ${selectedPlan === '30' ? 'border-yellow-500 bg-gray-700' : 'border-gray-700 hover:border-gray-600'}`}
              >
                <div className="text-xs font-bold">30天</div>
                <div className="text-yellow-500 text-xs">¥30</div>
              </button>
              <button 
                onClick={() => selectPlan('90')}
                className={`p-1 rounded-lg border ${selectedPlan === '90' ? 'border-yellow-500 bg-gray-700' : 'border-gray-700 hover:border-gray-600'}`}
              >
                <div className="text-xs font-bold">90天</div>
                <div className="text-yellow-500 text-xs">¥63</div>
                <div className="text-[10px] text-green-500">7折</div>
              </button>
              <button 
                onClick={() => selectPlan('180')}
                className={`p-1 rounded-lg border ${selectedPlan === '180' ? 'border-yellow-500 bg-gray-700' : 'border-gray-700 hover:border-gray-600'}`}
              >
                <div className="text-xs font-bold">180天</div>
                <div className="text-yellow-500 text-xs">¥90</div>
                <div className="text-[10px] text-green-500">5折</div>
              </button>
            </div>
            
            {selectedPlan && (
              <div>
                <div className="text-center mb-1">
                  <div className="text-gray-400 text-xs">应付金额</div>
                  <div className="text-base font-bold text-yellow-500">
                    {selectedPlan === '30' ? '¥30' : selectedPlan === '90' ? '¥63' : '¥90'}
                  </div>
                </div>
                <div className="bg-white p-1 rounded-lg flex justify-center">
                  <img 
                    src="https://images.unsplash.com/photo-1588336271629-1704e27ef8be?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80" 
                    alt="支付二维码" 
                    className="w-36 h-36 object-cover"
                  />
                </div>
                <p className="text-center text-gray-400 text-xs mt-1">请使用微信或支付宝扫码支付</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MembershipPage;