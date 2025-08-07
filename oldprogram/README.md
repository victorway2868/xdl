# 测试项目

简单的Electron + React + Tailwind CSS应用

## 项目结构

- `electron/` - Electron主进程代码
- `src/` - React应用源代码
- `build/` - 构建脚本和配置
- `dist/` - Vite构建输出目录和Electron构建输出目录

## 开发环境

### 安装依赖

```bash
npm install
```

### 运行开发服务器

```bash
npm run electron:dev
```

这将启动Vite开发服务器和Electron应用。

## 构建应用

### 构建生产版本

```bash
npm run electron:build
```

这将执行以下步骤：
1. 使用Vite构建React应用
2. 使用`build/build.js`脚本构建Electron应用

构建输出将位于`dist`目录中。

## 构建配置

构建配置在两个地方定义：

1. `package.json`中的`build`部分
2. `build/build.js`文件

确保这两个配置保持一致。

## 路径解析

在生产环境中，应用使用以下路径解析策略：

1. 首先尝试加载`__dirname/../dist/index.html`
2. 如果失败，尝试加载`process.resourcesPath/app/dist/index.html`

## 故障排除

如果应用在生产环境中显示空白窗口，请检查控制台日志以获取更多信息。
