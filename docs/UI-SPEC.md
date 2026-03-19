# 高中物理 AI 教学助手 UI 规范

## 1. 目标

本规范基于 `ui/` 目录下已有页面稿整理，目的是统一视觉语言、组件规则和页面结构，避免后续前端实现时出现第二套风格。

适用范围：

* 教师端后台
* 登录 / 注册页
* AI 出题、题目管理、教学计划、学情分析等核心业务页

不建议在一期引入新的主视觉方向；应以现有紫色品牌体系为基础继续收敛。

---

## 2. 现有页面分析结论

### 2.1 已形成的稳定风格

* 品牌主色稳定为高饱和紫色：`#891fe5`
* 主背景为浅暖灰：`#f7f6f8`
* 深色背景为深紫黑：`#1a1121`
* 主字体以 `Space Grotesk` 为核心，中文场景部分页面补了 `Noto Sans SC`
* 卡片普遍为白底、大圆角、浅描边、弱阴影
* 强交互按钮和 Hero 区普遍使用紫色纯色或紫色渐变
* 教师端主要是“左侧导航 + 顶部工具栏 + 主内容区”三栏结构
* 关键状态通过浅底色标签表达，如绿色成功、黄色待处理、红色风险

### 2.2 当前存在的不一致

* 侧边栏存在两套风格：
  `ui/_3`、`ui/ai_3`、`ui/_4` 为浅色侧栏
  `ui/ai_2` 为深色侧栏
* 中文字体未完全统一，有些页面只有 `Space Grotesk`
* 个别页面使用了额外语义色：
  `accent-purple: #754e97`
  `surface-light: #eee7f3`
  `border-light: #dcd0e7`
* 登录注册页与后台页属于同一品牌，但装饰密度更高，适合保留为“营销/身份页”变体，不应直接复制到后台业务页

### 2.3 建议的统一方向

* 教师端后台统一使用浅色主界面 + 白色卡片 + 紫色高亮
* 侧边栏必须统一为一套浅色方案；`ui/ai_2` 的深色侧边栏不纳入参考
* `ui/ai_2` 仅参考右侧内容区域的卡片组织、页头工具栏和内容排布
* 中文字体统一补齐 `Noto Sans SC`
* 图表、插图、装饰元素延续紫色体系，但减少“泛紫色炫光”，确保信息页可读性优先

---

## 3. 设计原则

### 3.1 产品气质

* 专业：像教学工作台，而不是娱乐化学习 App
* 智能：AI 能力要有明显高亮，但不能喧宾夺主
* 清晰：教学数据、批改结果、题目内容必须优先可读
* 温和：色彩有科技感，但避免压迫感和过重暗色

### 3.2 页面优先级

信息层级应始终遵循：

1. 页面主任务
2. 当前状态与关键数据
3. 可执行操作
4. 装饰与品牌强化

---

## 4. 设计 Token

### 4.1 颜色

建议统一为以下 token：

```css
:root {
  --color-primary: #891fe5;
  --color-primary-hover: #7a19cc;
  --color-primary-soft: #f3e8ff;
  --color-primary-soft-2: #eee7f3;

  --color-bg-page: #f7f6f8;
  --color-bg-card: #ffffff;
  --color-bg-elevated: #fcfbfd;
  --color-bg-dark: #1a1121;

  --color-text-strong: #150e1b;
  --color-text-default: #1f2937;
  --color-text-muted: #6b7280;
  --color-text-subtle: #9ca3af;

  --color-border: #eadff4;
  --color-border-strong: #dcd0e7;

  --color-success: #16a34a;
  --color-success-soft: #dcfce7;
  --color-warning: #ca8a04;
  --color-warning-soft: #fef3c7;
  --color-danger: #dc2626;
  --color-danger-soft: #fee2e2;
  --color-info: #2563eb;
  --color-info-soft: #dbeafe;
}
```

### 4.2 渐变

品牌渐变仅用于以下场景：

* Hero 区
* 主 CTA
* AI 高亮卡片

