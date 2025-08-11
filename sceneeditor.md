# 场景编辑器集成方案 - 作为扩展功能

## 1. 方案概述

将场景编辑器重新设计为主应用的一个功能模块，而不是独立的应用程序。这个方案充分利用现有的 Electron 框架架构，提供更好的用户体验和代码复用性。

### 1.1 设计目标

- **无缝集成**: 场景编辑器作为主应用的一个页面/功能模块
- **插件化挂件**: 基于现有插件系统实现各种直播挂件
- **统一管理**: 所有功能在一个应用中统一管理
- **共享资源**: 复用现有的服务、状态管理和UI组件

## 2. 技术架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                    主 Electron 应用                              │
├─────────────────────────────────────────────────────────────────┤
│  渲染进程 (React)                                                 │
│  ├── 主页面 (HomePage)                                           │
│  ├── 设置页面 (SettingsPage)                                     │
│  ├── 📺 场景编辑器页面 (SceneEditorPage) ← 新增                  │
│  │   ├── 布局编辑器                                              │
│  │   ├── 挂件配置面板                                            │
│  │   └── 控制面板                                                │
│  └── 其他页面...                                                 │
├─────────────────────────────────────────────────────────────────┤
│  主进程服务                                                       │
│  ├── 现有服务 (SettingsService, LoggerService...)               │
│  ├── 🔄 StreamService ← 新增                                     │
│  │   ├── Vite 开发服务器管理                                     │
│  │   ├── WebSocket 数据推送                                      │
│  │   └── 布局配置管理                                            │
│  ├── 📡 LiveDataService ← 新增                                   │
│  │   ├── 弹幕数据获取                                            │
│  │   ├── 数据缓存和处理                                          │
│  │   └── 实时数据推送                                            │
│  └── WindowManager                                               │
├─────────────────────────────────────────────────────────────────┤
│  插件系统                                                         │
│  ├── 现有插件 (theme, shortcuts...)                             │
│  └── 🎭 流媒体挂件插件 ← 新增                                    │
│      ├── ChatWidget (弹幕挂件)                                   │
│      ├── GiftWidget (礼物挂件)                                   │
│      ├── FollowerWidget (关注者挂件)                             │
│      └── CustomWidget (自定义挂件)                               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │   Vite 流媒体渲染服务    │
                    │   (独立端口，供OBS使用)   │
                    │   http://localhost:3001  │
                    └─────────────────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │      OBS 浏览器源       │
                    │    (捕捉流媒体页面)     │
                    └─────────────────────────┘
```

### 2.2 项目结构扩展

基于现有的框架结构，新增以下目录和文件：

```
src/
├── main/
│   ├── services/
│   │   ├── streamService.ts      # 🆕 流媒体服务
│   │   └── liveDataService.ts    # 🆕 直播数据服务
│   ├── handlers/
│   │   ├── stream.ts             # 🆕 流媒体相关 IPC 处理
│   │   └── liveData.ts           # 🆕 直播数据 IPC 处理
│   └── windows/
│
├── renderer/
│   ├── pages/
│   │   └── SceneEditor/          # 🆕 场景编辑器页面
│   │       ├── index.tsx         # 主页面组件
│   │       ├── LayoutEditor.tsx  # 布局编辑器
│   │       ├── WidgetPanel.tsx   # 挂件配置面板
│   │       └── ControlPanel.tsx  # 控制面板
│   ├── store/features/
│   │   ├── stream/               # 🆕 流媒体状态管理
│   │   │   └── streamSlice.ts
│   │   └── liveData/             # 🆕 直播数据状态管理
│   │       └── liveDataSlice.ts
│   └── components/
│       └── SceneEditor/          # 🆕 场景编辑器专用组件
│           ├── WidgetLibrary.tsx
│           ├── PropertyPanel.tsx
│           └── LayerPanel.tsx
│
├── plugins/modules/
│   └── streamWidgets/            # 🆕 流媒体挂件插件包
│       ├── manifest.json
│       ├── index.ts
│       └── widgets/
│           ├── ChatWidget.tsx
│           ├── GiftWidget.tsx
│           ├── FollowerWidget.tsx
│           └── CustomWidget.tsx
│
├── shared/interfaces/
│   ├── stream.ts                 # 🆕 流媒体相关接口
│   └── widget.ts                 # 🆕 挂件相关接口
│
└── stream/                       # 🆕 独立的流媒体渲染服务
    ├── vite.config.ts
    ├── index.html
    ├── src/
    │   ├── main.tsx
    │   ├── StreamApp.tsx
    │   ├── components/
    │   └── hooks/
    └── public/
