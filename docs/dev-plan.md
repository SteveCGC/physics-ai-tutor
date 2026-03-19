# 高中物理 AI 教学助手 — 开发计划

> 基于 `PRD.md`、`technical-plan.md`、`UI-SPEC.md` 三份文档整合输出。
> 目标：3 人小组（产品 + 全栈 + AI/后端），3–4 周完成 MVP，上线后再补 P1。

---

## 一、总览

| 阶段 | 周次 | 目标 | 验收里程碑 |
|------|------|------|-----------|
| **Phase 0** | 第 0.5 周 | 环境搭建、基础框架、共享包 | Monorepo 可运行，DB 迁移通过，Auth 可登录 |
| **Phase 1** | 第 1–2 周 | MVP 核心：出题、答题、客观题批改 | 教师能出题发布，学生能提交并看到客观题分数 |
| **Phase 2** | 第 2–3 周 | MVP 完善：主观题批改、成绩发布、基础数据展示 | 完整一轮出题→作答→批改→发布→查看分数闭环 |
| **Phase 3** | 第 3–4 周 | 收尾：文件上传、边界场景、测试、部署 | 生产环境上线，CI/CD 通过 |
| **Phase P1** | 上线后 | 薄弱点分析、个性化推荐、导出、题库管理 | 另行排期 |

---

## 二、Phase 0：基础框架（第 0.5 周）

### 目标
打通从 Monorepo 初始化到 DB 迁移、Auth 登录的完整骨架。

### 任务清单

#### 0-1 项目初始化
- [ ] 创建 `pnpm-workspace.yaml`，定义 `apps/*`、`packages/*`
- [ ] 创建 `apps/web`（Next.js 15 App Router）
- [ ] 创建 `apps/server`（Hono + Wrangler）
- [ ] 创建 `packages/shared`（共享类型 + 常量 + validators）
- [ ] 配置 `turbo.json` 构建编排（`build`、`dev`、`check-types`）
- [ ] 添加 `.env.example`，列出所有必填变量
- [ ] 配置 `.gitignore`，排除 `.env`、`dist`、`.open-next`

#### 0-2 前端基础配置
- [ ] 安装 shadcn/ui，初始化组件库
- [ ] 在 `styles/tokens.css` 落地 UI-SPEC 第 4 节所有 CSS 变量
  - `--color-primary: #891fe5`
  - `--color-bg-page: #f7f6f8`
  - `--color-bg-dark: #1a1121`
  - 完整 surface / text / border / state token
- [ ] 配置 `tailwind.config.ts`：将 CSS 变量映射为 Tailwind 语义键
- [ ] 引入字体：`Space Grotesk`（英文/数字）+ `Noto Sans SC`（中文）
- [ ] 引入 `KaTeX`，验证 `$F=ma$` 能正常渲染

#### 0-3 后端基础配置
- [ ] 初始化 Hono 应用，注册 CORS 中间件
- [ ] 配置 `wrangler.jsonc`：Hyperdrive binding、R2 bindings、兼容性标志
- [ ] 初始化 Mastra，占位注册 `agents`、`workflows`（空实现）
- [ ] 添加健康检查路由 `GET /health`

#### 0-4 数据库
- [ ] 在 Supabase 创建项目，获取 Direct 连接串
- [ ] 编写 Drizzle Schema（`apps/server/src/db/schema.ts`）：
  - `profiles`（含 `role`、`status`、`lastLoginAt`）
  - `classes`（含 `inviteCode`）
  - `exams`（含 `status: draft | published | archived`）
  - `questions`（含 `type`、`source`、`qualityFlags`、`acceptedAnswers`）
  - `submissions`（含 `status: in_progress | submitted | pending_review | published`）
  - `answers`（含 `gradedBy: auto | teacher`）
  - `scoreAuditLogs`
  - `documents`（`useCase: question_bank | lesson_plan`，`parseStatus`）
- [ ] 执行首次迁移，验证表结构正确
- [ ] 编写 Supabase RLS 策略（SQL，见 technical-plan 第 6.2 节）

#### 0-5 认证
- [ ] 实现 Supabase Auth 注册/登录（教师/学生角色选择）
- [ ] 实现 `authMiddleware`（Hono）：验证 JWT → 查 `profiles` → 注入 `c.get('profile')`
- [ ] 实现 `requireRole` 中间件
- [ ] 实现 Next.js `middleware.ts`：角色路由守卫（`/student/*` vs `/(dashboard)/*`）
- [ ] 实现注册时自动创建 `profiles` 记录的 Supabase 触发器或后端钩子

