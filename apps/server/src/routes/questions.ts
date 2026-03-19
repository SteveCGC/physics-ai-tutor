import {
  QuestionIdParamSchema,
  QuestionTypeSchema,
  UpdateQuestionSchema,
} from "@physics-ai-tutor/shared";
import { and, asc, eq, sql } from "drizzle-orm";
import { Hono, type Context } from "hono";
import { z } from "zod";

import { exams, questions } from "../db/schema";
import {
  QuestionGeneratorUnavailableError,
  regenerateQuestionWithMastra,
} from "../lib/question-generator";
import { requireRole } from "../middleware/role";
import type { AppContext } from "../types";

const questionsRoute = new Hono<AppContext>();
type RouteContext = Context<AppContext>;

function jsonError(message: string, status: number, code?: string) {
  return Response.json(code ? { error: message, code } : { error: message }, { status });
}

function getFirstZodError(error: z.ZodError) {
  return error.issues[0]?.message ?? "请求参数错误";
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

async function getQuestionWithExam(
  c: RouteContext,
  questionId: string
): Promise<
  | {
      question: typeof questions.$inferSelect;
      exam: typeof exams.$inferSelect;
    }
  | undefined
> {
  const db = c.get("db");
  const rows = await db
    .select({
      question: questions,
      exam: exams,
    })
    .from(questions)
    .innerJoin(exams, eq(exams.id, questions.examId))
    .where(eq(questions.id, questionId))
    .limit(1);

  return rows[0];
}

questionsRoute.use("*", requireRole("teacher"));

questionsRoute.patch("/:id", async (c) => {
  const params = QuestionIdParamSchema.safeParse(c.req.param());
  if (!params.success) {
    return jsonError(getFirstZodError(params.error), 400, "BAD_REQUEST");
  }

  const body = await c.req.json().catch(() => null);
  const result = UpdateQuestionSchema.safeParse(body);
  if (!result.success) {
    return jsonError(getFirstZodError(result.error), 400, "BAD_REQUEST");
  }

  const record = await getQuestionWithExam(c, params.data.id);
  if (!record) {
    return jsonError("题目不存在", 404, "QUESTION_NOT_FOUND");
  }

  const profile = c.get("profile");
  if (record.exam.teacherId !== profile.id) {
    return jsonError("无权操作该题目", 403, "FORBIDDEN");
  }

  if (record.exam.status !== "draft") {
    return jsonError("只有草稿试卷中的题目允许编辑", 400, "QUESTION_NOT_EDITABLE");
  }

  const db = c.get("db");
  const [updatedQuestion] = await db
    .update(questions)
    .set({
      ...result.data,
      explanation: result.data.explanation === undefined ? undefined : result.data.explanation,
    })
    .where(eq(questions.id, record.question.id))
    .returning();

  const totalScore = await calculateExamTotalScore(db, record.exam.id);
  await db.update(exams).set({ totalScore }).where(eq(exams.id, record.exam.id));

  return c.json(updatedQuestion);
});

questionsRoute.delete("/:id", async (c) => {
  const params = QuestionIdParamSchema.safeParse(c.req.param());
  if (!params.success) {
    return jsonError(getFirstZodError(params.error), 400, "BAD_REQUEST");
  }

  const record = await getQuestionWithExam(c, params.data.id);
  if (!record) {
    return jsonError("题目不存在", 404, "QUESTION_NOT_FOUND");
  }

  const profile = c.get("profile");
  if (record.exam.teacherId !== profile.id) {
    return jsonError("无权操作该题目", 403, "FORBIDDEN");
  }

  if (record.exam.status !== "draft") {
    return jsonError("只有草稿试卷中的题目允许删除", 400, "QUESTION_NOT_DELETABLE");
  }

  const db = c.get("db");
  await db.transaction(async (tx) => {
    await tx.delete(questions).where(eq(questions.id, record.question.id));

    const remainingQuestions = await tx
      .select({
        id: questions.id,
      })
      .from(questions)
      .where(eq(questions.examId, record.exam.id))
      .orderBy(asc(questions.orderIndex));

    for (const [index, question] of remainingQuestions.entries()) {
      await tx
        .update(questions)
        .set({ orderIndex: index + 1 })
        .where(eq(questions.id, question.id));
    }

    const totalScore = await calculateExamTotalScore(tx, record.exam.id);
    await tx.update(exams).set({ totalScore }).where(eq(exams.id, record.exam.id));
  });

  return c.json({ success: true });
});

questionsRoute.post("/:id/regenerate", async (c) => {
  const params = QuestionIdParamSchema.safeParse(c.req.param());
  if (!params.success) {
    return jsonError(getFirstZodError(params.error), 400, "BAD_REQUEST");
  }

  const record = await getQuestionWithExam(c, params.data.id);
  if (!record) {
    return jsonError("题目不存在", 404, "QUESTION_NOT_FOUND");
  }

  const profile = c.get("profile");
  if (record.exam.teacherId !== profile.id) {
    return jsonError("无权操作该题目", 403, "FORBIDDEN");
  }

  if (record.exam.status !== "draft") {
    return jsonError("只有草稿试卷中的题目允许重新生成", 400, "QUESTION_NOT_REGENERATABLE");
  }

  const questionType = QuestionTypeSchema.safeParse(record.question.type);
  if (!questionType.success) {
    return jsonError("题目类型非法，无法重新生成", 400, "INVALID_QUESTION_TYPE");
  }

  try {
    const generatedQuestion = await regenerateQuestionWithMastra({
      knowledgePoints: record.question.knowledgePoints ?? [],
      type: questionType.data,
      difficulty: record.question.difficulty,
    });

    const db = c.get("db");
    const [updatedQuestion] = await db
      .update(questions)
      .set({
        type: generatedQuestion.type,
        content: generatedQuestion.content,
        options: generatedQuestion.options,
        answer: generatedQuestion.answer,
        acceptedAnswers: generatedQuestion.acceptedAnswers,
        explanation: generatedQuestion.explanation ?? null,
        knowledgePoints: generatedQuestion.knowledgePoints,
        difficulty: generatedQuestion.difficulty,
        score: generatedQuestion.score,
        source: "ai",
      })
      .where(and(eq(questions.id, record.question.id), eq(questions.examId, record.exam.id)))
      .returning();

    const totalScore = await calculateExamTotalScore(db, record.exam.id);
    await db.update(exams).set({ totalScore }).where(eq(exams.id, record.exam.id));

    return c.json(updatedQuestion);
  } catch (error) {
    if (error instanceof QuestionGeneratorUnavailableError) {
      return jsonError("Mastra question-generator 未配置", 503, "QUESTION_GENERATOR_UNAVAILABLE");
    }

    throw error;
  }
});

export default questionsRoute;
