# 弹幕功能与场景编辑器整合方案

## 1. 整体架构设计

### 1.1 共享数据层架构
```
┌─────────────────────────────────────────────────────────────────┐
│                    主 Electron 应用                              │
├─────────────────────────────────────────────────────────────────┤
│  渲染进程 (React + TypeScript)                                   │
│  ├── 🏠 主页面 (HomePage)                                        │
│  ├── 💬 弹幕页面 (DanmuPage) ← 从旧项目迁移                      │
│  ├── 📺 场景编辑器页面 (SceneEditorPage) ← 新功能               │
│  └── ⚙️ 设置页面 (SettingsPage)                                 │
├─────────────────────────────────────────────────────────────────┤
│  共享状态管理 (Redux Toolkit)                                    │
│  ├── 🔄 liveDataSlice ← 核心共享数据                            │
│  │   ├── 弹幕消息流                                              │
│  │   ├── 礼物数据                                                │
│  │   ├── 观众信息                                                │
│  │   ├── 直播间状态                                              │
│  │   └── 实时统计                                                │
│  ├── 💬 danmuSlice ← 弹幕页面专用状态                           │
│  └── 📺 sceneSlice ← 场景编辑器专用状态                         │
├─────────────────────────────────────────────────────────────────┤
│  主进程服务层                                                     │
│  ├── 📡 LiveDataService ← 核心数据服务                          │
│  │   ├── DyCast 弹幕连接管理                                     │
│  │   ├── 数据解析和分发                                          │
│  │   ├── WebSocket 推送                                          │
│  │   └── 数据缓存管理                                            │
│  ├── 🎭 SceneService ← 场景编辑器服务                           │
│  │   ├── 布局配置管理                                            │
│  │   ├── 挂件数据绑定                                            │
│  │   └── OBS 集成                                               │
│  └── 现有服务 (SettingsService, LoggerService...)               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │   独立流媒体渲染服务     │
                    │   (Vite + WebSocket)    │
                    │   http://localhost:3001  │
                    └─────────────────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │      OBS 浏览器源       │
                    │    (捕捉流媒体页面)     │
                    └─────────────────────────┘
```

### 1.2 数据流设计
```
直播平台 → DyCast → LiveDataService → Redux Store → 双页面消费
                                    ↓
                              WebSocket推送
                                    ↓
                            独立流媒体渲染服务
                                    ↓
                                OBS显示
```

## 2. 核心功能实现

### 2.1 共享数据层 (LiveDataService)
负责统一管理所有直播间数据，为两个页面提供一致的数据源。

**主要职责：**
- 管理 DyCast 弹幕连接
- 解析和分发弹幕、礼物、观众等数据
- 提供实时数据推送
- 缓存历史数据
- 统计分析数据

### 2.2 弹幕页面 (DanmuPage)
从旧项目迁移，专注于弹幕展示和互动。

**核心功能：**
- 三栏布局：直播间信息 + 弹幕区域 + 社交信息
- 消息过滤和分类显示
- 观众榜单展示
- 实时统计数据
- 弹幕语音播报
- 礼物快捷键响应

### 2.3 场景编辑器页面 (SceneEditorPage)
新功能，专注于直播场景布局编辑。

**核心功能：**
- 可视化布局编辑器
- 挂件库和配置面板
- 实时预览和调试
- 布局保存和加载
- OBS 集成显示

## 3. 技术实施方案

### 3.1 第一阶段：数据层整合 (1-2周)

#### 3.1.1 迁移弹幕核心模块
```typescript
// src/shared/danmu/ - 迁移旧项目的弹幕核心
├── dycast.ts      // 弹幕连接核心
├── emitter.ts     // 事件发射器
├── model.ts       // 数据模型
├── util.ts        // 工具函数
└── types.ts       // TypeScript 类型定义
```