#### 0-6 共享包
- [ ] 定义共享类型：`question.ts`、`exam.ts`、`user.ts`、`submission.ts`、`grading.ts`
- [ ] 定义 `knowledge-points.ts`：人教版物理知识点体系（章节 → 知识点树）
- [ ] 定义 `question-types.ts`：`choice | fill | calculation | short_answer`
- [ ] 定义 Zod schemas（`validators/exam.ts`、`validators/question.ts`）

#### 0-7 验收标准
- `pnpm dev` 前后端均可本地启动
- 教师/学生注册登录后跳转到正确角色页面
- `GET /health` 返回 `{ status: "ok" }`
- DB 迁移无报错，RLS 策略生效（学生无法 SELECT 其他人的 submissions）

---

## 三、Phase 1：MVP 核心（第 1–2 周）

### 目标
实现"教师出题 → 审查 → 发布 → 学生答题 → 客观题自动批改"核心路径。

---

### 1A：班级管理

#### 后端
- [ ] `POST /api/classes`（仅教师）：创建班级，生成唯一 `inviteCode`（6 位随机大写字母数字）
- [ ] `GET /api/classes`（仅教师）：查看自己的班级列表
- [ ] `GET /api/classes/:id`：查看班级详情（学生数、邀请码）
- [ ] `POST /api/classes/join`（仅学生）：输入邀请码加入班级，更新 `profiles.classId`
- [ ] 加入前校验：学生只能加入一个班级；邀请码存在性检查

#### 前端
- [ ] `/(dashboard)/students/page.tsx`：班级列表、学生数、邀请码展示
- [ ] 创建班级模态（`Dialog`）：班级名、年级输入
- [ ] 生成邀请码展示 + 复制按钮 + 二维码（一期用 `qrcode.react` 简单实现）
- [ ] 学生端 `/student/join/page.tsx`：输入邀请码加入班级

---

### 1B：AI 出题 + 审查

#### 后端 — AI Agent
- [ ] 实现 `question-generator` Agent：
  - 指令：严格输出 JSON 数组，每题含 `type`、`content`、`options`、`answer`、`acceptedAnswers`、`explanation`、`knowledgePoints`、`difficulty`、`score`
  - 工具：`search-question-bank`（MVP 做关键词检索，避免重复）
  - 工具：`get-knowledge-points`（从 `knowledge-points.ts` 返回当前知识点上下文）
- [ ] 实现 `quality-checker` Agent：
  - 逐题检查，输出 `{ passed, issues, suggestions }`
  - 检查项：物理常识、单位、选项区分度、答案一致性
- [ ] 实现 `generate-exam` Workflow（四步）：
  1. `parse-requirements`：组装 prompt
  2. `generate-questions`：调用出题 Agent
  3. `quality-check`：调用质检 Agent，将 `issues` 写入 `qualityFlags`
  4. `save-draft`：插入 `exams`（status=draft）+ `questions`
- [ ] `POST /api/exams/:id/generate`（仅教师）：触发 Workflow，支持 SSE streaming 进度

#### 后端 — 试卷 CRUD
- [ ] `POST /api/exams`：创建试卷记录（draft 状态）
- [ ] `GET /api/exams`：教师看自己的全部试卷；学生看所在班级已发布的试卷
- [ ] `GET /api/exams/:id`：试卷详情（含题目列表）
- [ ] `PATCH /api/exams/:id`：编辑标题、发布（`status → published`）、归档
- [ ] `DELETE /api/exams/:id`（仅 draft 状态允许）
- [ ] 发布前校验：至少 1 道题；`publishedAt` 记录时间

#### 后端 — 题目 CRUD
- [ ] `PATCH /api/questions/:id`：教师编辑单题（题干/选项/答案/解析）
- [ ] `DELETE /api/questions/:id`：删除单题（仅所属试卷为 draft 时允许）
- [ ] `POST /api/questions/:id/regenerate`：单题重新生成（调用 Agent 替换此题）
- [ ] `POST /api/exams/:id/questions`：手动录入单题

