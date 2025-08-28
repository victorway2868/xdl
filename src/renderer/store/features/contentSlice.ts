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


    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

      const response = await fetch('https://xiaodouli.openclouds.dpdns.org/updates/appdates.json', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);



      if (!response.ok) {
        throw new Error(`服务器错误: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();


      // 验证数据结构
      if (!data || typeof data !== 'object') {
        throw new Error('服务器返回的数据格式无效');
      }

      // 缓存到本地存储
      try {
        localStorage.setItem('contentData', JSON.stringify(data));
        localStorage.setItem('contentDataTimestamp', Date.now().toString());

      } catch (cacheError) {
        console.warn('缓存数据失败:', cacheError);
      }

      return data;
    } catch (error) {
      console.error('获取数据失败:', error);

      // 尝试使用缓存数据
      try {
        const cachedData = localStorage.getItem('contentData');
        if (cachedData) {
  
          const parsedData = JSON.parse(cachedData);
          // 返回缓存数据，但仍然记录错误
          return parsedData;
        }
      } catch (cacheError) {
        console.error('读取缓存数据失败:', cacheError);
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
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContentData.fulfilled, (state, action: PayloadAction<ContentData>) => {
        state.loading = false;
        state.data = action.payload;
        state.lastFetched = Date.now();
        state.error = null;
      })
      .addCase(fetchContentData.rejected, (state, action) => {
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