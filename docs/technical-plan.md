# 高中物理AI教学助手 - 技术方案

## 一、项目背景

为高中物理教师打造的AI教学助手，核心功能：智能出题、自动批改、学情分析、个性化推荐。本技术方案基于PRD文档（`docs/PRD.md`），覆盖从项目架构到部署的完整技术设计。

---

## 二、技术栈

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| 前端 | Next.js 15 + Tailwind CSS + shadcn/ui | App Router, RSC |
| UI 补充 | KaTeX（公式渲染）+ Recharts（图表） | 物理公式 + 学情曲线 |
| 后端 | Hono + Mastra + Drizzle ORM | 轻量 TS 后端 + AI Agent |
| 数据库 | Supabase（PostgreSQL + Auth + Storage + pgvector） | 一站式 BaaS |
| AI 对话模型 | 智谱 GLM-4-Flash（开发期，永久免费） | Mastra 内置 zhipuai provider |
| Embedding 模型 | 阿里百炼 text-embedding-v3（免费额度） | OpenAI 兼容接口 |
| 向量搜索 | pgvector（Supabase 内置） | 教案/题库语义检索 |
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
│   │   │   │   ├── questions/      # 题库管理
│   │   │   │   ├── students/       # 学生管理
│   │   │   │   ├── analytics/      # 学情分析
│   │   │   │   └── settings/       # 设置
│   │   │   ├── student/            # 学生端
│   │   │   │   ├── assignments/    # 作业列表
│   │   │   │   │   └── [id]/page.tsx  # 答题页
│   │   │   │   ├── results/        # 成绩查看
│   │   │   │   └── practice/       # 个性化练习
│   │   │   └── api/                # Next.js BFF 层（代理后端）
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn/ui 组件
│   │   │   ├── layout/             # Sidebar, Header, etc.
│   │   │   ├── exam/               # 出题相关组件
│   │   │   ├── question/           # 题目渲染/编辑组件
│   │   │   ├── grading/            # 批改相关组件
│   │   │   └── analytics/          # 图表/学情组件
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
│       │   │   ├── analytics.ts    # 学情数据
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
│       │   │   │   ├── lesson-parser.ts        # 教案解析 Agent
│       │   │   │   └── analytics-agent.ts      # 学情分析 Agent
│       │   │   ├── tools/
│       │   │   │   ├── search-question-bank.ts # 搜索已有题库
│       │   │   │   ├── validate-question.ts    # 校验题目质量
│       │   │   │   ├── query-scores.ts         # 查询成绩数据
│       │   │   │   ├── save-question.ts        # 存储题目到DB
│       │   │   │   └── get-knowledge-points.ts # 获取知识点列表
│       │   │   └── workflows/
│       │   │       ├── generate-exam.ts        # 出题工作流
│       │   │       ├── parse-lesson-plan.ts    # 教案解析工作流
│       │   │       └── analyze-class.ts        # 学情分析工作流
│       │   ├── db/
│       │   │   ├── schema.ts       # Drizzle schema 定义
│       │   │   ├── client.ts       # 数据库连接
│       │   │   └── migrations/     # 数据库迁移文件
│       │   └── services/
│       │       ├── grading.ts      # 客观题批改逻辑（规则匹配）
│       │       ├── embedding.ts    # 文档向量化服务
│       │       └── export.ts       # PDF/Word 导出
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
│       │   └── analytics.ts        # 学情类型
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

### 核心表

