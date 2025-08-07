
import React from 'react';
import { User, Check, AlertCircle, Link, Key, Copy } from 'lucide-react';
import './HomePageUI.css';

const HomePageUI = () => {
  return (
    <div className="home-page-container">
      {/* Login Modal Placeholder */}
      {/* <LoginModal isOpen={false} onClose={() => {}} onWebLogin={() => {}} onCompanionLogin={() => {}} /> */}

      {/* Auth Notification Placeholder */}
      {/* <AuthNotification message="" isVisible={false} onClose={() => {}} /> */}

      {/* Status Prompt Placeholder */}
      {/* <StatusPrompt message="" isVisible={false} onClose={() => {}} type="info" /> */}

      <div className="top-section">
        <div className="stream-section">
          <div className="stream-header">
            <div className="version-info">
              <span>OBS：</span>
              <span className="version-number">检测中</span>
            </div>
            <div className="version-info">
              <span>伴侣：</span>
              <span className="version-number">检测中</span>
            </div>
            <div className="toggle-switch">
              <input type="checkbox" className="sr-only" />
              <div className="toggle-bg"></div>
            </div>
          </div>
          <div className="stream-control">
            <button className="stream-button">
              开始直播
            </button>
          </div>
          <div className="stream-footer">
            <button className="footer-button" onClick={() => window.alert('Navigate to OBS config')}>
              OBS一键配置
            </button>
            <button className="footer-button" onClick={() => window.alert('Navigate to Danmu')}>
              打开弹幕
            </button>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-content">
            <div className="platform-selection">
              <div className="platform-header">
                <label>选择平台</label>
                <button className="login-button">登录平台</button>
              </div>
              <select className="platform-select">
                <option>抖音</option>
                <option>Bilibili</option>
              </select>
              <div>
                <label>直播方式</label>
                <select className="platform-select">
                  <option>直播伴侣</option>
                  <option>手机开播</option>
                </select>
              </div>
            </div>
            <div className="user-info-section">
              <div className="user-info-content">
                <div className="user-avatar-placeholder">
                  <User size={32} />
                </div>
                <p className="login-prompt">请先登录</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="ad-section">
        <div className="ad-content">
          <div className="ad-loading">
            <div className="spinner"></div>
            <span>加载广告中...</span>
          </div>
        </div>
      </div>

      <div className="recommendations-section">
        <div className="recommendations-header">
          <h2>热门推荐</h2>
          <nav>
            <button>插件</button>
            <button>设备推荐</button>
            <button>直播教程</button>
            <button>更多</button>
          </nav>
        </div>
        <div className="recommendations-loading">
          <div className="spinner"></div>
          <span>正在加载热门推荐...</span>
        </div>
        <div className="recommendations-grid">
          {/* Placeholder for WorkCard components */}
        </div>
      </div>

      {/* OBS Settings Modal Placeholder */}
      {/* <div className="modal-backdrop">
        <div className="modal-content">
          <h2>参数设置</h2>
          ...
        </div>
      </div> */}
    </div>
  );
};

export default HomePageUI;
