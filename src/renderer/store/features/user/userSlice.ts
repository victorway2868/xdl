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
        // 没有可用 Cookie 或未登录，静默处理
        return rejectWithValue('NO_COOKIE');
      }
      return userInfo;
    } catch (error: any) {
      return rejectWithValue(error.message || 'NO_COOKIE');
    }
  }
);
// Async thunk for web login
export const loginWithDouyinWeb = createAsyncThunk<DouyinUserInfo>(
  'user/loginWithDouyinWeb',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const loginResult = await window.electronAPI.loginDouyinWeb();
      if (!loginResult.success) {
        throw new Error(loginResult.error || '抖音网页登录失败');
      }
      // After successful login, fetch user info
      const userInfo = await dispatch(fetchDouyinUserInfo()).unwrap();
      return userInfo;
    } catch (error: any) {
      const msg = typeof error === 'string' ? error : (error?.message || '登录后获取用户信息失败');
      return rejectWithValue(msg);
    }
  }
);

// Async thunk for companion login
export const loginWithDouyinCompanion = createAsyncThunk<DouyinUserInfo>(
  'user/loginWithDouyinCompanion',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const loginResult = await window.electronAPI.loginDouyinCompanion();
      if (!loginResult.success) {
        throw new Error(loginResult.error || '抖音直播伴侣登录失败');
      }
      // After successful login, fetch user info
      const userInfo = await dispatch(fetchDouyinUserInfo()).unwrap();
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
      // Fetch user info (uses existing cookie file)
      .addCase(fetchDouyinUserInfo.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDouyinUserInfo.fulfilled, (state, action: PayloadAction<DouyinUserInfo>) => {
        state.loading = false;
        state.douyinUserInfo = action.payload;
        state.isLoggedIn = true; // logged in if we can fetch user info
      })
      .addCase(fetchDouyinUserInfo.rejected, (state, action) => {
        state.loading = false;
        const msg = (action.payload as string) || '';
        const silent = msg === 'NO_COOKIE' || msg.includes('Cookie file not found or unreadable') || msg.includes('Cookie is invalid');
        state.error = silent ? null : msg;
        state.isLoggedIn = false;
      })
      // Web login -> then fetch user info
      .addCase(loginWithDouyinWeb.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginWithDouyinWeb.fulfilled, (state, action: PayloadAction<DouyinUserInfo>) => {
        state.loading = false;
        state.douyinUserInfo = action.payload;
        state.isLoggedIn = true;
      })
      .addCase(loginWithDouyinWeb.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Companion login -> then fetch user info
      .addCase(loginWithDouyinCompanion.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginWithDouyinCompanion.fulfilled, (state, action: PayloadAction<DouyinUserInfo>) => {
        state.loading = false;
        state.douyinUserInfo = action.payload;
        state.isLoggedIn = true;
      })
      .addCase(loginWithDouyinCompanion.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
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