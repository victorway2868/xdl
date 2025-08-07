import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// 主题类型定义
export type ThemeType = 'light' | 'dark';

// 主题上下文接口
interface ThemeContextType {
  themeType: ThemeType;
  toggleTheme: () => void;
  setTheme: (type: ThemeType) => void;
}

// 创建主题上下文
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// 主题提供者组件
interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeType;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'dark'
}) => {
  const [themeType, setThemeType] = useState<ThemeType>(defaultTheme);

  // 从本地存储加载主题设置
  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme') as ThemeType;
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      setThemeType(savedTheme);
    }
  }, []);

  // 应用Tailwind暗色模式类
  useEffect(() => {
    localStorage.setItem('app-theme', themeType);

    // 使用Tailwind的暗色模式类
    if (themeType === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [themeType]);

  const toggleTheme = () => {
    setThemeType(prev => prev === 'light' ? 'dark' : 'light');
  };

  const setTheme = (type: ThemeType) => {
    setThemeType(type);
  };

  const value: ThemeContextType = {
    themeType,
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// 使用主题的 Hook
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