#### 3.1.2 创建共享数据服务
```typescript
// src/main/services/liveDataService.ts
export class LiveDataService {
  private dycast: DyCast | null = null;
  private websocketServer: WebSocketServer;
  
  // 连接直播间
  async connectToRoom(roomId: string): Promise<void>
  
  // 获取实时数据
  getRealtimeData(): LiveDataState
  
  // 推送数据到渲染进程
  private broadcastData(data: any): void
  
  // 推送数据到流媒体服务
  private forwardToStream(data: any): void
}
```

#### 3.1.3 创建共享状态管理
```typescript
// src/renderer/store/features/liveData/liveDataSlice.ts
interface LiveDataState {
  // 连接状态
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  roomInfo: RoomInfo;
  
  // 消息数据
  chatMessages: ChatMessage[];
  giftMessages: GiftMessage[];
  socialMessages: SocialMessage[];
  
  // 统计数据
  stats: {
    totalMessages: number;
    chatCount: number;
    giftCount: number;
    followCount: number;
    likeCount: number;
    memberCount: number;
  };
  
  // 观众数据
  audienceList: AudienceInfo[];
}
```

### 3.2 第二阶段：弹幕页面迁移 (1-2周)

#### 3.2.1 迁移弹幕页面组件
```typescript
// src/renderer/pages/Danmu/
├── index.tsx           // 主页面组件
├── components/
│   ├── RoomInfoPanel.tsx    // 直播间信息面板
│   ├── ChatMessageList.tsx  // 弹幕消息列表
│   ├── SocialMessageList.tsx // 社交消息列表
│   ├── AudienceRank.tsx     // 观众榜单
│   ├── MessageFilters.tsx   // 消息过滤器
│   └── ConnectionControl.tsx // 连接控制
└── hooks/
    ├── useDanmuConnection.ts // 弹幕连接Hook
    ├── useMessageFilters.ts  // 消息过滤Hook
    └── useVoiceAnnouncement.ts // 语音播报Hook
```

#### 3.2.2 适配现有技术栈
- 将 JSX 转换为 TSX
- 集成 Ant Design 组件
- 使用 Redux Toolkit 状态管理
- 适配 Tailwind CSS 样式系统

### 3.3 第三阶段：场景编辑器开发 (2-3周)

#### 3.3.1 场景编辑器核心组件
```typescript
// src/renderer/pages/SceneEditor/
├── index.tsx              // 主页面
├── components/
│   ├── LayoutCanvas.tsx       // 布局画布
│   ├── WidgetLibrary.tsx      // 挂件库
│   ├── PropertyPanel.tsx      // 属性面板
│   ├── LayerPanel.tsx         // 图层面板
│   ├── ToolBar.tsx           // 工具栏
│   └── PreviewPanel.tsx      // 预览面板
├── widgets/
│   ├── ChatWidget.tsx        // 弹幕挂件
│   ├── GiftWidget.tsx        // 礼物挂件
│   ├── CountdownWidget.tsx   // 倒计时挂件
│   ├── VoteWidget.tsx        // 投票挂件
│   └── CustomWidget.tsx      // 自定义挂件
└── hooks/
    ├── useLayoutEditor.ts    // 布局编辑Hook
    ├── useWidgetManager.ts   // 挂件管理Hook
    └── useScenePreview.ts    // 场景预览Hook
```

#### 3.3.2 流媒体渲染服务
```typescript
// src/stream/ - 独立的流媒体渲染服务
├── vite.config.ts
├── index.html
├── src/
│   ├── main.tsx
│   ├── StreamApp.tsx         // 流媒体应用主组件
│   ├── components/
│   │   ├── WidgetRenderer.tsx    // 挂件渲染器
│   │   └── LayoutRenderer.tsx    // 布局渲染器
│   ├── hooks/
│   │   ├── useWebSocket.ts       // WebSocket连接
│   │   └── useLiveData.ts        // 实时数据接收
│   └── styles/
│       └── stream.css            // 流媒体专用样式
```

### 3.4 第四阶段：功能整合和优化 (1-2周)

#### 3.4.1 页面导航整合
在主页添加两个功能的入口按钮：

