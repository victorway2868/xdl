// 插件 Hook
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import {
  loadPlugins,
  enablePlugin,
  disablePlugin,
  reloadPlugin,
  clearError,
} from '../store/features/plugins/pluginsSlice';

export const usePlugins = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { plugins, loading, error, operationLoading } = useSelector(
    (state: RootState) => state.plugins
  );
  
  const refreshPlugins = useCallback(() => {
    dispatch(loadPlugins());
  }, [dispatch]);
  
  const togglePlugin = useCallback(async (pluginId: string, enabled: boolean) => {
    if (enabled) {
      await dispatch(enablePlugin(pluginId));
    } else {
      await dispatch(disablePlugin(pluginId));
    }
  }, [dispatch]);
  
  const reloadPluginById = useCallback(async (pluginId: string) => {
    await dispatch(reloadPlugin(pluginId));
    // 重新加载插件列表
    dispatch(loadPlugins());
  }, [dispatch]);
  
  const clearPluginError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);
  
  const getPluginById = useCallback((pluginId: string) => {
    return plugins.find(plugin => plugin.id === pluginId);
  }, [plugins]);
  
  const getEnabledPlugins = useCallback(() => {
    return plugins.filter(plugin => plugin.enabled);
  }, [plugins]);
  
  const getDisabledPlugins = useCallback(() => {
    return plugins.filter(plugin => !plugin.enabled);
  }, [plugins]);
  
  return {
    plugins,
    loading,
    error,
    operationLoading,
    refreshPlugins,
    togglePlugin,
    reloadPlugin: reloadPluginById,
    clearError: clearPluginError,
    getPluginById,
    getEnabledPlugins,
    getDisabledPlugins,
  };
};