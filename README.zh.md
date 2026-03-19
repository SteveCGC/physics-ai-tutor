# 高中物理 AI 教学助手

> 专为高中物理教师打造的 AI 教学助手 —— 智能出题、自动批改、学情分析，一站式完成。

**[English](./README.md)**

---

## 产品简介

高中物理 AI 教学助手消除了重复出题和批改的负担。教师选择知识点，点击**生成**，30 秒内即可得到一套可直接审查的物理题目。学生在线作答后，客观题立即自动评分；主观题进入流畅的批改中心。成绩发布后，师生双方都能看到与知识点精确对应的丰富反馈。

### 核心功能

| 功能 | 说明 |
|------|------|
| **AI 智能出题** | 指定章节、题型、难度 → GLM-4-Flash 生成含 LaTeX 公式的结构化题目 |
| **教师审查流程** | AI 生成结果进入 `草稿` 状态；教师逐题预览、编辑、重新生成，确认后发布 |
| **客观题自动批改** | 提交即时评分，支持单位别名归一化（如 m/s² ↔ m·s⁻²） |
| **批改中心** | 按题目 / 按学生双视图，键盘快速打分，一键插入常用评语 |
| **成绩发布** | 教师确认后才发布，24 小时内可修改，全程审计日志 |
| **班级管理** | 教师创建班级并生成邀请码；学生凭邀请码加入 |
| **文件上传** | 教案及题库文件（PDF / DOCX / PPTX）上传至 Cloudflare R2，自动解析为文本 |

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 15（App Router）· Tailwind CSS · shadcn/ui · KaTeX |
| 后端 | Hono · Drizzle ORM |
| AI Agent | Mastra · 智谱 GLM-4-Flash |
| Embedding *（P1）* | 阿里百炼 text-embedding-v3 |
| 数据库 | Supabase（PostgreSQL + Auth + pgvector） |
| 文件存储 | Cloudflare R2 |
| 部署 | Cloudflare Workers（前后端均部署） |
| Monorepo | pnpm workspace |

---

## 项目结构

```
physics-ai-tutor/
├── apps/
│   ├── web/                  # Next.js 15 前端
│   └── server/               # Hono + Mastra 后端
├── packages/
│   └── shared/               # 共享类型、Zod validators、知识点常量
├── docs/
│   ├── PRD.md                # 产品需求文档
│   ├── technical-plan.md     # 架构与数据库设计
│   ├── UI-SPEC.md            # 设计 Token 与组件规范
│   └── dev-plan.md           # 分阶段开发计划
├── ai/
│   ├── tasks.json            # 搭建任务（S-01, S-02）
│   ├── tasks/
│   │   ├── backend.json      # 后端任务（B-01 ~ B-05）
│   │   ├── frontend.json     # 前端任务（F-01 ~ F-05）
│   │   ├── ai-agents.json    # AI Agent 任务（A-01 ~ A-04）
│   │   └── p1.json           # P1 上线后补齐任务
│   ├── setup-guide.md        # Codex + Claude Code 编排指南
│   └── codex-claude-orchestrator.sh
├── scripts/
│   └── deploy.sh             # 一键 Cloudflare 部署脚本
└── .env.example
```

---

## 快速开始

### 前置条件