推荐：

```css
--gradient-primary: linear-gradient(135deg, #7c24f0 0%, #a13af6 100%);
```

不要在普通信息卡、表格、正文区大面积铺渐变。

### 4.3 字体

统一字体栈：

```css
font-family: "Space Grotesk", "Noto Sans SC", sans-serif;
```

规则：

* 页面标题、数据大数值、品牌名：`Space Grotesk` 风格明显
* 正文、表单、表格、题干：同一字体栈即可，不再额外混入 serif
* 数学公式保持 KaTeX 默认渲染，不强行跟正文字体统一

### 4.4 圆角

建议统一语义：

* `rounded-lg`：8px
* `rounded-xl`：12px
* `rounded-2xl`：16px
* `rounded-3xl`：24px

使用规则：

* 输入框、普通按钮、标签：8px 到 12px
* 卡片、模态、面板：16px
* 大型空状态容器、身份页容器：24px

### 4.5 阴影

建议仅保留三档：

```css
--shadow-sm: 0 1px 2px rgba(21, 14, 27, 0.06);
--shadow-md: 0 8px 24px rgba(137, 31, 229, 0.08);
--shadow-lg: 0 16px 40px rgba(137, 31, 229, 0.16);
```

使用规则：

* 默认卡片：`shadow-sm`
* Hover 卡片 / 浮层：`shadow-md`
* 主按钮、模态、Hero 浮块：`shadow-lg`

---

## 5. 布局规范

### 5.1 教师端后台结构

统一采用：

* 左侧导航：`240px - 256px`
* 顶部工具栏：高度 `64px`
* 内容区：左右内边距 `32px`
* 页面区块垂直间距：`24px - 32px`

推荐骨架：

```text
Sidebar | Header
        | Page Title
        | KPI / Actions
        | Main Content
```

### 5.2 页面宽度

* 仪表盘 / 列表页：全宽内容区
* 表单页 / 审查页：`max-width: 1200px - 1280px`
* 登录注册页：左右双栏容器 `max-width: 1200px`
* 模态：`max-width: 560px - 720px`

### 5.3 栅格

推荐：

* KPI 卡片：`3` 或 `4` 列
* 主内容 + 侧栏：`8/4` 或 `9/3`
* 表单：单列优先，必要时双列

---

## 6. 导航规范

### 6.1 侧边栏

一期侧边栏只采用浅色方案：

* 背景：白色
* 选中项：纯紫高亮
* 未选中项：深灰文字 + hover 浅紫底

推荐状态：

* 默认：`text-slate-600`
* Hover：`bg-primary/5 text-primary`
* Active：`bg-primary text-white`

不要同时存在“纯紫选中”和“淡紫选中”两种主导航系统。统一为：

* 一级主导航：纯紫选中
* 次级导航或筛选标签：淡紫选中

不采纳：

* 深色整栏背景
* 深色栏内白字导航作为默认后台样式
* `ui/ai_2` 左侧整栏视觉

### 6.2 顶部栏

包含以下固定区域：

* 搜索
* 通知 / 设置
* 当前学期或日期
* 用户入口

顶部栏背景采用：

* `bg-white/80`
* `backdrop-blur-md`
* 底边线 `border-primary/10`

---

## 7. 组件规范

### 7.1 按钮

按钮分四类：

* 主按钮 `Primary`
* 次按钮 `Secondary`
* 浅色按钮 `Soft`
* 危险按钮 `Danger`

建议样式：

* `Primary`：紫底白字，带轻阴影
* `Secondary`：白底描边紫字
* `Soft`：浅紫底紫字
* `Danger`：浅红底红字，删除类可配图标

尺寸：

* `sm`：高度 `32px`
* `md`：高度 `40px`
* `lg`：高度 `48px`

规则：

* 页面主 CTA 只保留一个
* 同一区域不要出现两个同权重紫色按钮互相竞争

### 7.2 输入框

统一样式：

