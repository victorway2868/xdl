# Requirements Document

## Introduction

本功能旨在为小斗笠直播助手创建一个完整的内容展示系统，包括从远程API获取数据、创建多个子页面（直播教程、插件、设备推荐）以及实现统一的卡片式封面展示模块。该系统将使用Redux进行全局状态管理，确保数据在各个页面间的一致性和高效共享，提升用户体验。

## Requirements

### Requirement 1

**User Story:** 作为用户，我希望应用启动时能自动获取最新的内容数据，这样我就能看到最新的教程、插件和设备推荐信息。

#### Acceptance Criteria

1. WHEN 应用启动 THEN 系统 SHALL 从 https://xiaodouli.openclouds.dpdns.org/updates/appdates.json 获取数据
2. WHEN 数据获取成功 THEN 系统 SHALL 将数据存储在Redux store中供各页面使用
3. WHEN 数据获取失败 THEN 系统 SHALL 使用本地缓存数据或显示错误提示
4. WHEN 用户在应用内切换页面 THEN 系统 SHALL NOT 重复获取数据

### Requirement 2

**User Story:** 作为开发者，我希望有一个统一的卡片式封面模块，这样我就能在不同页面中一致地展示内容。

#### Acceptance Criteria

1. WHEN 任何页面需要显示内容卡片 THEN 系统 SHALL 使用统一的卡片组件
2. WHEN 卡片显示内容 THEN 系统 SHALL 包含封面图、标题、平台标识
3. WHEN 封面图加载失败 THEN 系统 SHALL 显示默认占位图
4. WHEN 用户悬停卡片 THEN 系统 SHALL 显示交互效果（阴影、缩放等）
5. WHEN 卡片内容过长 THEN 系统 SHALL 自动截断并显示省略号
6. WHEN 卡片支持不同尺寸 THEN 系统 SHALL 提供响应式布局适配

### Requirement 3

**User Story:** 作为用户，我希望卡片能够显示不同平台的标识，这样我就能快速识别内容来源。

#### Acceptance Criteria

1. WHEN 内容来自YouTube THEN 卡片 SHALL 显示YouTube图标和品牌色
2. WHEN 内容来自抖音 THEN 卡片 SHALL 显示抖音图标和品牌色
3. WHEN 内容来自Bilibili THEN 卡片 SHALL 显示Bilibili图标和品牌色
4. WHEN 平台未知 THEN 卡片 SHALL 显示通用图标
5. WHEN 用户点击卡片 THEN 系统 SHALL 根据内容类型显示相应界面
6. WHEN 内容为文本类型 THEN 系统 SHALL 弹窗显示详细描述内容
7. WHEN 内容为视频类型 THEN 系统 SHALL 调用平台播放器弹窗播放视频
8. WHEN 用户点击操作按钮 THEN 系统 SHALL 根据action字段执行相应操作
9. WHEN 操作涉及外部链接 THEN 系统 SHALL 在外部浏览器中打开链接

### Requirement 4

**User Story:** 作为用户，我希望应用能够缓存内容数据，这样即使网络不好也能正常使用。

#### Acceptance Criteria

1. WHEN 数据获取成功 THEN 系统 SHALL 将数据缓存到本地存储
2. WHEN 应用离线启动 THEN 系统 SHALL 使用缓存数据显示内容
3. WHEN 缓存数据过期 THEN 系统 SHALL 在网络恢复时自动更新

### Requirement 5

**User Story:** 作为用户，我希望能够访问专门的直播教程页面，这样我就能学习如何更好地进行直播。

#### Acceptance Criteria

1. WHEN 用户点击主页面的"直播教程"按钮 THEN 系统 SHALL 导航到直播教程子页面
2. WHEN 直播教程页面加载 THEN 系统 SHALL 显示所有 Tutorials 分类的内容
3. WHEN 用户点击教程卡片 THEN 系统 SHALL 根据 action 字段执行相应操作

### Requirement 6

**User Story:** 作为用户，我希望能够访问插件页面，这样我就能了解和获取有用的OBS插件。

#### Acceptance Criteria

1. WHEN 用户点击主页面的"插件"按钮 THEN 系统 SHALL 导航到插件子页面
2. WHEN 插件页面加载 THEN 系统 SHALL 显示所有 OBSPlugins 分类的内容
3. WHEN 用户点击插件卡片 THEN 系统 SHALL 根据 action 字段执行相应操作

### Requirement 7

**User Story:** 作为用户，我希望能够访问设备推荐页面，这样我就能了解适合直播的硬件设备。

#### Acceptance Criteria

1. WHEN 用户点击主页面的"设备推荐"按钮 THEN 系统 SHALL 导航到设备推荐子页面
2. WHEN 设备推荐页面加载 THEN 系统 SHALL 显示所有 DeviceRecommendations 分类的内容
3. WHEN 用户点击设备卡片 THEN 系统 SHALL 显示设备详细信息和购买链接