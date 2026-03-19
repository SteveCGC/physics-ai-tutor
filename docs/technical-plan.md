# 高中物理AI教学助手 - 技术方案

## 一、项目背景

为高中物理教师打造的 AI 教学助手。本技术方案基于最新版 PRD（`docs/PRD.md`），以一期 MVP 为主，优先覆盖班级管理、AI 出题、教师审查、学生答题、客观题自动批改、主观题教师批改与成绩发布闭环。

---

## 二、技术栈

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| 前端 | Next.js 15 + Tailwind CSS + shadcn/ui | App Router, RSC |
| UI 补充 | KaTeX（公式渲染） | 一期基础公式渲染 |
| 后端 | Hono + Mastra + Drizzle ORM | 轻量 TS 后端 + AI Agent |
| 数据库 | Supabase（PostgreSQL + Auth + pgvector） | 认证 + 数据库 |
| 文件存储 | Cloudflare R2 | 10GB 免费，零出口费，Workers binding |
| AI 对话模型 | 智谱 GLM-4-Flash（开发期，永久免费） | Mastra 内置 zhipuai provider |
| Embedding 模型 | 阿里百炼 text-embedding-v3（按需启用） | P1 教案/题库检索再接入 |
| 向量搜索 | pgvector（Supabase 内置，可选） | P1 语义检索 |
| Monorepo | pnpm workspace | 前后端共享类型 |

---

## 三、项目结构

```
physics-ai-tutor/
├── pnpm-workspace.yaml
├── package.json                    # workspace root
├── turbo.json                      # Turborepo 构建编排（可选）
├── .env.example
│
├── apps/
│   ├── web/                        # Next.js 前端
│   │   ├── app/
│   │   │   ├── (auth)/             # 登录/注册
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── register/page.tsx
│   │   │   ├── (dashboard)/        # 需要登录的页面
│   │   │   │   ├── layout.tsx      # 侧边栏 + 顶栏布局
│   │   │   │   ├── page.tsx        # 仪表盘首页
│   │   │   │   ├── exams/          # 试卷管理
│   │   │   │   │   ├── page.tsx        # 试卷列表
│   │   │   │   │   ├── new/page.tsx    # AI 出题
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── page.tsx        # 试卷详情/审查
│   │   │   │   │       ├── edit/page.tsx   # 编辑试卷
│   │   │   │   │       └── grading/page.tsx # 批改中心
│   │   │   │   ├── questions/      # 手动录题/基础题库
│   │   │   │   ├── students/       # 学生管理
│   │   │   │   └── settings/       # 设置
│   │   │   ├── student/            # 学生端
│   │   │   │   ├── assignments/    # 作业列表
│   │   │   │   │   └── [id]/page.tsx  # 答题页
│   │   │   │   ├── results/        # 成绩查看
│   │   │   └── api/                # Next.js BFF 层（代理后端）
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn/ui 组件
│   │   │   ├── layout/             # Sidebar, Header, etc.
│   │   │   ├── exam/               # 出题相关组件
│   │   │   ├── question/           # 题目渲染/编辑组件
│   │   │   └── grading/            # 批改相关组件
│   │   ├── lib/
│   │   │   ├── api.ts              # 后端 API 请求封装
│   │   │   ├── auth.ts             # Supabase Auth 客户端
│   │   │   └── utils.ts
│   │   ├── hooks/                  # 自定义 hooks
│   │   ├── styles/
│   │   │   └── globals.css         # Tailwind + 自定义主题
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── server/                     # Hono + Mastra 后端
│       ├── src/
│       │   ├── index.ts            # Hono 入口，注册 Mastra
│       │   ├── routes/             # REST API 路由
│       │   │   ├── exams.ts        # 试卷 CRUD
│       │   │   ├── questions.ts    # 题目 CRUD
│       │   │   ├── submissions.ts  # 答题提交
│       │   │   ├── grading.ts      # 批改接口
│       │   │   ├── upload.ts       # 文件上传（教案/题库）
│       │   │   └── classes.ts      # 班级管理
│       │   ├── middleware/
│       │   │   ├── auth.ts         # Supabase JWT 验证
│       │   │   └── role.ts         # 角色权限（teacher/student）
│       │   ├── mastra/             # AI Agent 层
│       │   │   ├── index.ts        # Mastra 实例注册
│       │   │   ├── agents/
│       │   │   │   ├── question-generator.ts   # 出题 Agent
│       │   │   │   ├── quality-checker.ts      # 题目质检 Agent
│       │   │   │   └── lesson-parser.ts        # 教案解析 Agent（P1）
│       │   │   ├── tools/
│       │   │   │   ├── search-question-bank.ts # 搜索已有题库（基础版本）
│       │   │   │   └── validate-question.ts    # 校验题目质量
│       │   │   └── workflows/
│       │   │       ├── generate-exam.ts        # 出题工作流
│       │   │       └── parse-lesson-plan.ts    # 教案解析工作流（P1）
│       │   ├── db/
│       │   │   ├── schema.ts       # Drizzle schema 定义
│       │   │   ├── client.ts       # 数据库连接
│       │   │   └── migrations/     # 数据库迁移文件
│       │   └── services/
│       │       ├── grading.ts      # 客观题批改逻辑（规则匹配）
│       │       ├── document-parser.ts # 文件解析
│       │       └── export.ts       # PDF/Word 导出（P1）
│       ├── drizzle.config.ts
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   └── shared/                     # 前后端共享
│       ├── types/
│       │   ├── question.ts         # 题目类型
│       │   ├── exam.ts             # 试卷类型
│       │   ├── user.ts             # 用户类型
│       │   ├── submission.ts       # 提交类型
│       │   └── grading.ts          # 批改/发布类型
│       ├── constants/
│       │   ├── knowledge-points.ts # 知识点体系（人教版）
│       │   └── question-types.ts   # 题型枚举
│       ├── validators/             # Zod schema（前后端复用）
│       │   ├── exam.ts
│       │   └── question.ts
│       ├── tsconfig.json
│       └── package.json
│
└── docs/
    └── PRD.md
```

---

## 四、数据库设计（Drizzle Schema）

### 核心表（MVP）