#### 前端
- [ ] `/exams/new/page.tsx`：出题配置页
  - 知识点多选（从知识点树渲染，章节展开/折叠）
  - 题型多选（`choice`/`fill`/`calculation`/`short_answer`）
  - 难度滑块（1–5）
  - 题目数量（默认 10）
  - "生成试卷"按钮 → 触发 API，SSE 显示进度条
- [ ] `/exams/[id]/page.tsx`：审查页
  - 顶部操作栏：试卷标题（可编辑）、题目数量、总分、"发布"按钮
  - 题目列表：每题显示题干（KaTeX 渲染公式）、选项、答案、解析、知识点标签
  - 质检 flag 高亮（黄色警告卡片）
  - 每题右上角：编辑图标、重新生成图标、删除图标
  - 右侧统计栏：题型分布、难度分布
  - 底部固定发布操作条
- [ ] 题目编辑 `Sheet` 组件：支持 LaTeX 语法输入 + 实时 KaTeX 预览
- [ ] `/exams/page.tsx`：试卷列表
  - 按状态分 Tab（草稿/已发布/已归档）
  - 每行显示：标题、知识点、题目数、状态 Badge、创建时间、操作

---

### 1C：学生答题 + 客观题自动批改

#### 后端
- [ ] `GET /api/student/assignments`：学生查看已发布的作业列表（含截止时间、已提交状态）
- [ ] `GET /api/student/assignments/:id`：获取试卷题目（学生端，不返回答案和解析）
- [ ] `POST /api/submissions`：学生开始答题（创建 `in_progress` 的 submission）
- [ ] `POST /api/submissions/:id/submit`：提交答题
  - 调用 `grading.ts` 对 `choice`/`fill` 自动批改
  - 填空题归一化处理：去空格、大小写统一、常见单位别名映射
  - `calculation`/`short_answer` 标记为 `pending_review`
  - 更新 `submissions.status = 'submitted'`
  - 计算并写入 `submissions.totalScore`（仅客观题部分）
- [ ] `GET /api/submissions/:id`：查看提交详情（学生：仅自己；教师：本班任意）

#### 服务层 — `services/grading.ts`
- [ ] 精确匹配：选择题按 `answer` 字段严格匹配
- [ ] 填空题归一化函数：
  - 去首尾空白
  - 全角转半角
  - 单位别名映射（如 `m/s²` ↔ `m·s⁻²`）
  - 检查 `acceptedAnswers` 数组（等价答案集合）

#### 前端
- [ ] `/student/assignments/page.tsx`：作业列表（标题、截止时间、状态 Badge）
- [ ] `/student/assignments/[id]/page.tsx`：答题页
  - 顶部：进度条、剩余题目数、提交按钮
  - 题目渲染组件：
    - 选择题：单选按钮组
    - 填空题：文本输入框
    - 计算题/简答题：多行 Textarea + 附件上传按钮
  - KaTeX 公式渲染
  - 提交确认模态（提示主观题待教师批改）
- [ ] 提交后页面：显示客观题即时得分 + "主观题待批改"提示

---

## 四、Phase 2：完整批改闭环（第 2–3 周）

### 2A：主观题批改中心

#### 后端
- [ ] `GET /api/grading/exams/:id/queue`：获取该试卷待批改主观题汇总（学生数、已批改数）
- [ ] `GET /api/grading/exams/:id/by-question`：按题目视图（每道主观题 + 所有学生答案）
- [ ] `GET /api/grading/exams/:id/by-student`：按学生视图（每个学生 + 所有主观题答案）
- [ ] `PATCH /api/grading/answers/:id`（仅教师）：打分 + 写批注
  - 校验分值 `0 ≤ score ≤ question.score`
  - 更新 `answers.score`、`answers.teacherComment`、`answers.gradedBy='teacher'`
  - 更新 `answers.gradedAt`
- [ ] `POST /api/grading/submissions/:id/publish`（仅教师）：发布成绩
  - 校验所有主观题已批改完毕
  - 重新计算 `submissions.totalScore`（客观 + 主观）
  - `submissions.status → published`，写 `publishedAt`
  - 触发站内通知（向学生的 `notifications` 表写入，或 Supabase Realtime push）
