# Electron Framework App

一个基于现代 Electron 架构的应用程序，采用分层设计和插件化架构。

## 特性

- 🏗️ **分层架构**: 主进程采用 handlers/services/windows 三层架构
- 🔌 **插件系统**: 支持插件热插拔和第三方扩展
- 🎨 **现代 UI**: 基于 React + TypeScript + Ant Design
- 📊 **状态管理**: 使用 Redux Toolkit 进行状态管理
- 📝 **日志系统**: 完整的日志记录和查看功能
- ⚙️ **设置管理**: 可视化的应用设置界面
- 🔒 **安全设计**: 严格的 IPC 通信和安全策略

## 技术栈

- **核心框架**: Electron + Electron Forge
- **前端**: React + TypeScript + Ant Design
- **状态管理**: Redux Toolkit
- **构建工具**: Vite
- **日志系统**: electron-log
- **测试框架**: Jest

## 项目结构

```
src/
├── main/                   # 主进程代码
│   ├── handlers/          # IPC 请求处理器
│   ├── services/          # 业务逻辑服务
│   ├── windows/           # 窗口管理
│   └── plugins/           # 插件系统 (主进程)
├── renderer/              # 渲染进程代码
│   ├── components/        # React 组件
│   ├── pages/             # 页面组件
│   ├── store/             # Redux 状态管理
│   └── hooks/             # 自定义 Hooks
├── plugins/               # 插件系统
│   ├── core/              # 核心插件接口
│   └── modules/           # 具体插件实现
└── shared/                # 共享代码
    ├── types.ts           # 类型定义
    ├── constants.ts       # 常量
    └── interfaces/        # 接口定义
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm start
```

### 运行测试

```bash
npm test
```

### 打包应用

```bash
npm run make
```

## 插件开发

### 创建插件

1. 在 `src/plugins/modules/` 下创建插件目录
2. 创建 `manifest.json` 文件描述插件信息
3. 创建插件主文件，继承 `BasePlugin` 类
4. 实现 `onActivate` 和 `onDeactivate` 方法

### 插件示例

```typescript
import { BasePlugin } from '@plugins/core/base';

export default class MyPlugin extends BasePlugin {
  readonly name = 'my-plugin';
  readonly version = '1.0.0';
  readonly description = '我的插件';
  
  protected async onActivate(): Promise<void> {
    this.log('info', 'Plugin activated');
    // 插件激活逻辑
  }
  
  protected async onDeactivate(): Promise<void> {
    this.log('info', 'Plugin deactivated');
    // 插件停用逻辑
  }
}
```

## 架构设计

### 主进程分层

- **handlers/**: IPC 请求处理层，负责接收和分发渲染进程请求
- **services/**: 业务逻辑层，包含具体的业务实现
- **windows/**: 窗口管理层，统一管理应用窗口

### 插件系统

- **core/**: 定义插件接口和基类
- **modules/**: 具体插件实现
- **manager**: 插件生命周期管理
- **loader**: 插件发现和加载

### 安全设计

- 使用 `contextBridge` 安全暴露 API
- 严格的 CSP 策略
- 阻止不安全的导航和窗口创建

## 贡献指南

1. Fork 项目
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License