/**
 * 日志工具类
 */
export class CLog {
  static debug(...args) {
    console.log('[DEBUG]', ...args);
  }

  static info(...args) {
    console.log('[INFO]', ...args);
  }

  static warn(...args) {
    console.warn('[WARN]', ...args);
  }

  static error(...args) {
    console.error('[ERROR]', ...args);
  }
}

/**
 * 打印项目信息
 */
export function printInfo() {
  console.log('%c DyCast 弹幕获取工具 ', 'background: #007acc; color: white; padding: 2px 4px; border-radius: 2px;');
  console.log('版本: 1.0.14-beta.0');
  console.log('集成到小斗笠直播助手');
}

/**
 * 打印 SKMCJ 标识
 */
export function printSKMCJ() {
  const style = 'color: #007acc; font-weight: bold; font-size: 14px;';
  console.log('%c SKMCJ DyCast Integration ', style);
}
