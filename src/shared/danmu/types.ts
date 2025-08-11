/**
 * 弹幕系统类型定义
 * 从旧项目迁移并适配 TypeScript
 */

// 弹幕方法枚举
export enum CastMethod {
  CHAT = 'WebcastChatMessage',
  GIFT = 'WebcastGiftMessage', 
  MEMBER = 'WebcastMemberMessage',
  SOCIAL = 'WebcastSocialMessage',
  LIKE = 'WebcastLikeMessage',
  ROOM_USER_SEQ = 'WebcastRoomUserSeqMessage',
  ROOM_RANK = 'WebcastRoomRankMessage'
}

// 用户信息
export interface DanmuUser {
  id?: string;
  name?: string;
  nickname?: string;
  avatar?: string;
  level?: number;
  badges?: string[];
}

// 礼物信息
export interface DanmuGift {
  id?: string;
  name?: string;
  count?: number;
  price?: number;
  icon?: string;
}

// 直播间信息
export interface DanmuRoom {
  audienceCount?: number;
  likeCount?: number;
  followCount?: number;
  totalUserCount?: number;
}

// 弹幕消息基础接口
export interface DanmuMessage {
  method: CastMethod;
  user?: DanmuUser;
  content?: string;
  gift?: DanmuGift;
  room?: DanmuRoom;
  rank?: Array<{
    rank: number;
    nickname: string;
    avatar?: string;
    level?: number;
    score?: number;
  }>;
  timestamp?: number;
}

// 连接配置
export interface DanmuConfig {
  roomId: string;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
}

// 连接状态
export interface DanmuConnectionInfo {
  roomId: string;
  title?: string;
  nickname?: string;
  avatar?: string;
  cover?: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
}

// 事件回调类型
export type DanmuEventCallback = (data: any) => void;

// 事件类型
export interface DanmuEvents {
  open: (event: any, info: DanmuConnectionInfo) => void;
  message: (messages: DanmuMessage[]) => void;
  close: (code: number, reason: string) => void;
  error: (error: Error) => void;
}

// WebSocket 消息类型
export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

// 签名相关类型
export interface SignatureData {
  'X-MS-EDGE-REF'?: string;
  'user-agent'?: string;
  referer?: string;
  cookie?: string;
}

// 请求配置
export interface RequestConfig {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  data?: any;
  timeout?: number;
}

// 响应数据
export interface ResponseData {
  status: number;
  data: any;
  headers?: Record<string, string>;
}