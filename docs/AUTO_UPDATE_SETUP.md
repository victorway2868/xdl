# 自动更新系统设置指南

本文档将指导你如何配置和使用基于 GitHub Actions + Cloudflare R2 的自动更新系统。

## 🚀 系统概述

这个自动更新系统包含两个主要部分：

1. **CI/CD 部分**：GitHub Actions 自动构建应用并上传到 Cloudflare R2
2. **客户端部分**：Electron 应用自动检查、下载和安装更新

## 📋 前置要求

- GitHub 仓库
- Cloudflare R2 存储桶
- 已配置的 GitHub Secrets（你已经完成了这步）

## ⚙️ 配置步骤

### 1. 配置更新服务器 URL

编辑 `src/main/config/updater.config.ts` 文件：

```typescript
export const updaterConfig: UpdaterConfig = {
  // 替换为你的 R2 自定义域名
  updateServerUrl: 'https://your-actual-r2-domain.com',
  
  checkIntervalHours: 4,        // 每4小时检查一次
  initialDelayMs: 30000,        // 启动后30秒开始检查
  enabled: true,                // 启用自动更新
};
```

### 2. 验证 GitHub Secrets

确保你的 GitHub 仓库已配置以下 Secrets：

- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_ACCOUNT_ID`
- `R2_BUCKET`
- `R2_ENDPOINT`

### 3. 测试构建流程

推送一个版本标签来触发构建：

```bash
# 更新版本号
npm version patch  # 或 minor, major

# 推送标签
git push[object Object] 工作流程

### 发布新版本

1. **更新代码**：提交你的代码更改
2. **创建版本标签**：
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```
3. **自动构建**：GitHub Actions 会自动：
   - 构建 Windows 和 macOS 版本
   - 上传安装包到 R2
   - 生成版本元数据文件

### 客户端更新流程

1. **检查更新**：应用启动后30秒开始检查
2. **下载安装包**：如果发现新版本，后台下载
3. **验证完整性**：使用 SHA512 哈希验证文件
4. **自动安装**：验证通过后自动安装并重启

## [object Object]构

```
your-r2-bucket/
├── releases/
│   ├── windows/
│   │   └── YourApp-Setup-1.0.1.exe
│   └── macos/
│       └── YourApp-1.0.1.zip
└── updates/
    ├── latest-windows.json
    └── latest-macos.json
```

## 🔧 自定义配置

### 修改检查频率

在 `updater.config.ts` 中修改 `checkIntervalHours`：

```typescript
checkIntervalHours: 2,  // 每2小时检查一次
```

### 禁用自动更新

```typescript
enabled: false,  // 禁用自动更新
```

### 使用环境变量

你可以通过环境变量覆盖配置：

```bash
UPDATE_SERVER_URL=https://your-domain.com npm start
```

## 🛠️ 故障排除

### 常见问题

1. **构建失败**：检查 GitHub Actions 日志
2. **下载失败**：确认 R2 域名配置正确
3. **安装失败**：检查文件权限和哈希验证

### 日志查看

应用会在以下位置记录更新日志：
- Windows: `%APPDATA%/YourApp/logs/`
- macOS: `~/Library/Logs/YourApp/`

## 🔒 安全注意事项

- 所有下载的文件都会进行 SHA512 哈希验证
- 建议为生产环境启用代码签名
- 定期轮换 R2 访问密钥

## 📝 版本管理

版本号格式：`v主版本.次版本.修订版本`

例如：`v1.0.0`, `v1.2.3`, `v2.0.0`

## 🎯 下一步

1. 配置你的 R2 自定义域名
2. 更新 `updater.config.ts` 中的 URL
3. 创建第一个版本标签进行测试
4. 验证整个更新流程是否正常工作
