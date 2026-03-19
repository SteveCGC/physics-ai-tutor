import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { answers, exams, questions, submissions } from "../db/schema";
import { requireRole } from "../middleware/role";
import { gradeObjectiveQuestion } from "../services/grading";
import type { AppContext } from "../types";

const submissionsRoute = new Hono<AppContext>();

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const listSubmissionsQuerySchema = paginationQuerySchema.extend({
  examId: z.string().uuid().optional(),
});

const submissionParamsSchema = z.object({
  id: z.string().uuid(),
});

const createSubmissionSchema = z.object({
  examId: z.string().uuid(),
  answers: z
    .array(
      z.object({
        questionId: z.string().uuid(),
        studentAnswer: z.string(),
        attachmentUrl: z.string().url().optional(),
      })
    )
    .min(1),
});

function jsonError(message: string, status: number, code?: string) {
  return Response.json(code ? { error: message, code } : { error: message }, { status });
}

function getFirstZodError(error: z.ZodError) {
  return error.issues[0]?.message ?? "请求参数错误";
}

function sanitizeQuestionForStudent<T extends { answer: string; acceptedAnswers: string[] | null; explanation: string | null }>(
  question: T,
  canSeeSolution: boolean
) {
  if (canSeeSolution) {
    return question;
  }

  const { answer, acceptedAnswers, explanation, ...rest } = question;
  return rest;
}

submissionsRoute.use("/submissions/*", requireRole("teacher", "student"));
submissionsRoute.use("/student/results/*", requireRole("student"));

submissionsRoute.post("/submissions", requireRole("student"), async (c) => {
  const body = await c.req.json().catch(() => null);
  const result = createSubmissionSchema.safeParse(body);
  if (!result.success) {
    return jsonError(getFirstZodError(result.error), 400, "BAD_REQUEST");
  }

  const db = c.get("db");
  const profile = c.get("profile");
  const exam = await db.query.exams.findFirst({
    where: eq(exams.id, result.data.examId),
  });

  if (!exam) {
    return jsonError("试卷不存在", 404, "EXAM_NOT_FOUND");
  }

  if (exam.status !== "published") {
    return jsonError("试卷未发布", 400, "EXAM_NOT_PUBLISHED");
  }

  if (!profile.classId || profile.classId !== exam.classId) {
    return jsonError("无权提交该试卷", 403, "FORBIDDEN");
  }

  const existingSubmission = await db.query.submissions.findFirst({
    where: and(eq(submissions.examId, exam.id), eq(submissions.studentId, profile.id)),
  });
  if (existingSubmission) {
    return c.json({ error: "Already submitted" }, 400);
  }

  const examQuestions = await db
    .select()
    .from(questions)
    .where(eq(questions.examId, exam.id))
    .orderBy(asc(questions.orderIndex));

  const answerIds = result.data.answers.map((item) => item.questionId);
  const uniqueIds = new Set(answerIds);
  if (uniqueIds.size !== answerIds.length) {
    return jsonError("存在重复题目答案", 400, "DUPLICATE_QUESTION_ANSWER");
  }

  const questionIdSet = new Set(examQuestions.map((item) => item.id));
  const allQuestionsSubmitted =
    examQuestions.length === result.data.answers.length &&
    answerIds.every((questionId) => questionIdSet.has(questionId));

  if (!allQuestionsSubmitted) {
    return jsonError("提交答案必须覆盖试卷全部题目", 400, "INVALID_SUBMISSION_ANSWERS");
  }

  const answerByQuestionId = new Map(result.data.answers.map((item) => [item.questionId, item]));
  const objectiveResults: Array<{
    questionId: string;
    isCorrect: boolean;
    score: number;
    feedback: string | null;
  }> = [];
  const hasSubjective = examQuestions.some(
    (question) => question.type === "calculation" || question.type === "short_answer"
  );

  await db.transaction(async (tx) => {
    const [createdSubmission] = await tx
      .insert(submissions)
      .values({
        examId: exam.id,
        studentId: profile.id,
        status: hasSubjective ? "pending_review" : "submitted",
        submittedAt: new Date(),
      })
      .returning();

    for (const question of examQuestions) {
      const studentAnswer = answerByQuestionId.get(question.id)!;
      if (question.type === "choice" || question.type === "fill") {
        const graded = gradeObjectiveQuestion(question, studentAnswer.studentAnswer);
        objectiveResults.push({
          questionId: question.id,
          isCorrect: graded.isCorrect,
          score: graded.score,
          feedback: graded.feedback,
        });

        await tx.insert(answers).values({
          submissionId: createdSubmission.id,
          questionId: question.id,
          studentAnswer: studentAnswer.studentAnswer,
          attachmentUrl: studentAnswer.attachmentUrl ?? null,
          isCorrect: graded.isCorrect,
          score: graded.score,
          feedback: graded.feedback,
          gradedBy: "auto",
          gradedAt: new Date(),
        });
        continue;
      }

      await tx.insert(answers).values({
        submissionId: createdSubmission.id,
        questionId: question.id,
        studentAnswer: studentAnswer.studentAnswer,
        attachmentUrl: studentAnswer.attachmentUrl ?? null,
        gradedBy: null,
        gradedAt: null,
      });
    }
  });

  return c.json({
    results: objectiveResults,
  }, 201);
});

