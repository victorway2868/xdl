import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// 定义状态的接口
interface SoftwareState {
  versions: Record<string, string | null>;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// 初始状态
const initialState: SoftwareState = {
  versions: {},
  status: 'idle',
  error: null,
};

// 异步Thunk，用于获取软件版本
export const fetchSoftwareVersion = createAsyncThunk(
  'software/fetchVersion',
  async (softwareName: string, { rejectWithValue }) => {
    try {
      const version = await window.electronAPI.getSoftwareVersion(softwareName);
      return { softwareName, version };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  },
  {
    condition: (softwareName, { getState }) => {
      const { software } = getState() as { software: SoftwareState };
      // 如果该软件的版本正在获取，或已成功获取，则阻止新的请求
      const existingVersion = software.versions[softwareName];
      if (software.status === 'loading' && !existingVersion) {
        return false;
      }
      if (software.status === 'succeeded' && existingVersion) {
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
      .addCase(fetchSoftwareVersion.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchSoftwareVersion.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.versions[action.payload.softwareName] = action.payload.version;
      })
      .addCase(fetchSoftwareVersion.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});

export default softwareSlice.reducer;

