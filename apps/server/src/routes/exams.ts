import {
  CreateExamSchema,
  CreateManualQuestionSchema,
  ExamIdParamSchema,
  ListExamsQuerySchema,
  UpdateExamSchema,
} from "@physics-ai-tutor/shared";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { Hono, type Context } from "hono";
import { z } from "zod";

import { classes, exams, questions, submissions } from "../db/schema";
import { runGenerateExamWorkflow } from "../mastra/workflows";
import { requireRole } from "../middleware/role";
import type { AppContext } from "../types";

const examsRoute = new Hono<AppContext>();
type RouteContext = Context<AppContext>;

function jsonError(message: string, status: number, code?: string) {
  return Response.json(code ? { error: message, code } : { error: message }, { status });
}

function getFirstZodError(error: z.ZodError) {
  return error.issues[0]?.message ?? "请求参数错误";
}

const GenerateExamBodySchema = z.object({
  knowledgePoints: z.array(z.string().trim().min(1)).min(1, "至少提供一个知识点"),
  questionTypes: z
    .array(z.enum(["choice", "fill", "calculation", "short_answer"]))
    .min(1, "至少提供一种题型"),
  difficulty: z.number().int().min(1).max(5).default(3),
  count: z.number().int().min(1).max(30).default(10),
  totalQuestions: z.number().int().min(1).max(30).optional(),
});

async function getExamById(c: RouteContext, id: string) {
  const db = c.get("db");
  return db.query.exams.findFirst({
    where: eq(exams.id, id),
  });
}

async function getOwnedClass(c: RouteContext, classId: string) {
  const db = c.get("db");
  const profile = c.get("profile");

  return db.query.classes.findFirst({
    where: and(eq(classes.id, classId), eq(classes.teacherId, profile.id)),
  });
}

async function calculateExamTotalScore(
  db: Pick<AppContext["Variables"]["db"], "select">,
  examId: string
) {
  const [result] = await db
    .select({
      totalScore: sql<number>`coalesce(sum(${questions.score}), 0)`,
    })
    .from(questions)
    .where(eq(questions.examId, examId));

  return Number(result?.totalScore ?? 0);
}

async function getExamQuestions(
  db: Pick<AppContext["Variables"]["db"], "select">,
  examId: string
) {
  return db
    .select()
    .from(questions)
    .where(eq(questions.examId, examId))
    .orderBy(asc(questions.orderIndex));
}

async function enrichTeacherExamList(
  db: Pick<AppContext["Variables"]["db"], "select">,
  items: Array<typeof exams.$inferSelect>
) {
  if (items.length === 0) {
    return [];
  }

  const examIds = items.map((item) => item.id);
  const [questionCounts, pendingGradeCounts] = await Promise.all([
    db
      .select({
        examId: questions.examId,
        count: count(questions.id),
      })
      .from(questions)
      .where(inArray(questions.examId, examIds))
      .groupBy(questions.examId),
    db
      .select({
        examId: submissions.examId,
        count: count(submissions.id),
      })
      .from(submissions)
      .where(
        and(
          inArray(submissions.examId, examIds),
          eq(submissions.status, "pending_review")
        )
      )
      .groupBy(submissions.examId),
  ]);

  const questionCountMap = new Map(questionCounts.map((item) => [item.examId, Number(item.count)]));
  const pendingGradeCountMap = new Map(
    pendingGradeCounts.map((item) => [item.examId, Number(item.count)])
  );

  return items.map((item) => ({
    ...item,
    questionCount: questionCountMap.get(item.id) ?? 0,
    pendingGradeCount: pendingGradeCountMap.get(item.id) ?? 0,
  }));
}

async function enrichStudentExamList(
  db: Pick<AppContext["Variables"]["db"], "select">,
  items: Array<typeof exams.$inferSelect>,
  studentId: string
) {
  if (items.length === 0) {
    return [];
  }

  const examIds = items.map((item) => item.id);
  const studentSubmissions = await db
    .select({
      examId: submissions.examId,
      status: submissions.status,
    })
    .from(submissions)
    .where(and(eq(submissions.studentId, studentId), inArray(submissions.examId, examIds)));

  const submissionMap = new Map(studentSubmissions.map((item) => [item.examId, item.status]));

  return items.map((item) => ({
    ...item,
    submissionStatus: submissionMap.get(item.id) ?? null,
  }));
}

