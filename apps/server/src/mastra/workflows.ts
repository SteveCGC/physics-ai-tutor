import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

const questionDraftSchema = z.object({
  type: z.enum(["choice", "fill", "calculation", "short_answer"]),
  content: z.string(),
  options: z.array(z.string()).optional(),
  answer: z.string(),
  explanation: z.string().optional(),
  knowledgePoints: z.array(z.string()).min(1),
  difficulty: z.number().int().min(1).max(5),
  score: z.number().int().positive(),
});

const qualityCheckSchema = z.object({
  passed: z.boolean(),
  summary: z.string(),
  issues: z.array(z.string()),
  suggestions: z.array(z.string()),
});

export const generateExamInputSchema = z.object({
  questionType: z.enum(["choice", "fill", "calculation", "short_answer"]),
  knowledgePoints: z.array(z.string()).min(1),
  difficulty: z.number().int().min(1).max(5),
  score: z.number().int().positive().optional(),
  requirements: z.string().optional(),
});

type GenerateExamInput = z.infer<typeof generateExamInputSchema>;
type QuestionDraft = z.infer<typeof questionDraftSchema>;

const generateDraftStep = createStep({
  id: "generate-exam-draft",
  description: "调用 questionGenerator 生成题目初稿。",
  inputSchema: generateExamInputSchema,
  outputSchema: z.object({
    draft: questionDraftSchema,
  }),
  execute: async ({
    inputData,
    mastra,
  }: {
    inputData: GenerateExamInput;
    mastra: { getAgent(name: string): { generate: Function } };
  }) => {
    const agent = mastra.getAgent("questionGenerator");
    const response = await agent.generate(
      `
请生成 1 道高中物理题目，要求如下：
- 题型：${inputData.questionType}
- 知识点：${inputData.knowledgePoints.join("、")}
- 难度：${inputData.difficulty}
- 分值：${inputData.score ?? "请自行估算合理分值"}
- 额外要求：${inputData.requirements ?? "无"}
      `.trim(),
      {
        structuredOutput: {
          schema: questionDraftSchema,
        },
        maxSteps: 1,
      }
    );

    return {
      draft: await response.object,
    };
  },
});

const qualityCheckStep = createStep({
  id: "quality-check-exam-draft",
  description: "调用 qualityChecker 对题目初稿做审核。",
  inputSchema: z.object({
    draft: questionDraftSchema,
  }),
  outputSchema: z.object({
    draft: questionDraftSchema,
    review: qualityCheckSchema,
  }),
  execute: async ({
    inputData,
    mastra,
  }: {
    inputData: { draft: QuestionDraft };
    mastra: { getAgent(name: string): { generate: Function } };
  }) => {
    const agent = mastra.getAgent("qualityChecker");
    const response = await agent.generate(
      `
请审核下面的高中物理题目草稿，并输出结构化审核结果。
题目内容：
${JSON.stringify(inputData.draft, null, 2)}
      `.trim(),
      {
        structuredOutput: {
          schema: qualityCheckSchema,
        },
        maxSteps: 1,
      }
    );

    return {
      draft: inputData.draft,
      review: await response.object,
    };
  },
});

const parseLessonPlanStep = createStep({
  id: "parse-lesson-plan-placeholder",
  description: "P1 预留：教案解析占位步骤。",
  inputSchema: z.object({
    lessonPlanText: z.string(),
  }),
  outputSchema: z.object({
    enabled: z.literal(false),
    message: z.string(),
  }),
  execute: async () => {
    return {
      enabled: false,
      message: "parseLessonPlan workflow is reserved for P1 and is not enabled in MVP.",
    };
  },
});

export function createGenerateExamWorkflow() {
  return createWorkflow({
    id: "generateExam",
    inputSchema: generateExamInputSchema,
    outputSchema: z.object({
      draft: questionDraftSchema,
      review: qualityCheckSchema,
    }),
  })
    .then(generateDraftStep)
    .then(qualityCheckStep)
    .commit();
}

export function createParseLessonPlanWorkflow() {
  return createWorkflow({
    id: "parseLessonPlan",
    inputSchema: z.object({
      lessonPlanText: z.string(),
    }),
    outputSchema: z.object({
      enabled: z.literal(false),
      message: z.string(),
    }),
  })
    .then(parseLessonPlanStep)
    .commit();
}
