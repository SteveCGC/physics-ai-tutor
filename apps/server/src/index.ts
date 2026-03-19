import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

export type Env = {
  // Supabase
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_DATABASE_URL: string;
  // AI
  ZHIPU_API_KEY: string;
  DASHSCOPE_API_KEY: string;
  // Cloudflare R2
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_ACCOUNT_ID: string;
  R2_EXAM_FILES: R2Bucket;
  R2_STUDENT_SUBMISSIONS: R2Bucket;
  R2_TEACHER_DOCUMENTS: R2Bucket;
  R2_GENERATED_REPORTS: R2Bucket;
  R2_AVATARS: R2Bucket;
  // Hyperdrive（可选，生产环境加速 PostgreSQL）
  HYPERDRIVE?: Hyperdrive;
  // 前端地址
  FRONTEND_URL: string;
};

const app = new Hono<{ Bindings: Env }>();

// 中间件
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const frontendUrl = c.env.FRONTEND_URL || "http://localhost:3000";
      return origin === frontendUrl ? origin : frontendUrl;
    },
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// 健康检查
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API 路由（后续任务实现）
app.get("/api/v1", (c) => {
  return c.json({
    name: "Physics AI Tutor API",
    version: "1.0.0",
    description: "高中物理AI教学助手 API",
  });
});

// 404 处理
app.notFound((c) => {
  return c.json({ error: "Not Found", code: "NOT_FOUND" }, 404);
});

// 错误处理
app.onError((err, c) => {
  console.error("[Server Error]", err);
  return c.json({ error: "Internal Server Error", code: "INTERNAL_ERROR" }, 500);
});

export default app;