```typescript
// apps/server/src/db/schema.ts

// 用户表（Supabase Auth 管理，这里存扩展信息）
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),                          // = Supabase auth.users.id
  role: text('role').notNull(),                          // 'teacher' | 'student'
  name: text('name').notNull(),
  school: text('school'),
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

// 班级-学生关联
export const classStudents = pgTable('class_students', {
  classId: uuid('class_id').references(() => classes.id),
  studentId: uuid('student_id').references(() => profiles.id),
}, (t) => ({ pk: primaryKey(t.classId, t.studentId) }));

// 试卷表
export const exams = pgTable('exams', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  status: text('status').notNull().default('draft'),     // draft | published | closed
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
  type: text('type').notNull(),                          // choice | fill | calculation | short_answer | comprehensive
  content: text('content').notNull(),                    // 支持 LaTeX
  options: jsonb('options'),                              // 选择题选项 ["A. ...", "B. ..."]
  answer: text('answer').notNull(),                      // 标准答案
  explanation: text('explanation'),                       // 解析
  knowledgePoints: jsonb('knowledge_points'),
  difficulty: integer('difficulty').notNull(),            // 1-5
  score: integer('score').notNull(),                     // 该题分值
  orderIndex: integer('order_index').notNull(),
  source: text('source').default('ai'),                  // ai | manual | imported
  embedding: vector('embedding', { dimensions: 1024 }),  // 阿里百炼 text-embedding-v3 = 1024 维
  createdAt: timestamp('created_at').defaultNow(),
});

// 学生答题提交表
export const submissions = pgTable('submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  examId: uuid('exam_id').references(() => exams.id),
  studentId: uuid('student_id').references(() => profiles.id),
  status: text('status').notNull().default('in_progress'), // in_progress | submitted | graded
  totalScore: integer('total_score'),
  submittedAt: timestamp('submitted_at'),
  gradedAt: timestamp('graded_at'),
});

// 单题作答记录
export const answers = pgTable('answers', {
  id: uuid('id').primaryKey().defaultRandom(),
  submissionId: uuid('submission_id').references(() => submissions.id),
  questionId: uuid('question_id').references(() => questions.id),
  studentAnswer: text('student_answer'),                  // 学生答案
  isCorrect: boolean('is_correct'),                      // 客观题自动判断
  score: integer('score'),                                // 得分
  feedback: text('feedback'),                             // 错因解析（客观题自动）
  teacherComment: text('teacher_comment'),                // 教师批注（主观题）
  gradedBy: text('graded_by'),                           // 'auto' | 'teacher'
});

// 教案文档表
export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  teacherId: uuid('teacher_id').references(() => profiles.id),
  title: text('title').notNull(),
  fileUrl: text('file_url').notNull(),                   // Supabase Storage URL
  fileType: text('file_type'),                           // pdf | docx | pptx
  parsedContent: text('parsed_content'),                 // 解析后的纯文本
  knowledgePoints: jsonb('knowledge_points'),             // AI 提取的知识点
  createdAt: timestamp('created_at').defaultNow(),
});

// 文档向量块表（RAG 用）
export const documentChunks = pgTable('document_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').references(() => documents.id),
  content: text('content').notNull(),                    // 文本块
  embedding: vector('embedding', { dimensions: 1024 }),  // 向量
  metadata: jsonb('metadata'),                           // { chapter, topic, ... }
});
```

---

## 五、AI Agent 架构

### 5.1 Mastra 实例注册

```typescript
// apps/server/src/mastra/index.ts
import { Mastra } from '@mastra/core';
import { PgVector } from '@mastra/pg';
import { questionGeneratorAgent } from './agents/question-generator';
import { qualityCheckerAgent } from './agents/quality-checker';
import { lessonParserAgent } from './agents/lesson-parser';
import { analyticsAgent } from './agents/analytics-agent';
import { generateExamWorkflow } from './workflows/generate-exam';
import { parseLessonPlanWorkflow } from './workflows/parse-lesson-plan';
import { analyzeClassWorkflow } from './workflows/analyze-class';

export const vectorStore = new PgVector({
  connectionString: process.env.SUPABASE_DATABASE_URL!,
});

export const mastra = new Mastra({
  agents: {
    questionGenerator: questionGeneratorAgent,
    qualityChecker: qualityCheckerAgent,
    lessonParser: lessonParserAgent,
    analytics: analyticsAgent,
  },
  workflows: {
    generateExam: generateExamWorkflow,
    parseLessonPlan: parseLessonPlanWorkflow,
    analyzeClass: analyzeClassWorkflow,
  },
});
```

### 5.2 Agent 定义