examsRoute.use("*", requireRole("teacher", "student"));

examsRoute.post("/", requireRole("teacher"), async (c) => {
  const body = await c.req.json().catch(() => null);
  const result = CreateExamSchema.safeParse(body);

  if (!result.success) {
    return jsonError(getFirstZodError(result.error), 400, "BAD_REQUEST");
  }

  if (result.data.classId) {
    const ownedClass = await getOwnedClass(c, result.data.classId);
    if (!ownedClass) {
      return jsonError("班级不存在或无权限操作", 403, "FORBIDDEN");
    }
  }

  const db = c.get("db");
  const profile = c.get("profile");
  const [createdExam] = await db
    .insert(exams)
    .values({
      title: result.data.title,
      classId: result.data.classId ?? null,
      knowledgePoints: result.data.knowledgePoints,
      deadline: result.data.deadline ? new Date(result.data.deadline) : null,
      teacherId: profile.id,
      status: "draft",
      totalScore: 0,
    })
    .returning();

  return c.json(createdExam, 201);
});

examsRoute.get("/", async (c) => {
  const query = ListExamsQuerySchema.safeParse(c.req.query());
  if (!query.success) {
    return jsonError(getFirstZodError(query.error), 400, "BAD_REQUEST");
  }

  const db = c.get("db");
  const profile = c.get("profile");
  const { page, pageSize, status } = query.data;
  const offset = (page - 1) * pageSize;

  if (profile.role === "teacher") {
    const filters = [eq(exams.teacherId, profile.id)];
    if (status) {
      filters.push(eq(exams.status, status));
    }

    const [totalResult, items] = await Promise.all([
      db
        .select({ count: count(exams.id) })
        .from(exams)
        .where(and(...filters)),
      db
        .select()
        .from(exams)
        .where(and(...filters))
        .orderBy(desc(exams.createdAt))
        .limit(pageSize)
        .offset(offset),
    ]);

    const enrichedItems = await enrichTeacherExamList(db, items);

    return c.json({
      total: Number(totalResult[0]?.count ?? 0),
      page,
      pageSize,
      items: enrichedItems,
    });
  }

  if (!profile.classId) {
    return c.json({
      total: 0,
      page,
      pageSize,
      items: [],
    });
  }

  const filters = [eq(exams.classId, profile.classId), eq(exams.status, "published" as const)];
  const [totalResult, items] = await Promise.all([
    db
      .select({ count: count(exams.id) })
      .from(exams)
      .where(and(...filters)),
    db
      .select()
      .from(exams)
      .where(and(...filters))
      .orderBy(asc(exams.deadline), desc(exams.publishedAt), desc(exams.createdAt))
      .limit(pageSize)
      .offset(offset),
  ]);

  const enrichedItems = await enrichStudentExamList(db, items, profile.id);

  return c.json({
    total: Number(totalResult[0]?.count ?? 0),
    page,
    pageSize,
    items: enrichedItems,
  });
});

examsRoute.post("/:id/questions", requireRole("teacher"), async (c) => {
  const params = ExamIdParamSchema.safeParse(c.req.param());
  if (!params.success) {
    return jsonError(getFirstZodError(params.error), 400, "BAD_REQUEST");
  }

  const body = await c.req.json().catch(() => null);
  const result = CreateManualQuestionSchema.safeParse(body);
  if (!result.success) {
    return jsonError(getFirstZodError(result.error), 400, "BAD_REQUEST");
  }

  const exam = await getExamById(c, params.data.id);
  if (!exam) {
    return jsonError("试卷不存在", 404, "EXAM_NOT_FOUND");
  }

  const profile = c.get("profile");
  if (exam.teacherId !== profile.id) {
    return jsonError("无权操作该试卷", 403, "FORBIDDEN");
  }

  if (exam.status !== "draft") {
    return jsonError("只有草稿试卷允许添加题目", 400, "EXAM_NOT_EDITABLE");
  }

  const db = c.get("db");
  const [orderResult] = await db
    .select({
      maxOrder: sql<number>`coalesce(max(${questions.orderIndex}), 0)`,
    })
    .from(questions)
    .where(eq(questions.examId, exam.id));

  const [createdQuestion] = await db
    .insert(questions)
    .values({
      examId: exam.id,
      type: result.data.type,
      content: result.data.content,
      options: result.data.options,
      answer: result.data.answer,
      acceptedAnswers: result.data.acceptedAnswers,
      explanation: result.data.explanation ?? null,
      knowledgePoints: result.data.knowledgePoints,
      difficulty: result.data.difficulty,
      score: result.data.score,
      orderIndex: Number(orderResult?.maxOrder ?? 0) + 1,
      source: "manual",
    })
    .returning();

  const totalScore = await calculateExamTotalScore(db, exam.id);
  await db.update(exams).set({ totalScore }).where(eq(exams.id, exam.id));

  return c.json(createdQuestion, 201);
});

