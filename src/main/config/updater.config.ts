/**
 * 自动更新器配置
 */
export interface UpdaterConfig {
  /** 更新服务器URL (你的R2自定义域名) */
  updateServerUrl: string;
  
  /** 检查更新的间隔时间（小时） */
  checkIntervalHours: number;
  
  /** 启动后延迟检查的时间（毫秒） */
  initialDelayMs: number;
  
  /** 是否启用自动更新 */
  enabled: boolean;
}

/**
 * 默认更新器配置
 * 请根据你的实际情况修改 updateServerUrl
 */
export const updaterConfig: UpdaterConfig = {
  // 替换为你的R2自定义域名，例如: 'https://updates.yourdomain.com'
  updateServerUrl: process.env.UPDATE_SERVER_URL || 'https://c77d4a202f5816bfb892c8583e016ec4.r2.cloudflarestorage.com/xiaodouli',
  
  // 每4小时检查一次更新
  checkIntervalHours: 4,
  
  // 应用启动后30秒开始检查更新
  initialDelayMs: 30000,
  
  // 启用自动更新
  enabled: true,
};