#### 出题 Agent

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
4. 每道题必须附带详细解析
5. 计算题需要给出完整的解题步骤
6. 确保物理量单位正确（SI单位制）
7. 难度1-5对应：基础概念→简单应用→综合运用→拓展提升→竞赛难度
8. 生成前先搜索题库，避免与已有题目高度重复

输出格式为严格 JSON。`,
  tools: {
    searchQuestionBank,
    saveQuestion,
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

#### 教案解析 Agent

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

#### 学情分析 Agent

```typescript
// apps/server/src/mastra/agents/analytics-agent.ts
export const analyticsAgent = new Agent({
  name: 'analytics',
  model: 'zhipuai/glm-4-flash',
  instructions: `你是学情分析专家，根据学生答题数据生成分析报告。

分析维度：
1. 个人/班级薄弱知识点排序
2. 典型错误模式识别
3. 知识点掌握趋势
4. 个性化练习推荐建议
5. 教学改进建议（面向教师）

基于数据说话，给出具体可操作的建议。`,
  tools: {
    queryScores,
  },
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
    // 1. 将知识点文本向量化
    // 2. 在 pgvector 中搜索相似题目
    // 3. 返回结果
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
    searchContext: z.string(),
  }),
  execute: async ({ context }) => {
    // 构建出题 prompt + RAG 检索上下文
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
    // 逐题检查，标记问题
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
import { analyticsRoutes } from './routes/analytics';
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
app.route('/api/analytics', analyticsRoutes);
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
| 教师 | `teacher` | 创建班级、出题、批改、查看学情 |
| 学生 | `student` | 答题、查看成绩、个性化练习 |
| 管理员 | `admin` | 学校级管理，管理教师和班级（二期） |

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
  → 创建 profiles（role: 'student'）+ class_students 关联
  → 进入学生端
```

#### 数据库 Schema 补充

```typescript
// profiles 表增加字段
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),                          // = Supabase auth.users.id
  role: text('role').notNull(),                          // 'teacher' | 'student' | 'admin'
  name: text('name').notNull(),
  avatar: text('avatar'),                                // 头像 URL
  phone: text('phone'),                                  // 手机号（可选登录方式）
  school: text('school'),
  title: text('title'),                                  // 教师职称（如"物理教研组长"）
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
type Role = 'teacher' | 'student' | 'admin';

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
    if (profile.role === 'admin') return await next(); // admin 跳过
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
| `POST /api/grading/*` | ✅ | ❌ | 批改操作 |
| `GET /api/analytics/class` | ✅ 本班的 | ❌ | 班级学情 |
| `GET /api/analytics/student` | ✅ 本班学生 | ✅ 仅自己 | 个人学情 |
| `POST /api/upload` | ✅ | ❌ | 上传教案 |
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
    AND class_id IN (
      SELECT class_id FROM class_students WHERE student_id = auth.uid()
    )
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
| 图表 | 紫色系柱状图/折线图，简洁无多余装饰 |

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
| 仪表盘 | `/` | 欢迎卡、今日数据、AI快速操作、最近作业 |
| AI 出题 | `/exams/new` | 选知识点 → 选题型/难度 → 生成 → 审查 |
| 试卷审查 | `/exams/[id]` | 逐题预览、编辑、重新生成、发布 |
| 批改中心 | `/exams/[id]/grading` | 按题目/按学生视图、打分、批注 |
| 学情分析 | `/analytics` | 班级/个人薄弱点、趋势图、建议 |
| 题库管理 | `/questions` | 搜索、筛选、导入、分类 |
| 学生答题 | `/student/assignments/[id]` | 答题界面、LaTeX输入、提交 |
| 学生成绩 | `/student/results` | 历史成绩、错题本、进步曲线 |

### 7.3 实时交互

出题时使用 **Streaming**，实时显示生成进度：

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

### 8.1 出题流程

