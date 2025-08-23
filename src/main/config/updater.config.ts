/**
 * 自动更新器配置
 */
export interface UpdaterConfig {
  /** 更新服务器URL (你的R2自定义域名) */
  updateServerUrl: string;

  /** 是否启用自动更新 */
  enabled: boolean;

  /** 应用启动时是否立即检查更新（无延迟） */
  checkOnStartup: boolean;

  /** 是否启用定时检查（默认关闭） */
  periodicCheckEnabled: boolean;

  /** 检查更新的间隔时间（小时），仅当 periodicCheckEnabled 为 true 时有效 */
  checkIntervalHours?: number;

  /** 启动后延迟检查的时间（毫秒）；设为 0 表示不延迟。仅当 periodicCheckEnabled 为 true 时有效 */
  initialDelayMs?: number;
}

/**
 * 默认更新器配置
 * 请根据你的实际情况修改 updateServerUrl
 */
export const updaterConfig: UpdaterConfig = {
  // 替换为你的R2自定义域名，例如: 'https://updates.yourdomain.com'
  updateServerUrl: process.env.UPDATE_SERVER_URL || 'https://xiaodouli.openclouds.dpdns.org',

  // 启用自动更新
  enabled: true,

  // 应用启动时强制检查更新（无延迟）
  checkOnStartup: true,

  // 默认不启用定时检查
  periodicCheckEnabled: false,

  // 如需开启定时检查，可设置以下两个参数；当前关闭状态下可忽略
  checkIntervalHours: 0,
  initialDelayMs: 0,
};
