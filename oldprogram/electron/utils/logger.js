/**
 * 统一日志管理模块
 * 确保开发环境和生产环境都能正确记录日志
 */

import winston from 'winston';
import path from 'path';
import { app } from 'electron';
import { getPath, PathType } from './pathManager.js';

let logger = null;

/**
 * 初始化日志系统
 */
export function initLogger() {
  if (logger) {
    return logger;
  }

  try {
    // 获取日志目录
    const logsDir = getPath(PathType.LOGS);
    
    // 创建日志格式
    const logFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ level, message, timestamp, stack }) => {
        return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
      })
    );

    // 创建传输器数组
    const transports = [];

    // 在开发环境中添加控制台输出
    if (!app.isPackaged) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            logFormat
          )
        })
      );
    }

    // 添加文件输出（开发和生产环境都需要）
    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, 'app.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        format: logFormat
      }),
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        format: logFormat
      })
    );

    // 创建 winston logger
    logger = winston.createLogger({
      level: app.isPackaged ? 'info' : 'debug',
      transports: transports,
      exitOnError: false
    });

    // 记录初始化信息
    logger.info('Logger initialized successfully');
    logger.info(`Environment: ${app.isPackaged ? 'production' : 'development'}`);
    logger.info(`Logs directory: ${logsDir}`);

    return logger;
  } catch (error) {
    console.error('Failed to initialize logger:', error);
    // 创建一个简单的后备 logger
    logger = winston.createLogger({
      level: 'info',
      transports: [
        new winston.transports.Console()
      ]
    });
    return logger;
  }
}

/**
 * 获取日志实例
 */
export function getLogger() {
  if (!logger) {
    return initLogger();
  }
  return logger;
}

/**
 * 记录 IPC 事件
 */
export function logIPC(event, data, direction = 'send') {
  const logger = getLogger();
  logger.info(`IPC ${direction}: ${event}`, { data });
}

/**
 * 记录状态通知
 */
export function logStatusNotification(message, status) {
  const logger = getLogger();
  logger.info(`Status notification: ${message}`, { status });
}

/**
 * 记录认证通知
 */
export function logAuthNotification(message) {
  const logger = getLogger();
  logger.info(`Auth notification: ${message}`);
}

export default { initLogger, getLogger, logIPC, logStatusNotification, logAuthNotification };
