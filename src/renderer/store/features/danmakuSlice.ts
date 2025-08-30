import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// 定义消息和房间信息的数据结构
export interface User {
  name: string;
  avatar: string;
}

export interface Gift {
  name: string;
  count: number;
  price: number;
}

export interface ChatMessage {
  id: string;
  type: 'chat';
  user: User;
  content: string;
  time: string;
}

export interface GiftMessage {
  id: string;
  type: 'gift';
  user: User;
  gift: Gift;
  time: string;
}

export interface SocialMessage {
  id: string;
  type: 'follow' | 'like' | 'member';
  user: User;
  content: string;
  time: string;
}

export type Message = ChatMessage | GiftMessage | SocialMessage;

export interface Audience {
  nickname: string;
  rank: number;
  [key: string]: any;
}

export interface RoomInfo {
  title: string;
  nickname: string;
  avatar: string;
  cover: string;
  followCount: string;
  memberCount: string;
  userCount: string;
  likeCount: string;
}

export interface MessageStats {
  totalMessages: number;
  chatCount: number;
  giftCount: number;
  followCount: number;
  likeActionCount: number;
  memberCount: number;
  audienceCount: number;
}

// 定义Slice的State类型
interface DanmakuState {
  connectStatus: 0 | 1 | 2 | 3; // 0-未连接 1-已连接 2-连接失败 3-已断开
  roomNum: string;
  roomInfo: RoomInfo;
  messages: Message[];
  audienceList: Audience[];
  messageStats: MessageStats;
}

// 初始化State
const initialState: DanmakuState = {
  connectStatus: 0,
  roomNum: '',
  roomInfo: {
    title: '*****',
    nickname: '***',
    avatar: '',
    cover: '',
    followCount: '*****',
    memberCount: '*****',
    userCount: '*****',
    likeCount: '*****',
  },
  messages: [],
  audienceList: [],
  messageStats: {
    totalMessages: 0,
    chatCount: 0,
    giftCount: 0,
    followCount: 0,
    likeActionCount: 0,
    memberCount: 0,
    audienceCount: 0,
  },
};

const danmakuSlice = createSlice({
  name: 'danmaku',
  initialState,
  reducers: {
    // 连接状态
    setConnectStatus(state, action: PayloadAction<DanmakuState['connectStatus']>) {
      state.connectStatus = action.payload;
    },
    setRoomNum(state, action: PayloadAction<string>) {
      state.roomNum = action.payload;
    },
    // 更新房间信息
    updateRoomInfo(state, action: PayloadAction<Partial<RoomInfo>>) {
      state.roomInfo = { ...state.roomInfo, ...action.payload };
    },
    // 新增消息
    addMessage(state, action: PayloadAction<Message>) {
      state.messages.push(action.payload);
      // 更新统计
      state.messageStats.totalMessages += 1;
      switch (action.payload.type) {
        case 'chat':
          state.messageStats.chatCount += 1;
          break;
        case 'gift':
          state.messageStats.giftCount += 1;
          break;
        case 'follow':
          state.messageStats.followCount += 1;
          break;
        case 'like':
          state.messageStats.likeActionCount += 1;
          break;
        case 'member':
          state.messageStats.memberCount += 1;
          break;
      }
    },
    // 更新观众列表
    updateAudienceList(state, action: PayloadAction<Audience[]>) {
      state.audienceList = action.payload;
      state.messageStats.audienceCount += 1;
    },
    // 重置/断开连接
    resetDanmakuState(state) {
      state.connectStatus = 3;
      state.roomInfo = initialState.roomInfo;
      state.messages = [];
      state.audienceList = [];
      state.messageStats = initialState.messageStats;
    },
    // 外部发起的连接动作，会由中间件处理
    connect: (state, action: PayloadAction<string>) => {
      state.connectStatus = 1; // 立即设置为连接中
      state.roomNum = action.payload;
    },
    disconnect: () => { 
      // 这个 action 将被中间件捕获以关闭连接
    },
    // 自动连接弹幕，使用用户的liveid
    autoConnect: (state, action: PayloadAction<{ liveid: string }>) => {
      state.connectStatus = 1; // 立即设置为连接中
      state.roomNum = action.payload.liveid;
    },
  },
});

export const {
  setConnectStatus,
  setRoomNum,
  updateRoomInfo,
  addMessage,
  updateAudienceList,
  resetDanmakuState,
  connect,
  disconnect,
  autoConnect,
} = danmakuSlice.actions;

export default danmakuSlice.reducer;

