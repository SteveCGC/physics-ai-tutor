import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { answers, exams, questions, scoreAuditLogs, submissions } from "../db/schema";
import { requireRole } from "../middleware/role";
import type { AppContext } from "../types";

const gradingRoute = new Hono<AppContext>();

const answerIdParamSchema = z.object({
  answerId: z.string().uuid(),
});

const submissionIdParamSchema = z.object({
  submissionId: z.string().uuid(),
});

const examIdParamSchema = z.object({
  examId: z.string().uuid(),
});

const gradeAnswerSchema = z.object({
  score: z.number().min(0),
  teacherComment: z.string().trim().max(2000).optional(),
});

const reviseAnswerSchema = gradeAnswerSchema.extend({
  reason: z.string().trim().min(1, "reason 必填"),
});

function jsonError(message: string, status: number, code?: string) {
  return Response.json(code ? { error: message, code } : { error: message }, { status });
}

function getFirstZodError(error: z.ZodError) {
  return error.issues[0]?.message ?? "请求参数错误";
}

async function getTeacherOwnedAnswerContext(db: AppContext["Variables"]["db"], answerId: string) {
  const rows = await db
    .select({
      answer: answers,
      question: questions,
      submission: submissions,
      exam: exams,
    })
    .from(answers)
    .innerJoin(questions, eq(questions.id, answers.questionId))
    .innerJoin(submissions, eq(submissions.id, answers.submissionId))
    .innerJoin(exams, eq(exams.id, submissions.examId))
    .where(eq(answers.id, answerId))
    .limit(1);

  return rows[0];
}

async function getTeacherOwnedSubmissionContext(
  db: AppContext["Variables"]["db"],
  submissionId: string
) {
  const rows = await db
    .select({
      submission: submissions,
      exam: exams,
    })
    .from(submissions)
    .innerJoin(exams, eq(exams.id, submissions.examId))
    .where(eq(submissions.id, submissionId))
    .limit(1);

  return rows[0];
}

async function listSubmissionAnswersWithQuestions(
  db: Pick<AppContext["Variables"]["db"], "select">,
  submissionId: string
) {
  return db
    .select({
      answer: answers,
      question: questions,
    })
    .from(answers)
    .innerJoin(questions, eq(questions.id, answers.questionId))
    .where(eq(answers.submissionId, submissionId))
    .orderBy(asc(questions.orderIndex));
}

async function calculateSubmissionTotalScore(
  db: Pick<AppContext["Variables"]["db"], "select">,
  submissionId: string
) {
  const rows = await db
    .select({
      score: answers.score,
    })
    .from(answers)
    .where(eq(answers.submissionId, submissionId));

  return rows.reduce((sum, item) => sum + (item.score ?? 0), 0);
}

gradingRoute.use("/grading/*", requireRole("teacher"));

gradingRoute.patch("/grading/answers/:answerId", async (c) => {
  const params = answerIdParamSchema.safeParse(c.req.param());
  if (!params.success) {
    return jsonError(getFirstZodError(params.error), 400, "BAD_REQUEST");
  }

  const body = await c.req.json().catch(() => null);
  const result = gradeAnswerSchema.safeParse(body);
  if (!result.success) {
    return jsonError(getFirstZodError(result.error), 400, "BAD_REQUEST");
  }

  const db = c.get("db");
  const profile = c.get("profile");
  const record = await getTeacherOwnedAnswerContext(db, params.data.answerId);
  if (!record) {
    return jsonError("答案不存在", 404, "ANSWER_NOT_FOUND");
  }

  if (record.exam.teacherId !== profile.id) {
    return jsonError("无权批改该答案", 403, "FORBIDDEN");
  }

  if (record.question.type !== "calculation" && record.question.type !== "short_answer") {
    return jsonError("仅主观题允许教师批改", 400, "ANSWER_NOT_MANUAL_GRADEABLE");
  }

  if (result.data.score > record.question.score) {
    return jsonError("分数超出题目满分", 400, "SCORE_EXCEEDS_MAX");
  }

  const [updatedAnswer] = await db
    .update(answers)
    .set({
      score: result.data.score,
      teacherComment: result.data.teacherComment ?? null,
      gradedBy: "teacher",
      gradedAt: new Date(),
    })
    .where(eq(answers.id, record.answer.id))
    .returning();

  return c.json(updatedAnswer);
});

