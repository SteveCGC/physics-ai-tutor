import { z } from "zod";

export const QuestionTypeSchema = z.enum([
  "choice",
  "fill",
  "calculation",
  "short_answer",
]);

export const QuestionSourceSchema = z.enum(["ai", "manual", "imported"]);

export const QuestionIdParamSchema = z.object({
  id: z.string().uuid("题目ID格式错误"),
});

export const CreateManualQuestionSchema = z.object({
  type: QuestionTypeSchema,
  content: z.string().min(1, "题目内容不能为空"),
  options: z.array(z.string()).optional(),
  answer: z.string().min(1, "标准答案不能为空"),
  acceptedAnswers: z.array(z.string()).optional(),
  explanation: z.string().optional(),
  knowledgePoints: z.array(z.string().min(1)).min(1, "至少选择一个知识点"),
  difficulty: z.number().int().min(1).max(5),
  score: z.number().int().min(1),
});

export const UpdateQuestionSchema = z
  .object({
    content: z.string().min(1, "题目内容不能为空").optional(),
    options: z.array(z.string()).optional(),
    answer: z.string().min(1, "标准答案不能为空").optional(),
    acceptedAnswers: z.array(z.string()).optional(),
    explanation: z.string().optional().nullable(),
    difficulty: z.number().int().min(1).max(5).optional(),
    score: z.number().int().min(1).optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "至少提供一个待更新字段",
  });
