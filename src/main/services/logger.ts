// 日志服务
import { LogEntry } from '../../shared/types';

// Safely import electron-log
let log: any;
try {
  log = require('electron-log');
} catch (error) {
  console.error('Failed to load electron-log:', error);
  // Fallback to console logging
  log = {
    transports: {
      file: { level: 'info', maxSize: 0 },
      console: { level: 'debug' }
    },
    log: console.log,
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error
  };
}

export class LoggerService {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  
  constructor() {
    // 配置 electron-log
    log.transports.file.level = 'info';
    log.transports.console.level = 'debug';
    log.transports.file.maxSize = 5 * 1024 * 1024; // 5MB
    
    // 拦截日志输出，保存到内存中
    const originalLog = log.log;
    log.log = (...args: any[]) => {
      this.addLog('info', args.join(' '), 'main');
      return originalLog.apply(log, args);
    };
  }
  
  addLog(level: LogEntry['level'], message: string, source: LogEntry['source'], metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      source,
      metadata,
    };
    
    this.logs.push(entry);
    
    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // 输出到 electron-log
    switch (level) {
      case 'debug':
        log.debug(`[${source}] ${message}`, metadata);
        break;
      case 'info':
        log.info(`[${source}] ${message}`, metadata);
        break;
      case 'warn':
        log.warn(`[${source}] ${message}`, metadata);
        break;
      case 'error':
        log.error(`[${source}] ${message}`, metadata);
        break;
    }
  }
  
  getLogs(): LogEntry[] {
    return [...this.logs];
  }
  
  clearLogs(): void {
    this.logs = [];
  }
}

export const loggerService = new LoggerService();