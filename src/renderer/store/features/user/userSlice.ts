// 用户状态管理
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User, DouyinUserInfo } from '@shared/types';

// Async thunk for fetching Douyin user info
export const fetchDouyinUserInfo = createAsyncThunk<DouyinUserInfo>(
  'user/fetchDouyinUserInfo',
  async (_, { rejectWithValue }) => {
    try {
      const userInfo = await window.electronAPI.getDouyinUserInfo();
      if (!userInfo) {
        throw new Error('Failed to get user info');
      }
      return userInfo;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

interface UserState {
  currentUser: User | null;
  douyinUserInfo: DouyinUserInfo | null; // Add new state for Douyin info
  isLoggedIn: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  currentUser: null,
  douyinUserInfo: null, // Initialize
  isLoggedIn: false,
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<User>) => {
      state.loading = false;
      state.currentUser = action.payload;
      state.isLoggedIn = true;
      state.error = null;
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
      state.isLoggedIn = false;
    },
    logout: (state) => {
      state.currentUser = null;
      state.isLoggedIn = false;
      state.douyinUserInfo = null; // Clear on logout
      state.error = null;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.currentUser) {
        state.currentUser = { ...state.currentUser, ...action.payload };
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDouyinUserInfo.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDouyinUserInfo.fulfilled, (state, action: PayloadAction<DouyinUserInfo>) => {
        state.loading = false;
        state.douyinUserInfo = action.payload;
        state.isLoggedIn = true; // Consider logged in if we get user info
      })
      .addCase(fetchDouyinUserInfo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isLoggedIn = false;
      });
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  updateUser,
  clearError,
} = userSlice.actions;

export default userSlice.reducer;