```typescript
// apps/server/src/db/schema.ts

// 用户表（Supabase Auth 管理，这里存扩展信息）
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),                          // = Supabase auth.users.id
  role: text('role').notNull(),                          // 'teacher' | 'student'
  name: text('name').notNull(),
  school: text('school'),
  classId: uuid('class_id'),                             // 学生一期仅允许绑定一个班级
  createdAt: timestamp('created_at').defaultNow(),
});

// 班级表
export const classes = pgTable('classes', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),                          // "高二(1)班"
  grade: text('grade').notNull(),                        // "高二"
  teacherId: uuid('teacher_id').references(() => profiles.id),
  inviteCode: text('invite_code').unique(),              // 学生加入用
  createdAt: timestamp('created_at').defaultNow(),
});

// 试卷表
export const exams = pgTable('exams', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  status: text('status').notNull().default('draft'),     // draft | published | archived
  teacherId: uuid('teacher_id').references(() => profiles.id),
  classId: uuid('class_id').references(() => classes.id),
  knowledgePoints: jsonb('knowledge_points'),             // ["牛顿第二定律", "力的合成"]
  totalScore: integer('total_score'),
  deadline: timestamp('deadline'),
  createdAt: timestamp('created_at').defaultNow(),
  publishedAt: timestamp('published_at'),
});

// 题目表
export const questions = pgTable('questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  examId: uuid('exam_id').references(() => exams.id),
  type: text('type').notNull(),                          // choice | fill | calculation | short_answer
  content: text('content').notNull(),                    // 支持 LaTeX
  options: jsonb('options'),                              // 选择题选项 ["A. ...", "B. ..."]
  answer: text('answer').notNull(),                      // 标准答案
  acceptedAnswers: jsonb('accepted_answers'),            // 填空题等价答案集合
  explanation: text('explanation'),                       // 解析
  knowledgePoints: jsonb('knowledge_points'),
  difficulty: integer('difficulty').notNull(),            // 1-5
  score: integer('score').notNull(),                     // 该题分值
  orderIndex: integer('order_index').notNull(),
  source: text('source').default('ai'),                  // ai | manual | imported
  qualityFlags: jsonb('quality_flags'),                  // 审查提示
  createdAt: timestamp('created_at').defaultNow(),
});

// 学生答题提交表
export const submissions = pgTable('submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  examId: uuid('exam_id').references(() => exams.id),
  studentId: uuid('student_id').references(() => profiles.id),
  status: text('status').notNull().default('in_progress'), // in_progress | submitted | pending_review | published
  totalScore: integer('total_score'),
  submittedAt: timestamp('submitted_at'),
  publishedAt: timestamp('published_at'),
});

// 单题作答记录
export const answers = pgTable('answers', {
  id: uuid('id').primaryKey().defaultRandom(),
  submissionId: uuid('submission_id').references(() => submissions.id),
  questionId: uuid('question_id').references(() => questions.id),
  studentAnswer: text('student_answer'),                  // 学生答案
  attachmentUrl: text('attachment_url'),                  // 附件，供教师查看
  isCorrect: boolean('is_correct'),                      // 客观题自动判断
  score: integer('score'),                                // 得分
  feedback: text('feedback'),                             // 错因解析（客观题自动）
  teacherComment: text('teacher_comment'),                // 教师批注（主观题）
  gradedBy: text('graded_by'),                           // 'auto' | 'teacher'
  gradedAt: timestamp('graded_at'),
});

// 成绩发布后的修改审计
export const scoreAuditLogs = pgTable('score_audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  submissionId: uuid('submission_id').references(() => submissions.id),
  answerId: uuid('answer_id').references(() => answers.id),
  operatorId: uuid('operator_id').references(() => profiles.id),
  oldScore: integer('old_score'),
  newScore: integer('new_score'),
  oldComment: text('old_comment'),
  newComment: text('new_comment'),
  reason: text('reason').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 文件上传表：一期用于题库文件上传，P1 扩展到教案解析
export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  teacherId: uuid('teacher_id').references(() => profiles.id),
  title: text('title').notNull(),
  fileUrl: text('file_url').notNull(),                   // Supabase Storage URL
  fileType: text('file_type'),                           // pdf | docx | pptx
  parsedContent: text('parsed_content'),                 // 解析后的纯文本
  useCase: text('use_case').notNull(),                   // question_bank | lesson_plan
  parseStatus: text('parse_status').default('pending'),  // pending | done | failed
  knowledgePoints: jsonb('knowledge_points'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

---

## 五、AI Agent 架构

### 5.1 Mastra 实例注册

```typescript
// apps/server/src/mastra/index.ts
import { Mastra } from '@mastra/core';
import { questionGeneratorAgent } from './agents/question-generator';
import { qualityCheckerAgent } from './agents/quality-checker';
import { lessonParserAgent } from './agents/lesson-parser';
import { generateExamWorkflow } from './workflows/generate-exam';
import { parseLessonPlanWorkflow } from './workflows/parse-lesson-plan';

export const mastra = new Mastra({
  agents: {
    questionGenerator: questionGeneratorAgent,
    qualityChecker: qualityCheckerAgent,
    lessonParser: lessonParserAgent,
  },
  workflows: {
    generateExam: generateExamWorkflow,
    parseLessonPlan: parseLessonPlanWorkflow,
  },
});
```

### 5.2 Agent 定义

#### 出题 Agent（MVP）

```typescript
// apps/server/src/mastra/agents/question-generator.ts
import { Agent } from '@mastra/core/agent';
import { searchQuestionBank } from '../tools/search-question-bank';
import { saveQuestion } from '../tools/save-question';
import { getKnowledgePoints } from '../tools/get-knowledge-points';

export const questionGeneratorAgent = new Agent({
  name: 'question-generator',
  model: 'zhipuai/glm-4-flash',
  instructions: `你是一位资深高中物理出题专家，擅长根据指定知识点生成高质量物理题目。

规则：
1. 严格按照指定的知识点、题型、难度生成题目
2. 物理公式使用 LaTeX 格式（如 $F=ma$）
3. 选择题必须有4个选项，且只有一个正确答案
4. 每道题至少给出标准答案，解析可选但建议输出
5. 一期题型仅限 choice、fill、calculation、short_answer
6. 确保物理量单位正确（SI单位制）
7. 难度1-5对应：基础概念→简单应用→综合运用→拓展提升→竞赛难度
8. 避免与同一教师已有题目高度重复
9. 不生成依赖图片识别才能作答的题目

输出格式为严格 JSON。`,
  tools: {
    searchQuestionBank,
    getKnowledgePoints,
  },
});
```

#### 质检 Agent

```typescript
// apps/server/src/mastra/agents/quality-checker.ts
export const qualityCheckerAgent = new Agent({
  name: 'quality-checker',
  model: 'zhipuai/glm-4-flash',
  instructions: `你是物理题目质量审查员，负责检查AI生成的物理题目质量。

检查项：
1. 物理概念是否准确（公式、定律、单位）
2. 题目表述是否清晰无歧义
3. 选择题选项是否有明显区分度
4. 答案和解析是否正确
5. 难度标注是否合理
6. 是否存在超纲内容

输出：{ passed: boolean, issues: string[], suggestions: string[] }`,
});
```

#### 教案解析 Agent（P1）

```typescript
// apps/server/src/mastra/agents/lesson-parser.ts
export const lessonParserAgent = new Agent({
  name: 'lesson-parser',
  model: 'zhipuai/glm-4-flash',
  instructions: `你是教案分析专家，负责从教师上传的教案中提取结构化信息。

提取内容：
1. 章节名称和教学目标
2. 核心知识点列表（匹配课标体系）
3. 重难点标注
4. 建议的题型和难度分布

输出格式为结构化 JSON。`,
});
```

### 5.3 Tool 定义示例

```typescript
// apps/server/src/mastra/tools/search-question-bank.ts
import { createTool } from '@mastra/core/tool';
import { z } from 'zod';

export const searchQuestionBank = createTool({
  id: 'search-question-bank',
  description: '在题库中搜索与指定知识点相关的已有题目，用于避免重复出题',
  inputSchema: z.object({
    knowledgePoint: z.string().describe('知识点名称'),
    topK: z.number().default(5).describe('返回数量'),
  }),
  outputSchema: z.object({
    questions: z.array(z.object({
      id: z.string(),
      content: z.string(),
      similarity: z.number(),
    })),
  }),
  execute: async ({ context }) => {
    // MVP 可先做关键词检索；P1 再升级为向量检索
  },
});
```

### 5.4 Workflow 定义

```typescript
// apps/server/src/mastra/workflows/generate-exam.ts
import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';

