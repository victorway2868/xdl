// 日志 Hook
import { useCallback } from 'react';

export const useLogger = () => {
  const log = useCallback(async (level: string, message: string, metadata?: Record<string, any>) => {
    try {
      await window.electronAPI.log(level, message, metadata);
    } catch (error) {
      console.error('Failed to log message:', error);
    }
  }, []);
  
  const info = useCallback((message: string, metadata?: Record<string, any>) => {
    return log('info', message, metadata);
  }, [log]);
  
  const warn = useCallback((message: string, metadata?: Record<string, any>) => {
    return log('warn', message, metadata);
  }, [log]);
  
  const error = useCallback((message: string, metadata?: Record<string, any>) => {
    return log('error', message, metadata);
  }, [log]);
  
  const debug = useCallback((message: string, metadata?: Record<string, any>) => {
    return log('debug', message, metadata);
  }, [log]);
  
  const getLogs = useCallback(async () => {
    try {
      return await window.electronAPI.getLogs();
    } catch (error) {
      console.error('Failed to get logs:', error);
      return [];
    }
  }, []);
  
  return {
    log,
    info,
    warn,
    error,
    debug,
    getLogs,
  };
};