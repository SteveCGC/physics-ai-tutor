import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { knowledgePointsTree } from "@physics-ai-tutor/shared";

export const getKnowledgePointsInputSchema = z.object({
  category: z.string().trim().min(1).optional(),
});

export const getKnowledgePointsOutputSchema = z.object({
  knowledgePoints: z.array(
    z.object({
      name: z.string(),
      category: z.string(),
      subPoints: z.array(z.string()),
    })
  ),
});

type GetKnowledgePointsInput = z.infer<typeof getKnowledgePointsInputSchema>;
type GetKnowledgePointsOutput = z.infer<typeof getKnowledgePointsOutputSchema>;

export const getKnowledgePointsTool = createTool<
  GetKnowledgePointsInput,
  GetKnowledgePointsOutput
>({
  id: "get-knowledge-points",
  description: "读取系统知识点体系，可按章节名称或分类筛选。",
  inputSchema: getKnowledgePointsInputSchema,
  outputSchema: getKnowledgePointsOutputSchema,
  execute: async ({ context }: { context: GetKnowledgePointsInput }) => {
    const category = context.category?.trim();
    const knowledgePoints = category
      ? knowledgePointsTree.filter(
          (item) => item.name === category || item.category === category
        )
      : knowledgePointsTree;

    return {
      knowledgePoints,
    };
  },
});