- [ ] 成绩发布后修改接口 `PATCH /api/grading/answers/:id/revise`：
  - 校验 `publishedAt` + 24 小时内允许
  - 写入 `scoreAuditLogs`（旧分、新分、修改人、时间、原因）
  - 重新计算总分

#### 前端
- [ ] `/exams/[id]/grading/page.tsx`：批改中心
  - 顶部：试卷标题、待批改题目数 Badge、"发布成绩"按钮（全部批改后高亮）
  - 视图切换 Tab：按题目 / 按学生
  - **按题目视图**：
    - 左侧题目列表（选中高亮）
    - 右侧：当前题 + 逐个学生答案卡
    - 答案卡：学生名、答案内容、附件预览、分值输入框（键盘可直接输入）、批注 Textarea
    - 常用批注一键插入（预设 5 条）
  - **按学生视图**：
    - 左侧学生列表（含已批改进度）
    - 右侧：当前学生的所有主观题
  - 底部固定操作条：已批改 X/Y、"发布成绩"按钮

### 2B：成绩查看

#### 后端（已有基础，补充）
- [ ] `GET /api/student/results`：学生查看所有已发布成绩（列表）
- [ ] `GET /api/student/results/:submissionId`：成绩详情
  - 仅 `published` 状态可见
  - 返回：总分、客观题各题得分 + 错因解析、主观题得分 + 教师批注
- [ ] `GET /api/teacher/exams/:id/summary`：教师查看该试卷全班成绩汇总（最高/最低/平均分、各题得分率）

#### 前端
- [ ] `/student/results/page.tsx`：成绩列表
- [ ] `/student/results/[submissionId]/page.tsx`：成绩详情页
  - 总分大字展示
  - 各题得分列表：题干（折叠）、学生答案、正确答案（客观）、得分、错因解析
  - 主观题：学生答案、教师批注、得分

### 2C：仪表盘

#### 教师端
- [ ] `/page.tsx`（仪表盘）：
  - 欢迎 Hero（渐变背景，用户名）
  - 统计卡（4 张）：班级总人数、已发布试卷数、待批改任务数、本周出题数
  - 快速操作：新建试卷、查看批改队列
  - 最近试卷列表（最近 5 条）
  - 通知角标（待批改数量）

#### 学生端
- [ ] `/student/page.tsx`（仪表盘）：
  - 欢迎语 + 班级信息
  - 待完成作业列表（截止时间排序）
  - 最近成绩列表

### 2D：布局框架组件（按 UI-SPEC 第 14 节）
- [ ] `AppShell`：双栏布局容器（Sidebar + 主区）
- [ ] `Sidebar`：单一实现，浅色白底，纯紫选中，数据驱动导航项（见 `SidebarItem` 类型）
  - 教师导航项：仪表盘、AI 出题、试卷管理、题库、学生管理、设置
  - 学生导航项：我的作业、成绩查看
  - 底部用户信息卡 + 登出按钮
- [ ] `Topbar`：半透明白底 + blur，含搜索框、通知铃铛、用户入口
- [ ] `PageContainer`：统一内边距 `px-8 py-8`，内容最大宽度
- [ ] `PageHeader`：页标题、副标题、右上角主操作 slot

---

## 五、Phase 3：收尾、文件上传、测试、部署（第 3–4 周）

### 3A：文件上传（题库文件 + 教案，一期基础版）

#### 基础设施
- [ ] 在 Cloudflare 创建 5 个 R2 Bucket：`lesson-plans`、`question-banks`、`student-uploads`、`exports`、`avatars`
- [ ] 配置 `wrangler.jsonc` 的 `r2_buckets` bindings
- [ ] 设置 `exports` bucket 生命周期规则（7 天自动清理）

#### 后端
- [ ] `POST /api/upload/presign`（仅教师）：生成教案/题库文件 Presigned URL，有效期 10 分钟
- [ ] `POST /api/upload/direct`（教师/学生）：小文件（≤ 20MB）直传 Worker → R2
- [ ] `POST /api/upload/confirm`（仅教师）：记录 `documents` 表，异步触发文件解析
- [ ] `GET /api/files/:bucket/:key`：权限控制的文件读取（见 `canAccessFile` 函数）
- [ ] `services/document-parser.ts`：
  - PDF → `pdf-parse`
  - DOCX → `mammoth`
  - PPTX → 简单文本提取（一期基础版）
  - 解析结果写入 `documents.parsedContent`，`parseStatus = 'done'`

