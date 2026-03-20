import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { createDb, type DatabaseEnv } from "../../db/client";
import { questions } from "../../db/schema";

const qualityFlagSchema = z.object({
  type: z.string().min(1),
  message: z.string().min(1),
  severity: z.enum(["warning", "error"]),
});

const questionDraftSchema = z.object({
  type: z.enum(["choice", "fill", "calculation", "short_answer"]),
  content: z.string().trim().min(1),
  options: z.array(z.string()).optional(),
  answer: z.string().trim().min(1),
  acceptedAnswers: z.array(z.string()).optional(),
  explanation: z.string().optional(),
  knowledgePoints: z.array(z.string().min(1)).min(1),
  difficulty: z.number().int().min(1).max(5),
  score: z.number().int().positive(),
  qualityFlags: z.array(qualityFlagSchema).optional(),
});

export const saveQuestionsInputSchema = z.object({
  examId: z.string().uuid(),
  questions: z.array(questionDraftSchema).min(1),
});

export const saveQuestionsOutputSchema = z.object({
  questionIds: z.array(z.string().uuid()),
});

type SaveQuestionsInput = z.infer<typeof saveQuestionsInputSchema>;
type SaveQuestionsOutput = z.infer<typeof saveQuestionsOutputSchema>;

export function createSaveQuestionsTool(env: DatabaseEnv) {
  return createTool<SaveQuestionsInput, SaveQuestionsOutput>({
    id: "save-questions",
    description: "按输入顺序批量保存题目到数据库，source 固定为 ai。",
    inputSchema: saveQuestionsInputSchema,
    outputSchema: saveQuestionsOutputSchema,
    execute: async ({ context }: { context: SaveQuestionsInput }) => {
      const db = createDb(env);
      const values = context.questions.map((question, index) => ({
        examId: context.examId,
        type: question.type,
        content: question.content,
        options: question.options,
        answer: question.answer,
        acceptedAnswers: question.acceptedAnswers,
        explanation: question.explanation,
        knowledgePoints: question.knowledgePoints,
        difficulty: question.difficulty,
        score: question.score,
        orderIndex: index + 1,
        source: "ai" as const,
        qualityFlags: question.qualityFlags,
      }));

      const inserted = await db.insert(questions).values(values).returning({
        id: questions.id,
      });

      return {
        questionIds: inserted.map((item) => item.id),
      };
    },
  });
}
