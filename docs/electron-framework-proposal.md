# Electron 应用框架方案

## 1. 概述

本文档旨在为新的 Electron 项目提供一个结构清晰、功能完备且易于扩展的框架方案。该方案集成了业界最佳实践，重点关注 **状态管理**、**操作日志**、**模块化** 和 **插件化架构**，确保项目在初期具有高效率的开发能力，并能在未来轻松添加新功能。通过主进程分层设计和插件系统，实现了高度的可扩展性和代码复用性。

---

## 2. 技术选型

| 类别 | 技术 | 理由 |
| :--- | :--- | :--- |
| **核心框架** | **Electron** | 跨平台桌面应用开发的首选。 |
| **打包构建** | **Electron Forge** | Electron 官方推荐的构建工具，集成了打包、分发和自动更新等功能。 |
| **前端框架** | **React + TypeScript** | 提供强大的类型检查和组件化开发模式，提升代码质量和可维护性。 |
| **状态管理** | **Redux Toolkit** | Redux 官方推荐的工具集，简化了 Redux 的使用，能高效、可预测地管理全局状态。 |
| **日志系统** | **electron-log** | 功能强大的日志库，支持在主进程和渲染进程中记录日志，可输出到文件和控制台。 |
| **UI 库 (可选)** | **Ant Design / Material-UI** | 提供高质量的 React UI 组件，加速界面开发。 |

---

## 3. 项目结构

一个清晰的目录结构是可维护性的关键。建议采用以下结构：

```
/
├── build/                  # Electron Forge 打包输出目录
├── public/                 # 静态资源目录 (图片, 图标, 字体等)
├── forge.config.js         # Electron Forge 配置文件
├── package.json
├── tsconfig.json
└── src/
    ├── main/               # 主进程 (Main Process) 代码
    │   ├── index.ts        # 主进程入口文件
    │   ├── preload.ts      # 预加载脚本，用于主进程和渲染进程通信
    │   ├── handlers/       # IPC 请求处理器
    │   │   ├── index.ts    # 统一注册所有处理器
    │   │   ├── settings.ts # 设置相关 IPC 处理
    │   │   ├── logger.ts   # 日志相关 IPC 处理
    │   │   └── plugins.ts  # 插件相关 IPC 处理
    │   ├── services/       # 业务逻辑服务
    │   │   ├── logger.ts   # 日志服务
    │   │   ├── settings.ts # 设置管理服务
    │   │   ├── database.ts # 数据库服务
    │   │   └── fileSystem.ts # 文件系统服务
    │   ├── windows/        # 窗口管理
    │   │   ├── manager.ts  # 窗口管理器
    │   │   ├── main.ts     # 主窗口创建和控制
    │   │   └── splash.ts   # 启动画面窗口
    │   └── plugins/        # 插件系统 (主进程部分)
    │       ├── manager.ts  # 插件管理器
    │       └── loader.ts   # 插件加载器
    │
    ├── renderer/           # 渲染进程 (Renderer Process) 代码 (React App)
    │   ├── index.html      # 应用 HTML 入口
    │   ├── index.tsx       # React 应用入口
    │   ├── App.tsx         # 根组件
    │   ├── store/          # Redux 状态管理
    │   │   ├── store.ts
    │   │   └── features/   # 按功能划分的 state slice
    │   │       ├── user/
    │   │       │   └── userSlice.ts
    │   │       ├── settings/
    │   │       │   └── settingsSlice.ts
    │   │       └── plugins/
    │   │           └── pluginsSlice.ts
    │   ├── components/     # 通用 React 组件
    │   ├── pages/          # 页面级组件
    │   ├── hooks/          # 自定义 Hooks (例如 useLogger, usePlugins)
    │   └── plugins/        # 插件系统 (渲染进程部分)
    │       ├── registry.ts # 插件注册表
    │       └── hooks.ts    # 插件相关 Hooks
    │
    ├── plugins/            # 插件系统
    │   ├── core/           # 核心插件接口和基类
    │   │   ├── types.ts    # 插件类型定义
    │   │   ├── base.ts     # 插件基类
    │   │   └── lifecycle.ts # 插件生命周期管理
    │   └── modules/        # 具体功能插件
    │       ├── theme/      # 主题插件示例
    │       │   ├── index.ts
    │       │   └── manifest.json
    │       └── shortcuts/  # 快捷键插件示例
    │           ├── index.ts
    │           └── manifest.json
    │
    └── shared/             # 主进程和渲染进程共享的代码
        ├── types.ts        # 共享的 TypeScript 类型定义
        ├── constants.ts    # 共享的常量
        └── interfaces/     # 共享接口定义
            ├── ipc.ts      # IPC 接口定义
            └── plugins.ts  # 插件接口定义
```

**关于 `public` 目录的说明**:

所有静态资源（如图片、图标、字体文件等）都应存放在根目录的 `public` 文件夹中。构建工具（如 Vite, Webpack）会自动处理这些资源，确保它们在开发和生产环境中都能被正确引用。

- **渲染进程**: 可以直接使用相对路径 (例如 `<img src="/icons/app.png">`) 来引用 `public` 目录下的文件。
- **主进程**: 需要使用 `path.join(__dirname, '../public/icons/app.png')` 来构建正确的绝对路径，特别是在打包后需要访问 `asar` 归档内的文件时。

---

## 4. 核心功能实现