* 背景：`slate-50` / `primary/5`
* 描边：默认浅边框
* 聚焦：`ring-2 ring-primary/20` + `border-primary`
* 左图标输入框时，图标颜色固定 `slate-400`

输入框高度建议：

* 普通输入：`44px - 48px`
* 搜索框：`40px`
* 多行输入：最小 `96px`

### 7.3 Select / Tabs / Segmented

* Select 与输入框共用边框和聚焦规则
* Tabs 底部高亮线使用 `primary`
* 切换器背景优先用 `surface-light`

### 7.4 卡片

统一卡片基线：

* 白底
* 16px 圆角
* 1px 浅边框
* 默认小阴影

卡片类型：

* 数据卡：数字 + 标签 + 趋势
* 内容卡：标题 + 摘要 + 标签 + 操作
* AI 卡：允许使用紫底或浅紫高亮
* 空状态卡：大留白、插图、双 CTA

### 7.5 Tag / Badge

建议语义：

* 知识点标签：浅紫底 + 紫字
* 成功状态：浅绿底 + 绿字
* 待处理：浅黄底 + 黄字
* 风险：浅红底 + 红字
* AI 中状态：浅紫底 + 紫字

标签应短小，不要用于承载长句。

### 7.6 表格

适用于作业、成绩、题目列表：

* 表头浅紫灰背景
* 行 hover 使用 `primary/5`
* 状态列配 Badge
* 最后一列保留更多操作入口

### 7.7 模态

从 `ui/_1` 看，模态适合用于“轻配置、高频任务”：

* 宽度 `560px - 640px`
* 顶部标题区可用浅紫渐变底
* 内容区按表单节分组
* Footer 固定双按钮：取消 / 主操作

---

## 8. 页面模板规范

### 8.1 仪表盘

结构：

* 欢迎 Hero
* 关键指标 3 到 4 张
* 快速操作
* 趋势图 / 最近作业

规则：

* Hero 可以用渐变
* KPI 卡保持白底，避免每张都使用重色

### 8.2 AI 出题与审查页

结构：

* 顶部操作栏
* 题目列表主区
* 右侧统计栏
* 底部发布操作条

规则：

* 题目卡强调内容可读性，图片仅辅助
* “重新生成”“删除”使用小圆图标按钮，位置固定右上角
* 发布操作区固定底部，强化流程闭环

### 8.3 教学计划页

结构：

* 标题区 + 周/月切换
* 日期切换条
* 左侧课程卡片
* 右侧待办与进度面板

规则：

* 状态卡片比数据图表更重要
* 教案关联资源使用小圆文件徽标即可，不需要复杂文件卡

### 8.4 题目管理页

结构：

* 标题区 + 新增按钮
* 空状态或列表态
* 底部轻量统计

规则：

* 空状态要明确告诉用户下一步动作
* 导入功能作为次级 CTA，不要抢主按钮

### 8.5 登录 / 注册页

结构：

* 左侧品牌叙事区
* 右侧身份表单区

规则：

* 左侧可用紫色大渐变和物理意象
* 右侧保持克制、浅底、清晰输入节奏
* 登录与注册共用同一品牌模板，不再各自设计第二套风格

---

## 9. 图标与插图

### 9.1 图标

当前主要使用 `Material Symbols Outlined`，建议继续统一使用。

规则：

* 默认 20px 或 24px
* 场景图标保持线性风格
* 操作图标优先配合文字，不单独承担语义

### 9.2 插图

* 后台业务页插图仅用于空状态或题目配图
* 不建议在所有卡片中使用高饱和装饰图
* 物理主题元素可使用：
  公式
  几何线框
  力学箭头
  电路 / 波形抽象图形

---

## 10. 动效规范

仅保留轻量动效：

* 按钮 hover：透明度 / 阴影 / 轻微位移
* 卡片 hover：阴影增强
* 模态出现：淡入 + 轻微上移
* 侧栏切换：背景色和文字色过渡

避免：

