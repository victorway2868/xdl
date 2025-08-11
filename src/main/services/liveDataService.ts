/**
 * 直播数据服务
 * 统一管理弹幕连接和数据分发，为弹幕页面和场景编辑器提供共享数据
 */

import { EventEmitter } from 'events';
import { BrowserWindow } from 'electron';
import { 
  LiveDataState, 
  ConnectionStatus, 
  MessageType,
  ChatMessage,
  GiftMessage, 
  SocialMessage,
  AudienceInfo,
  MessageStats,
  RoomInfo,
  DanmuRawMessage
} from '../../shared/interfaces/liveData';
import { loggerService } from './logger';

export class LiveDataService extends EventEmitter {
  private static instance: LiveDataService;
  
  // 当前状态
  private state: LiveDataState = {
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
    lastUpdated: null
  };

  // DyCast 实例（动态导入）
  private dycast: any = null;
  private currentRoomId: string | null = null;

  // WebSocket 服务器（用于流媒体服务）
  private wsServer: any = null;
  private wsClients: Set<any> = new Set();

  constructor() {
    super();
    loggerService.addLog('info', 'LiveDataService initialized', 'main');
  }

  static getInstance(): LiveDataService {
    if (!LiveDataService.instance) {
      LiveDataService.instance = new LiveDataService();
    }
    return LiveDataService.instance;
  }

  /**
   * 连接到直播间
   */
  async connectToRoom(roomId: string): Promise<{ success: boolean; message?: string }> {
    try {
      loggerService.addLog('info', `Connecting to room: ${roomId}`, 'main');
      
      // 如果已经连接到相同房间，直接返回成功
      if (this.currentRoomId === roomId && this.state.connectionStatus === ConnectionStatus.CONNECTED) {
        return { success: true, message: '已连接到该直播间' };
      }

      // 断开现有连接
      if (this.dycast) {
        await this.disconnect();
      }

      // 更新连接状态
      this.updateState({
        connectionStatus: ConnectionStatus.CONNECTING,
        error: null
      });

      // 动态导入 DyCast（需要先迁移弹幕核心模块）
      const { DyCast } = await import('../../shared/danmu/dycast');
      
      // 创建新连接
      this.dycast = new DyCast(roomId);
      this.currentRoomId = roomId;

      // 设置事件监听
      this.setupDycastListeners();

      // 开始连接
      await this.dycast.connect();

      return { success: true };
    } catch (error) {
      loggerService.addLog('error', 'Failed to connect to room', 'main', { error });
      this.updateState({
        connectionStatus: ConnectionStatus.ERROR,
        error: error instanceof Error ? error.message : '连接失败'
      });
      return { success: false, message: error instanceof Error ? error.message : '连接失败' };
    }
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    try {
      loggerService.addLog('info', 'Disconnecting from live room', 'main');

      if (this.dycast) {
        this.dycast.close();
        this.dycast = null;
      }

      this.currentRoomId = null;
      
      this.updateState({
        connectionStatus: ConnectionStatus.DISCONNECTED,
        roomInfo: null,
        error: null,
        chatMessages: [],
        giftMessages: [],
        socialMessages: [],
        audienceList: [],
        stats: {
          totalMessages: 0,
          chatCount: 0,
          giftCount: 0,
          followCount: 0,
          likeCount: 0,
          memberCount: 0,
          audienceCount: 0
        }
      });

    } catch (error) {
      loggerService.addLog('error', 'Error during disconnect', 'main', { error });
    }
  }

  /**
   * 获取当前状态
   */
  getCurrentState(): LiveDataState {
    return { ...this.state };
  }

