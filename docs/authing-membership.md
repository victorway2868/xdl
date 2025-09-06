# 小斗笠会员认证与权限控制方案（维护文档）

最后更新：2025-09-06

## 概览
- 目标：引入 Authing OIDC 登录，计算会员到期与权限放行，前后端分层清晰、可维护可扩展
- 关键点：系统浏览器 + PKCE + Loopback 回调；主进程为权威；渲染层仅通过 IPC 获取状态；离线快照；权限拦截

---

## 架构与职责分层

### 主进程
- 模块
  - `src/main/services/authing.ts`：OIDC 登录、回调、换/刷新令牌、用户信息获取与解析（北京时间）、离线快照、广播
  - `src/main/handlers/authing.ts`：IPC 处理器封装
  - `src/main/handlers/index.ts`：集中注册 `registerAuthingHandlers()`
- 依赖与安全
  - `keytar` 持久化 `refresh_token`
  - `access_token` 仅内存
  - 广播频道：`authing-updated`（渲染层订阅）

### 渲染层
- 状态管理
  - Redux Slice：`src/renderer/store/features/authingSlice.ts`
  - Store 注册：`src/renderer/store/store.ts`，键名 `authing`
- 初始化与订阅
  - Hook：`src/renderer/hooks/useAuthingInit.ts`（启动时仅自动获取一次、订阅主进程广播）
- UI 接入
  - 会员中心：`src/renderer/pages/MembershipPage.tsx`（展示登录状态/会员到期、登录/退出按钮）
  - 权限拦截：`src/renderer/utils/ensureMember.ts`（未登录启动登录、非会员提示）
  - 受控入口：
    - 首页“开始直播”：`src/renderer/pages/HomePage.tsx`
    - OBS 配置“一键配置”：`src/renderer/pages/ObsConfigPage.tsx`

### Preload 与 IPC
- Preload API：`src/main/preload.ts` 暴露
  - `getAuthingStatus(): Promise<AuthingSnapshot>`
  - `startAuthingLogin(): Promise<void>`
  - `logoutAuthing(): Promise<void>`
  - `onAuthingUpdated(cb): () => void`

---

## 认证流程与策略

### 交互登录（系统浏览器）
- 授权模式：Authorization Code + PKCE（无 client_secret）
- 回调端口策略（按顺序探测首个可用）
  - `127.0.0.1:16266 → 26266 → 36266 → 46266 → 56266`
  - 注意 Authing 后台“回调白名单”需预先添加这 5 条 callback URL
- 成功后：换取 token → 刷新用户信息 → 解析会员 → 缓存/广播

### 启动阶段“仅自动获取一次”
- 若存在 `refresh_token`：
  - 尝试 refresh → 成功后仅自动拉取一次 `/userinfo`
- 失败或无 token：
  - 状态标记“未登录”
  - 若存在离线快照则带 `isStale=true` 返回（UI 可提示离线）

### Token 策略
- `refresh_token`：`keytar` 持久化（主进程）
- `access_token`：仅内存，过期则 refresh，失败清除 `refresh_token`

---

## 会员到期解析（北京时间）
- 策略：从 `nickname` 中提取第一个连续 10 位数字，如 `2025092916` → 表示“2025年09月29日16时”（北京时间）
- 解析：
  - 年月日时：`YYYY` `MM` `DD` `HH`
  - UTC 转换：将北京时间（UTC+8）转为 UTC 毫秒用于比较
  - `isMember = 当前时间 < 到期时间`
- 主进程缓存并下发字段：
  - `user.nicknameRaw`、`membershipExpiryRaw`、`membershipExpiryDate`（UTC ms）、`membershipExpiryTextCN`、`isMember`
- 无法解析 → `isMember=false`，相关字段置空

---

## 渲染层使用方式

### 初始化
- 在 `MainLayout` 中使用 `useAuthingInit()` 完成：
  - 启动阶段仅自动获取一次
  - 订阅 `authing-updated` 广播并刷新 Redux