- Node.js ≥ 20
- pnpm ≥ 9
- [Supabase](https://supabase.com) 项目（PostgreSQL + Auth）
- [Cloudflare](https://cloudflare.com) 账号（Workers + R2）
- [智谱 AI](https://open.bigmodel.cn) API Key（GLM-4-Flash，有免费额度）

### 1. 克隆并安装依赖

```bash
git clone https://gitee.com/your-org/physics-ai-tutor.git
cd physics-ai-tutor
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`：

```env
# AI 模型
ZHIPU_API_KEY=your_zhipu_key          # GLM-4-Flash（免费）
DASHSCOPE_API_KEY=your_dashscope_key  # 阿里百炼（P1 功能，暂可留空）

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_DATABASE_URL=postgresql://...

# Cloudflare R2
R2_ACCESS_KEY_ID=your_r2_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret
R2_ACCOUNT_ID=your_cf_account_id

# 应用
FRONTEND_URL=http://localhost:3000
```

后端本地开发还需在 `apps/server` 下创建 `.dev.vars`（Wrangler 本地密钥），内容与上方相同。

### 3. 初始化数据库

```bash
cd apps/server
pnpm drizzle-kit migrate
```

### 4. 创建 R2 Bucket

```bash
wrangler r2 bucket create lesson-plans
wrangler r2 bucket create question-banks
wrangler r2 bucket create student-uploads
wrangler r2 bucket create exports
wrangler r2 bucket create avatars
```

### 5. 本地运行

```bash
# 同时启动前端和后端
pnpm dev

# 或分别启动：
pnpm --filter web dev       # http://localhost:3000
pnpm --filter server dev    # http://localhost:4000
```

### 6. 验证流程

- 打开 `http://localhost:3000`，以**教师**身份注册
- 创建班级 → 复制邀请码
- 开无痕窗口，以**学生**身份注册，输入邀请码加入班级
- 教师：进入**AI 智能出题**，选择知识点，点击**生成**
- 学生：打开已发布的作业并提交答案

---

## 部署

### 一键部署到 Cloudflare

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

脚本执行步骤：
1. 安装依赖
2. 构建 shared 包
3. 部署后端 Worker（`apps/server`）
4. 部署前端 Worker（`apps/web`，使用 `@opennextjs/cloudflare`）

### 设置生产环境密钥

```bash
cd apps/server
pnpm run deploy:secrets
# 按提示输入：ZHIPU_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY,
#             R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID
```

### CI/CD（GitHub Actions）

推送到 `main` 分支 → `.github/workflows/deploy.yml` 自动依次部署后端和前端。

需要在 GitHub 仓库设置以下 Secrets：
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

---

## AI Agent 架构

```
教师选择知识点
      │
      ▼
generate-exam Workflow（Mastra）
  ├── Step 1: parse-requirements   构建出题 Prompt
  ├── Step 2: generate-questions   GLM-4-Flash → JSON 题目数组
  ├── Step 3: quality-check        质检 Agent 标记疑似问题
  └── Step 4: save-draft           写入数据库（status = draft）
      │
      ▼
教师在审查页面逐题确认
（编辑 / 单题重新生成 / 删除）
      │
      ▼
发布 → 学生作答 → 自动批改 → 教师批改主观题 → 发布成绩
```

Agent 说明：

| Agent | 职责 |
|-------|------|
| `question-generator` | 将出题需求转为结构化 JSON 题目 |
| `quality-checker` | 检查物理准确性、表述歧义、选项区分度等 |
| `lesson-parser` *（P1）* | 从教案中提取知识点结构 |
| `analytics-agent` *（P1）* | 基于答题数据生成教学建议 |

---

## 开发路线图

### MVP（当前）

- [x] 班级管理与邀请码加入
- [x] AI 智能出题（选择题 / 填空题 / 计算题 / 简答题）
- [x] 教师审查流程（草稿 → 发布）
- [x] 学生在线作答，支持图片附件上传
- [x] 客观题自动批改，含单位别名归一化
- [x] 批改中心（按题目 / 按学生双视图）
- [x] 成绩发布 + 24 小时修改窗口 + 审计日志
- [x] 文件上传至 Cloudflare R2（教案、题库、学生附件）
- [x] 一键 Cloudflare 部署 + GitHub Actions CI/CD

### P1（上线后优先补齐）

- [ ] RAG 管道 — 教案解析 + pgvector 语义检索
- [ ] 薄弱点分析 — 知识点错误率热力图
- [ ] 个性化练习推荐
- [ ] 试卷 PDF 导出 + 成绩 Excel 导出
- [ ] 题库管理（搜索、筛选、复用）

### P2（二期规划）

- [ ] 主观题 AI 辅助评分
- [ ] 家长端（查看成绩与薄弱点报告）
- [ ] 移动端适配（H5 / App）
- [ ] 手写公式拍照识别（OCR → LaTeX）
- [ ] 多教师协作

---

## 参与贡献

1. Fork 仓库并创建功能分支
2. 提交 PR 前运行 `pnpm typecheck`，确保无类型错误
3. 遵守 `docs/UI-SPEC.md` 中的颜色 Token 规范——组件内禁止直接写 hex 值
4. MVP 与 P1 功能严格分离，不在 MVP 构建中激活 P1 代码路径

---

## 许可证

MIT