```typescript
// src/renderer/pages/HomePage.tsx 中添加
<div className="grid grid-cols-2 gap-4 mt-6">
  <button
    onClick={() => navigate('/danmu')}
    className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg transition-colors"
  >
    <MessageCircle className="w-8 h-8 mx-auto mb-2" />
    <div className="font-medium">弹幕助手</div>
    <div className="text-sm opacity-80">实时弹幕监控</div>
  </button>
  
  <button
    onClick={() => navigate('/scene-editor')}
    className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg transition-colors"
  >
    <Monitor className="w-8 h-8 mx-auto mb-2" />
    <div className="font-medium">场景编辑器</div>
    <div className="text-sm opacity-80">直播布局设计</div>
  </button>
</div>
```

#### 3.4.2 数据同步机制
确保两个页面的数据实时同步：

```typescript
// 共享数据更新时，自动同步到所有消费者
const useLiveDataSync = () => {
  const dispatch = useAppDispatch();
  
  useEffect(() => {
    // 监听主进程的数据推送
    window.electronAPI.onLiveDataUpdate((data) => {
      dispatch(updateLiveData(data));
    });
    
    return () => {
      window.electronAPI.removeAllListeners('liveDataUpdate');
    };
  }, [dispatch]);
};
```

## 4. 用户体验设计

### 4.1 统一的连接管理
- 在任一页面连接直播间后，另一页面自动获得数据
- 连接状态在所有页面同步显示
- 支持快速切换页面而不断开连接

### 4.2 数据共享提示
- 在页面顶部显示数据来源状态
- 提供"在弹幕页面中查看"/"在场景编辑器中使用"的快捷跳转

### 4.3 设置统一管理
- 直播间连接设置在两个页面间共享
- 消息过滤设置可以独立配置
- 布局和挂件设置独立管理

## 5. 技术优势

### 5.1 代码复用
- 弹幕核心模块完全复用
- 数据服务层统一管理
- UI组件可以跨页面复用

### 5.2 性能优化
- 单一数据连接，避免重复连接
- 智能数据缓存和清理
- 按需加载页面组件

### 5.3 扩展性
- 新增挂件类型容易扩展
- 支持第三方插件开发
- 数据格式标准化，便于集成

## 6. 实施时间表

| 阶段 | 时间 | 主要任务 | 交付物 |
|------|------|----------|--------|
| 第一阶段 | 1-2周 | 数据层整合 | 共享数据服务、状态管理 |
| 第二阶段 | 1-2周 | 弹幕页面迁移 | 完整弹幕功能页面 |
| 第三阶段 | 2-3周 | 场景编辑器开发 | 场景编辑器和流媒体服务 |
| 第四阶段 | 1-2周 | 整合优化 | 完整集成方案 |

**总计：5-9周**

## 7. 风险评估和应对

### 7.1 技术风险
- **DyCast迁移兼容性**：逐步迁移，保持向后兼容
- **WebSocket连接稳定性**：增加重连机制和错误处理
- **性能问题**：实施数据分页和虚拟滚动

### 7.2 用户体验风险
- **学习成本**：提供详细的使用指南和示例
- **功能冲突**：明确划分两个页面的职责边界
- **数据一致性**：实施严格的数据同步机制

## 8. 成功标准

### 8.1 功能标准
- ✅ 弹幕页面完全迁移，功能无损失
- ✅ 场景编辑器基础功能完整
- ✅ 两个页面数据实时同步
- ✅ OBS集成正常工作

### 8.2 性能标准
- ✅ 页面切换响应时间 < 500ms
- ✅ 弹幕消息延迟 < 100ms
- ✅ 内存使用增长 < 50MB

### 8.3 用户体验标准
- ✅ 用户可以无缝在两个功能间切换
- ✅ 设置和配置统一管理
- ✅ 错误处理友好，有明确提示

这个方案既保持了弹幕功能的完整性，又为场景编辑器提供了强大的数据支持，同时最大化了代码复用和用户体验的一致性。