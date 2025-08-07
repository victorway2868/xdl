// 设置状态管理
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { AppSettings } from '@shared/types';
import { DEFAULT_SETTINGS } from '@shared/constants';

interface SettingsState {
  settings: AppSettings;
  loading: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;
}

const initialState: SettingsState = {
  settings: DEFAULT_SETTINGS,
  loading: false,
  error: null,
  hasUnsavedChanges: false,
};

// 异步 thunk - 加载设置
export const loadSettings = createAsyncThunk(
  'settings/load',
  async () => {
    const settings = await window.electronAPI.getSettings();
    return settings;
  }
);

// 异步 thunk - 保存设置
export const saveSettings = createAsyncThunk(
  'settings/save',
  async (updates: Partial<AppSettings>) => {
    await window.electronAPI.saveSettings(updates);
    return updates;
  }
);

// 异步 thunk - 重置设置
export const resetSettings = createAsyncThunk(
  'settings/reset',
  async () => {
    await window.electronAPI.resetSettings();
    return DEFAULT_SETTINGS;
  }
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateLocalSettings: (state, action: PayloadAction<Partial<AppSettings>>) => {
      state.settings = { ...state.settings, ...action.payload };
      state.hasUnsavedChanges = true;
    },
    clearError: (state) => {
      state.error = null;
    },
    markSaved: (state) => {
      state.hasUnsavedChanges = false;
    },
  },
  extraReducers: (builder) => {
    // 加载设置
    builder
      .addCase(loadSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload;
        state.hasUnsavedChanges = false;
      })
      .addCase(loadSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load settings';
      });
    
    // 保存设置
    builder
      .addCase(saveSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(saveSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = { ...state.settings, ...action.payload };
        state.hasUnsavedChanges = false;
      })
      .addCase(saveSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to save settings';
      });
    
    // 重置设置
    builder
      .addCase(resetSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload;
        state.hasUnsavedChanges = false;
      })
      .addCase(resetSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to reset settings';
      });
  },
});

export const { updateLocalSettings, clearError, markSaved } = settingsSlice.actions;

export default settingsSlice.reducer;