// Step 1: 解析出题需求
const parseRequirements = createStep({
  id: 'parse-requirements',
  inputSchema: z.object({
    knowledgePoints: z.array(z.string()),
    questionTypes: z.array(z.string()),
    difficulty: z.number().min(1).max(5),
    count: z.number().default(10),
  }),
  outputSchema: z.object({
    prompt: z.string(),
    searchContext: z.string().optional(),
  }),
  execute: async ({ context }) => {
    // 构建出题 prompt；若有基础题库则附带检索上下文
  },
});

// Step 2: AI 生成题目
const generateQuestions = createStep({
  id: 'generate-questions',
  execute: async ({ context, mastra }) => {
    const agent = mastra.getAgent('questionGenerator');
    const result = await agent.generate({
      messages: [{ role: 'user', content: context.prompt }],
    });
    return { questions: JSON.parse(result.text) };
  },
});

// Step 3: 质量检查
const qualityCheck = createStep({
  id: 'quality-check',
  execute: async ({ context, mastra }) => {
    const checker = mastra.getAgent('qualityChecker');
    // 逐题检查，输出 qualityFlags 供教师审查页展示
  },
});

// Step 4: 存入数据库（草稿状态）
const saveDraft = createStep({
  id: 'save-draft',
  execute: async ({ context }) => {
    // 存入 exams + questions 表，status = 'draft'
  },
});

export const generateExamWorkflow = createWorkflow({
  id: 'generate-exam',
  inputSchema: z.object({ /* ... */ }),
  outputSchema: z.object({ /* ... */ }),
})
  .step(parseRequirements)
  .then(generateQuestions)
  .then(qualityCheck)
  .then(saveDraft)
  .commit();
```

---

## 六、Hono 后端架构

### 6.1 入口

```typescript
// apps/server/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { MastraServer } from '@mastra/hono';
import { mastra } from './mastra';
import { examRoutes } from './routes/exams';
import { questionRoutes } from './routes/questions';
import { submissionRoutes } from './routes/submissions';
import { gradingRoutes } from './routes/grading';
import { uploadRoutes } from './routes/upload';
import { classRoutes } from './routes/classes';
import { authMiddleware } from './middleware/auth';

const app = new Hono();

// 中间件
app.use('*', cors({ origin: process.env.FRONTEND_URL }));
app.use('/api/*', authMiddleware);

// 业务路由
app.route('/api/exams', examRoutes);
app.route('/api/questions', questionRoutes);
app.route('/api/submissions', submissionRoutes);
app.route('/api/grading', gradingRoutes);
app.route('/api/upload', uploadRoutes);
app.route('/api/classes', classRoutes);

// Mastra Agent 路由（自动生成 /mastra/agents/... /mastra/workflows/...）
const mastraServer = new MastraServer(app, mastra, {
  prefix: '/mastra',
});
await mastraServer.init();

// 健康检查
app.get('/health', (c) => c.json({ status: 'ok' }));

export default app;
```

### 6.2 用户管理与权限设计

#### 角色体系

| 角色 | 标识 | 说明 |
|------|------|------|
| 教师 | `teacher` | 创建班级、出题、批改、发布成绩 |
| 学生 | `student` | 答题、查看成绩 |

#### 注册与身份认证流程

```
教师注册：
  邮箱/手机号注册 → Supabase Auth 创建用户
  → 选择角色 "教师" → 填写姓名、学校
  → 创建 profiles 记录（role: 'teacher'）
  → 进入教师端仪表盘

学生加入：
  教师创建班级 → 生成邀请码/二维码
  → 学生注册/登录后输入邀请码
  → 创建/更新 profiles（role: 'student'，写入 classId）
  → 进入学生端
```

#### 数据库 Schema 补充

```typescript
// profiles 表增加字段
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),                          // = Supabase auth.users.id
  role: text('role').notNull(),                          // 'teacher' | 'student'
  name: text('name').notNull(),
  avatar: text('avatar'),                                // 头像 URL
  phone: text('phone'),                                  // 手机号（可选登录方式）
  school: text('school'),
  classId: uuid('class_id'),
  status: text('status').notNull().default('active'),    // active | disabled
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

#### 认证中间件

```typescript
// apps/server/src/middleware/auth.ts
import { createClient } from '@supabase/supabase-js';
import { db } from '../db/client';
import { eq } from 'drizzle-orm';
import { profiles } from '../db/schema';

export const authMiddleware = async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  // 1. 验证 Supabase JWT
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
  );
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return c.json({ error: 'Unauthorized' }, 401);

  // 2. 查询用户 profile（含角色）
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
  });
  if (!profile) return c.json({ error: 'Profile not found' }, 403);
  if (profile.status === 'disabled') return c.json({ error: 'Account disabled' }, 403);

  // 3. 注入上下文
  c.set('user', user);
  c.set('profile', profile);
  await next();
};
```

#### 角色权限中间件

```typescript
// apps/server/src/middleware/role.ts
type Role = 'teacher' | 'student';

export const requireRole = (...roles: Role[]) => {
  return async (c, next) => {
    const profile = c.get('profile');
    if (!roles.includes(profile.role)) {
      return c.json({ error: 'Forbidden: insufficient permissions' }, 403);
    }
    await next();
  };
};

// 资源归属校验：确保教师只能操作自己的数据
export const requireOwnership = (resourceField: string = 'teacherId') => {
  return async (c, next) => {
    const profile = c.get('profile');
    // 具体的归属校验在各路由中实现
    c.set('ownerId', profile.id);
    await next();
  };
};
```

#### API 权限矩阵

| API | 教师 | 学生 | 说明 |
|-----|------|------|------|
| `POST /api/exams` | ✅ | ❌ | 创建试卷 |
| `GET /api/exams` | ✅ 自己的 | ✅ 已发布的 | 教师看全部，学生只看已发布 |
| `PATCH /api/exams/:id` | ✅ 仅自己的 | ❌ | 编辑/发布试卷 |
| `POST /api/exams/:id/generate` | ✅ | ❌ | AI 出题 |
| `GET /api/questions` | ✅ | ❌ | 题库管理 |
| `POST /api/submissions` | ❌ | ✅ | 提交答题 |
| `GET /api/submissions` | ✅ 本班的 | ✅ 仅自己的 | 查看提交记录 |
| `POST /api/grading/answers/:id` | ✅ | ❌ | 单题打分/写批注 |
| `POST /api/grading/submissions/:id/publish` | ✅ | ❌ | 发布成绩 |
| `POST /api/upload` | ✅ | ❌ | 上传题库文件或教案文件 |
| `POST /api/classes` | ✅ | ❌ | 创建班级 |
| `POST /api/classes/join` | ❌ | ✅ | 加入班级 |

#### 路由中使用示例

