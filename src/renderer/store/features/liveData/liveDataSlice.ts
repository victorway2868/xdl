/**
 * 直播数据状态管理
 * 使用 Redux Toolkit 管理弹幕和场景编辑器的共享数据
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  LiveDataState, 
  ConnectionStatus,
  MessageFilters,
  ChatMessage,
  GiftMessage,
  SocialMessage
} from '@shared/interfaces/liveData';

// 初始状态
const initialState: LiveDataState & {
  // 扩展状态
  isLoading: boolean;
  messageFilters: MessageFilters;
} = {
  // 基础状态
  connectionStatus: ConnectionStatus.DISCONNECTED,
  roomInfo: null,
  error: null,
  chatMessages: [],
  giftMessages: [],
  socialMessages: [],
  stats: {
    totalMessages: 0,
    chatCount: 0,
    giftCount: 0,
    followCount: 0,
    likeCount: 0,
    memberCount: 0,
    audienceCount: 0
  },
  audienceList: [],
  lastUpdated: null,
  
  // 扩展状态
  isLoading: false,
  messageFilters: {
    chat: true,
    gift: true,
    follow: true,
    like: true,
    member: true
  }
};

// 异步 Thunks
export const connectToRoom = createAsyncThunk(
  'liveData/connectToRoom',
  async (roomId: string, { rejectWithValue }) => {
    try {
      const result = await window.electronAPI.liveData.connect(roomId);
      if (!result.success) {
        return rejectWithValue(result.message || '连接失败');
      }
      return result;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : '连接失败');
    }
  }
);

export const disconnectFromRoom = createAsyncThunk(
  'liveData/disconnectFromRoom',
  async (_, { rejectWithValue }) => {
    try {
      const result = await window.electronAPI.liveData.disconnect();
      if (!result.success) {
        return rejectWithValue(result.message || '断开连接失败');
      }
      return result;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : '断开连接失败');
    }
  }
);

export const getCurrentState = createAsyncThunk(
  'liveData/getCurrentState',
  async (_, { rejectWithValue }) => {
    try {
      const state = await window.electronAPI.liveData.getCurrentState();
      return state;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : '获取状态失败');
    }
  }
);

// Slice
const liveDataSlice = createSlice({
  name: 'liveData',
  initialState,
  reducers: {
    // 更新数据（从主进程推送）
    updateData: (state, action: PayloadAction<Partial<LiveDataState>>) => {
      Object.assign(state, action.payload);
    },

    // 更新消息过滤器
    updateMessageFilters: (state, action: PayloadAction<Partial<MessageFilters>>) => {
      state.messageFilters = { ...state.messageFilters, ...action.payload };
    },

    // 清空消息
    clearMessages: (state) => {
      state.chatMessages = [];
      state.giftMessages = [];
      state.socialMessages = [];
      state.stats = {
        totalMessages: 0,
        chatCount: 0,
        giftCount: 0,
        followCount: 0,
        likeCount: 0,
        memberCount: 0,
        audienceCount: 0
      };
    },

    // 添加聊天消息
    addChatMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.chatMessages.push(action.payload);
      state.stats.chatCount++;
      state.stats.totalMessages++;
      state.lastUpdated = new Date();
    },

    // 添加礼物消息
    addGiftMessage: (state, action: PayloadAction<GiftMessage>) => {
      state.giftMessages.push(action.payload);
      state.stats.giftCount++;
      state.stats.totalMessages++;
      state.lastUpdated = new Date();
    },

    // 添加社交消息
    addSocialMessage: (state, action: PayloadAction<SocialMessage>) => {
      state.socialMessages.push(action.payload);
      
      switch (action.payload.type) {
        case 'follow':
          state.stats.followCount++;
          break;
        case 'like':
          state.stats.likeCount++;
          break;
        case 'member':
          state.stats.memberCount++;
          break;
      }
      
      state.stats.totalMessages++;
      state.lastUpdated = new Date();
    },

    // 设置错误
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    // 重置状态
    resetState: (state) => {
      Object.assign(state, initialState);
    }
  },
  extraReducers: (builder) => {
    // 连接到直播间
    builder
      .addCase(connectToRoom.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.connectionStatus = ConnectionStatus.CONNECTING;
      })
      .addCase(connectToRoom.fulfilled, (state) => {
        state.isLoading = false;
        // 连接状态由主进程推送更新
      })
      .addCase(connectToRoom.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.connectionStatus = ConnectionStatus.ERROR;
      });

    // 断开连接
    builder
      .addCase(disconnectFromRoom.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(disconnectFromRoom.fulfilled, (state) => {
        state.isLoading = false;
        // 状态由主进程推送更新
      })
      .addCase(disconnectFromRoom.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // 获取当前状态
    builder
      .addCase(getCurrentState.fulfilled, (state, action) => {
        if (action.payload) {
          Object.assign(state, action.payload);
        }
      });
  }
});

// Actions
export const {
  updateData,
  updateMessageFilters,
  clearMessages,
  addChatMessage,
  addGiftMessage,
  addSocialMessage,
  setError,
  resetState
} = liveDataSlice.actions;

// Selectors
export const selectLiveData = (state: { liveData: typeof initialState }) => state.liveData;
export const selectConnectionStatus = (state: { liveData: typeof initialState }) => state.liveData.connectionStatus;
export const selectRoomInfo = (state: { liveData: typeof initialState }) => state.liveData.roomInfo;
export const selectMessages = (state: { liveData: typeof initialState }) => ({
  chat: state.liveData.chatMessages,
  gift: state.liveData.giftMessages,
  social: state.liveData.socialMessages
});
export const selectStats = (state: { liveData: typeof initialState }) => state.liveData.stats;
export const selectAudienceList = (state: { liveData: typeof initialState }) => state.liveData.audienceList;
export const selectMessageFilters = (state: { liveData: typeof initialState }) => state.liveData.messageFilters;
export const selectIsLoading = (state: { liveData: typeof initialState }) => state.liveData.isLoading;
export const selectError = (state: { liveData: typeof initialState }) => state.liveData.error;

// 过滤后的消息选择器
export const selectFilteredMessages = (state: { liveData: typeof initialState }) => {
  const { chatMessages, giftMessages, socialMessages, messageFilters } = state.liveData;
  
  return {
    chat: messageFilters.chat ? chatMessages : [],
    gift: messageFilters.gift ? giftMessages : [],
    social: socialMessages.filter(msg => {
      switch (msg.type) {
        case 'follow': return messageFilters.follow;
        case 'like': return messageFilters.like;
        case 'member': return messageFilters.member;
        default: return false;
      }
    }),
    all: [
      ...(messageFilters.chat ? chatMessages : []),
      ...(messageFilters.gift ? giftMessages : [])
    ].sort((a, b) => a.time.getTime() - b.time.getTime())
  };
};

export default liveDataSlice.reducer;