```

## 3. 功能实现方案

### 3.1 场景编辑器页面集成

场景编辑器将作为主应用的一个标准页面存在：

```typescript
// src/renderer/App.tsx - 路由配置
import { SceneEditorPage } from './pages/SceneEditor';

function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/scene-editor" element={<SceneEditorPage />} /> {/* 新增 */}
        {/* 其他路由... */}
      </Routes>
    </MainLayout>
  );
}
```

**导航集成**：
- 在主导航菜单中添加"场景编辑器"入口
- 可以通过快捷键快速切换到场景编辑器
- 支持标签页或侧边栏形式的导航

#### 3.1.1 按钮入口设计

场景编辑器的主要入口位于主页（HomePage）的导航栏中：

**位置**: 主页下部区域的导航栏（第615-654行）
**按钮样式**: 
```typescript
// 场景编辑器按钮实现
<button
  onClick={() => navigate('/scene-editor')}
  style={{
    fontSize: '14px',
    color: '#d1d5db',
    padding: '8px 16px',
    borderRadius: '8px',
    transition: 'all 0.3s ease',
    border: '1px solid transparent',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    outline: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  }}
  // 悬停效果
  onMouseEnter={(e) => {
    e.currentTarget.style.color = 'white';
    e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
  }}
>
  📺 场景编辑器
</button>
```

**设计特点**：
- 使用电视机图标（📺）作为视觉标识，与直播场景主题呼应
- 采用与其他导航按钮一致的样式风格（插件、设备推荐、直播教程等）
- 支持响应式hover效果，提供良好的交互反馈
- 位于热门推荐区域的顶部，用户访问便捷
- 通过 React Router 导航到 `/scene-editor` 路由

**访问路径**：
1. 用户打开应用进入主页
2. 在下部区域找到"热门推荐"部分
3. 点击导航栏中的"📺 场景编辑器"按钮
4. 应用导航到场景编辑器页面

### 3.2 主进程服务扩展

基于现有的服务架构模式，新增两个核心服务：

#### 3.2.1 StreamService - 流媒体服务

```typescript
// src/main/services/streamService.ts
export class StreamService {
  private viteServer: ViteDevServer | null = null;
  private websocketServer: WebSocketServer;
  private currentLayout: LayoutConfig;
  
  async startStreamServer(port: number = 3001): Promise<void> {
    // 启动 Vite 开发服务器
    // 配置 WebSocket 推送
    // 设置静态资源服务
  }
  
  async updateLayout(layout: LayoutConfig): Promise<void> {
    // 更新布局配置
    // 通过 WebSocket 推送到流媒体页面
  }
  
  async updateWidgetData(widgetId: string, data: any): Promise<void> {
    // 推送挂件数据更新
  }
}
```

#### 3.2.2 LiveDataService - 直播数据服务

```typescript
// src/main/services/liveDataService.ts
export class LiveDataService {
  private danmuConnection: DanmuConnection;
  private dataCache: Map<string, any> = new Map();
  
  async connectToLiveRoom(roomId: string): Promise<void> {
    // 连接到直播间
    // 设置数据监听
  }
  
  async getRealtimeData(type: 'chat' | 'gift' | 'follow'): Promise<any[]> {
    // 获取实时数据
  }
  
  private forwardDataToStream(data: any): void {
    // 转发数据到流媒体服务
    streamService.updateWidgetData(data.type, data);
  }
}
```

### 3.3 插件系统集成

流媒体挂件将作为插件系统的一部分：

```typescript
// src/plugins/modules/streamWidgets/index.ts
export class StreamWidgetsPlugin extends BasePlugin {
  name = 'StreamWidgets';
  version = '1.0.0';
  
  activate(context: PluginContext): void {
    // 注册挂件类型
    context.registerWidgetType('chat', ChatWidget);
    context.registerWidgetType('gift', GiftWidget);
    context.registerWidgetType('follower', FollowerWidget);
    
    // 注册UI组件
    context.registerComponent('widget-library', WidgetLibrary);
  }
  
