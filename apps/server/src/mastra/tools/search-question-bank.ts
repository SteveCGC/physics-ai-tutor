import { createTool } from "@mastra/core/tools";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";

import { createDb, type DatabaseEnv } from "../../db/client";
import { questions } from "../../db/schema";

export const searchQuestionBankInputSchema = z.object({
  knowledgePoint: z.string().trim().min(1, "knowledgePoint 不能为空"),
  questionType: z
    .enum(["choice", "fill", "calculation", "short_answer"])
    .optional(),
  topK: z.number().int().min(1).max(20).default(5),
});

export const searchQuestionBankOutputSchema = z.object({
  questions: z.array(
    z.object({
      id: z.string().uuid(),
      content: z.string(),
      type: z.enum(["choice", "fill", "calculation", "short_answer"]),
      knowledgePoints: z.array(z.string()).nullable(),
    })
  ),
});


export function createSearchQuestionBankTool(env: DatabaseEnv) {
  return createTool({
    id: "search-question-bank",
    description: "按知识点关键词在题库中检索已有题目，避免重复出题。",
    inputSchema: searchQuestionBankInputSchema,
    outputSchema: searchQuestionBankOutputSchema,
    execute: async (context) => {
      const db = createDb(env);
      const keyword = `%${context.knowledgePoint}%`;
      const filters = [
        or(
          ilike(questions.content, keyword),
          sql`${questions.knowledgePoints}::text ILIKE ${keyword}`
        ),
      ];

      if (context.questionType) {
        filters.push(eq(questions.type, context.questionType));
      }

      const results = await db
        .select({
          id: questions.id,
          content: questions.content,
          type: questions.type,
          knowledgePoints: questions.knowledgePoints,
        })
        .from(questions)
        .where(and(...filters))
        .orderBy(desc(questions.createdAt))
        .limit(context.topK);

      return {
        questions: results.map((item) => ({
          id: item.id,
          content: item.content,
          type: item.type as SearchQuestionBankOutput["questions"][number]["type"],
          knowledgePoints: item.knowledgePoints ?? null,
        })),
      };
    },
  });
}