#### 前端
- [ ] `lib/upload.ts`：`uploadLessonPlan`、`uploadStudentImage` 封装
- [ ] 文件上传组件（拖拽 + 点击选择）：
  - 格式校验（教案：`.pdf`、`.docx`、`.pptx`）
  - 大小校验（≤ 20MB）
  - 上传进度条
  - 上传完成/失败状态反馈
- [ ] 学生答题页：附件上传按钮（计算题/简答题旁），上传图片到 `student-uploads`

### 3B：登录注册页（UI-SPEC 第 8.5 节）
- [ ] `/login/page.tsx`：左侧品牌区（渐变背景 + 物理公式装饰）+ 右侧登录表单
- [ ] `/register/page.tsx`：同一模板，表单增加角色选择（教师/学生）、学校输入
- [ ] 首次登录教师引导：选择"上传教案"或"直接出题"

### 3C：边界场景处理
- [ ] 出题超时处理（> 30s 提示用户，可重试）
- [ ] 学生重复提交防御（提交后禁用提交按钮）
- [ ] 试卷已发布后学生新提交的截止时间校验
- [ ] 成绩修改 24 小时限制校验（后端 + 前端提示）
- [ ] `inviteCode` 大小写不敏感处理
- [ ] 学生加入班级时，`profiles.classId` 已有值则提示需先联系教师解绑

### 3D：基础 UI 组件库完善（按 UI-SPEC）
- [ ] `Button`：`variant × size` 组合，loading 状态，icon 按钮
- [ ] `Input`：焦点环、错误态、leading icon
- [ ] `Textarea`：可调高度，字符计数
- [ ] `Select`：与 Input 共用聚焦规则
- [ ] `Card`、`StatCard`、`FeatureCard`
- [ ] `Badge`：所有 `BadgeVariant`（`knowledge`、`success`、`warning`、`danger`、`info`、`ai`）
- [ ] `Field`：label + hint + error 布局
- [ ] `Dialog`/`Sheet`：模态和侧抽屉

### 3E：Cloudflare 部署

#### 基础设施准备
- [ ] 创建 Supabase Hyperdrive：连接 Supabase PostgreSQL Direct 连接串
- [ ] 设置 Workers Secrets（`wrangler secret put`）：
  - `ZHIPU_API_KEY`、`DASHSCOPE_API_KEY`
  - `SUPABASE_URL`、`SUPABASE_ANON_KEY`
  - `R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY`、`R2_ACCOUNT_ID`
- [ ] 配置 `apps/web/open-next.config.ts` + `next.config.ts`（`images.unoptimized: true`）

#### 各包 deploy 脚本
- [ ] `apps/server/package.json` 添加 `deploy` 脚本：`wrangler deploy`
- [ ] `apps/web/package.json` 添加 `deploy` 脚本：`npx @opennextjs/cloudflare build && wrangler deploy`
- [ ] `apps/server/package.json` 添加 `deploy:secrets` 脚本（一次性批量设置所有 secret）

#### 一键部署脚本（technical-plan 13.6 节要求）
- [ ] 创建 `scripts/deploy.sh`，实现以下步骤：
  1. `pnpm install`
  2. `pnpm --filter @physics-ai-tutor/shared build`
  3. `pnpm --filter @physics-ai-tutor/server deploy`
  4. `pnpm --filter @physics-ai-tutor/web deploy`
- [ ] 脚本加 `set -e`，任一步骤失败立即中止
- [ ] `chmod +x scripts/deploy.sh`，本地验证一键部署全流程可通过

#### CI/CD（自动部署）
- [ ] 配置 `.github/workflows/deploy.yml`：
  - `push: main` 触发
  - `deploy-server` job → `deploy-web` job（有依赖顺序）
  - 使用 GitHub Secrets：`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`

### 3F：功能验收测试

按 PRD 验收标准逐条测试：

| 测试项 | 期望结果 |
|-------|---------|
| 教师选知识点生成 10 题 | < 30 秒，进度实时反馈 |
| 试卷未发布时学生端 | 不显示该试卷 |
| 学生提交后 | 客观题立即出分，主观题标记待批改 |
| 教师发布成绩后 | 学生可查看总分、各题得分、解析、批注 |
| 成绩修改 | 保留 `scoreAuditLogs`，总分刷新 |
| 教师只能看自己班级的数据 | 访问他人试卷返回 403 |
| 学生只能看自己的成绩 | 不能查看班级汇总 |