```
教师选择知识点/题型/难度
  → API: POST /api/exams (创建试卷记录)
  → Mastra Workflow: generate-exam
    → Step 1: RAG 检索教案相关内容
    → Step 2: 出题 Agent 生成题目（Streaming）
    → Step 3: 质检 Agent 逐题检查
    → Step 4: 存入 DB（draft 状态）
  → 前端进入审查页面
  → 教师编辑/确认
  → API: PATCH /api/exams/:id { status: 'published' }
  → 通知学生
```

### 8.2 答题批改流程

```
学生打开试卷 → 答题 → 提交
  → API: POST /api/submissions
  → 服务端自动批改客观题（规则匹配）
  → 客观题即时返回结果
  → 主观题标记 "待批改"

教师进入批改中心
  → 逐题打分、添加批注
  → API: POST /api/grading/publish
  → 学生收到通知，查看成绩
```

### 8.3 RAG 教案解析流程

```
教师上传教案文件
  → Supabase Storage 存储文件
  → API: POST /api/upload
  → 文档解析（PDF/Word → 纯文本）
  → Mastra Workflow: parse-lesson-plan
    → Step 1: 文本分块（chunk）
    → Step 2: 阿里百炼 Embedding → 向量化
    → Step 3: 存入 pgvector (document_chunks 表)
    → Step 4: 教案解析 Agent 提取知识点
  → 返回结构化知识点列表
```

---

## 九、Supabase 使用方案

| 功能 | Supabase 服务 | 用途 |
|------|-------------|------|
| 用户认证 | Auth | 教师/学生注册登录，JWT token |
| 文件存储 | Storage | 教案PDF/Word、学生答题图片 |
| 数据库 | PostgreSQL | 所有业务数据（通过 Drizzle ORM 操作） |
| 向量搜索 | pgvector 扩展 | 教案/题库语义检索 |
| 实时通知 | Realtime | 成绩发布通知学生（可选） |
| RLS | Row Level Security | 数据权限隔离（教师只看自己的班级） |

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

### 阶段 3：分析 + 优化（第 3 周）

- [ ] 薄弱点分析（学情分析 Agent）
- [ ] 个性化练习推荐
- [ ] 题库管理 + 导入
- [ ] PDF/Word 导出试卷
- [ ] Streaming 出题体验优化
- [ ] Memory 集成（学生学习记忆）

---

## 十二、验证方案

### 本地开发验证

1. 启动后端：`cd apps/server && pnpm dev` → Hono 监听 :4000
2. 启动前端：`cd apps/web && pnpm dev` → Next.js 监听 :3000
3. 验证出题：前端选择"牛顿第二定律" + "选择题" → 点击生成 → 检查是否返回结构化题目
4. 验证批改：学生提交选择题 → 检查是否自动返回评分
5. 验证 RAG：上传一份教案 PDF → 检查知识点提取结果 → 基于教案出题

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
                             │  + Storage + pgvector │
                             └──────────────────────┘
```

### 13.2 各服务部署目标

| 服务 | 部署目标 | 工具 |
|------|---------|------|
| 前端 (Next.js) | Cloudflare Workers | `@opennextjs/cloudflare` |
| 后端 (Hono + Mastra) | Cloudflare Workers | `@mastra/deployer-cloudflare` + `wrangler` |
| 数据库连接 | Cloudflare Hyperdrive | 代理 Supabase PostgreSQL |
| 数据库 | Supabase (外部) | PostgreSQL + pgvector |
| 文件存储 | Supabase Storage (外部) | 教案/图片 |
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
  "vars": {
    "FRONTEND_URL": "https://physics-ai-tutor.pages.dev"
  },
  // 敏感变量通过 wrangler secret 设置，不写在配置文件中
  // wrangler secret put ZHIPU_API_KEY
  // wrangler secret put DASHSCOPE_API_KEY
  // wrangler secret put SUPABASE_URL
  // wrangler secret put SUPABASE_ANON_KEY
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
    "deploy:secrets": "wrangler secret put ZHIPU_API_KEY && wrangler secret put DASHSCOPE_API_KEY && wrangler secret put SUPABASE_URL && wrangler secret put SUPABASE_ANON_KEY"
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
| Workers 无文件系统 | 不能用本地文件存储 | 文件存 Supabase Storage |
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
