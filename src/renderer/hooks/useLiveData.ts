/**
 * 直播数据 Hook
 * 提供统一的直播数据访问接口，供弹幕页面和场景编辑器使用
 */

import { useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  connectToRoom,
  disconnectFromRoom,
  getCurrentState,
  updateData,
  updateMessageFilters,
  clearMessages,
  selectLiveData,
  selectConnectionStatus,
  selectRoomInfo,
  selectMessages,
  selectFilteredMessages,
  selectStats,
  selectAudienceList,
  selectMessageFilters,
  selectIsLoading,
  selectError
} from '../store/features/liveData/liveDataSlice';
import { ConnectionStatus, MessageFilters } from '@shared/interfaces/liveData';

export const useLiveData = () => {
  const dispatch = useAppDispatch();
  
  // 选择器
  const liveData = useAppSelector(selectLiveData);
  const connectionStatus = useAppSelector(selectConnectionStatus);
  const roomInfo = useAppSelector(selectRoomInfo);
  const messages = useAppSelector(selectMessages);
  const filteredMessages = useAppSelector(selectFilteredMessages);
  const stats = useAppSelector(selectStats);
  const audienceList = useAppSelector(selectAudienceList);
  const messageFilters = useAppSelector(selectMessageFilters);
  const isLoading = useAppSelector(selectIsLoading);
  const error = useAppSelector(selectError);

  // 连接状态判断
  const isConnected = connectionStatus === ConnectionStatus.CONNECTED;
  const isConnecting = connectionStatus === ConnectionStatus.CONNECTING;
  const isDisconnected = connectionStatus === ConnectionStatus.DISCONNECTED;
  const hasError = connectionStatus === ConnectionStatus.ERROR;

  // 连接到直播间
  const connect = useCallback(async (roomId: string) => {
    return dispatch(connectToRoom(roomId));
  }, [dispatch]);

  // 断开连接
  const disconnect = useCallback(async () => {
    return dispatch(disconnectFromRoom());
  }, [dispatch]);

  // 刷新状态
  const refreshState = useCallback(async () => {
    return dispatch(getCurrentState());
  }, [dispatch]);

  // 更新消息过滤器
  const updateFilters = useCallback((filters: Partial<MessageFilters>) => {
    dispatch(updateMessageFilters(filters));
    // 保存到本地存储
    const currentFilters = { ...messageFilters, ...filters };
    localStorage.setItem('liveData:messageFilters', JSON.stringify(currentFilters));
  }, [dispatch, messageFilters]);

  // 清空消息
  const clearAllMessages = useCallback(() => {
    dispatch(clearMessages());
  }, [dispatch]);

  // 设置主进程数据更新监听器
  useEffect(() => {
    // 监听主进程推送的数据更新
    const handleDataUpdate = (data: any) => {
      dispatch(updateData(data));
    };

    // 注册监听器
    window.electronAPI.liveData.onDataUpdate(handleDataUpdate);

    // 初始化时获取当前状态
    dispatch(getCurrentState());

    // 从本地存储恢复消息过滤器设置
    const savedFilters = localStorage.getItem('liveData:messageFilters');
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters);
        dispatch(updateMessageFilters(filters));
      } catch (error) {
        console.warn('Failed to parse saved message filters:', error);
      }
    }

    // 清理函数
    return () => {
      window.electronAPI.liveData.removeDataUpdateListener(handleDataUpdate);
    };
  }, [dispatch]);

  return {
    // 状态数据
    liveData,
    connectionStatus,
    roomInfo,
    messages,
    filteredMessages,
    stats,
    audienceList,
    messageFilters,
    isLoading,
    error,

    // 状态判断
    isConnected,
    isConnecting,
    isDisconnected,
    hasError,

    // 操作方法
    connect,
    disconnect,
    refreshState,
    updateFilters,
    clearAllMessages
  };
};

// 专门用于弹幕页面的 Hook
export const useDanmuData = () => {
  const liveDataHook = useLiveData();
  
  // 弹幕页面特有的逻辑可以在这里扩展
  const getStatusDisplay = useCallback(() => {
    switch (liveDataHook.connectionStatus) {
      case ConnectionStatus.DISCONNECTED:
        return { text: '未连接', color: 'text-gray-400', icon: 'WifiOff' };
      case ConnectionStatus.CONNECTING:
        return { text: '连接中', color: 'text-yellow-400', icon: 'Wifi' };
      case ConnectionStatus.CONNECTED:
        return { text: '已连接', color: 'text-green-400', icon: 'Wifi' };
      case ConnectionStatus.ERROR:
        return { text: '连接失败', color: 'text-red-400', icon: 'WifiOff' };
      default:
        return { text: '未知', color: 'text-gray-400', icon: 'WifiOff' };
    }
  }, [liveDataHook.connectionStatus]);

  return {
    ...liveDataHook,
    getStatusDisplay
  };
};

// 专门用于场景编辑器的 Hook
export const useSceneData = () => {
  const liveDataHook = useLiveData();
  
  // 场景编辑器特有的逻辑
  const getWidgetData = useCallback((widgetType: string) => {
    switch (widgetType) {
      case 'chat':
        return {
          messages: liveDataHook.filteredMessages.chat,
          count: liveDataHook.stats.chatCount
        };
      case 'gift':
        return {
          messages: liveDataHook.filteredMessages.gift,
          count: liveDataHook.stats.giftCount
        };
      case 'audience':
        return {
          list: liveDataHook.audienceList,
          count: liveDataHook.audienceList.length
        };
      case 'stats':
        return liveDataHook.stats;
      default:
        return null;
    }
  }, [liveDataHook.filteredMessages, liveDataHook.stats, liveDataHook.audienceList]);

  return {
    ...liveDataHook,
    getWidgetData
  };
};