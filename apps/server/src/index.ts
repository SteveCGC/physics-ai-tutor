import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { createDb } from "./db/client";
import { authMiddleware } from "./middleware/auth";
import { createMastra } from "./mastra";
import classesRoute from "./routes/classes";
import examsRoute from "./routes/exams";
import gradingRoute from "./routes/grading";
import meRoute from "./routes/me";
import questionsRoute from "./routes/questions";
import submissionsRoute from "./routes/submissions";
import teacherRoute from "./routes/teacher";
import uploadRoute from "./routes/upload";
import type { AppContext, Bindings } from "./types";

function jsonError(message: string, status: number, code?: string) {
  return Response.json(code ? { error: message, code } : { error: message }, { status });
}

async function createMastraApp(env: Bindings) {
  const mastraApp = new Hono<AppContext>();

  try {
    const { MastraServer } = await import("@mastra/hono");
    const mastra = createMastra(env);
    const mastraServer = new MastraServer({
      mastra,
      app: mastraApp,
    });

    await mastraServer.init();
  } catch (error) {
    console.error("[Mastra Init Error]", error);
    mastraApp.all("*", () =>
      jsonError("Mastra server unavailable", 503, "MASTRA_UNAVAILABLE")
    );
  }

  return mastraApp;
}

async function createApp(env: Bindings) {
  const app = new Hono<AppContext>();

  app.use("*", logger());
  app.use("*", async (c, next) => {
    const db = createDb(c.env);
    c.set("db", db);
    await next();
  });
  app.use(
    "*",
    cors({
      origin: (origin, c) => {
        const frontendUrl = c.env.FRONTEND_URL;
        return origin === frontendUrl ? origin : frontendUrl;
      },
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    })
  );
  app.use("/api/*", authMiddleware);
  app.use("/mastra/*", authMiddleware);

  app.get("/health", (c) => {
    return c.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/v1", (c) => {
    return c.json({
      name: "Physics AI Tutor API",
      version: "1.0.0",
      description: "高中物理AI教学助手 API",
    });
  });

  app.route("/api/classes", classesRoute);
  app.route("/api/exams", examsRoute);
  app.route("/api/questions", questionsRoute);
  app.route("/api", meRoute);
  app.route("/api", submissionsRoute);
  app.route("/api", gradingRoute);
  app.route("/api", teacherRoute);
  app.route("/api", uploadRoute);
  app.route("/mastra", await createMastraApp(env));

  app.notFound((c) => {
    return jsonError("Not Found", 404, "NOT_FOUND");
  });

  app.onError((err) => {
    console.error("[Server Error]", err);
    return jsonError("Internal Server Error", 500, "INTERNAL_ERROR");
  });

  return app;
}

export default {
  async fetch(request: Request, env: Bindings, executionCtx: ExecutionContext) {
    const app = await createApp(env);
    return app.fetch(request, env, executionCtx);
  },
};
