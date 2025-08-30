import React from 'react';
import { X } from 'lucide-react';
import '../styles/themes.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onWebLogin: () => void;
  onCompanionLogin: () => void;
}

const LoginModal: React.FC<Props> = ({ isOpen, onClose, onWebLogin, onCompanionLogin }) => {
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay">
      <div className="modal-content login-modal">
        {/* 标题栏 */}
        <div className="modal-header">
          <h2 className="modal-title">选择登录方式</h2>
          <button
            onClick={onClose}
            className="modal-close-btn"
            aria-label="关闭弹窗"
          >
            <X size={20} />
          </button>
        </div>

        {/* 登录选项 */}
        <div className="login-options">
          <button
            onClick={onWebLogin}
            className="btn-login-option btn-login-web"
          >
            抖音网页登录
          </button>

          <button
            onClick={onCompanionLogin}
            className="btn-login-option btn-login-companion"
          >
            抖音直播伴侣
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;