submissionsRoute.get("/submissions", async (c) => {
  const query = listSubmissionsQuerySchema.safeParse(c.req.query());
  if (!query.success) {
    return jsonError(getFirstZodError(query.error), 400, "BAD_REQUEST");
  }

  const db = c.get("db");
  const profile = c.get("profile");
  const { page, pageSize, examId } = query.data;
  const offset = (page - 1) * pageSize;

  if (profile.role === "teacher") {
    if (!examId) {
      return jsonError("examId 为必填", 400, "BAD_REQUEST");
    }

    const exam = await db.query.exams.findFirst({
      where: and(eq(exams.id, examId), eq(exams.teacherId, profile.id)),
    });
    if (!exam) {
      return jsonError("试卷不存在或无权限访问", 403, "FORBIDDEN");
    }

    const filters = [eq(submissions.examId, exam.id)];
    const [totalResult, items] = await Promise.all([
      db
        .select({ count: count(submissions.id) })
        .from(submissions)
        .where(and(...filters)),
      db
        .select({
          id: submissions.id,
          examId: submissions.examId,
          studentId: submissions.studentId,
          status: submissions.status,
          totalScore: submissions.totalScore,
          submittedAt: submissions.submittedAt,
          publishedAt: submissions.publishedAt,
        })
        .from(submissions)
        .where(and(...filters))
        .orderBy(desc(submissions.submittedAt))
        .limit(pageSize)
        .offset(offset),
    ]);

    return c.json({
      total: Number(totalResult[0]?.count ?? 0),
      page,
      pageSize,
      items,
    });
  }

  const filters = [eq(submissions.studentId, profile.id)];
  if (examId) {
    filters.push(eq(submissions.examId, examId));
  }

  const [totalResult, items] = await Promise.all([
    db
      .select({ count: count(submissions.id) })
      .from(submissions)
      .where(and(...filters)),
    db
      .select({
        id: submissions.id,
        examId: submissions.examId,
        studentId: submissions.studentId,
        status: submissions.status,
        totalScore: submissions.totalScore,
        submittedAt: submissions.submittedAt,
        publishedAt: submissions.publishedAt,
      })
      .from(submissions)
      .where(and(...filters))
      .orderBy(desc(submissions.submittedAt))
      .limit(pageSize)
      .offset(offset),
  ]);

  return c.json({
    total: Number(totalResult[0]?.count ?? 0),
    page,
    pageSize,
    items,
  });
});

