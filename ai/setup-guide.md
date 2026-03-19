# Codex 编码 + Claude Code 验收：协作工作流

## 架构概览

```
┌─────────────┐     编码指令      ┌─────────────┐
│  任务清单     │ ──────────────▶  │  Codex CLI   │
│ tasks.json   │                  │  (编码者)     │
└─────────────┘                  └──────┬──────┘
       ▲                                │
       │ 修复指令                        │ git diff
       │ (如果 FAIL)                     ▼
┌──────┴──────┐    代码变更       ┌─────────────┐
│ 编排脚本     │ ◀────────────── │ Claude Code  │
│ orchestrator │                  │  (验收者)     │
└─────────────┘                  └─────────────┘
       │
       ▼
  ✅ PASS → 下一个模块
  ❌ FAIL → 带修复指令重试 (最多 3 轮)
```

## 前置条件

### 1. 安装 Codex CLI
```bash
npm i -g @openai/codex
```

### 2. 安装 Claude Code
```bash
npm i -g @anthropic-ai/claude-code
```

### 3. 配置 API Keys
```bash
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
```

### 4. 安装依赖工具
```bash
brew install jq   # macOS
# apt install jq  # Linux
```

### 5. 安装项目依赖
```bash
pnpm install
```

### 6. 配置项目环境变量
```bash
cp .env.example .env
# 填写以下变量:
# ZHIPU_API_KEY           — 智谱 API Key（GLM-4-Flash 免费）
# DASHSCOPE_API_KEY       — 阿里百炼 API Key（text-embedding-v3，P1 激活后使用）
# SUPABASE_URL            — Supabase 项目 URL
# SUPABASE_ANON_KEY       — Supabase 匿名 Key
# SUPABASE_DATABASE_URL   — PostgreSQL 连接串（含 pgvector，P1 启用后需要）
# FRONTEND_URL            — 前端地址（默认 http://localhost:3000）
# R2_ACCESS_KEY_ID        — Cloudflare R2 API Key
# R2_SECRET_ACCESS_KEY    — Cloudflare R2 API Secret
# R2_ACCOUNT_ID           — Cloudflare 账号 ID
```

---

## 快速开始

### Step 1: 确认任务清单

任务按阶段拆分为 5 个文件，位于 `ai/tasks/` 目录：

| 文件 | 包含任务 | 说明 |
|------|----------|------|
| `ai/tasks.json` | S-01, S-02 | 项目搭建（monorepo + 数据库 schema） |
| `ai/tasks/backend.json` | B-01 ~ B-05 | Hono 后端 API（MVP） |
| `ai/tasks/frontend.json` | F-01 ~ F-05 | Next.js 前端页面（MVP） |
| `ai/tasks/ai-agents.json` | A-01 ~ A-04 | Mastra AI Agent + Tools + Workflow（MVP） |
| `ai/tasks/p1.json` | P1-A ~ P1-E | P1 功能（上线后补齐） |

### MVP 任务对应关系

| 任务 ID | 文件 | 描述 |
|---------|------|------|
| `S-01-monorepo-setup` | tasks.json | pnpm workspace monorepo + UI Token + 字体配置 |
| `S-02-database-schema` | tasks.json | Drizzle ORM schema（8 张表）+ 迁移 |
| `B-01-auth-middleware` | backend.json | Supabase Auth 认证 + 角色权限中间件 |
| `B-02-classes-api` | backend.json | 班级管理 API（创建/加入/解绑） |
| `B-03-exams-api` | backend.json | 试卷 + 题目 CRUD API |
| `B-04-submissions-grading-api` | backend.json | 答题提交 + 自动批改 + 教师批改 + 成绩发布 |
| `B-05-r2-upload-api` | backend.json | Cloudflare R2 文件上传 + 文档解析 |
| `F-01-auth-layout` | frontend.json | 登录注册页 + Dashboard 布局组件 + 基础 UI 组件库 |
| `F-02-dashboard` | frontend.json | 教师/学生仪表盘首页 |
| `F-03-exam-generation` | frontend.json | AI 出题页（配置→流式生成→审查）+ 试卷列表 |
| `F-04-student-exam` | frontend.json | 学生答题页 + 成绩查看页 |
| `F-05-grading-center` | frontend.json | 教师批改中心 |
| `A-01-mastra-setup` | ai-agents.json | Mastra 基础设施 + 知识点体系常量 |
| `A-02-tools` | ai-agents.json | 4 个 Agent Tool（题库搜索、校验、存储、知识点） |
| `A-03-agents` | ai-agents.json | 出题 Agent + 质检 Agent（+ lesson-parser P1 占位）|
| `A-04-workflows` | ai-agents.json | generate-exam Workflow（+ parse-lesson-plan P1 占位）|

