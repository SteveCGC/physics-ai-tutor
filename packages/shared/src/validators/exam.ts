import { z } from "zod";

export const ExamStatusSchema = z.enum(["draft", "published", "archived"]);

export const CreateExamSchema = z.object({
  title: z.string().min(1, "试卷标题不能为空").max(100),
  classId: z.string().uuid("班级ID格式错误"),
  knowledgePoints: z.array(z.string().min(1)).min(1, "至少选择一个知识点"),
  deadline: z.string().datetime("截止时间格式错误").optional().nullable(),
});

export const ListExamsQuerySchema = z.object({
  status: ExamStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const ExamIdParamSchema = z.object({
  id: z.string().uuid("试卷ID格式错误"),
});

export const UpdateExamSchema = z
  .object({
    title: z.string().min(1, "试卷标题不能为空").max(100).optional(),
    classId: z.string().uuid("班级ID格式错误").optional(),
    deadline: z.string().datetime("截止时间格式错误").optional().nullable(),
    status: ExamStatusSchema.optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "至少提供一个待更新字段",
  });