  /**
   * 设置 DyCast 事件监听器
   */
  private setupDycastListeners(): void {
    if (!this.dycast) return;

    // 连接打开
    this.dycast.on('open', (ev: any, info: any) => {
      loggerService.addLog('info', 'DyCast connection opened', 'main', { info });
      
      const roomInfo: RoomInfo = {
        roomId: this.currentRoomId || '',
        title: info?.title || '直播间',
        nickname: info?.nickname || '主播',
        avatar: info?.avatar || '',
        cover: info?.cover || '',
        followCount: 0,
        memberCount: 0,
        userCount: 0,
        likeCount: 0
      };

      this.updateState({
        connectionStatus: ConnectionStatus.CONNECTED,
        roomInfo,
        error: null
      });
    });

    // 接收消息
    this.dycast.on('message', (messages: DanmuRawMessage[]) => {
      this.handleDanmuMessages(messages);
    });

    // 连接关闭
    this.dycast.on('close', (code: number, reason: string) => {
      loggerService.addLog('info', 'DyCast connection closed', 'main', { code, reason });
      this.updateState({
        connectionStatus: ConnectionStatus.DISCONNECTED
      });
    });

    // 连接错误
    this.dycast.on('error', (error: Error) => {
      loggerService.addLog('error', 'DyCast connection error', 'main', { error });
      this.updateState({
        connectionStatus: ConnectionStatus.ERROR,
        error: error.message
      });
    });
  }

  /**
   * 处理弹幕消息
   */
  private handleDanmuMessages(messages: DanmuRawMessage[]): void {
    const updates: Partial<LiveDataState> = {};
    let statsUpdated = false;

    messages.forEach(msg => {
      const messageId = `${Date.now()}-${Math.random()}`;
      const time = new Date();

      switch (msg.method) {
        case 'WebcastChatMessage':
          const chatMsg: ChatMessage = {
            id: messageId,
            type: MessageType.CHAT,
            user: {
              name: msg.user?.name || '匿名用户',
              avatar: msg.user?.avatar || ''
            },
            content: msg.content || '',
            time
          };
          
          this.state.chatMessages.push(chatMsg);
          this.state.stats.chatCount++;
          this.state.stats.totalMessages++;
          statsUpdated = true;
          break;

        case 'WebcastGiftMessage':
          const giftMsg: GiftMessage = {
            id: messageId,
            type: MessageType.GIFT,
            user: {
              name: msg.user?.name || '匿名用户',
              avatar: msg.user?.avatar || ''
            },
            gift: {
              name: msg.gift?.name || '礼物',
              count: msg.gift?.count || 1,
              price: msg.gift?.price || 0
            },
            time
          };
          
          this.state.giftMessages.push(giftMsg);
          this.state.stats.giftCount++;
          this.state.stats.totalMessages++;
          statsUpdated = true;
          break;

        case 'WebcastMemberMessage':
        case 'WebcastSocialMessage':
        case 'WebcastLikeMessage':
          const socialMsg: SocialMessage = {
            id: messageId,
            type: msg.method === 'WebcastMemberMessage' ? MessageType.MEMBER :
                  msg.method === 'WebcastSocialMessage' ? MessageType.FOLLOW : MessageType.LIKE,
            user: {
              name: msg.user?.name || '匿名用户',
              avatar: msg.user?.avatar || ''
            },
            content: msg.method === 'WebcastMemberMessage' ? '进入直播间' :
                    msg.method === 'WebcastSocialMessage' ? '关注了主播' : '为主播点赞',
            time
          };
          
          this.state.socialMessages.push(socialMsg);
          
          if (msg.method === 'WebcastMemberMessage') {
            this.state.stats.memberCount++;
          } else if (msg.method === 'WebcastSocialMessage') {
            this.state.stats.followCount++;
          } else if (msg.method === 'WebcastLikeMessage') {
            this.state.stats.likeCount++;
          }
          
          this.state.stats.totalMessages++;
          statsUpdated = true;
          break;

        case 'WebcastRoomUserSeqMessage':
        case 'WebcastRoomRankMessage':
          if (msg.rank && Array.isArray(msg.rank)) {
            this.state.audienceList = msg.rank.map(item => ({
              rank: item.rank,
              nickname: item.nickname,
              avatar: item.avatar,
              level: item.level,
              score: item.score
            }));
            this.state.stats.audienceCount++;
            statsUpdated = true;
          }
          break;
      }

      // 更新直播间统计信息
      if (msg.room && this.state.roomInfo) {
        const roomUpdates: Partial<RoomInfo> = {};
        if (msg.room.audienceCount) roomUpdates.memberCount = msg.room.audienceCount;
        if (msg.room.likeCount) roomUpdates.likeCount = msg.room.likeCount;
        if (msg.room.followCount) roomUpdates.followCount = msg.room.followCount;
        if (msg.room.totalUserCount) roomUpdates.userCount = msg.room.totalUserCount;
        
        if (Object.keys(roomUpdates).length > 0) {
          this.state.roomInfo = { ...this.state.roomInfo, ...roomUpdates };
          updates.roomInfo = this.state.roomInfo;
        }
      }
    });

    // 限制消息数量，避免内存溢出
    this.limitMessageHistory();

    // 更新状态
    if (statsUpdated) {
      updates.stats = { ...this.state.stats };
      updates.lastUpdated = new Date();
    }

    if (Object.keys(updates).length > 0) {
      this.updateState(updates);
    }
  }