### 权限拦截
- 引入 `ensureMemberOrPrompt()`：
  - 未登录：发起系统浏览器登录；登录成功后重查状态
  - 已登录但非会员：弹窗提示“需要会员权限”
  - 已登录且会员：放行
- 已接入：
  - `HomePage.tsx` 中 `handleStartStreaming` 前
  - `ObsConfigPage.tsx` 中 `handleConfigureOBS` 前

### 会员中心页面
- 读取 Redux `authing` 状态
- 展示登录账号（优先 `name / email / sub`）
- 展示会员到期中文文案（`membershipExpiryTextCN`）
- 登录/退出通过 preload API 调主进程

---

## 配置与常量

- 域名与端点（从 `AUTHING_URL` 派生，便于维护）

```ts
const AUTHING_URL = 'https://fboz85pty1tn-xiaodouli.authing.cn';
const AUTHING_ISSUER = `${AUTHING_URL}/oidc`;
const AUTH_ENDPOINT = `${AUTHING_ISSUER}/auth`;
const TOKEN_ENDPOINT = `${AUTHING_ISSUER}/token`;
const USERINFO_ENDPOINT = `${AUTHING_ISSUER}/me`;
```

- Client ID：`src/main/services/authing.ts` 中配置（如需多环境建议改为从配置/环境变量读取）
- 回调白名单：务必在 Authing 后台预置 5 个 callback URL
  - `http://127.0.0.1:16266/callback`
  - `http://127.0.0.1:26266/callback`
  - `http://127.0.0.1:36266/callback`
  - `http://127.0.0.1:46266/callback`
  - `http://127.0.0.1:56266/callback`

---

## 错误处理与备选路径
- 端口占用：自动尝试下一个候选端口；全部占用则报错提示
- 网络失败：启动拉取失败 → 未登录 +（若有）离线快照 `isStale=true`
- 刷新失败：清除 `refresh_token` 并回退未登录
- 昵称无法解析：视为非会员；会员字段置空

---

## 安全与日志
- 不在日志打印 token
- 仅主进程持有 `refresh_token`（`keytar`）；`access_token` 仅内存
- 校验 `state/nonce`，回调完成后关闭本地回环服务

---

## 构建与运行
- 安装依赖（已包含 `keytar`）：`npm install`
- 构建：`npm run build:all`
- 启动：`npm start`

---

## 代码与文件导航
- 主进程
  - 服务：`src/main/services/authing.ts`
  - 处理器：`src/main/handlers/authing.ts`
  - 处理器注册：`src/main/handlers/index.ts`
  - preload：`src/main/preload.ts`
- 渲染层
  - Redux Slice：`src/renderer/store/features/authingSlice.ts`
  - Store：`src/renderer/store/store.ts`
  - 初始化 Hook：`src/renderer/hooks/useAuthingInit.ts`
  - 权限拦截：`src/renderer/utils/ensureMember.ts`
  - 会员中心页：`src/renderer/pages/MembershipPage.tsx`
  - 入口接入：`HomePage.tsx` / `ObsConfigPage.tsx`

---

## 测试要点（建议）
- 登录/回调：能在系统浏览器完成并回到应用，状态正确更新
- 启动“仅自动获取一次”：二次打开应用不重复请求（除主动登录之后）
- 端口占用：按照候选序列切换下一端口
- 离线快照：断网启动时 UI 显示 `isStale` 提示
- 权限拦截：未登录触发登录、非会员提示、会员放行
- 昵称解析：覆盖无 10 位数字、边界日期（月底/跨年/闰年）

---

## 后续可选优化
- 将 `CLIENT_ID`、`AUTHING_URL` 改为从配置/环境变量读取，支持多环境
- UI 提示 `isStale` 离线状态，改善用户感知
- 增加单元测试：到期解析、端口回退、single-flight、离线快照
- 登录回调成功页面可定制（当前为简单提示，可替换为品牌页）

---

## 变更记录
- 2025-09-06：初版文档，完成 Authing OIDC 集成、会员解析与权限拦截落地说明

