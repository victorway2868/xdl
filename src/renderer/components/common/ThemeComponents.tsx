import React from 'react';

// 主题卡片组件 - 自动继承主题
export const ThemeCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary';
}> = ({ children, className = '', variant = 'primary' }) => {
  const baseClass = variant === 'primary' ? 'theme-card' : 'theme-card-secondary';
  return (
    <div className={`${baseClass} ${className}`}>
      {children}
    </div>
  );
};

// 主题导航栏组件
export const ThemeNavbar: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <div className={`theme-navbar ${className}`}>
      {children}
    </div>
  );
};

// 主题文字组件
export const ThemeText: React.FC<{
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'muted';
}> = ({ children, className = '', variant = 'primary' }) => {
  const textClass = `theme-text-${variant}`;
  return (
    <span className={`${textClass} ${className}`}>
      {children}
    </span>
  );
};

// 主题按钮组件
export const ThemeButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary';
  title?: string;
}> = ({ children, onClick, className = '', variant = 'primary', title }) => {
  const buttonClass = variant === 'primary' ? 'theme-btn-primary' : 'theme-btn-secondary';
  return (
    <button 
      onClick={onClick}
      className={`${buttonClass} ${className}`}
      title={title}
    >
      {children}
    </button>
  );
};