### P1 任务对应关系

| 任务 ID | 描述 |
|---------|------|
| `P1-A-rag-pipeline` | pgvector + embedding 服务 + 分块 + 教案解析激活 |
| `P1-B-analytics-api` | 班级/学生学情分析 API |
| `P1-C-analytics-ui` | 学情分析页面 + 题库管理页面 |
| `P1-D-analytics-agent` | 学情分析 AI Agent + analyze-class Workflow |
| `P1-E-export` | 试卷 PDF 导出 + 成绩 Excel 导出 |

### 建议 MVP 执行顺序

```
S-01 → S-02
           ↓
        B-01（认证中间件，所有后续任务的前置）
           ↓
    ┌──────┴──────────────────────┐
    │ 后端                         │ AI Agent
    ▼                              ▼
B-02 → B-03 → B-04 → B-05     A-01 → A-02 → A-03 → A-04
    │                              │
    └──────────────┬───────────────┘
                   ▼
              F-01 → F-02 → F-03 → F-04 → F-05
```

> S 任务最先执行；B-01 认证中间件是后续所有后端和 AI 任务的依赖；前端可在后端 B-02/B-03 完成后并行开发。

### P1 执行顺序

```
P1-A（RAG 管道） → P1-B（分析 API）→ P1-D（分析 Agent）
                                  ↓
                           P1-C（分析 UI）
P1-E（导出，独立，可并行）
```

---

### Step 2: 运行编排器

从项目根目录运行：

```bash
chmod +x ai/codex-claude-orchestrator.sh

# 运行全部 MVP 任务（自动加载 ai/tasks/ 下所有文件，含 p1.json）
./ai/codex-claude-orchestrator.sh

# 只运行基础设施任务
TASKS_FILE=ai/tasks.json ./ai/codex-claude-orchestrator.sh

# 只运行后端任务
TASKS_FILE=ai/tasks/backend.json ./ai/codex-claude-orchestrator.sh

# 只运行前端任务
TASKS_FILE=ai/tasks/frontend.json ./ai/codex-claude-orchestrator.sh

# 只运行 AI Agent 任务
TASKS_FILE=ai/tasks/ai-agents.json ./ai/codex-claude-orchestrator.sh

# 只运行 P1 任务
TASKS_FILE=ai/tasks/p1.json ./ai/codex-claude-orchestrator.sh

# 指定目录（加载该目录所有 JSON）
TASKS_DIR=ai/tasks ./ai/codex-claude-orchestrator.sh
```

### Step 3: 查看结果

审查日志保存在 `ai/review-logs/` 目录（已加入 .gitignore，不提交 git）：

```
ai/review-logs/
├── S-01-monorepo-setup_codex_attempt1.log      # Codex 编码日志
├── S-01-monorepo-setup_review_attempt1.json    # Claude Code 验收报告
├── S-01-monorepo-setup_test.log                # 类型检查日志
└── S-01-monorepo-setup_fix_instructions.txt    # FAIL 时的修复指令
```

---

## 配置选项

通过环境变量自定义行为：

```bash
PROJECT_DIR=./ \
TASKS_DIR=ai/tasks \
TASKS_FILE=ai/tasks/backend.json \
MAX_RETRIES=3 \
CODEX_MODEL=gpt-4o \
CLAUDE_MODEL=claude-opus-4-6 \
LOG_DIR=ai/review-logs \
./ai/codex-claude-orchestrator.sh
```

