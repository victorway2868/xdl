# 显示器采集功能迁移文档

## 概述
本次迁移将显示器采集功能从旧程序迁移到新的模块化架构中，并实现了基于设备类型的智能采集源选择。

## 迁移内容

### 1. 源文件迁移
- **原始位置**: `oldprogram/electron/modules/obsset_modules/create-display-capture.js`
- **新位置**: `src/main/modules/obsconfig/displayCapture.ts`

### 2. 功能改进
- 将JavaScript代码重构为TypeScript
- 集成到现有的OBS WebSocket管理系统
- 添加了完整的错误处理和返回值规范
- 移除了独立的WebSocket连接管理（使用统一的连接池）

### 3. 集成到一键配置流程
在 `src/main/handlers/obsConfig.ts` 中的 `one-click-configure-obs` 处理器中：

```typescript
// Step 4: 根据设备类型配置采集源
if (options.deviceName === 'PC端游') {
  // PC端游使用显示器采集
  captureResult = await createDisplayCaptureSource({ sourceName: '显示器采集' });
} else {
  // 其他设备使用视频采集设备
  captureResult = await addOrEnsureVideoCaptureDevice({ ... });
}
```

## 功能特性

### 显示器采集模块 (`displayCapture.ts`)
- **自动显示器检测**: 自动识别并选择主显示器
- **多显示器支持**: 支持多显示器环境，优先选择主显示器
- **错误处理**: 完整的错误处理和用户友好的错误信息
- **TypeScript支持**: 完整的类型定义和智能提示

### 智能采集源选择
- **PC端游**: 自动使用显示器采集，适合录制桌面游戏
- **其他设备**: 使用视频采集设备，适合手机/平板等外接设备

## API接口

### IPC处理器
```typescript
// 单独配置显示器采集
ipcMain.handle('configure-display-capture', async (_e, options: { sourceName?: string }) => {
  return await createDisplayCaptureSource(options);
});
```

### 函数接口
```typescript
export async function createDisplayCaptureSource(options: {
  sourceName?: string;
}): Promise<{
  success: boolean;
  sourceName?: string;
  monitorName?: string;
  monitorId?: string;
  message: string;
}>
```

## 使用方式

### 前端调用
```typescript
// 配置显示器采集
const result = await window.electronAPI.invoke('configure-display-capture', {
  sourceName: '显示器采集'
});

// 一键配置（自动根据设备类型选择）
const result = await window.electronAPI.invoke('one-click-configure-obs', {
  deviceName: 'PC端游',
  resolution: '1920x1080'
});
```

## 兼容性
- 支持Windows、macOS、Linux平台
- 兼容OBS Studio 28.0+
- 需要OBS WebSocket插件支持

## 注意事项
1. 显示器采集需要OBS Studio支持`monitor_capture`输入类型
2. 在多显示器环境中，会自动选择主显示器
3. 如果没有找到主显示器，会使用第一个可用显示器
4. 显示器采集源名称默认为"显示器采集"，可通过参数自定义

## 测试建议
1. 测试单显示器环境下的显示器采集
2. 测试多显示器环境下的主显示器选择
3. 测试PC端游设备类型的一键配置流程
4. 验证与其他设备类型的兼容性