  /**
   * 限制消息历史数量
   */
  private limitMessageHistory(): void {
    const maxMessages = 1000;
    
    if (this.state.chatMessages.length > maxMessages) {
      this.state.chatMessages = this.state.chatMessages.slice(-maxMessages);
    }
    
    if (this.state.giftMessages.length > maxMessages) {
      this.state.giftMessages = this.state.giftMessages.slice(-maxMessages);
    }
    
    if (this.state.socialMessages.length > maxMessages) {
      this.state.socialMessages = this.state.socialMessages.slice(-maxMessages);
    }
  }

  /**
   * 更新状态并通知所有监听者
   */
  private updateState(updates: Partial<LiveDataState>): void {
    this.state = { ...this.state, ...updates };
    
    // 发送到渲染进程
    this.broadcastToRenderer(updates);
    
    // 发送到流媒体服务
    this.broadcastToStream(updates);
    
    // 触发内部事件
    this.emit('stateUpdate', updates);
  }

  /**
   * 广播数据到渲染进程
   */
  private broadcastToRenderer(data: Partial<LiveDataState>): void {
    const allWindows = BrowserWindow.getAllWindows();
    allWindows.forEach(window => {
      if (!window.isDestroyed()) {
        window.webContents.send('liveData:update', data);
      }
    });
  }

  /**
   * 广播数据到流媒体服务（WebSocket）
   */
  private broadcastToStream(data: Partial<LiveDataState>): void {
    if (this.wsClients.size > 0) {
      const message = JSON.stringify({
        type: 'liveDataUpdate',
        data,
        timestamp: Date.now()
      });

      this.wsClients.forEach(client => {
        try {
          if (client.readyState === 1) { // WebSocket.OPEN
            client.send(message);
          }
        } catch (error) {
          loggerService.addLog('error', 'Error sending WebSocket message', 'main', { error });
          this.wsClients.delete(client);
        }
      });
    }
  }

  /**
   * 启动 WebSocket 服务器（用于流媒体服务）
   */
  async startWebSocketServer(port: number = 3002): Promise<void> {
    try {
      const WebSocket = await import('ws');
      this.wsServer = new WebSocket.WebSocketServer({ port });

      this.wsServer.on('connection', (ws: any) => {
        loggerService.addLog('info', 'Stream client connected', 'main');
        this.wsClients.add(ws);

        // 发送当前状态
        ws.send(JSON.stringify({
          type: 'initialState',
          data: this.state,
          timestamp: Date.now()
        }));

        ws.on('close', () => {
          loggerService.addLog('info', 'Stream client disconnected', 'main');
          this.wsClients.delete(ws);
        });

        ws.on('error', (error: Error) => {
          loggerService.addLog('error', 'WebSocket client error', 'main', { error });
          this.wsClients.delete(ws);
        });
      });

      loggerService.addLog('info', `WebSocket server started on port ${port}`, 'main');
    } catch (error) {
      loggerService.addLog('error', 'Failed to start WebSocket server', 'main', { error });
    }
  }

  /**
   * 停止 WebSocket 服务器
   */
  async stopWebSocketServer(): Promise<void> {
    if (this.wsServer) {
      this.wsServer.close();
      this.wsServer = null;
      this.wsClients.clear();
      loggerService.addLog('info', 'WebSocket server stopped', 'main');
    }
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    await this.disconnect();
    await this.stopWebSocketServer();
    this.removeAllListeners();
  }
}