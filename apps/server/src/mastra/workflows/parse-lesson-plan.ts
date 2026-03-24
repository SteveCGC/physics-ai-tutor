import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

const parseLessonPlanInputSchema = z.object({
  documentId: z.string(),
  fileKey: z.string(),
  fileType: z.string(),
});

const parseLessonPlanOutputSchema = z.object({
  knowledgePoints: z.array(z.string()),
});

const parseLessonPlanPlaceholderStep = createStep({
  id: "parse-lesson-plan-placeholder",
  inputSchema: parseLessonPlanInputSchema,
  outputSchema: parseLessonPlanOutputSchema,
  // P1: 实现教案解析 + embedding 分块 + pgvector 存储
  execute: async () => ({
    knowledgePoints: [],
  }),
});

export const parseLessonPlanWorkflow = createWorkflow({
  id: "parse-lesson-plan",
  inputSchema: parseLessonPlanInputSchema,
  outputSchema: parseLessonPlanOutputSchema,
})
  .then(parseLessonPlanPlaceholderStep)
  .commit();

export function createParseLessonPlanWorkflow() {
  return parseLessonPlanWorkflow;
}