  deactivate(): void {
    // 清理插件资源
  }
}
```

### 3.4 用户界面设计

#### 3.4.1 场景编辑器主界面

```typescript
// src/renderer/pages/SceneEditor/index.tsx
export const SceneEditorPage: React.FC = () => {
  return (
    <div className="scene-editor">
      <div className="editor-header">
        <ControlPanel />
      </div>
      <div className="editor-body">
        <div className="left-panel">
          <WidgetLibrary />
          <LayerPanel />
        </div>
        <div className="center-canvas">
          <LayoutEditor />
        </div>
        <div className="right-panel">
          <PropertyPanel />
        </div>
      </div>
    </div>
  );
};
```

#### 3.4.2 集成到主导航

```typescript
// src/renderer/components/layout/MainLayout.tsx
const navigationItems = [
  { key: 'home', label: '首页', icon: <HomeOutlined /> },
  { key: 'scene-editor', label: '场景编辑器', icon: <VideoCameraOutlined /> }, // 新增
  { key: 'settings', label: '设置', icon: <SettingOutlined /> },
];
```

**实际实现**: 当前场景编辑器入口已在主页（HomePage）的导航栏中实现：

```typescript
// src/renderer/pages/HomePage.tsx (第620-648行)
<button
  onClick={() => navigate('/scene-editor')}
  style={{
    fontSize: '14px',
    color: '#d1d5db',
    padding: '8px 16px',
    borderRadius: '8px',
    transition: 'all 0.3s ease',
    // ... 其他样式
  }}
>
  📺 场景编辑器