```typescript
// apps/server/src/routes/exams.ts
import { Hono } from 'hono';
import { requireRole } from '../middleware/role';

const app = new Hono();

// 只有教师可以创建试卷
app.post('/', requireRole('teacher'), async (c) => {
  const profile = c.get('profile');
  const body = await c.req.json();
  // profile.id 自动作为 teacherId
  const exam = await db.insert(exams).values({
    ...body,
    teacherId: profile.id,
    status: 'draft',
  }).returning();
  return c.json(exam);
});

// 教师看自己的全部试卷，学生只看已发布的
app.get('/', async (c) => {
  const profile = c.get('profile');
  if (profile.role === 'teacher') {
    return c.json(await db.query.exams.findMany({
      where: eq(exams.teacherId, profile.id),
    }));
  } else {
    // 学生：查自己所在班级的已发布试卷
    return c.json(await getPublishedExamsForStudent(profile.id));
  }
});

// 只有教师可以批改
app.post('/:id/grading', requireRole('teacher'), async (c) => {
  // ...
});

export { app as examRoutes };
```

#### Supabase RLS（数据库层兜底）

即使后端中间件被绕过，RLS 保证数据安全：

```sql
-- 教师只能查看自己创建的试卷
CREATE POLICY "Teachers see own exams" ON exams
  FOR SELECT USING (teacher_id = auth.uid());

-- 学生只能查看已发布的试卷（且属于自己的班级）
CREATE POLICY "Students see published exams" ON exams
  FOR SELECT USING (
    status = 'published'
    AND class_id = (SELECT class_id FROM profiles WHERE id = auth.uid())
  );

-- 学生只能查看自己的提交记录
CREATE POLICY "Students see own submissions" ON submissions
  FOR SELECT USING (student_id = auth.uid());

-- 学生只能创建自己的提交
CREATE POLICY "Students create own submissions" ON submissions
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- 教师只能批改自己班级的提交
CREATE POLICY "Teachers grade own class" ON submissions
  FOR UPDATE USING (
    exam_id IN (
      SELECT id FROM exams WHERE teacher_id = auth.uid()
    )
  );
```

#### 前端路由守卫

```typescript
// apps/web/lib/auth.ts
// 前端根据角色重定向到对应页面

// middleware.ts (Next.js)
export function middleware(request: NextRequest) {
  const role = getUserRoleFromSession();

  // 教师访问学生页面 → 重定向
  if (role === 'teacher' && request.nextUrl.pathname.startsWith('/student')) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  // 学生访问教师页面 → 重定向
  if (role === 'student' && !request.nextUrl.pathname.startsWith('/student')) {
    return NextResponse.redirect(new URL('/student', request.url));
  }
}
```

---

## 七、前端关键页面

### 7.1 UI 设计规范

基于 UI 设计稿，整体风格为**现代、干净、紫色主题、圆角卡片、宽松留白、数据驱动型 Dashboard**，接近 Linear / Vercel Dashboard 风格。

#### 色彩体系

| 用途 | 色值 | 说明 |
|------|------|------|
| 主色 | `#7C3AED`（紫色） | 导航高亮、按钮、图表、标签 |
| 背景 | `#FFFFFF` / `#F9FAFB` | 白色主背景 + 浅灰卡片底色 |
| 正向数据 | `#10B981`（绿色） | 上升指标（+3.4%） |
| 警告/关注 | `#F97316`（橙红） | 需关注的薄弱知识点 |
| 侧边栏 | 深紫/深色底 | 白色图标 + 文字 |

#### 布局规范

- **左侧固定侧边栏**：深色背景，宽度 240px，包含 Logo + 导航菜单
- **顶部栏**：搜索框 + 日期显示 + 通知铃铛 + 设置齿轮
- **主内容区**：卡片式网格布局，最大宽度 1280px

#### 组件风格

| 特征 | 规范 |
|------|------|
| 圆角 | 全局大圆角 `rounded-xl`（卡片）、`rounded-lg`（按钮/输入框） |
| 阴影 | `shadow-sm` 轻微投影，层次感柔和 |
| 间距 | 宽松留白，卡片间距 `gap-6`，内边距 `p-6` |
| 字体 | 中文无衬线（系统默认），层级清晰：大标题 24px > 数据数字 32px bold > 正文 14px |
| 图标 | Lucide Icons 线性风格 |
| 数据展示 | 大数字突出 + 小标签辅助 + 趋势箭头 |
| 状态标签 | 彩色圆角 Badge：`已批改`绿色、`待批改`橙色、`进行中`蓝色 |
| 图表 | 一期不作为核心页面依赖，P1 再引入 |

#### Tailwind 主题配置

```typescript
// apps/web/tailwind.config.ts
// shadcn/ui CSS 变量覆盖为紫色主题
// --primary: 263 70% 50%       (#7C3AED)
// --primary-foreground: 0 0% 100%
// --accent: 263 70% 96%        (淡紫色悬停态)
// --sidebar-background: 263 40% 12%  (深紫侧边栏)
// --sidebar-foreground: 0 0% 95%
// --chart-1: 263 70% 50%       (图表主色)
```

### 7.2 核心页面

| 页面 | 路由 | 功能 |
|------|------|------|
| 仪表盘 | `/` | 欢迎卡、班级入口、最近试卷、待批改提醒 |
| AI 出题 | `/exams/new` | 选知识点 → 选题型/难度 → 生成 → 审查 |
| 试卷审查 | `/exams/[id]` | 逐题预览、编辑、重新生成、发布 |
| 批改中心 | `/exams/[id]/grading` | 按题目/按学生视图、打分、批注 |
| 题库管理 | `/questions` | 搜索、筛选、导入、分类 |
| 学生答题 | `/student/assignments/[id]` | 答题界面、基础公式输入、提交 |
| 学生成绩 | `/student/results` | 已发布成绩、分题得分、教师批注 |

### 7.3 实时交互

出题时可以使用 **Streaming**，实时显示生成进度；不是一期阻塞项：

```typescript
// 前端调用出题 workflow，流式显示
const response = await fetch('/mastra/workflows/generate-exam/stream', {
  method: 'POST',
  body: JSON.stringify({ knowledgePoints, questionTypes, difficulty }),
});
const reader = response.body.getReader();
// 逐步显示每道题的生成状态
```

---

## 八、关键流程

### 8.1 出题流程（MVP）

```
教师选择知识点/题型/难度
  → API: POST /api/exams (创建试卷记录)
  → Mastra Workflow: generate-exam
    → Step 1: 读取知识点与基础题库上下文
    → Step 2: 出题 Agent 生成题目（可选 Streaming）
    → Step 3: 质检 Agent 逐题检查
    → Step 4: 存入 DB（draft 状态）
  → 前端进入审查页面
  → 教师编辑/确认
  → API: PATCH /api/exams/:id { status: 'published' }
  → 通知学生
```

### 8.2 答题批改流程（MVP）

```
学生打开试卷 → 答题 → 提交
  → API: POST /api/submissions
  → 服务端自动批改客观题（规则匹配）
  → 计算 choice/fill 得分并保存
  → 主观题标记 "待批改"

教师进入批改中心
  → 逐题打分、添加批注
  → API: POST /api/grading/submissions/:id/publish
  → 学生收到通知，查看成绩
```

### 8.3 文件上传与解析流程

```
教师上传题库文件或教案文件
  → R2 存储文件
  → API: POST /api/upload
  → 文档解析（PDF/Word → 纯文本）
  → 一期：提取题目原文或基础文本，供教师手动确认入库
  → P1：调用 parse-lesson-plan 提取知识点
```