---

## 六、Phase P1：上线后优先补齐

> 排期另定，以下为功能列表。

### P1-A：薄弱点分析
- [ ] 聚合每次作答的错题，提取知识点维度得分率
- [ ] `GET /api/teacher/analytics/class/:classId`：全班薄弱知识点 Top N
- [ ] `GET /api/student/analytics`：个人薄弱知识点
- [ ] 前端：学情分析页面（知识点热力图 / 条形图）

### P1-B：个性化练习推荐
- [ ] 基于薄弱知识点向学生推荐已有题库中相关题目
- [ ] `GET /api/student/recommended`：推荐练习列表
- [ ] 前端：学生仪表盘显示推荐练习卡片

### P1-C：教案上传与解析（升级）
- [ ] 接入 `lesson-parser` Agent（目前占位）
- [ ] 从文档解析出章节名、知识点列表、重难点
- [ ] P1：按需启用阿里百炼 Embedding + pgvector 向量检索

### P1-D：导出能力
- [ ] 试卷导出 PDF（使用 `jsPDF` 或 Cloudflare Worker 调 Puppeteer）
- [ ] 成绩汇总导出 Excel（`xlsx` 包）
- [ ] 导出文件存 R2 `exports` bucket，返回 1 小时签名 URL

### P1-E：历史题库管理
- [ ] `/questions/page.tsx`：题库列表（可按知识点、题型、难度筛选）
- [ ] 复用已有题目到新试卷
- [ ] 归档/删除题目

---

## 七、关键开发约定

### 代码规范

| 规则 | 说明 |
|------|------|
| 类型共享 | 前后端通过 `@physics-ai-tutor/shared` 共享类型，禁止各端自行定义重复类型 |
| 公式输入 | 所有需展示 LaTeX 的字段，前端统一通过 `<KatexRenderer>` 组件渲染，不内联处理 |
| 颜色值 | 组件内禁止直接写 hex 值，统一使用 CSS 变量或 Tailwind 语义键 |
| API 鉴权 | 所有 `/api/*` 路由自动走 `authMiddleware`，敏感操作追加 `requireRole(...)` |
| 错误格式 | 统一返回 `{ error: string, code?: string }`，前端统一 `toast` 提示 |
| 数据边界 | 每个路由 handler 入参用 Zod schema 校验，validation error 返回 422 |

### 字段约定

| 字段 | 规则 |
|------|------|
| `status: draft` | 试卷/题目仅教师可见 |
| `status: published` | 试卷对本班学生可见 |
| `gradedBy: auto` | 客观题系统自动批改 |
| `gradedBy: teacher` | 教师手动批改 |
| `source: ai` | AI 生成题目 |
| `source: manual` | 教师手动录入 |
| `source: imported` | 文件导入 |

### 环境变量

```
# 本地开发 .env
ZHIPU_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_DATABASE_URL=
FRONTEND_URL=http://localhost:3000
# 文件存储（R2 presigned URL 用）
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_ACCOUNT_ID=
```

---

## 八、风险与注意事项

| 风险 | 影响 | 应对 |
|------|------|------|
| GLM-4-Flash 生成质量不稳定 | 题目命中率 < 80% | 质检 Agent 打 flag，教师审查兜底；prompt 持续迭代 |
| Workers 免费版 CPU 10ms 限制 | AI 出题超时 | 使用 SSE streaming，避免单次同步等待；生产用付费版（30s） |
| Workers 内存 128MB | 大文件解析失败 | 超过 10MB 的文件先读取流式处理；PPTX 一期只提取文本 |
| Hyperdrive 冷启动延迟 | 首次请求慢 | 开发阶段直连 Supabase，生产通过 Hyperdrive |
| Supabase RLS + Drizzle 冲突 | 数据访问报错 | Drizzle 操作使用 `anon` key 时 RLS 生效；Server-side 使用 `service_role` key 绕过 RLS（仅内部操作） |
| 填空题等价答案覆盖不全 | 批改准确率下降 | 提供 `acceptedAnswers` 编辑界面，教师可在审查页补充；物理常用单位别名内置 50+ 条 |

---

*最后更新：2026-03-19*