> **优先级**: `TASKS_DIR` > `TASKS_FILE` > 自动检测（先找 `ai/tasks/` 目录，再找 `ai/tasks.json`）

---

## 测试命令说明

编排器根据任务名前缀自动选择测试命令：

| 任务前缀 | 测试命令 | 说明 |
|---------|---------|------|
| `S-` | `pnpm typecheck` | 全量 TypeScript 类型检查 |
| `B-` | `pnpm --filter server typecheck` | 后端 TypeScript 类型检查（apps/server） |
| `F-` | `pnpm --filter web typecheck` | 前端 TypeScript 类型检查（apps/web） |
| `A-` | `pnpm --filter server typecheck` | AI Agent TypeScript 类型检查（apps/server） |
| `P1-` | `pnpm typecheck` | 全量类型检查 |
| 其他 | `pnpm typecheck` | 全量类型检查 |

---

## Claude Code 验收的 8 项检查

| 检查项 | 说明 |
|--------|------|
| 功能完整性 | 是否实现了所有需求（acceptance_criteria 逐条对照） |
| 代码质量 | 有无 bug 和逻辑错误 |
| 错误处理 | 异常捕获是否充分 |
| 类型安全 | 类型定义是否完善，有无 any |
| 安全性 | 有无安全隐患（注入、越权、敏感信息泄露等） |
| 性能 | 有无 N+1 查询、内存泄漏等 |
| 可维护性 | 代码结构和命名 |
| 规范符合性 | 是否符合文档约定（颜色用 CSS 变量、Sidebar 白色背景、status 值正确等） |

---

## 技术栈速查

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 15 + Tailwind CSS + shadcn/ui（主品牌色 **#891fe5**，非 #7C3AED） |
| 字体 | Space Grotesk + Noto Sans SC |
| 布局 | Sidebar 白色背景（浅色方案），顶栏半透明 |
| 后端 | Hono v4 + Drizzle ORM |
| AI Agent | Mastra Core + 智谱 GLM-4-Flash |
| Embedding | 阿里百炼 text-embedding-v3（P1 激活） |
| 向量搜索 | pgvector（Supabase 内置，P1 启用） |
| 数据库 | Supabase PostgreSQL |
| 认证 | Supabase Auth + JWT |
| 文件存储 | Cloudflare R2（5 个 Bucket） |
| 部署 | Cloudflare Workers（前后端均部署） |
| Monorepo | pnpm workspace |

---

## 关键约定（编码时必须遵守）

| 约定 | 说明 |
|------|------|
| 颜色值 | 组件内禁止直接写 hex 值，使用 CSS 变量 `var(--color-primary)` 等 |
| Sidebar 主题 | 必须白色背景，选中项紫色高亮；禁止深色侧边栏 |
| 主品牌色 | `#891fe5`，不是 `#7C3AED` |
| 试卷状态 | `draft \| published \| archived`（无 closed） |
| 提交状态 | `in_progress \| submitted \| pending_review \| published`（无 graded） |
| 题目类型 | `choice \| fill \| calculation \| short_answer`（无 comprehensive，那是 P2） |
| DB 学生归属 | `profiles.classId` 一对一（无 classStudents 多对多表） |
| 向量/embedding | MVP 不使用，P1 才引入 |
| Package 名称 | 后端包名 `@physics-ai-tutor/server`（filter 时用 `--filter server`） |
| 错误响应格式 | 统一 `{ error: string, code?: string }` |
| Workers 限制 | Supabase 客户端在请求处理函数内初始化（不在全局作用域） |

---

## 注意事项

- `ai/review-logs/` 目录已加入 `.gitignore`，本地生成不提交
- S- 任务是所有后续任务的前置，务必最先执行
- B-01 认证中间件完成后，后端和 AI 任务才能开始
- B- 和 F- 任务请先配置好 `.env` 和 `apps/server/.dev.vars`，避免环境变量缺失导致 typecheck 失败
- A- 任务依赖 B-01（认证）和 S-02（数据库 schema）
- AI Agent 可在 Mastra Studio 中独立测试: `cd apps/server && pnpm mastra dev`
- P1 任务在 MVP 上线并有真实数据后再执行，不要提前
