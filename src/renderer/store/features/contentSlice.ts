import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// 内容项接口
export interface ContentItem {
  id: string;
  title: string;
  category: string;
  description: string;
  videoUrl?: string;
  externalUrl?: string;
  coverUrl?: string;
  platform?: string;
  action?: string;
  workType?: string; // 添加workType字段
}

// 内容数据接口
export interface ContentData {
  Tutorials: ContentItem[];
  OBSPlugins: ContentItem[];
  DeviceRecommendations: ContentItem[];
  Ads: ContentItem[];
}

// 状态接口
interface ContentState {
  data: ContentData | null;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: ContentState = {
  data: null,
  loading: false,
  error: null,
  lastFetched: null,
};

// 异步获取内容数据
export const fetchContentData = createAsyncThunk(
  'content/fetchData',
  async (_, { rejectWithValue }) => {
    console.log('🚀 [ContentSlice] 开始获取数据...');
    console.log('🌐 [ContentSlice] 请求URL: https://xiaodouli.openclouds.dpdns.org/updates/appdates.json');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 增加到15秒超时
      console.log('⏰ [ContentSlice] 设置请求超时时间: 15秒');

      console.log('📡 [ContentSlice] 发送网络请求...');
      const response = await fetch('https://xiaodouli.openclouds.dpdns.org/updates/appdates.json', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log('✅ [ContentSlice] 网络请求成功');
      console.log('📊 [ContentSlice] 响应状态:', response.status, response.statusText);

      if (!response.ok) {
        console.error('❌ [ContentSlice] 服务器响应错误:', response.status, response.statusText);
        throw new Error(`服务器错误: ${response.status} ${response.statusText}`);
      }

      console.log('🔄 [ContentSlice] 解析JSON数据...');
      const data = await response.json();
      console.log('📦 [ContentSlice] 数据解析成功，数据大小:', JSON.stringify(data).length, '字符');

      // 验证数据结构
      if (!data || typeof data !== 'object') {
        console.error('❌ [ContentSlice] 数据格式验证失败');
        throw new Error('服务器返回的数据格式无效');
      }

      console.log('✅ [ContentSlice] 数据格式验证通过');
      console.log('📋 [ContentSlice] 数据包含的分类:', Object.keys(data));

      // 缓存到本地存储
      console.log('💾 [ContentSlice] 开始缓存数据到localStorage...');
      try {
        localStorage.setItem('contentData', JSON.stringify(data));
        localStorage.setItem('contentDataTimestamp', Date.now().toString());
        console.log('✅ [ContentSlice] 数据缓存成功');

      } catch (cacheError) {
        console.warn('缓存数据失败:', cacheError);
      }

      console.log('🎉 [ContentSlice] 数据获取完成，返回最新数据');
      return data;
    } catch (error) {
      console.error('❌ [ContentSlice] 获取数据失败:', error);

      // 特殊处理 AbortController 的错误
      const isAbortError = error instanceof DOMException && error.name === 'AbortError';
      const isNetworkError = error instanceof TypeError || isAbortError;

      if (isAbortError) {
        console.warn('⏰ [ContentSlice] 请求超时 (15秒)');
      } else if (isNetworkError) {
        console.warn('🌐 [ContentSlice] 网络连接失败');
      }

      // 对于网络错误或超时，优先尝试使用缓存数据
      if (isNetworkError) {
        console.log('🔄 [ContentSlice] 网络请求失败或超时，尝试使用缓存数据...');
        
        try {
          const cachedData = localStorage.getItem('contentData');
          const cachedTimestamp = localStorage.getItem('contentDataTimestamp');
          
          if (cachedData) {
            const parsedData = JSON.parse(cachedData);
            const cacheAge = cachedTimestamp ? Date.now() - parseInt(cachedTimestamp) : 0;
            console.log('💾 [ContentSlice] 成功加载缓存数据');
            console.log('📅 [ContentSlice] 缓存数据年龄:', Math.round(cacheAge / 1000 / 60), '分钟');
            console.log('📋 [ContentSlice] 缓存数据包含的分类:', Object.keys(parsedData));
            return parsedData;
          } else {
            console.warn('💾 [ContentSlice] 没有找到缓存数据');
          }
        } catch (cacheError) {
          console.error('❌ [ContentSlice] 读取缓存数据失败:', cacheError);
        }
      }

      // 如果是网络错误，提供更友好的错误信息
      let errorMessage = '获取数据失败';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = '请求超时，请检查网络连接';
        } else if (error.message.includes('fetch')) {
          errorMessage = '网络连接失败，请检查网络设置';
        } else {
          errorMessage = error.message;
        }
      }

      return rejectWithValue(errorMessage);
    }
  }
);

// 从缓存加载数据
export const loadCachedData = createAsyncThunk(
  'content/loadCached',
  async () => {
    console.log('尝试加载缓存数据...');
    const cachedData = localStorage.getItem('contentData');
    const timestamp = localStorage.getItem('contentDataTimestamp');

    if (cachedData && timestamp) {
      console.log('找到缓存数据，时间戳:', new Date(parseInt(timestamp)));
      return {
        data: JSON.parse(cachedData),
        timestamp: parseInt(timestamp),
      };
    }
    console.log('未找到缓存数据');
    return null;
  }
);



// 测试服务器连接
export const testServerConnection = createAsyncThunk(
  'content/testConnection',
  async (_, { rejectWithValue }) => {
    try {
      console.log('测试服务器连接...');
      const response = await fetch('https://xiaodouli.openclouds.dpdns.org/updates/appdates.json', {
        method: 'HEAD', // 只获取头部信息，不下载内容
        mode: 'cors',
      });

      console.log('服务器连接测试结果:', response.status, response.statusText);
      return {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      };
    } catch (error) {
      console.error('服务器连接测试失败:', error);
      return rejectWithValue(error instanceof Error ? error.message : '连接测试失败');
    }
  }
);

const contentSlice = createSlice({
  name: 'content',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchContentData
      .addCase(fetchContentData.pending, (state) => {
        console.log('🔄 [Redux] fetchContentData.pending - 开始加载数据');
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContentData.fulfilled, (state, action: PayloadAction<ContentData>) => {
        console.log('✅ [Redux] fetchContentData.fulfilled - 数据加载成功');
        console.log('📋 [Redux] 数据分类:', Object.keys(action.payload));
        state.loading = false;
        state.data = action.payload;
        state.lastFetched = Date.now();
        state.error = null;
      })
      .addCase(fetchContentData.rejected, (state, action) => {
        console.log('❌ [Redux] fetchContentData.rejected - 数据加载失败');
        console.log('🔍 [Redux] 错误信息:', action.payload);
        state.loading = false;
        state.error = action.payload as string;
      })
      // loadCachedData
      .addCase(loadCachedData.fulfilled, (state, action) => {
        if (action.payload) {
          state.data = action.payload.data;
          state.lastFetched = action.payload.timestamp;
        }
      });
  },
});

export const { clearError } = contentSlice.actions;
export default contentSlice.reducer;