submissionsRoute.get("/submissions/:id", async (c) => {
  const params = submissionParamsSchema.safeParse(c.req.param());
  if (!params.success) {
    return jsonError(getFirstZodError(params.error), 400, "BAD_REQUEST");
  }

  const db = c.get("db");
  const profile = c.get("profile");
  const rows = await db
    .select({
      submission: submissions,
      exam: exams,
      answer: answers,
      question: questions,
    })
    .from(submissions)
    .innerJoin(exams, eq(exams.id, submissions.examId))
    .innerJoin(answers, eq(answers.submissionId, submissions.id))
    .innerJoin(questions, eq(questions.id, answers.questionId))
    .where(eq(submissions.id, params.data.id))
    .orderBy(asc(questions.orderIndex));

  if (rows.length === 0) {
    return jsonError("提交记录不存在", 404, "SUBMISSION_NOT_FOUND");
  }

  const { submission, exam } = rows[0];
  if (profile.role === "teacher") {
    if (exam.teacherId !== profile.id) {
      return jsonError("无权访问该提交记录", 403, "FORBIDDEN");
    }
  } else if (submission.studentId !== profile.id) {
    return jsonError("无权访问该提交记录", 403, "FORBIDDEN");
  }

  const canSeeSolution = profile.role === "teacher" || submission.status === "published";
  return c.json({
    ...submission,
    exam,
    answers: rows.map((row) => ({
      ...row.answer,
      question: sanitizeQuestionForStudent(row.question, canSeeSolution),
    })),
  });
});

submissionsRoute.get("/student/results", async (c) => {
  const query = paginationQuerySchema.safeParse(c.req.query());
  if (!query.success) {
    return jsonError(getFirstZodError(query.error), 400, "BAD_REQUEST");
  }

  const db = c.get("db");
  const profile = c.get("profile");
  const { page, pageSize } = query.data;
  const offset = (page - 1) * pageSize;

  const filters = [eq(submissions.studentId, profile.id), eq(submissions.status, "published")];
  const [totalResult, items] = await Promise.all([
    db
      .select({ count: count(submissions.id) })
      .from(submissions)
      .where(and(...filters)),
    db
      .select({
        submissionId: submissions.id,
        examTitle: exams.title,
        totalScore: submissions.totalScore,
        fullScore: exams.totalScore,
        submittedAt: submissions.submittedAt,
        publishedAt: submissions.publishedAt,
      })
      .from(submissions)
      .innerJoin(exams, eq(exams.id, submissions.examId))
      .where(and(...filters))
      .orderBy(desc(submissions.publishedAt))
      .limit(pageSize)
      .offset(offset),
  ]);

  return c.json({
    total: Number(totalResult[0]?.count ?? 0),
    page,
    pageSize,
    items,
  });
});

submissionsRoute.get("/student/results/:id", async (c) => {
  const params = submissionParamsSchema.safeParse(c.req.param());
  if (!params.success) {
    return jsonError(getFirstZodError(params.error), 400, "BAD_REQUEST");
  }

  const db = c.get("db");
  const profile = c.get("profile");
  const rows = await db
    .select({
      submission: submissions,
      exam: exams,
      answer: answers,
      question: questions,
    })
    .from(submissions)
    .innerJoin(exams, eq(exams.id, submissions.examId))
    .innerJoin(answers, eq(answers.submissionId, submissions.id))
    .innerJoin(questions, eq(questions.id, answers.questionId))
    .where(and(eq(submissions.id, params.data.id), eq(submissions.studentId, profile.id)))
    .orderBy(asc(questions.orderIndex));

  if (rows.length === 0) {
    return jsonError("成绩不存在", 404, "RESULT_NOT_FOUND");
  }

  const { submission, exam } = rows[0];
  if (submission.status !== "published") {
    return jsonError("成绩尚未发布", 403, "FORBIDDEN");
  }

  return c.json({
    ...submission,
    exam,
    answers: rows.map((row) => ({
      ...row.answer,
      question: row.question,
    })),
  });
});

export default submissionsRoute;
