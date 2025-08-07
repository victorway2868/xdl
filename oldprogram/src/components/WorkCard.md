# WorkCard 组件

通用的作品封面组件，可用于视频教程、插件、设备推荐等各种内容的展示。

## 特性

- 🎨 **多种尺寸**: small, medium, large
- 🎭 **多种变体**: default, compact, featured  
- 🏷️ **丰富信息**: 标题、描述、分类、封面、版本、价格、评分、标签、作者
- 🎯 **交互支持**: 点击事件、次要操作按钮
- 📱 **响应式设计**: 自适应不同屏幕尺寸
- 🎪 **状态管理**: 加载、禁用、显示/隐藏操作按钮

## 基本用法

```jsx
import WorkCard from '../components/WorkCard';

<WorkCard
  title="直播间互动特效"
  description="增强观众互动体验的特效插件"
  category="插件"
  coverImage="/images/plugin1.jpg"
  version="2.1.0"
  rating={4.8}
  tags={['特效', '互动', '热门']}
  author="小斗笠工作室"
  onClick={() => console.log('点击卡片')}
  onSecondaryAction={() => console.log('下载插件')}
  secondaryActionText="下载"
/>
```

## 属性说明

### 基本信息
| 属性 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| title | string | ✅ | - | 标题 |
| description | string | ❌ | - | 描述 |
| category | string | ❌ | - | 所属类型/分类 |
| coverImage | string | ❌ | - | 封面图片URL |

### 可选信息
| 属性 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| version | string | ❌ | - | 版本号（插件等） |
| price | string | ❌ | - | 价格（设备等） |
| author | string | ❌ | - | 作者/制造商 |
| rating | number | ❌ | - | 评分 |
| tags | array | ❌ | [] | 标签数组 |

### 交互
| 属性 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| onClick | function | ❌ | - | 点击事件 |
| onSecondaryAction | function | ❌ | - | 次要操作（如下载、购买等） |
| secondaryActionText | string | ❌ | '查看详情' | 次要操作按钮文字 |

### 样式定制
| 属性 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| size | string | ❌ | 'medium' | 尺寸: 'small', 'medium', 'large' |
| variant | string | ❌ | 'default' | 变体: 'default', 'compact', 'featured' |
| className | string | ❌ | '' | 自定义CSS类 |

### 状态
| 属性 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| isLoading | boolean | ❌ | false | 加载状态 |
| isDisabled | boolean | ❌ | false | 禁用状态 |
| showActions | boolean | ❌ | true | 是否显示操作按钮 |

## 尺寸说明

### Small (小尺寸)
- 容器高度: 192px (h-48)
- 图片高度: 96px (h-24)
- 适用场景: 首页推荐、侧边栏展示

### Medium (中等尺寸)
- 容器高度: 256px (h-64)
- 图片高度: 128px (h-32)
- 适用场景: 列表页面、网格布局

### Large (大尺寸)
- 容器高度: 320px (h-80)
- 图片高度: 192px (h-48)
- 适用场景: 详情展示、特色推荐

## 变体说明

### Default (默认变体)
- 渐变背景: from-gray-800 to-gray-900
- 边框: border-indigo-900/30
- 悬停效果: hover:border-indigo-700/50

### Compact (紧凑变体)
- 简洁背景: bg-slate-700/50
- 边框: border-slate-600/40
- 悬停效果: hover:bg-slate-700

### Featured (特色变体)
- 特色背景: from-blue-800 to-purple-900
- 边框: border-blue-700/50
- 悬停效果: hover:border-blue-500/70

## 使用示例

### 插件列表
```jsx
{plugins.map(plugin => (
  <WorkCard
    key={plugin.id}
    title={plugin.name}
    description={plugin.description}
    category="插件"
    coverImage={plugin.coverImage}
    version={plugin.version}
    rating={plugin.rating}
    tags={plugin.tags}
    author={plugin.author}
    size="medium"
    variant="default"
    onClick={() => viewPlugin(plugin.id)}
    onSecondaryAction={() => downloadPlugin(plugin.id)}
    secondaryActionText="下载"
  />
))}
```

### 设备推荐
```jsx
{devices.map(device => (
  <WorkCard
    key={device.id}
    title={device.name}
    description={device.description}
    category={device.category}
    coverImage={device.coverImage}
    price={device.price}
    rating={device.rating}
    tags={device.tags}
    author={device.author}
    size="medium"
    variant="default"
    onClick={() => viewDevice(device.id)}
    onSecondaryAction={() => buyDevice(device.id)}
    secondaryActionText="购买"
  />
))}
```

### 视频教程
```jsx
{tutorials.map(tutorial => (
  <WorkCard
    key={tutorial.id}
    title={tutorial.title}
    description={tutorial.description}
    category="教程"
    coverImage={tutorial.coverImage}
    author={tutorial.author}
    tags={[tutorial.duration, `${tutorial.views}次观看`]}
    size="medium"
    variant="default"
    onClick={() => playVideo(tutorial.videoId)}
    onSecondaryAction={() => playVideo(tutorial.videoId)}
    secondaryActionText="观看教程"
  />
))}
```

## 注意事项

1. **图片处理**: 组件内置图片加载错误处理，会显示默认占位符
2. **标签限制**: 最多显示3个标签，超出部分显示"+N"
3. **文本截断**: 描述文本超过2行会自动截断
4. **响应式**: 组件支持响应式设计，在不同屏幕尺寸下自适应
5. **无障碍**: 支持键盘导航和屏幕阅读器