---

## 九、Supabase 使用方案

| 功能 | Supabase 服务 | 用途 |
|------|-------------|------|
| 用户认证 | Auth | 教师/学生注册登录，JWT token |
| 文件存储 | Cloudflare R2（见 9.1） | 教案PDF/Word、学生答题图片 |
| 数据库 | PostgreSQL | 所有业务数据（通过 Drizzle ORM 操作） |
| 向量搜索 | pgvector 扩展（P1） | 教案/题库语义检索 |
| 实时通知 | Realtime | 成绩发布通知学生（可选） |
| RLS | Row Level Security | 数据权限隔离（教师只看自己的班级） |

---

## 9.1 文件存储方案（Cloudflare R2）

### 为什么选 R2 而不是 Supabase Storage

| | Supabase Storage | Cloudflare R2 |
|--|----------------|---------------|
| 免费存储 | 1 GB | **10 GB** |
| 出口流量 | 2 GB/月 | **无限免费** |
| 和 Workers 集成 | 需走外网请求 | **直接 binding，零延迟** |
| 超出价格 | $0.021/GB | $0.015/GB |
| S3 兼容 | ❌ | ✅ |
| 自定义域名 | ❌ | ✅ |

R2 和 Workers 同属 Cloudflare 生态，通过 binding 直接访问，不经过公网，零延迟零出口费。

### R2 Bucket 划分

| Bucket 名称 | 用途 | 访问权限 | 文件类型 |
|-------------|------|---------|---------|
| `lesson-plans` | 教师上传的教案 | 教师私有（仅上传者可访问） | PDF, DOCX, PPTX |
| `question-banks` | 教师上传的题库文件 | 教师私有 | PDF, DOCX, XLSX |
| `student-uploads` | 学生答题时上传的图片（解题步骤、草稿） | 学生私有 + 对应教师可读 | PNG, JPG, JPEG |
| `exports` | 系统生成的导出文件（P1） | 教师私有，临时签名 URL | PDF, DOCX |
| `avatars` | 用户头像 | 公开读 | PNG, JPG, JPEG |

### 文件限制

| 限制项 | 值 | 说明 |
|-------|---|------|
| 单文件最大 | 20MB | 教案 PDF 一般 < 5MB，预留余量 |
| 图片最大 | 5MB | 学生上传答题图片 |
| 头像最大 | 2MB | 裁剪后上传 |
| 允许教案格式 | `.pdf` `.docx` `.pptx` | 一期支持三种 |
| 允许题库格式 | `.pdf` `.docx` `.xlsx` | 含 Excel 批量导入 |
| 允许图片格式 | `.png` `.jpg` `.jpeg` | 学生答题 + 头像 |

### R2 免费额度明细

| 项目 | 免费额度 | 超出价格 |
|------|---------|---------|
| 存储 | 10 GB/月 | $0.015/GB/月 |
| A 类操作（写入/列表） | 100 万次/月 | $4.50/百万次 |
| B 类操作（读取） | 1000 万次/月 | $0.36/百万次 |
| 出口流量 | **无限免费** | $0 |

**按项目估算**：5 个教师 + 200 学生用一学期 ≈ 2-3 GB 存储 + 几十万次读写，完全在免费范围内。

### Wrangler R2 配置

```jsonc
// apps/server/wrangler.jsonc（追加 R2 binding）
{
  "r2_buckets": [
    { "binding": "LESSON_PLANS", "bucket_name": "lesson-plans" },
    { "binding": "QUESTION_BANKS", "bucket_name": "question-banks" },
    { "binding": "STUDENT_UPLOADS", "bucket_name": "student-uploads" },
    { "binding": "EXPORTS", "bucket_name": "exports" },
    { "binding": "AVATARS", "bucket_name": "avatars" }
  ]
}
```

创建 Bucket：
```bash
wrangler r2 bucket create lesson-plans
wrangler r2 bucket create question-banks
wrangler r2 bucket create student-uploads
wrangler r2 bucket create exports
wrangler r2 bucket create avatars
```

### 上传流程（前端 → 后端 Worker → R2）

R2 没有像 Supabase Storage 那样的客户端 SDK 直传，采用**后端 Presigned URL**方案：

```
前端                          后端 Workers                     R2
  │                              │                             │
  │  1. 请求上传 URL              │                             │
  │  POST /api/upload/presign    │                             │
  │  ──────────────────────────→ │                             │
  │                              │  2. 校验权限                 │
  │                              │  3. 生成 presigned URL       │
  │  ← ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │                             │
  │  { uploadUrl, fileKey }      │                             │
  │                              │                             │
  │  4. PUT 文件到 presigned URL  │                             │
  │  ──────────────────────────────────────────────────────── → │
  │                              │                   ← 200 OK  │
  │                              │                             │
  │  5. 确认上传完成              │                             │
  │  POST /api/upload/confirm    │                             │
  │  ──────────────────────────→ │                             │
  │                              │  6. 记录DB + 触发解析        │
  │  ← ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │                             │
```

### 后端类型定义

```typescript
// apps/server/src/index.ts
type Bindings = {
  // 数据库
  HYPERDRIVE: { connectionString: string };
  // R2 Buckets
  LESSON_PLANS: R2Bucket;
  QUESTION_BANKS: R2Bucket;
  STUDENT_UPLOADS: R2Bucket;
  EXPORTS: R2Bucket;
  AVATARS: R2Bucket;
  // Secrets
  ZHIPU_API_KEY: string;
  DASHSCOPE_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  FRONTEND_URL: string;
};
```

### 后端上传接口

```typescript
// apps/server/src/routes/upload.ts
import { Hono } from 'hono';
import { requireRole } from '../middleware/role';
import { AwsClient } from 'aws4fetch'; // R2 presigned URL 生成

const app = new Hono();

// ─── Presigned URL 上传（教案） ───

app.post('/presign', requireRole('teacher'), async (c) => {
  const profile = c.get('profile');
  const { filename, contentType, bucket } = await c.req.json();

  // 1. 校验文件格式
  const allowedBuckets = ['lesson-plans', 'question-banks'];
  if (!allowedBuckets.includes(bucket)) {
    return c.json({ error: 'Invalid bucket' }, 400);
  }

  // 2. 生成唯一 key：{userId}/{timestamp}_{filename}
  const fileKey = `${profile.id}/${Date.now()}_${filename}`;

  // 3. 生成 presigned URL（有效期 10 分钟）
  const r2 = new AwsClient({
    accessKeyId: c.env.R2_ACCESS_KEY_ID,
    secretAccessKey: c.env.R2_SECRET_ACCESS_KEY,
  });

  const url = new URL(`https://${c.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${bucket}/${fileKey}`);
  url.searchParams.set('X-Amz-Expires', '600');

  const signed = await r2.sign(new Request(url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
  }), { aws: { signQuery: true } });

  return c.json({
    uploadUrl: signed.url,
    fileKey,
  });
});

// ─── 小文件直接通过 Worker 上传到 R2（备选方案） ───

