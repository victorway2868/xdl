import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { fetchContentData, loadCachedData } from '../store/features/contentSlice';

export const useContentData = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { data, loading, error, lastFetched } = useSelector((state: RootState) => state.content);

  useEffect(() => {
    console.log('useContentData 初始化, 当前状态:', { data: !!data, loading, error, lastFetched });
    
    // 首先尝试加载缓存数据
    if (!data && !loading) {
      console.log('加载缓存数据...');
      dispatch(loadCachedData());
    }

    // 总是尝试获取最新数据（除非正在加载中）
    if (!loading) {
      console.log('获取最新数据...');
      dispatch(fetchContentData());
    }
  }, [dispatch]);

  // 单独的 effect 来处理定期刷新
  useEffect(() => {
    if (data && lastFetched) {
      // 检查是否需要刷新数据（超过5分钟）
      const shouldRefresh = Date.now() - lastFetched > 5 * 60 * 1000;
      
      if (shouldRefresh && !loading) {
        console.log('数据过期，自动刷新...');
        dispatch(fetchContentData());
      }
    }
  }, [dispatch, data, lastFetched, loading]);

  const refresh = () => {
    console.log('手动刷新数据...');
    dispatch(fetchContentData());
  };

  return {
    data,
    loading,
    error,
    refresh,
    lastFetched,
  };
};