</button>
```

**用户体验设计**：
- 按钮采用扁平设计风格，与应用整体UI保持一致
- 使用电视机emoji图标，直观表达直播场景编辑功能
- 悬停时有蓝色高亮效果，提供即时视觉反馈
- 位于热门推荐区域顶部，便于用户发现和访问

## 4. 技术优势

### 4.1 架构优势

1. **代码复用**: 充分利用现有的服务、组件和状态管理
2. **统一体验**: 用户在单一应用中完成所有操作
3. **资源共享**: 共享日志、设置、主题等应用级资源
4. **插件扩展**: 基于现有插件系统，易于扩展新挂件

### 4.2 开发优势

1. **渐进式开发**: 可以逐步添加功能，不影响现有功能
2. **类型安全**: 完全基于 TypeScript，类型安全有保障
3. **热更新**: 开发时支持热更新，提高开发效率
4. **测试友好**: 可以独立测试各个模块

### 4.3 用户体验优势

1. **无需安装额外软件**: 所有功能集成在一个应用中
2. **设置统一管理**: 应用设置和场景编辑器设置统一管理
3. **快速切换**: 可以快速在不同功能间切换
4. **资源优化**: 共享内存和资源，减少系统负担

## 5. 实施计划

### 5.1 第一阶段：基础架构 (1-2周)

1. **服务层扩展**
   - 创建 StreamService 和 LiveDataService
   - 配置 Vite 流媒体服务器
   - 实现基础的 IPC 通信

2. **插件系统集成**
   - 创建 StreamWidgets 插件包
   - 实现基础挂件类型
   - 集成到现有插件管理器

3. **状态管理**
   - 创建 stream 和 liveData 的 Redux slices
   - 实现基础的状态同步

### 5.2 第二阶段：UI集成 (2-3周)

1. **页面创建**
   - 实现 SceneEditorPage 主页面
   - 创建布局编辑器组件
   - 实现挂件配置面板

2. **导航集成**
   - 添加到主导航菜单
   - 实现路由配置
   - 添加快捷键支持

3. **布局优化**
   - 优化布局编辑器界面
   - 完善属性面板交互
   - 提升编辑体验

### 5.3 第三阶段：功能完善 (2-3周)

1. **挂件系统**
   - 实现各种直播挂件
   - 挂件数据绑定
   - 样式和动画系统

2. **数据集成**
   - 集成弹幕数据服务
   - 实现实时数据推送
   - 数据缓存和优化

3. **用户体验优化**
   - 拖拽操作优化
   - 快捷键支持
   - 撤销/重做功能

## 6. 与现有架构的兼容性

### 6.1 完全兼容现有功能

- 所有现有页面和功能保持不变
- 现有插件系统继续工作
- 现有服务和状态管理继续使用

### 6.2 扩展现有能力

- 扩展插件系统支持挂件类型
- 扩展窗口管理支持多窗口操作
- 扩展设置系统支持流媒体配置

### 6.3 共享基础设施

- 复用 electron-log 日志系统
- 复用 Redux Toolkit 状态管理
- 复用 Ant Design UI 组件
- 复用现有的构建和打包配置

## 7. 实施清单和检查点

### 7.1 已完成的设计工作 ✅

**架构设计**
- [x] 重新设计为应用内功能模块而非独立应用
- [x] 基于现有插件系统设计挂件架构
- [x] 设计主进程服务层 (StreamService, LiveDataService)
- [x] 设计IPC通信接口和处理器
- [x] 设计Redux状态管理方案

**代码结构**
- [x] 创建流媒体相关接口定义 (`src/shared/interfaces/stream.ts`, `widget.ts`)
- [x] 创建流媒体挂件插件结构 (`src/plugins/modules/streamWidgets/`)
- [x] 创建主进程服务 (`src/main/services/streamService.ts`)
- [x] 创建IPC处理器 (`src/main/handlers/stream.ts`)
- [x] 创建Redux状态管理 (`src/renderer/store/features/stream/streamSlice.ts`)
- [x] 创建场景编辑器页面组件 (`src/renderer/pages/SceneEditor/`)
- [x] 创建API Hook (`src/renderer/hooks/useStreamApi.ts`)

**UI集成设计**
- [x] 设计场景编辑器主界面布局
- [x] 设计响应式样式和暗色主题支持
- [x] 设计与主导航的集成方案
- [x] 设计控制面板和工具栏
- [x] 实现主页导航栏中的场景编辑器入口按钮（第620-648行）

### 7.2 接下来需要实施的工作

**第一阶段：核心集成 (预计1-2周)**
1. 修改主进程入口文件，注册新的服务和处理器
2. 更新 preload.ts，暴露流媒体相关API
3. 更新主应用路由，添加场景编辑器页面
4. 实现基础的挂件组件 (ChatWidget, GiftWidget等)
5. 实现布局编辑器的拖拽和缩放功能

**第二阶段：功能完善 (预计2-3周)**
1. 实现流媒体渲染服务 (Vite + WebSocket)
2. 集成弹幕数据服务
3. 完善挂件配置和属性面板
4. 实现布局编辑器的高级功能
5. 添加布局保存和加载功能

**第三阶段：优化和测试 (预计1-2周)**
1. 性能优化和内存管理
2. 错误处理和用户反馈
3. 单元测试和集成测试
4. 用户体验优化
5. 文档和示例

### 7.3 技术债务和注意事项

**依赖管理**
- 需要添加 Vite 相关依赖到 package.json
- 需要添加 WebSocket 库依赖
- 可能需要更新一些现有依赖的版本

**性能考虑**
- 流媒体服务器启动时间优化
- 大量挂件时的渲染性能
- WebSocket 连接的资源管理
- 内存泄漏防护

**兼容性**
- 确保与现有插件系统兼容
- 确保不影响应用的其他功能
- 跨平台兼容性测试

## 8. 总结

这个重新设计的方案将场景编辑器完美集成到现有的 Electron 应用框架中，作为一个功能强大的扩展模块。通过详细的架构设计和代码实现，我们已经为项目提供了：

**核心价值**：
- ✅ 无缝集成到现有应用架构
- ✅ 充分利用现有组件和服务
- ✅ 插件化的可扩展挂件系统
- ✅ 统一的用户体验和界面设计
- ✅ 渐进式开发和部署策略
- ✅ 完整的类型安全和错误处理
- ✅ 现代化的技术栈和开发体验

**技术优势**：
- 基于成熟的 Electron + React + TypeScript 架构
- 利用 Redux Toolkit 进行可预测的状态管理
- 通过插件系统实现高度可扩展性
- 使用 Vite 提供快速的开发和构建体验
- WebSocket 实现实时数据推送
- 响应式设计和暗色主题支持

**商业价值**：
- 降低开发和维护成本
- 提供统一的用户体验
- 支持快速功能迭代
- 便于第三方扩展开发
- 减少用户学习成本

这个方案既满足了场景编辑器的功能需求，又最大化了与现有系统的协同效应，是一个技术先进、实施可行、商业价值明确的解决方案。