app.post('/direct', requireRole('teacher', 'student'), async (c) => {
  const profile = c.get('profile');
  const formData = await c.req.formData();
  const file = formData.get('file') as File;
  const bucket = formData.get('bucket') as string;

  if (!file) return c.json({ error: 'No file' }, 400);
  if (file.size > 20 * 1024 * 1024) return c.json({ error: 'File too large' }, 400);

  // 选择 R2 bucket
  const r2Bucket = getBucket(c.env, bucket);
  if (!r2Bucket) return c.json({ error: 'Invalid bucket' }, 400);

  const fileKey = `${profile.id}/${Date.now()}_${file.name}`;

  // 直接写入 R2（通过 binding，零延迟）
  await r2Bucket.put(fileKey, file.stream(), {
    httpMetadata: { contentType: file.type },
    customMetadata: { uploadedBy: profile.id, originalName: file.name },
  });

  return c.json({ fileKey, fileUrl: `/api/files/${bucket}/${fileKey}` });
});

// ─── 上传确认 → 记录DB + 触发解析 ───

app.post('/confirm', requireRole('teacher'), async (c) => {
  const profile = c.get('profile');
  const { fileKey, bucket, title, fileType } = await c.req.json();
  const db = c.get('db');

  const [doc] = await db.insert(documents).values({
    teacherId: profile.id,
    title,
    fileUrl: fileKey,       // 存 R2 key，不存完整 URL
    fileType,
  }).returning();

  // 异步触发教案解析 Workflow
  const workflow = mastra.getWorkflow('parseLessonPlan');
  workflow.execute({
    documentId: doc.id,
    fileKey,
    bucket,
    fileType,
  }).catch(console.error);

  return c.json({ id: doc.id, status: 'parsing' });
});

// ─── 文件读取（权限控制在应用层） ───

app.get('/files/:bucket/:key{.+}', async (c) => {
  const profile = c.get('profile');
  const bucket = c.req.param('bucket');
  const key = c.req.param('key');

  // 权限校验：文件 key 以用户 ID 开头才允许访问
  // 教师可访问本班学生的文件
  if (!await canAccessFile(profile, bucket, key, c.get('db'))) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const r2Bucket = getBucket(c.env, bucket);
  const object = await r2Bucket.get(key);

  if (!object) return c.json({ error: 'Not found' }, 404);

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'private, max-age=3600',
    },
  });
});

// ─── 辅助函数 ───

function getBucket(env: Bindings, name: string): R2Bucket | null {
  const map: Record<string, R2Bucket> = {
    'lesson-plans': env.LESSON_PLANS,
    'question-banks': env.QUESTION_BANKS,
    'student-uploads': env.STUDENT_UPLOADS,
    'exports': env.EXPORTS,
    'avatars': env.AVATARS,
  };
  return map[name] || null;
}

async function canAccessFile(profile, bucket, key, db): Promise<boolean> {
  const ownerId = key.split('/')[0];

  // 自己的文件：直接允许
  if (ownerId === profile.id) return true;

  // 教师访问学生文件：校验是否本班学生
  if (profile.role === 'teacher' && bucket === 'student-uploads') {
    const student = await db.query.profiles.findFirst({
      where: eq(profiles.id, ownerId),
    });
    if (!student?.classId) return false;

    const classRecord = await db.query.classes.findFirst({
      where: and(
        eq(classes.id, student.classId),
        eq(classes.teacherId, profile.id),
      ),
    });
    return !!classRecord;
  }

  // 头像：公开读
  if (bucket === 'avatars') return true;

  return false;
}

export { app as uploadRoutes };
```

### 前端上传代码

```typescript
// apps/web/lib/upload.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function uploadLessonPlan(file: File, token: string) {
  // 1. 校验
  const allowedExts = ['.pdf', '.docx', '.pptx'];
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!allowedExts.includes(ext)) throw new Error('不支持的文件格式');
  if (file.size > 20 * 1024 * 1024) throw new Error('文件不能超过20MB');

  // 2. 获取 presigned URL
  const presignRes = await fetch(`${API_URL}/api/upload/presign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      bucket: 'lesson-plans',
    }),
  });
  const { uploadUrl, fileKey } = await presignRes.json();

  // 3. 直传到 R2
  await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });

  // 4. 通知后端确认
  const confirmRes = await fetch(`${API_URL}/api/upload/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      fileKey,
      bucket: 'lesson-plans',
      title: file.name,
      fileType: ext.slice(1),
    }),
  });

  return confirmRes.json();
}

// 学生上传答题图片（小文件直传 Worker）
export async function uploadStudentImage(file: File, token: string) {
  if (file.size > 5 * 1024 * 1024) throw new Error('图片不能超过5MB');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('bucket', 'student-uploads');

  const res = await fetch(`${API_URL}/api/upload/direct`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  });

  return res.json();
}
```

### 文件权限控制

R2 没有 Supabase RLS，**权限控制在应用层实现**：

| 文件操作 | 权限规则 |
|---------|---------|
| 上传教案/题库 | 仅教师，key 以 `{teacherId}/` 开头 |
| 上传答题图片 | 仅学生，key 以 `{studentId}/` 开头 |
| 上传头像 | 所有用户，key 以 `{userId}/` 开头 |
| 读取自己的文件 | key 前缀匹配 `{userId}/` |
| 教师读取学生文件 | 校验学生是否在教师的班级中 |
| 公开读头像 | avatars bucket 所有人可读 |
| 导出文件 | 生成临时签名 URL（1 小时过期） |

### 文档解析方案

教师上传的教案/题库文件需要解析为纯文本，再交给 AI Agent 处理。

#### 解析工具链

| 文件格式 | 解析方案 | npm 包 | 说明 |
|---------|---------|--------|------|
| PDF | 文本提取 | `pdf-parse` | 纯文本 PDF 直接提取 |
| PDF（扫描件） | OCR 识别 | 调用外部 OCR API | 二期支持，一期提示用户上传电子版 |
| DOCX | XML 解析 | `mammoth` | Word 转 HTML/纯文本 |
| PPTX | XML 解析 | `pptx-parser` 或自写解析 | 提取幻灯片文本 |
| XLSX | 表格解析 | `xlsx` / `sheetjs` | 题库批量导入 |

#### Workers 环境适配

`pdf-parse` 和 `mammoth` 均为纯 JS 实现，**不依赖 Node.js fs**，可在 Workers 中运行。解析时直接从 R2 读取：

```typescript
// apps/server/src/services/document-parser.ts

export async function parseDocument(
  r2Bucket: R2Bucket,
  fileKey: string,
  fileType: string,
): Promise<string> {
  // 1. 从 R2 读取文件（通过 binding，零延迟，不走公网）
  const object = await r2Bucket.get(fileKey);
  if (!object) throw new Error('File not found in R2');
  const buffer = await object.arrayBuffer();

  // 2. 根据格式解析
  switch (fileType) {
    case 'pdf': {
      const pdfParse = await import('pdf-parse');
      const result = await pdfParse(Buffer.from(buffer));
      return result.text;
    }
    case 'docx': {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
      return result.value;
    }
    case 'pptx': {
      return await parsePptx(buffer);
    }
    default:
      throw new Error(`不支持的文件格式: ${fileType}`);
  }
}
```

#### 完整的教案解析流程

```
教案文件（PDF/DOCX/PPTX）
  │
  ▼
前端上传 → R2 (lesson-plans bucket)
  │
  ▼
后端从 R2 读取（binding，零延迟）
  │
  ▼