* 大面积持续脉冲
* 高频旋转、弹跳
* 影响信息阅读的背景动画

---

## 11. 响应式规范

### 11.1 教师端后台

* `>= 1280px`：完整侧栏 + 多列布局
* `1024px - 1279px`：保留侧栏，内容区缩为双列
* `< 1024px`：侧栏折叠为抽屉，KPI 和主内容改为单列

### 11.2 登录注册页

* 桌面端：双栏
* 平板及以下：隐藏左侧品牌区，仅保留右侧表单

### 11.3 审查与批改页

* 右侧统计栏在中屏以下移到底部
* 底部操作条保持固定，但按钮宽度可压缩

---

## 12. 可访问性与可读性

一期最低要求：

* 正文与背景对比度足够，浅紫文字不用于长段落正文
* 主要按钮不可只靠颜色区分，要配文案
* 错误、成功、待处理状态除颜色外应配图标或文字
* 表单聚焦状态清晰可见
* 表格和题目卡的正文行高至少 `1.5`

---

## 13. 前端实现建议

建议在项目里落成如下结构：

* `styles/tokens.css`
* `components/ui/button.tsx`
* `components/ui/input.tsx`
* `components/ui/card.tsx`
* `components/ui/badge.tsx`
* `components/layout/sidebar.tsx`
* `components/layout/topbar.tsx`

建议将以下内容先抽成 token：

* 颜色
* 圆角
* 阴影
* 字体栈
* 页面容器宽度
* 组件尺寸

---

## 14. 前端实现规则

### 14.1 Token 落地规则

建议在 `styles/tokens.css` 或全局主题文件中落成以下分层：

* `brand`：品牌色、渐变、品牌阴影
* `surface`：页面背景、卡片背景、浮层背景
* `text`：主文字、次文字、弱提示文字
* `state`：success / warning / danger / info
* `radius`：`lg / xl / 2xl / 3xl`
* `shadow`：`sm / md / lg`

不要把业务语义直接写成散落的 hex 值，例如：

* 不要在组件里直接写 `#891fe5`
* 不要每个页面各自声明 `accent-purple`
* 不要混用多个近似边框色

### 14.2 页面容器规则

建议统一提供这些布局组件：

* `AppShell`
  负责整体两栏布局
* `Sidebar`
  负责左侧导航和底部用户信息
* `Topbar`
  负责搜索、通知、学期信息、用户入口
* `PageContainer`
  负责页面左右 padding 和内容最大宽度
* `PageHeader`
  负责标题、副标题、右上角主操作

推荐约束：

* `AppShell`：`min-h-screen bg-[var(--color-bg-page)]`
* `Sidebar`：固定宽 `256px`
* `Topbar`：固定高 `64px`
* `PageContainer`：`px-8 py-8`
* 页面主区块间距：默认 `space-y-8`

### 14.3 Sidebar 组件规则

`Sidebar` 必须做成单一实现，不允许页面各自拼装。

建议结构：

* 品牌区
* 主导航区
* 可选次导航区
* 底部用户区 / 登出按钮

建议 props：

```ts
type SidebarItem = {
  key: string
  label: string
  href: string
  icon: ReactNode
  badge?: string
}
```

视觉规则：

* 背景始终白色
* 当前选中项使用纯紫底白字
* hover 使用浅紫底
* 图标与文字左对齐，间距固定
* 底部用户卡片与主导航视觉分区明确

禁止项：

* 页面自行决定侧栏深浅主题
* 同一产品内混用圆角矩形和胶囊型主导航
* 选中态有的用纯色、有的用描边

### 14.4 Topbar 组件规则

`Topbar` 建议分为四个 slot：

* `search`
* `actions`
* `context`
* `user`

视觉规则：

* 半透明白底 + blur
* 与页面背景有明确分层
* 搜索框默认宽度 `320px - 420px`
* 图标按钮统一为方形轻底按钮

建议 props：

```ts
type TopbarProps = {
  searchPlaceholder?: string
  contextText?: string
  actions?: ReactNode
  user?: ReactNode
}
```

