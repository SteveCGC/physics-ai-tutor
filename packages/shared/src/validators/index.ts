import { z } from "zod";

export * from "./exam";
export * from "./question";

// ============================================================
// Zod Validators — physics-ai-tutor
// ============================================================

// 用户角色
export const UserRoleSchema = z.enum(["teacher", "student"]);

import { CreateExamSchema, ExamStatusSchema } from "./exam";
import { CreateManualQuestionSchema, QuestionSourceSchema, QuestionTypeSchema } from "./question";

// 提交状态
export const SubmissionStatusSchema = z.enum([
  "in_progress",
  "submitted",
  "pending_review",
  "published",
]);

// 文件用途
export const DocumentUseCaseSchema = z.enum(["question_bank", "lesson_plan"]);

// 解析状态
export const ParseStatusSchema = z.enum(["pending", "done", "failed"]);

// 批改人
export const GradedBySchema = z.enum(["auto", "teacher"]);

// ---- API 请求体 Validators ----

// 创建班级
export const CreateClassSchema = z.object({
  name: z.string().min(1, "班级名称不能为空").max(50),
  grade: z.string().min(1, "年级不能为空").max(20),
});

// 加入班级（学生）
export const JoinClassSchema = z.object({
  inviteCode: z
    .string()
    .length(6, "邀请码为6位")
    .regex(/^[A-Z0-9]{6}$/, "邀请码格式错误"),
});

// 更新试卷状态
export const UpdateExamStatusSchema = z.object({
  status: ExamStatusSchema,
});

// 创建题目
export const CreateQuestionSchema = CreateManualQuestionSchema.extend({
  examId: z.string().uuid(),
  orderIndex: z.number().int().min(0),
  source: QuestionSourceSchema.default("manual"),
});

// 提交答案
export const SubmitAnswerSchema = z.object({
  questionId: z.string().uuid(),
  studentAnswer: z.string().optional(),
  attachmentUrl: z.string().optional(),
});

// 批量提交
export const SubmitExamSchema = z.object({
  answers: z.array(SubmitAnswerSchema),
});

// 教师批改单题
export const GradeAnswerSchema = z.object({
  score: z.number().int().min(0),
  teacherComment: z.string().optional(),
});

// 修改已发布成绩（审计）
export const UpdatePublishedScoreSchema = z.object({
  score: z.number().int().min(0),
  comment: z.string().optional(),
  reason: z.string().min(1, "修改原因不能为空"),
});

// AI 出题请求
export const GenerateExamRequestSchema = z.object({
  knowledgePoints: z.array(z.string()).min(1),
  questionTypes: z.array(QuestionTypeSchema).min(1),
  totalQuestions: z.number().int().min(1).max(50),
  difficulty: z.number().int().min(1).max(5).optional(),
  referenceDocumentId: z.string().uuid().optional(),
});

// 分页参数
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