文档解析 → 纯文本
  │
  ▼
文本分块（chunk）
  ├── strategy: 'recursive'
  ├── size: 1000 字符
  └── overlap: 200 字符
  │
  ▼
P1: 阿里百炼 Embedding → 向量化
  │
  ▼
存入 pgvector（P1 启用）
  │
  ▼  同时
教案解析 Agent 提取结构化知识点
  │
  ▼
更新 documents 表
  ├── parsed_content: 纯文本
  └── knowledge_points: ["牛顿第二定律", "力的合成", ...]
```

### 文件清理策略

| 场景 | 策略 |
|------|------|
| 导出文件（P1） | 生成签名 URL（有效期 1 小时），过期自动失效 |
| 删除教案 | 同步删除 R2 文件；若已启用向量检索，则同时删除向量数据 |
| 学生退出班级 | 保留答题图片（成绩记录需要） |
| 教师删除账号 | 标记 disabled，文件保留 90 天后清理 |
| R2 生命周期规则 | exports bucket 设置 7 天自动清理 |

```bash
# 设置 exports bucket 自动清理（7天过期）
wrangler r2 bucket lifecycle set exports --rules '[{"id":"auto-cleanup","enabled":true,"conditions":{"age":7},"action":"Delete"}]'
```

---

## 十、AI 模型配置

```typescript
// apps/server/src/mastra/models.ts

// 开发阶段：智谱 GLM-4-Flash（永久免费）
// Mastra 内置 zhipuai provider，直接用 'zhipuai/glm-4-flash'

// Embedding：阿里百炼 text-embedding-v3
import { createOpenAI } from '@ai-sdk/openai';

export const dashscope = createOpenAI({
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  apiKey: process.env.DASHSCOPE_API_KEY!,
});

// 使用：dashscope.textEmbeddingModel('text-embedding-v3')
```

环境变量：
```env
# .env
ZHIPU_API_KEY=xxx                          # 智谱 API Key
DASHSCOPE_API_KEY=xxx                      # 阿里百炼 API Key
SUPABASE_URL=xxx                           # Supabase 项目 URL
SUPABASE_ANON_KEY=xxx                      # Supabase 匿名 Key
SUPABASE_DATABASE_URL=xxx                  # PostgreSQL 连接串
FRONTEND_URL=http://localhost:3000         # 前端地址
```

---

## 十一、开发阶段划分

### 阶段 1：项目搭建 + 基础功能（第 1 周）

- [ ] pnpm workspace + monorepo 初始化
- [ ] Next.js 前端 + shadcn/ui 紫色主题
- [ ] Hono 后端 + Mastra 基础配置
- [ ] Supabase 项目创建 + Drizzle schema + 迁移
- [ ] Supabase Auth 登录/注册（教师/学生角色）
- [ ] 出题 Agent + generate-exam Workflow
- [ ] AI 出题页面（选知识点 → 生成 → 审查 → 发布）
- [ ] 学生答题页面 + 客观题自动批改

### 阶段 2：批改 + 学情（第 2 周）

- [ ] 主观题批改中心（教师端）
- [ ] 成绩记录 + 学生端成绩查看
- [ ] 仪表盘页面（统计卡片 + 图表）
- [ ] 教案上传 + RAG 解析流程
- [ ] 质检 Agent 集成

### 阶段 3：增强能力（上线后）

- [ ] 薄弱点分析
- [ ] 个性化练习推荐
- [ ] 题库管理增强
- [ ] PDF/Word 导出试卷
- [ ] Streaming 出题体验优化
- [ ] 教案向量检索

---

## 十二、验证方案

### 本地开发验证

1. 启动后端：`cd apps/server && pnpm dev` → Hono 监听 :4000
2. 启动前端：`cd apps/web && pnpm dev` → Next.js 监听 :3000
3. 验证出题：前端选择"牛顿第二定律" + "选择题" → 点击生成 → 检查是否返回结构化题目
4. 验证批改：学生提交选择题 → 检查是否自动返回评分
5. 验证上传解析：上传一份题库或教案文件 → 检查文本提取与状态更新

### Agent 测试

```bash
# Mastra 自带开发工具
cd apps/server && pnpm mastra dev
# 打开 Mastra Studio，可直接测试每个 Agent 和 Workflow
```

---

## 十三、Cloudflare 部署方案

前后端分开部署，均部署到 Cloudflare，实现一键部署。

### 13.1 部署架构

```
┌─────────────────────────────────────────────────────────┐
│                    Cloudflare 全球边缘网络                  │
│                                                         │
│  ┌─────────────────┐       ┌──────────────────────┐     │
│  │  Cloudflare      │       │  Cloudflare           │     │
│  │  Workers         │  API  │  Workers              │     │
│  │                  │ ───── │                        │     │
│  │  Next.js 前端    │       │  Hono + Mastra 后端   │     │
│  │  @opennextjs/    │       │  @mastra/deployer-    │     │
│  │  cloudflare      │       │  cloudflare            │     │
│  └─────────────────┘       └──────────┬───────────┘     │
│                                       │                  │
│                            ┌──────────┴───────────┐     │
│                            │  Hyperdrive           │     │
│                            │  (连接池代理)          │     │
│                            └──────────┬───────────┘     │
└───────────────────────────────────────┼─────────────────┘
                                        │
                             ┌──────────┴───────────┐
                             │  Supabase             │
                             │  PostgreSQL + Auth    │
                             │  + pgvector(P1 可选)  │
                             └──────────────────────┘
```

### 13.2 各服务部署目标

| 服务 | 部署目标 | 工具 |
|------|---------|------|
| 前端 (Next.js) | Cloudflare Workers | `@opennextjs/cloudflare` |
| 后端 (Hono + Mastra) | Cloudflare Workers | `@mastra/deployer-cloudflare` + `wrangler` |
| 数据库连接 | Cloudflare Hyperdrive | 代理 Supabase PostgreSQL |
| 数据库 | Supabase (外部) | PostgreSQL + pgvector（P1 可选） |
| 文件存储 | Cloudflare R2 | 教案/图片（binding 直连，零延迟） |
| 认证 | Supabase Auth (外部) | JWT 验证 |

### 13.3 后端 Workers 配置

```jsonc
// apps/server/wrangler.jsonc
{
  "name": "physics-ai-tutor-api",
  "main": "dist/index.js",
  "compatibility_date": "2025-04-01",
  "compatibility_flags": ["nodejs_compat"],
  "observability": {
    "enabled": true
  },
  "hyperdrive": [
    {
      "binding": "HYPERDRIVE",
      "id": "<hyperdrive-config-id>"
    }
  ],
  "r2_buckets": [
    { "binding": "LESSON_PLANS", "bucket_name": "lesson-plans" },
    { "binding": "QUESTION_BANKS", "bucket_name": "question-banks" },
    { "binding": "STUDENT_UPLOADS", "bucket_name": "student-uploads" },
    { "binding": "EXPORTS", "bucket_name": "exports" },
    { "binding": "AVATARS", "bucket_name": "avatars" }
  ],
  "vars": {
    "FRONTEND_URL": "https://physics-ai-tutor.pages.dev"
  }
  // 敏感变量通过 wrangler secret 设置，不写在配置文件中
  // wrangler secret put ZHIPU_API_KEY
  // wrangler secret put DASHSCOPE_API_KEY
  // wrangler secret put SUPABASE_URL
  // wrangler secret put SUPABASE_ANON_KEY
  // wrangler secret put R2_ACCESS_KEY_ID
  // wrangler secret put R2_SECRET_ACCESS_KEY
}
```

#### 后端数据库连接（通过 Hyperdrive）

```typescript
// apps/server/src/db/client.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// 本地开发：直接连 Supabase
// 生产环境：通过 Hyperdrive 连接池
export function createDb(env?: { HYPERDRIVE?: { connectionString: string } }) {
  const connectionString = env?.HYPERDRIVE?.connectionString
    || process.env.SUPABASE_DATABASE_URL!;

  const client = postgres(connectionString, {
    prepare: false, // Hyperdrive 事务模式不支持 prepared statements
  });

  return drizzle(client, { schema });
}
```

#### 后端入口适配 Workers

```typescript
// apps/server/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createDb } from './db/client';

