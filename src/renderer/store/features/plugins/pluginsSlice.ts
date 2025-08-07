// 插件状态管理
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { PluginInfo } from '@shared/types';

interface PluginsState {
  plugins: PluginInfo[];
  loading: boolean;
  error: string | null;
  operationLoading: { [pluginId: string]: boolean };
}

const initialState: PluginsState = {
  plugins: [],
  loading: false,
  error: null,
  operationLoading: {},
};

// 异步 thunk - 加载插件列表
export const loadPlugins = createAsyncThunk(
  'plugins/load',
  async () => {
    const plugins = await window.electronAPI.getPlugins();
    return plugins;
  }
);

// 异步 thunk - 启用插件
export const enablePlugin = createAsyncThunk(
  'plugins/enable',
  async (pluginId: string) => {
    await window.electronAPI.enablePlugin(pluginId);
    return pluginId;
  }
);

// 异步 thunk - 禁用插件
export const disablePlugin = createAsyncThunk(
  'plugins/disable',
  async (pluginId: string) => {
    await window.electronAPI.disablePlugin(pluginId);
    return pluginId;
  }
);

// 异步 thunk - 重新加载插件
export const reloadPlugin = createAsyncThunk(
  'plugins/reload',
  async (pluginId: string) => {
    await window.electronAPI.reloadPlugin(pluginId);
    return pluginId;
  }
);

const pluginsSlice = createSlice({
  name: 'plugins',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updatePluginStatus: (state, action) => {
      const { pluginId, enabled } = action.payload;
      const plugin = state.plugins.find(p => p.id === pluginId);
      if (plugin) {
        plugin.enabled = enabled;
      }
    },
  },
  extraReducers: (builder) => {
    // 加载插件列表
    builder
      .addCase(loadPlugins.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadPlugins.fulfilled, (state, action) => {
        state.loading = false;
        state.plugins = action.payload;
      })
      .addCase(loadPlugins.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load plugins';
      });
    
    // 启用插件
    builder
      .addCase(enablePlugin.pending, (state, action) => {
        state.operationLoading[action.meta.arg] = true;
        state.error = null;
      })
      .addCase(enablePlugin.fulfilled, (state, action) => {
        state.operationLoading[action.payload] = false;
        const plugin = state.plugins.find(p => p.id === action.payload);
        if (plugin) {
          plugin.enabled = true;
          plugin.error = undefined;
        }
      })
      .addCase(enablePlugin.rejected, (state, action) => {
        state.operationLoading[action.meta.arg] = false;
        state.error = action.error.message || 'Failed to enable plugin';
      });
    
    // 禁用插件
    builder
      .addCase(disablePlugin.pending, (state, action) => {
        state.operationLoading[action.meta.arg] = true;
        state.error = null;
      })
      .addCase(disablePlugin.fulfilled, (state, action) => {
        state.operationLoading[action.payload] = false;
        const plugin = state.plugins.find(p => p.id === action.payload);
        if (plugin) {
          plugin.enabled = false;
          plugin.error = undefined;
        }
      })
      .addCase(disablePlugin.rejected, (state, action) => {
        state.operationLoading[action.meta.arg] = false;
        state.error = action.error.message || 'Failed to disable plugin';
      });
    
    // 重新加载插件
    builder
      .addCase(reloadPlugin.pending, (state, action) => {
        state.operationLoading[action.meta.arg] = true;
        state.error = null;
      })
      .addCase(reloadPlugin.fulfilled, (state, action) => {
        state.operationLoading[action.payload] = false;
        // 重新加载插件列表
      })
      .addCase(reloadPlugin.rejected, (state, action) => {
        state.operationLoading[action.meta.arg] = false;
        state.error = action.error.message || 'Failed to reload plugin';
      });
  },
});

export const { clearError, updatePluginStatus } = pluginsSlice.actions;

export default pluginsSlice.reducer;