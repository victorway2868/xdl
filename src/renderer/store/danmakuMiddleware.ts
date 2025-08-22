import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { DyCast, CastMethod } from '../core/danmaku/dycast';
import { RootState } from './store'; 

import {
  connect,
  disconnect,
  setConnectStatus,
  updateRoomInfo,
  addMessage,
  updateAudienceList,
  resetDanmakuState,
  ChatMessage,
  GiftMessage,
  SocialMessage,
} from './features/danmakuSlice';

export const danmakuMiddleware = createListenerMiddleware();

let dycastInstance: DyCast | null = null;

danmakuMiddleware.startListening({
  actionCreator: connect,
  effect: async (action, listenerApi) => {
    // 如果已存在连接，先断开
    if (dycastInstance) {
      dycastInstance.close();
    }

    const roomNum = action.payload;
    dycastInstance = new DyCast(roomNum);
    const dispatch = listenerApi.dispatch;

    dycastInstance.on('open', (ev, info) => {
      console.log('Middleware: Danmaku connection opened', info);
      dispatch(setConnectStatus(1));
      if (info) {
        dispatch(updateRoomInfo({
          title: info.title || '直播间',
          nickname: info.nickname || '主播',
          avatar: info.avatar || '',
          cover: info.cover || '',
        }));
      }
    });

    dycastInstance.on('message', (messages) => {
      messages.forEach(msg => {
        const messageId = Date.now() + Math.random();
        const time = new Date().toISOString();

        switch (msg.method) {
          case CastMethod.CHAT:
            dispatch(addMessage({
              id: messageId.toString(),
              type: 'chat',
              user: { name: msg.user?.name || '匿名用户', avatar: msg.user?.avatar || '' },
              content: msg.content || '',
              time,
            } as ChatMessage));
            break;

          case CastMethod.GIFT:
            dispatch(addMessage({
              id: messageId.toString(),
              type: 'gift',
              user: { name: msg.user?.name || '匿名用户', avatar: msg.user?.avatar || '' },
              gift: { name: msg.gift?.name || '礼物', count: msg.gift?.count || 1, price: msg.gift?.price || 0 },
              time,
            } as GiftMessage));
            break;

          case CastMethod.MEMBER:
          case CastMethod.SOCIAL:
          case CastMethod.LIKE:
            const typeMap = {
              [CastMethod.MEMBER]: 'member',
              [CastMethod.SOCIAL]: 'follow',
              [CastMethod.LIKE]: 'like',
            };
            const contentMap = {
              [CastMethod.MEMBER]: '进入直播间',
              [CastMethod.SOCIAL]: '关注了主播',
              [CastMethod.LIKE]: '为主播点赞',
            };
            dispatch(addMessage({
              id: messageId.toString(),
              type: typeMap[msg.method],
              user: { name: msg.user?.name || '匿名用户', avatar: msg.user?.avatar || '' },
              content: contentMap[msg.method],
              time,
            } as SocialMessage));
            break;

          case CastMethod.ROOM_USER_SEQ:
          case CastMethod.ROOM_RANK:
            if (msg.rank && Array.isArray(msg.rank)) {
              dispatch(updateAudienceList(msg.rank));
            }
            break;
        }

        if (msg.room) {
          const roomUpdate: Partial<RoomInfo> = {};
          if (msg.room.audienceCount) roomUpdate.memberCount = msg.room.audienceCount.toString();
          if (msg.room.likeCount) roomUpdate.likeCount = msg.room.likeCount.toString();
          if (msg.room.followCount) roomUpdate.followCount = msg.room.followCount.toString();
          if (msg.room.totalUserCount) roomUpdate.userCount = msg.room.totalUserCount.toString();

          if (Object.keys(roomUpdate).length > 0) {
            dispatch(updateRoomInfo(roomUpdate));
          }
        }
      });
    });

    dycastInstance.on('close', (code, reason) => {
      console.log('Middleware: Danmaku connection closed', code, reason);
      dispatch(resetDanmakuState());
      dycastInstance = null;
    });

    dycastInstance.on('error', (error) => {
      console.error('Middleware: Danmaku connection error', error);
      dispatch(setConnectStatus(2));
      dycastInstance = null;
    });

    try {
      await dycastInstance.connect();
    } catch (err) {
      console.error('Middleware: Failed to connect', err);
      dispatch(setConnectStatus(2));
      dycastInstance = null;
    }
  },
});

danmakuMiddleware.startListening({
  actionCreator: disconnect,
  effect: () => {
    if (dycastInstance) {
      dycastInstance.close();
      dycastInstance = null;
    }
  },
});

