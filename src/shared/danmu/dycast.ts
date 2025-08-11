/**
 * DyCast 弹幕连接核心
 * 简化版本，用于测试整合方案
 * 后续可以从旧项目完整迁移
 */

import { EventEmitter } from 'events';
import { DanmuMessage, DanmuConfig, DanmuConnectionInfo, CastMethod } from './types';

export class DyCast extends EventEmitter {
  private roomId: string;
  private config: DanmuConfig;
  private isConnected: boolean = false;
  private simulationTimer: NodeJS.Timeout | null = null;

  constructor(roomId: string, config?: Partial<DanmuConfig>) {
    super();
    this.roomId = roomId;
    this.config = {
      roomId,
      timeout: 30000,
      retryCount: 3,
      retryDelay: 5000,
      ...config
    };
  }

  /**
   * 连接到直播间
   */
  async connect(): Promise<void> {
    try {
      console.log(`DyCast: Connecting to room ${this.roomId}`);
      
      // 模拟连接延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.isConnected = true;
      
      // 触发连接打开事件
      const connectionInfo: DanmuConnectionInfo = {
        roomId: this.roomId,
        title: `直播间${this.roomId}`,
        nickname: `主播${this.roomId}`,
        avatar: '',
        cover: '',
        status: 'connected'
      };
      
      this.emit('open', null, connectionInfo);
      
      // 开始模拟数据推送
      this.startSimulation();
      
      console.log(`DyCast: Connected to room ${this.roomId}`);
    } catch (error) {
      console.error('DyCast: Connection failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 断开连接
   */
  close(): void {
    console.log(`DyCast: Closing connection to room ${this.roomId}`);
    
    this.isConnected = false;
    
    if (this.simulationTimer) {
      clearInterval(this.simulationTimer);
      this.simulationTimer = null;
    }
    
    this.emit('close', 0, 'Manual close');
  }

  /**
   * 开始模拟数据推送（用于测试）
   */
  private startSimulation(): void {
    if (!this.isConnected) return;

    let messageCount = 0;
    const users = ['用户A', '用户B', '用户C', '用户D', '用户E'];
    const gifts = ['玫瑰', '跑车', '火箭', '城堡', '嘉年华'];
    const chatContents = ['666', '主播好棒', '支持支持', '来了来了', '哈哈哈'];

    this.simulationTimer = setInterval(() => {
      if (!this.isConnected) return;

      const messages: DanmuMessage[] = [];
      const now = Date.now();

      // 随机生成不同类型的消息
      const messageType = Math.random();
      
      if (messageType < 0.6) {
        // 聊天消息 (60%)
        messages.push({
          method: CastMethod.CHAT,
          user: {
            name: users[Math.floor(Math.random() * users.length)],
            avatar: ''
          },
          content: chatContents[Math.floor(Math.random() * chatContents.length)],
          timestamp: now
        });
      } else if (messageType < 0.8) {
        // 礼物消息 (20%)
        messages.push({
          method: CastMethod.GIFT,
          user: {
            name: users[Math.floor(Math.random() * users.length)],
            avatar: ''
          },
          gift: {
            name: gifts[Math.floor(Math.random() * gifts.length)],
            count: Math.floor(Math.random() * 5) + 1,
            price: Math.floor(Math.random() * 100) + 10
          },
          timestamp: now
        });
      } else if (messageType < 0.9) {
        // 社交消息 (10%)
        const socialType = Math.random();
        let method: CastMethod;
        
        if (socialType < 0.4) {
          method = CastMethod.MEMBER;
        } else if (socialType < 0.7) {
          method = CastMethod.SOCIAL;
        } else {
          method = CastMethod.LIKE;
        }
        
        messages.push({
          method,
          user: {
            name: users[Math.floor(Math.random() * users.length)],
            avatar: ''
          },
          timestamp: now
        });
      } else {
        // 观众榜单更新 (10%)
        const audienceList = [];
        for (let i = 0; i < 10; i++) {
          audienceList.push({
            rank: i + 1,
            nickname: `观众${i + 1}`,
            avatar: '',
            level: Math.floor(Math.random() * 50) + 1,
            score: Math.floor(Math.random() * 10000)
          });
        }
        
        messages.push({
          method: CastMethod.ROOM_RANK,
          rank: audienceList,
          timestamp: now
        });
      }

      // 偶尔更新直播间统计信息
      if (messageCount % 10 === 0) {
        messages.forEach(msg => {
          msg.room = {
            audienceCount: Math.floor(Math.random() * 1000) + 100,
            likeCount: Math.floor(Math.random() * 10000) + 1000,
            followCount: Math.floor(Math.random() * 500) + 50,
            totalUserCount: Math.floor(Math.random() * 5000) + 500
          };
        });
      }

      if (messages.length > 0) {
        this.emit('message', messages);
      }

      messageCount++;
    }, 2000 + Math.random() * 3000); // 2-5秒随机间隔
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * 获取房间ID
   */
  getRoomId(): string {
    return this.roomId;
  }
}

// 导出方法枚举供外部使用
export { CastMethod };