### 4.1. 主进程分层架构

**目的**: 避免主进程代码膨胀，提高代码可维护性和可扩展性。

**分层设计**:

1. **handlers/ - IPC 请求处理层**
   - 负责接收和分发来自渲染进程的 IPC 请求
   - 每个功能模块对应一个处理器文件
   - 统一在 `handlers/index.ts` 中注册所有处理器

2. **services/ - 业务逻辑层**
   - 包含具体的业务逻辑实现
   - 文件操作、数据库访问、系统调用等
   - 为 handlers 层提供服务支持

3. **windows/ - 窗口管理层**
   - 统一管理所有应用窗口
   - 窗口创建、销毁、状态控制
   - 支持多窗口应用架构

**实现示例**:
```typescript
// handlers/settings.ts
export const registerSettingsHandlers = () => {
  ipcMain.handle('settings:get', () => settingsService.getSettings());
  ipcMain.handle('settings:save', (_, data) => settingsService.saveSettings(data));
};

// services/settings.ts
export class SettingsService {
  async getSettings() { /* 业务逻辑 */ }
  async saveSettings(data) { /* 业务逻辑 */ }
}
```

### 4.2. 插件化架构

**目的**: 提供高度可扩展的插件系统，支持功能模块的热插拔和第三方扩展。

**核心组件**:

1. **插件接口定义** (`plugins/core/types.ts`)
   ```typescript
   interface IPlugin {
     name: string;
     version: string;
     activate(context: PluginContext): void;
     deactivate(): void;
   }
   ```

2. **插件生命周期管理** (`plugins/core/lifecycle.ts`)
   - 插件加载、激活、停用、卸载
   - 依赖关系管理
   - 错误处理和恢复

3. **插件管理器** (`main/plugins/manager.ts`)
   - 插件发现和注册
   - 运行时插件管理
   - 插件间通信协调

**插件开发流程**:
1. 创建插件目录和 `manifest.json`
2. 实现插件主类，继承 `BasePlugin`
3. 注册插件提供的功能和 API
4. 通过插件管理器加载和激活

### 4.3. 状态管理 (Redux Toolkit)

- **目的**: 集中管理应用的全局状态（如用户信息、应用设置、插件状态等）。
- **实现**:
    1.  在 `src/renderer/store/` 中配置 Redux Store。
    2.  使用 `createSlice` 按功能模块（如 `user`, `settings`, `plugins`）创建 "Slice"。
    3.  React 组件通过 `useSelector` 获取状态，通过 `useDispatch` 派发 `actions` 来更新状态。
- **优势**: 状态变更可预测、可追溯，便于调试。支持插件状态的统一管理。

### 4.4. 操作日志 (electron-log)

- **目的**: 记录关键操作、程序错误和调试信息，便于问题排查和行为分析。
- **实现**:
    1.  **服务层**: 在 `src/main/services/logger.ts` 中实现日志服务。
    2.  **处理层**: 在 `src/main/handlers/logger.ts` 中处理来自渲染进程的日志请求。
    3.  **IPC 通信**: 通过预加载脚本暴露安全的日志 API。
    4.  **便捷使用**: 提供 `useLogger` hook 和插件日志接口。

### 4.5. 进程间通信 (IPC)

- **安全**: 严格使用 `preload.ts` 和 `contextBridge`，避免将整个 `ipcRenderer` 模块暴露给渲染进程。
- **API化**: 将所有 IPC 通道定义成统一的 API 接口，支持插件扩展。
- **类型安全**: 在 `shared/interfaces/ipc.ts` 中定义所有 IPC 接口类型。

---

## 5. 如何添加新功能？

### 5.1. 传统功能扩展 (示例：添加"应用设置"功能)

这个框架的可扩展性体现在添加新功能的流程化上：

1.  **服务层**: 在 `src/main/services/settings.ts` 中实现设置管理服务。
2.  **处理层**: 在 `src/main/handlers/settings.ts` 中实现 IPC 处理器。
3.  **定义状态**: 在 `src/renderer/store/features/` 下创建 `settingsSlice.ts`。
4.  **创建界面**: 在 `src/renderer/pages/` 中创建 `Settings.tsx` 页面组件。
5.  **定义通信**: 在 `shared/interfaces/ipc.ts` 中添加设置相关的接口类型。

### 5.2. 插件化功能扩展 (示例：添加"主题切换"插件)

对于可复用的功能模块，建议采用插件化方式：

1.  **创建插件目录**: `src/plugins/modules/theme/`
2.  **定义插件清单**: 创建 `manifest.json` 描述插件信息
3.  **实现插件类**: 继承 `BasePlugin` 并实现必要接口
4.  **注册插件功能**: 通过插件上下文注册 UI 组件和服务
5.  **插件激活**: 通过插件管理器自动发现和加载

---

## 6. 开发与构建

- **安装依赖**: `npm install`
- **启动开发**: `npm start` (Electron Forge 会自动编译 TS 和启动应用，并支持热重载)
- **打包应用**: `npm run make` (为当前操作系统打包成可执行文件)

---

## 7. 总结

此方案通过 **Electron Forge + React + TypeScript** 奠定了坚实的基础，利用 **Redux Toolkit** 和 **electron-log** 分别解决了状态管理和日志记录的核心需求。清晰的 **分层结构** 和 **IPC API化** 设计，使得未来添加任何新功能都将变得简单且有章可循。