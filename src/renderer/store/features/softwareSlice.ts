import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// 为单个软件检查定义状态接口
interface SoftwareCheck {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  version: string | null;
  error?: string | null;
}

// 整个Slice的状态接口
interface SoftwareState {
  checks: Record<string, SoftwareCheck>;
}

// 初始状态
const initialState: SoftwareState = {
  checks: {},
};

// 异步Thunk，用于获取软件版本
export const fetchSoftwareVersion = createAsyncThunk(
  'software/fetchVersion',
  async (softwareName: string, { rejectWithValue }) => {
    try {
      const version = await window.electronAPI.getSoftwareVersion(softwareName);
      return { softwareName, version };
    } catch (error: any) {
      return rejectWithValue({ softwareName, message: error.message });
    }
  },
  {
    condition: (softwareName, { getState }) => {
      const state = getState() as { software: SoftwareState };
      const check = state.software.checks[softwareName];
      // 如果该软件正在被检查，或已成功获取，则阻止发起新的请求
      if (check && (check.status === 'loading' || check.status === 'succeeded')) {
        return false;
      }
      return true;
    },
  }
);

// 创建Slice
const softwareSlice = createSlice({
  name: 'software',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSoftwareVersion.pending, (state, action) => {
        const softwareName = action.meta.arg;
        state.checks[softwareName] = {
          status: 'loading',
          version: null,
          error: null,
        };
      })
      .addCase(fetchSoftwareVersion.fulfilled, (state, action) => {
        const { softwareName, version } = action.payload;
        state.checks[softwareName] = {
          status: 'succeeded',
          version: version,
          error: null,
        };
      })
      .addCase(fetchSoftwareVersion.rejected, (state, action) => {
        const { softwareName, message } = action.payload as { softwareName: string; message: string };
        state.checks[softwareName] = {
          status: 'failed',
          version: null,
          error: message,
        };
      });
  },
});

export default softwareSlice.reducer;