gradingRoute.post("/grading/submissions/:submissionId/publish", async (c) => {
  const params = submissionIdParamSchema.safeParse(c.req.param());
  if (!params.success) {
    return jsonError(getFirstZodError(params.error), 400, "BAD_REQUEST");
  }

  const db = c.get("db");
  const profile = c.get("profile");
  const record = await getTeacherOwnedSubmissionContext(db, params.data.submissionId);
  if (!record) {
    return jsonError("提交记录不存在", 404, "SUBMISSION_NOT_FOUND");
  }

  if (record.exam.teacherId !== profile.id) {
    return jsonError("无权发布该成绩", 403, "FORBIDDEN");
  }

  const submissionAnswers = await listSubmissionAnswersWithQuestions(db, record.submission.id);
  const ungradedSubjective = submissionAnswers
    .filter(
      (item) =>
        (item.question.type === "calculation" || item.question.type === "short_answer") &&
        item.answer.gradedBy == null
    )
    .map((item) => ({
      answerId: item.answer.id,
      questionId: item.question.id,
      questionType: item.question.type,
      orderIndex: item.question.orderIndex,
    }));

  if (ungradedSubjective.length > 0) {
    return c.json({ error: "存在未批改主观题", ungradedQuestions: ungradedSubjective }, 400);
  }

  const publishedAt = new Date();
  const totalScore = submissionAnswers.reduce((sum, item) => sum + (item.answer.score ?? 0), 0);

  await db.transaction(async (tx) => {
    await tx
      .update(submissions)
      .set({
        totalScore,
        status: "published",
        publishedAt,
      })
      .where(eq(submissions.id, record.submission.id));
  });

  return c.json({ totalScore, publishedAt });
});

gradingRoute.post("/grading/exams/:examId/publish-all", async (c) => {
  const params = examIdParamSchema.safeParse(c.req.param());
  if (!params.success) {
    return jsonError(getFirstZodError(params.error), 400, "BAD_REQUEST");
  }

  const db = c.get("db");
  const profile = c.get("profile");
  const exam = await db.query.exams.findFirst({
    where: and(eq(exams.id, params.data.examId), eq(exams.teacherId, profile.id)),
  });
  if (!exam) {
    return jsonError("试卷不存在或无权限访问", 403, "FORBIDDEN");
  }

  const pendingSubmissions = await db
    .select()
    .from(submissions)
    .where(and(eq(submissions.examId, exam.id), eq(submissions.status, "pending_review")));

  let published = 0;
  let skipped = 0;

  for (const submission of pendingSubmissions) {
    const submissionAnswers = await listSubmissionAnswersWithQuestions(db, submission.id);
    const hasUngraded = submissionAnswers.some(
      (item) =>
        (item.question.type === "calculation" || item.question.type === "short_answer") &&
        item.answer.gradedBy == null
    );

    if (hasUngraded) {
      skipped += 1;
      continue;
    }

    const totalScore = submissionAnswers.reduce((sum, item) => sum + (item.answer.score ?? 0), 0);
    await db
      .update(submissions)
      .set({
        totalScore,
        status: "published",
        publishedAt: new Date(),
      })
      .where(eq(submissions.id, submission.id));

    published += 1;
  }

  return c.json({ published, skipped });
});

gradingRoute.patch("/grading/answers/:answerId/revise", async (c) => {
  const params = answerIdParamSchema.safeParse(c.req.param());
  if (!params.success) {
    return jsonError(getFirstZodError(params.error), 400, "BAD_REQUEST");
  }

  const body = await c.req.json().catch(() => null);
  const result = reviseAnswerSchema.safeParse(body);
  if (!result.success) {
    return jsonError(getFirstZodError(result.error), 400, "BAD_REQUEST");
  }

  const db = c.get("db");
  const profile = c.get("profile");
  const record = await getTeacherOwnedAnswerContext(db, params.data.answerId);
  if (!record) {
    return jsonError("答案不存在", 404, "ANSWER_NOT_FOUND");
  }

  if (record.exam.teacherId !== profile.id) {
    return jsonError("无权修改该评分", 403, "FORBIDDEN");
  }

  if (!record.submission.publishedAt) {
    return jsonError("成绩尚未发布", 400, "SUBMISSION_NOT_PUBLISHED");
  }

  if (result.data.score > record.question.score) {
    return jsonError("分数超出题目满分", 400, "SCORE_EXCEEDS_MAX");
  }

  const now = new Date();
  const windowMs = 24 * 60 * 60 * 1000;
  if (now.getTime() - record.submission.publishedAt.getTime() > windowMs) {
    return c.json({ error: "超过 24 小时修改窗口" }, 403);
  }

  let updatedAnswer: typeof answers.$inferSelect | undefined;
  let totalScore = 0;

  await db.transaction(async (tx) => {
    await tx.insert(scoreAuditLogs).values({
      submissionId: record.submission.id,
      answerId: record.answer.id,
      operatorId: profile.id,
      oldScore: record.answer.score,
      newScore: result.data.score,
      oldComment: record.answer.teacherComment,
      newComment: result.data.teacherComment ?? null,
      reason: result.data.reason,
    });

    [updatedAnswer] = await tx
      .update(answers)
      .set({
        score: result.data.score,
        teacherComment: result.data.teacherComment ?? null,
        gradedBy: "teacher",
        gradedAt: now,
      })
      .where(eq(answers.id, record.answer.id))
      .returning();

    totalScore = await calculateSubmissionTotalScore(tx, record.submission.id);
    await tx
      .update(submissions)
      .set({
        totalScore,
      })
      .where(eq(submissions.id, record.submission.id));
  });

  return c.json({
    answer: updatedAnswer,
    totalScore,
  });
});

export default gradingRoute;
