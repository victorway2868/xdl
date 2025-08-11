/**
 * 直播数据相关接口定义
 * 用于弹幕功能和场景编辑器功能的数据共享
 */

// 连接状态枚举
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting', 
  CONNECTED = 'connected',
  ERROR = 'error'
}

// 消息类型枚举
export enum MessageType {
  CHAT = 'chat',
  GIFT = 'gift',
  FOLLOW = 'follow',
  LIKE = 'like',
  MEMBER = 'member'
}

// 用户信息接口
export interface UserInfo {
  id?: string;
  name: string;
  avatar?: string;
  level?: number;
  badges?: string[];
}

// 直播间信息接口
export interface RoomInfo {
  roomId: string;
  title: string;
  cover?: string;
  nickname: string;
  avatar?: string;
  followCount: number;
  memberCount: number;
  userCount: number;
  likeCount: number;
}

// 聊天消息接口
export interface ChatMessage {
  id: string;
  type: MessageType.CHAT;
  user: UserInfo;
  content: string;
  time: Date;
  emojis?: string[];
}

// 礼物消息接口
export interface GiftMessage {
  id: string;
  type: MessageType.GIFT;
  user: UserInfo;
  gift: {
    id?: string;
    name: string;
    count: number;
    price: number;
    icon?: string;
  };
  time: Date;
}

// 社交消息接口
export interface SocialMessage {
  id: string;
  type: MessageType.FOLLOW | MessageType.LIKE | MessageType.MEMBER;
  user: UserInfo;
  content: string;
  time: Date;
}

// 观众信息接口
export interface AudienceInfo {
  rank: number;
  nickname: string;
  avatar?: string;
  level?: number;
  score?: number;
}

// 消息统计接口
export interface MessageStats {
  totalMessages: number;
  chatCount: number;
  giftCount: number;
  followCount: number;
  likeCount: number;
  memberCount: number;
  audienceCount: number;
}

// 消息过滤器接口
export interface MessageFilters {
  chat: boolean;
  gift: boolean;
  follow: boolean;
  like: boolean;
  member: boolean;
}

// 直播数据状态接口
export interface LiveDataState {
  // 连接状态
  connectionStatus: ConnectionStatus;
  roomInfo: RoomInfo | null;
  error: string | null;
  
  // 消息数据
  chatMessages: ChatMessage[];
  giftMessages: GiftMessage[];
  socialMessages: SocialMessage[];
  
  // 统计数据
  stats: MessageStats;
  
  // 观众数据
  audienceList: AudienceInfo[];
  
  // 最后更新时间
  lastUpdated: Date | null;
}

// IPC 通信接口
export interface LiveDataIPC {
  // 连接直播间
  connectToRoom: (roomId: string) => Promise<{ success: boolean; message?: string }>;
  
  // 断开连接
  disconnect: () => Promise<void>;
  
  // 获取当前状态
  getCurrentState: () => Promise<LiveDataState>;
  
  // 监听数据更新
  onDataUpdate: (callback: (data: Partial<LiveDataState>) => void) => void;
  
  // 移除监听器
  removeDataUpdateListener: (callback: Function) => void;
}

// 弹幕原始数据接口（从旧项目迁移）
export interface DanmuRawMessage {
  method: string;
  user?: {
    name?: string;
    avatar?: string;
    id?: string;
    level?: number;
  };
  content?: string;
  gift?: {
    name?: string;
    count?: number;
    price?: number;
    id?: string;
  };
  room?: {
    audienceCount?: number;
    likeCount?: number;
    followCount?: number;
    totalUserCount?: number;
  };
  rank?: AudienceInfo[];
}