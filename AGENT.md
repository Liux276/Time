## 1. 代码要求
1. 代码需要良好的兼容性和接口设计
2. 代码需要具有良好的可读性和可维护性，满足谷歌代码规范
3. 代码需要具有良好的性能和效率，满足实际应用需求
4. 修订应该删除无用代码

# 2. 安全要求
1. 代码需要具有良好的安全性，防止常见的安全漏洞，如XSS、CSRF等
2. 代码需要具有良好的数据保护措施，防止数据泄露，使用不暴露到公网的数据库

# 3. 工程与文档一致性要求
1. 对外行为发生变化时（路由、状态规则、权限、启动参数），必须同步更新 README，并确保示例命令可直接运行
2. 服务端网络监听地址应显式可配置，默认使用本机回环地址
3. 列表类页面如支持“列显示/隐藏”等个性化能力，必须做持久化并按页面隔离，避免不同页面相互污染

# 4. UI 设计系统规范

项目采用统一的设计令牌系统，所有前端页面必须遵循以下规范。

## 4.1 设计令牌（CSS Custom Properties）

定义在 `packages/client/src/assets/main.css` 的 `:root` 中：

| 令牌 | 值 | 用途 |
|---|---|---|
| `--color-bg-base` | `#FAF8F5` | 页面背景 |
| `--color-surface` | `#F3F0ED` | 卡片/容器次级背景 |
| `--color-elevated` | `#FFFFFF` | 卡片/弹窗主背景 |
| `--color-accent` | `#E07A4B` | 品牌强调色 |
| `--color-accent-hover` | `#C96A3E` | 强调色悬浮态 |
| `--color-text-primary` | `#2D2A26` | 主文字 |
| `--color-text-secondary` | `#6B645B` | 次级文字 |
| `--color-text-muted` | `#9C958B` | 辅助文字 |
| `--color-border` | `#E8E4DF` | 边框/分隔线 |
| `--glass-bg` | `rgba(255,255,255,0.72)` | 玻璃拟态背景 |

## 4.2 组件使用规范

### 通用组件
- **PageHeader**：所有页面顶部使用 `<PageHeader title="..." />` 替代手写 h1。支持 `showBack`、`subtitle`、`after-title` 和 `actions` 插槽
- **StatCard**：统计数字展示使用 `<StatCard>`，支持 `value`、`suffix`、`label`、`icon`、`color`
- **AppIcon**：SVG 矢量图标使用 `<AppIcon name="..." />`，禁止新增 @vicons/ionicons5 图标引用

### CSS 工具类
- `card-solid` — 实底卡片（用于列表项、子卡片）
- `card-glass` — 玻璃拟态卡片（用于空状态提示等）
- `card-no-hover` — 取消 Naive UI 卡片的悬浮阴影效果（用于静态展示卡片）
- `subsection-title` — 分区标题样式
- `btn-primary / btn-secondary / btn-ghost` — 按钮样式
- `text-caption` — 辅助小字
- `text-sm-body` — 次级正文

## 4.4 表格列渲染规范

在 `h()` 渲染函数中：
- 链接文字：`style: 'color: var(--color-accent)'`
- 可编辑文字：`style: 'color: var(--color-text-secondary); cursor: pointer'`，hover 加下划线
- 标签（Tag）：始终使用 `round: true, bordered: false`
- 图标按钮：使用 `quaternary` 类型 + `circle`

## 4.5 字体
- 西文：Poppins（Google Fonts CDN）
- 中文：Noto Sans SC（Google Fonts CDN）
- 等宽：ui-monospace, Menlo, monospace

## 4.6 间距
采用 8px 网格系统。所有间距值必须为 4 的倍数：4, 8, 12, 16, 24, 32, 40, 48, 56, 64px。