type Bindings = {
  HYPERDRIVE: { connectionString: string };
  ZHIPU_API_KEY: string;
  DASHSCOPE_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  FRONTEND_URL: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// 每个请求中初始化 DB（Workers 不能在全局作用域访问 bindings）
app.use('*', async (c, next) => {
  const db = createDb(c.env);
  c.set('db', db);
  await next();
});

app.use('*', cors({ origin: (origin, c) => c.env.FRONTEND_URL }));

// ... 路由注册

export default app;
```

### 13.4 前端 Workers 配置

```jsonc
// apps/web/wrangler.jsonc
{
  "name": "physics-ai-tutor-web",
  "compatibility_date": "2025-04-01",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  },
  "vars": {
    "NEXT_PUBLIC_API_URL": "https://physics-ai-tutor-api.<account>.workers.dev"
  }
}
```

#### open-next 配置

```typescript
// apps/web/open-next.config.ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({});
```

#### Next.js 配置

```typescript
// apps/web/next.config.ts
const nextConfig = {
  // 关闭 Image Optimization（Workers 不支持）
  images: {
    unoptimized: true,
  },
};
export default nextConfig;
```

### 13.5 Hyperdrive 配置

```bash
# 创建 Hyperdrive 连接到 Supabase PostgreSQL
# 使用 Supabase 的 Direct 连接串（非 Pooled）
wrangler hyperdrive create physics-ai-tutor-db \
  --connection-string="postgresql://postgres.xxx:password@db.xxx.supabase.co:5432/postgres"

# 输出的 id 填入 wrangler.jsonc 的 hyperdrive.id
```

### 13.6 一键部署脚本

```bash
#!/bin/bash
# scripts/deploy.sh — 一键部署前后端到 Cloudflare

set -e

echo "🚀 Physics AI Tutor - Cloudflare 部署"
echo "======================================"

# 1. 安装依赖
echo "📦 安装依赖..."
pnpm install

# 2. 构建共享包
echo "📦 构建 shared 包..."
pnpm --filter @physics-ai-tutor/shared build

# 3. 部署后端
echo "🔧 部署后端 (Cloudflare Workers)..."
pnpm --filter @physics-ai-tutor/server deploy

# 4. 部署前端
echo "🎨 部署前端 (Cloudflare Workers)..."
pnpm --filter @physics-ai-tutor/web deploy

echo ""
echo "✅ 部署完成！"
echo "  前端: https://physics-ai-tutor-web.<account>.workers.dev"
echo "  后端: https://physics-ai-tutor-api.<account>.workers.dev"
```

#### 各 package.json 中的 deploy 脚本

```jsonc
// apps/server/package.json
{
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "deploy:secrets": "wrangler secret put ZHIPU_API_KEY && wrangler secret put DASHSCOPE_API_KEY && wrangler secret put SUPABASE_URL && wrangler secret put SUPABASE_ANON_KEY && wrangler secret put R2_ACCESS_KEY_ID && wrangler secret put R2_SECRET_ACCESS_KEY"
  }
}

// apps/web/package.json
{
  "scripts": {
    "dev": "next dev",
    "build": "npx @opennextjs/cloudflare build",
    "preview": "wrangler dev",
    "deploy": "npx @opennextjs/cloudflare build && wrangler deploy"
  }
}
```

### 13.7 环境变量管理

| 变量 | 存放位置 | 说明 |
|------|---------|------|
| `ZHIPU_API_KEY` | `wrangler secret` | 智谱 API Key |
| `DASHSCOPE_API_KEY` | `wrangler secret` | 阿里百炼 API Key |
| `SUPABASE_URL` | `wrangler secret` | Supabase URL |
| `SUPABASE_ANON_KEY` | `wrangler secret` | Supabase Key |
| `R2_ACCESS_KEY_ID` | `wrangler secret` | R2 API Key（presigned URL 用） |
| `R2_SECRET_ACCESS_KEY` | `wrangler secret` | R2 API Secret |
| `R2_ACCOUNT_ID` | `wrangler secret` | Cloudflare 账号 ID |
| `FRONTEND_URL` | `wrangler.jsonc vars` | 前端域名（CORS） |
| `NEXT_PUBLIC_API_URL` | `wrangler.jsonc vars` | 后端 API 地址 |

敏感变量一律用 `wrangler secret put` 设置，不进代码仓库。

### 13.8 自定义域名（可选）

```bash
# 绑定自定义域名
# 前端
wrangler domains add physics-ai-tutor-web app.physics-tutor.com

# 后端
wrangler domains add physics-ai-tutor-api api.physics-tutor.com
```

部署后访问：
- 前端：`https://app.physics-tutor.com`
- 后端 API：`https://api.physics-tutor.com`

### 13.9 注意事项与限制

| 限制 | 影响 | 应对方案 |
|------|------|---------|
| Workers 无文件系统 | 不能用本地文件存储 | 文件存 Cloudflare R2（binding 直连） |
| Workers 无直连 TCP | 不能直连 PostgreSQL | 通过 Hyperdrive 代理 |
| Hyperdrive 事务模式 | 不支持 prepared statements | Drizzle/postgres.js 设置 `prepare: false` |
| Workers 全局作用域限制 | bindings 不能在模块初始化时访问 | 在请求处理函数中初始化 DB/Mastra |
| Next.js Image Optimization | Workers 不支持 | 设置 `images: { unoptimized: true }` |
| Workers CPU 时间限制 | 付费版 30s / 免费版 10ms | AI 出题用 streaming，避免超时 |
| Workers 内存限制 128MB | 大文件解析受限 | 大文件上传直传 Supabase Storage |

### 13.10 CI/CD（GitHub Actions）

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare

on:
  push:
    branches: [main]

jobs:
  deploy-server:
    runs-on: ubuntu-latest
    name: Deploy Backend
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm --filter @physics-ai-tutor/shared build
      - run: pnpm --filter @physics-ai-tutor/server deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

  deploy-web:
    runs-on: ubuntu-latest
    name: Deploy Frontend
    needs: deploy-server
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm --filter @physics-ai-tutor/shared build
      - run: pnpm --filter @physics-ai-tutor/web deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

GitHub 仓库需设置的 Secrets：
- `CLOUDFLARE_API_TOKEN` — Cloudflare API Token（需要 Workers 编辑权限）
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare 账号 ID
