import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const questionTypeSchema = z.enum(["choice", "fill", "calculation", "short_answer"]);

export const validateQuestionInputSchema = z.object({
  content: z.string(),
  type: questionTypeSchema,
  options: z.array(z.string()).optional(),
  answer: z.string(),
  explanation: z.string().optional(),
  difficulty: z.number().int(),
  score: z.number(),
});

export const validateQuestionOutputSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.string()),
});

type ValidateQuestionInput = z.infer<typeof validateQuestionInputSchema>;
type ValidateQuestionOutput = z.infer<typeof validateQuestionOutputSchema>;

function countStandaloneDollarSigns(text: string) {
  let count = 0;

  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== "$") {
      continue;
    }

    const previousChar = text[index - 1];
    const nextChar = text[index + 1];

    if (previousChar !== "$" && nextChar !== "$") {
      count += 1;
    }
  }

  return count;
}

export const validateQuestionTool = createTool<ValidateQuestionInput, ValidateQuestionOutput>({
  id: "validate-question",
  description: "按 MVP 规则校验题目格式与基础质量，不调用 AI。",
  inputSchema: validateQuestionInputSchema,
  outputSchema: validateQuestionOutputSchema,
  execute: async ({ context }: { context: ValidateQuestionInput }) => {
    const errors: string[] = [];

    if (!context.content.trim()) {
      errors.push("题目内容不能为空");
    }

    if (!context.answer.trim()) {
      errors.push("答案不能为空");
    }

    if (context.difficulty < 1 || context.difficulty > 5) {
      errors.push("difficulty 必须在 1-5 范围内");
    }

    if (context.score <= 0) {
      errors.push("score 必须大于 0");
    }

    if (context.type === "choice") {
      if (!context.options || context.options.length !== 4) {
        errors.push("选择题必须提供 4 个选项");
      }

      if (!["A", "B", "C", "D"].includes(context.answer.trim().toUpperCase())) {
        errors.push("选择题答案必须为 A/B/C/D");
      }
    }

    const standaloneDollarCount = countStandaloneDollarSigns(context.content);
    if (standaloneDollarCount % 2 !== 0) {
      errors.push("LaTeX 单个 $ 符号必须成对出现");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },
});
