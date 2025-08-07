# 自动生成 latest.yml 版本文件

## 概述

现在每次构建完成后，系统会自动生成包含软件包大小信息的 `latest.yml` 文件。

## 自动化流程

### 1. 构建时自动生成

当你运行 `npm run electron:build` 时，构建流程会：

1. 检查资源文件
2. 构建 Vite 项目
3. 构建 Electron 应用
4. **自动生成 latest.yml 文件**（包含文件大小）
5. 验证构建结果

### 2. 手动生成

如果你只想生成版本文件而不重新构建整个应用，可以运行：

```bash
npm run generate-version
```

## 生成的文件内容

`latest.yml` 文件包含以下信息：

```json
{
  "version": "2.0.0",
  "productName": "小斗笠直播助手",
  "releaseDate": "2025-06-10T17:15:23.213Z",
  "downloadUrl": "https://84794ee73142290fa69ac64ae8fc7bee.r2.cloudflarestorage.com/xiaodouliupdates/小斗笠直播助手-Setup-2.0.0.exe",
  "fileName": "小斗笠直播助手-Setup-2.0.0.exe",
  "fileSize": "200.13 MB",
  "sha512": ""
}
```

### 字段说明

- **version**: 从 package.json 读取的版本号
- **productName**: 产品名称
- **releaseDate**: 生成时间（ISO 格式）
- **downloadUrl**: 下载链接（指向 Cloudflare R2）
- **fileName**: 安装包文件名
- **fileSize**: 文件大小（以 MB 为单位，保留两位小数）
- **sha512**: SHA512 校验和（当前为空，可以后续添加）

## 相关脚本文件

1. **build/generate-latest-yml.js** - 独立的版本文件生成脚本
2. **build/build.js** - 主构建脚本（已集成版本文件生成）
3. **build/create-version-file.js** - 原有的版本文件生成脚本（已更新）
4. **build/r2-upload.js** - R2 上传脚本（已更新）

## 文件大小计算

- 自动读取安装包文件的实际大小
- 将字节转换为 MB（1 MB = 1,048,576 字节）
- 保留两位小数，格式为 "XXX.XX MB"
- 如果安装包文件不存在，则不包含 fileSize 字段

## 使用场景

1. **软件更新检查** - 应用程序可以读取此文件检查新版本
2. **下载进度显示** - 使用文件大小计算下载进度
3. **用户提示** - 在更新提示中显示下载大小
4. **自动化部署** - CI/CD 流程中自动生成和上传版本信息

## 注意事项

- 版本文件会在每次构建后自动覆盖
- 文件大小基于实际的安装包文件计算
- 如果安装包不存在，会显示警告但仍会生成版本文件
- downloadUrl 指向 Cloudflare R2 存储，确保 URL 正确性