examsRoute.post("/:id/generate", requireRole("teacher"), async (c) => {
  const params = ExamIdParamSchema.safeParse(c.req.param());
  if (!params.success) {
    return jsonError(getFirstZodError(params.error), 400, "BAD_REQUEST");
  }

  const body = await c.req.json().catch(() => null);
  const normalizedBody =
    body && typeof body === "object" && body !== null
      ? {
          ...body,
          count:
            "count" in body && typeof body.count === "number"
              ? body.count
              : "totalQuestions" in body && typeof body.totalQuestions === "number"
                ? body.totalQuestions
                : undefined,
        }
      : body;

  const result = GenerateExamBodySchema.safeParse(normalizedBody);
  if (!result.success) {
    return jsonError(getFirstZodError(result.error), 400, "BAD_REQUEST");
  }

  const exam = await getExamById(c, params.data.id);
  if (!exam) {
    return jsonError("试卷不存在", 404, "EXAM_NOT_FOUND");
  }

  const profile = c.get("profile");
  if (exam.teacherId !== profile.id) {
    return jsonError("无权操作该试卷", 403, "FORBIDDEN");
  }

  if (exam.status !== "draft") {
    return jsonError("只有草稿试卷允许生成题目", 400, "EXAM_NOT_EDITABLE");
  }

  const db = c.get("db");
  const workflowInput = {
    examId: exam.id,
    knowledgePoints: result.data.knowledgePoints,
    questionTypes: result.data.questionTypes,
    difficulty: result.data.difficulty,
    count: result.data.count,
  };
  const acceptsSse = c.req.header("accept")?.includes("text/event-stream") ?? false;

  await db.delete(questions).where(eq(questions.examId, exam.id));

  const finalizeExamScore = async () => {
    const totalScore = await calculateExamTotalScore(db, exam.id);
    await db.update(exams).set({ totalScore }).where(eq(exams.id, exam.id));
    return totalScore;
  };

  if (!acceptsSse) {
    try {
      const workflowResult = await runGenerateExamWorkflow({
        env: c.env,
        input: workflowInput,
      });

      await finalizeExamScore();

      return c.json({
        examId: workflowResult.examId,
        questionCount: workflowResult.questionCount,
        questionIds: workflowResult.questionIds,
        questions: workflowResult.questions,
      });
    } catch (error) {
      console.error("[exam.generate]", error);
      return jsonError(
        error instanceof Error ? error.message : "生成失败",
        500,
        "EXAM_GENERATION_FAILED"
      );
    }
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const run = async () => {
        try {
          const workflowResult = await runGenerateExamWorkflow({
            env: c.env,
            input: workflowInput,
            onEvent(event) {
              if (event.event === "step") {
                send("step", event);
                return;
              }

              send("questions", event);
            },
          });

          await finalizeExamScore();

          send("done", {
            event: "done",
            examId: workflowResult.examId,
            questionCount: workflowResult.questionCount,
          });
          controller.close();
        } catch (error) {
          console.error("[exam.generate]", error);
          send("error", {
            event: "error",
            message: error instanceof Error ? error.message : "生成失败",
          });
          controller.close();
        }
      };

      void run();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
});

examsRoute.get("/:id", async (c) => {
  const params = ExamIdParamSchema.safeParse(c.req.param());
  if (!params.success) {
    return jsonError(getFirstZodError(params.error), 400, "BAD_REQUEST");
  }

  const exam = await getExamById(c, params.data.id);
  if (!exam) {
    return jsonError("试卷不存在", 404, "EXAM_NOT_FOUND");
  }

  const profile = c.get("profile");
  if (profile.role === "teacher") {
    if (exam.teacherId !== profile.id) {
      return jsonError("无权访问该试卷", 403, "FORBIDDEN");
    }
  } else {
    if (!profile.classId || profile.classId !== exam.classId) {
      return jsonError("无权访问该试卷", 403, "FORBIDDEN");
    }

    if (exam.status === "draft") {
      return jsonError("学生不可访问草稿试卷", 403, "FORBIDDEN");
    }
  }

  const db = c.get("db");
  const examQuestions = await getExamQuestions(db, exam.id);

  const items =
    profile.role === "teacher"
      ? examQuestions
      : examQuestions.map(({ answer, acceptedAnswers, explanation, ...question }) => question);

  return c.json({
    ...exam,
    questions: items,
  });
});

examsRoute.patch("/:id", requireRole("teacher"), async (c) => {
  const params = ExamIdParamSchema.safeParse(c.req.param());
  if (!params.success) {
    return jsonError(getFirstZodError(params.error), 400, "BAD_REQUEST");
  }

  const body = await c.req.json().catch(() => null);
  const result = UpdateExamSchema.safeParse(body);
  if (!result.success) {
    return jsonError(getFirstZodError(result.error), 400, "BAD_REQUEST");
  }

  const exam = await getExamById(c, params.data.id);
  if (!exam) {
    return jsonError("试卷不存在", 404, "EXAM_NOT_FOUND");
  }

  const profile = c.get("profile");
  if (exam.teacherId !== profile.id) {
    return jsonError("无权操作该试卷", 403, "FORBIDDEN");
  }

  if (exam.status === "archived") {
    return jsonError("已归档试卷不可修改", 400, "EXAM_ARCHIVED");
  }

  const nextState = result.data.status;
  if (nextState) {
    const validTransition =
      (exam.status === "draft" && nextState === "published") ||
      (exam.status === "published" && nextState === "archived") ||
      nextState === exam.status;

    if (!validTransition) {
      return jsonError("非法的试卷状态流转", 400, "INVALID_EXAM_STATUS_TRANSITION");
    }
  }

  const db = c.get("db");
  const updatePayload: {
    title?: string;
    classId?: string;
    deadline?: Date | null;
    status?: "draft" | "published" | "archived";
    totalScore?: number;
    publishedAt?: Date | null;
  } = {};

  if (result.data.title !== undefined) {
    updatePayload.title = result.data.title;
  }

  if (result.data.classId !== undefined) {
    const ownedClass = await getOwnedClass(c, result.data.classId);
    if (!ownedClass) {
      return jsonError("班级不存在或无权限操作", 403, "FORBIDDEN");
    }

    updatePayload.classId = result.data.classId;
  }

  if (result.data.deadline !== undefined) {
    updatePayload.deadline = result.data.deadline ? new Date(result.data.deadline) : null;
  }

  if (nextState === "published" && exam.status === "draft") {
    const examQuestions = await getExamQuestions(db, exam.id);
    if (examQuestions.length === 0) {
      return jsonError("发布前至少需要 1 道题", 400, "EXAM_EMPTY");
    }

    updatePayload.status = "published";
    updatePayload.totalScore = examQuestions.reduce((sum, item) => sum + item.score, 0);
    updatePayload.publishedAt = new Date();
  } else if (nextState === "archived" && exam.status === "published") {
    updatePayload.status = "archived";
  }

  const [updatedExam] = await db
    .update(exams)
    .set(updatePayload)
    .where(eq(exams.id, exam.id))
    .returning();

  return c.json(updatedExam);
});

examsRoute.delete("/:id", requireRole("teacher"), async (c) => {
  const params = ExamIdParamSchema.safeParse(c.req.param());
  if (!params.success) {
    return jsonError(getFirstZodError(params.error), 400, "BAD_REQUEST");
  }

  const exam = await getExamById(c, params.data.id);
  if (!exam) {
    return jsonError("试卷不存在", 404, "EXAM_NOT_FOUND");
  }

  const profile = c.get("profile");
  if (exam.teacherId !== profile.id) {
    return jsonError("无权操作该试卷", 403, "FORBIDDEN");
  }

  if (exam.status === "published") {
    return c.json({ error: "已发布的试卷不能删除，请归档" }, 400);
  }

  if (exam.status === "archived") {
    return jsonError("试卷已归档", 400, "EXAM_ARCHIVED");
  }

  const db = c.get("db");
  const [archivedExam] = await db
    .update(exams)
    .set({ status: "archived" })
    .where(eq(exams.id, exam.id))
    .returning();

  return c.json(archivedExam);
});

export default examsRoute;