### 14.5 Button 组件规则

建议统一为单个 `Button` 组件，通过 `variant` 和 `size` 控制：

```ts
type ButtonVariant = "primary" | "secondary" | "soft" | "danger" | "ghost"
type ButtonSize = "sm" | "md" | "lg" | "icon"
```

行为规则：

* 带图标按钮默认图标在左
* `icon` 按钮必须是正方形
* disabled 时降透明度，不保留 hover 阴影
* loading 时宽度尽量稳定，避免跳动

推荐使用场景：

* `primary`：页面唯一主操作
* `secondary`：次级确认、预览、返回
* `soft`：轻量引导、上传、筛选入口
* `danger`：删除、移除、清空
* `ghost`：工具栏图标按钮

### 14.6 Card 组件规则

建议抽三个基类：

* `Card`
* `StatCard`
* `FeatureCard`

推荐结构：

```ts
Card
  CardHeader
  CardContent
  CardFooter
```

规则：

* 所有卡片默认白底、浅边框、16px 圆角
* `StatCard` 用于数据指标，不放长段正文
* `FeatureCard` 可容纳标签、插图、操作按钮
* 题目卡和课程卡都应基于同一个卡片体系扩展

### 14.7 Form 组件规则

建议最少抽出：

* `Field`
* `Input`
* `Textarea`
* `Select`
* `Checkbox`
* `Tabs`

规则：

* 标签、输入框、说明文、错误文案的间距固定
* 输入焦点边框统一
* 错误态除了变色，还要有明确提示文案
* 图标输入框的左 padding 不要每页手写

建议字段骨架：

```tsx
<Field label="手机号/邮箱" hint="用于登录和接收通知" error={error}>
  <Input leadingIcon={<Mail />} />
</Field>
```

### 14.8 Badge 与状态系统

建议统一通过 `status` 或 `variant` 控制，不要页面内手写状态颜色。

```ts
type BadgeVariant =
  | "knowledge"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "ai"
```

规则：

* 知识点标签只用于知识点，不复用做流程状态
* AI 状态单独保留，避免和 warning 混淆
* 状态 Badge 不超过两行，不承载长说明

### 14.9 图表与数据可视化规则

虽然一期图表不是最优先，但如果实现：

* 图表主色使用品牌紫
* 辅助色用透明度变化，不再额外引入新主色
* 网格线和坐标轴尽量弱化
* 图表卡片外围仍使用普通 `Card`

不要：

* 使用高饱和多彩柱状图
* 使用厚重 3D 风格
* 把图表本身做成渐变发光主体

### 14.10 页面实现优先级

前端实现顺序建议：

1. Token 和全局主题
2. `Button / Input / Card / Badge`
3. `Sidebar / Topbar / PageHeader`
4. 登录注册模板
5. 仪表盘和题目管理页
6. AI 出题与审查页
7. 教学计划页
8. 学情分析页

### 14.11 禁止项

以下做法默认禁止：

* 每个页面自定义一套品牌色
* 页面内直接写大量临时 Tailwind 颜色值替代 token
* 同一类组件在不同页面出现不同圆角、不同阴影、不同 hover 逻辑
* 侧边栏、页头、按钮由页面局部重复实现
* 把登录注册页的重装饰风格直接搬进教师后台

---

## 15. 一期推荐定稿

如果只保留一套主风格，一期建议定为：

* 默认浅色后台 + 浅色侧边栏
* 紫色主品牌
* 白卡片 + 浅紫描边
* `Space Grotesk + Noto Sans SC`
* 业务页少装饰、登录页多装饰
* 深色模式先保留样式能力，不作为主验收重点

这套规范最接近以下页面的综合结果：

* `ui/_2`
* `ui/_3`
* `ui/_4`
* `ui/ai_2` 的右侧内容区
* `ui/ai_4`

它们已经足够支持一期产品的统一实现，不需要再重新做一版完全不同的设计系统。
