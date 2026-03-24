import { Mastra } from "@mastra/core";
import { createStep, createWorkflow } from "@mastra/core/workflows";
import type { QualityFlag, QuestionType } from "@physics-ai-tutor/shared";
import { z } from "zod";

import type { DatabaseEnv } from "../../db/client";
import { createQualityCheckerAgent, createQuestionGeneratorAgent } from "../agents";
import { createSaveQuestionsTool } from "../tools";

const questionTypeSchema = z.enum(["choice", "fill", "calculation", "short_answer"]);

const qualityFlagSchema = z.object({
  type: z.string().min(1),
  message: z.string().min(1),
  severity: z.enum(["warning", "error"]),
});

export const rawQuestionSchema = z.object({
  type: questionTypeSchema,
  content: z.string().trim().min(1),
  options: z.array(z.string()).optional(),
  answer: z.string().trim().min(1),
  acceptedAnswers: z.array(z.string()).optional(),
  explanation: z.string().optional(),
  knowledgePoints: z.array(z.string().trim().min(1)).min(1),
  difficulty: z.number().int().min(1).max(5),
  score: z.number().int().positive(),
  qualityFlags: z.array(qualityFlagSchema).optional(),
});

const reviewItemSchema = z.object({
  questionIndex: z.number().int().min(0),
  passed: z.boolean(),
  issues: z.array(z.string()),
  suggestions: z.array(z.string()),
});

export const generateExamWorkflowInputSchema = z.object({
  examId: z.string().min(1),
  knowledgePoints: z.array(z.string().trim().min(1)).min(1),
  questionTypes: z.array(questionTypeSchema).min(1),
  difficulty: z.number().int().min(1).max(5),
  count: z.number().int().min(1).max(30).default(10),
});

export const generateExamWorkflowOutputSchema = z.object({
  examId: z.string().min(1),
  questionCount: z.number().int().min(0),
  questionIds: z.array(z.string().min(1)),
});

const parseRequirementsOutputSchema = z.object({
  prompt: z.string(),
  questionDistribution: z.record(z.string(), z.number().int().min(0)),
});

const generateQuestionsOutputSchema = z.object({
  questions: z.array(rawQuestionSchema).min(1),
});

const qualityCheckOutputSchema = z.object({
  questions: z.array(rawQuestionSchema).min(1),
});

const saveDraftOutputSchema = generateExamWorkflowOutputSchema;

export type RawQuestion = z.infer<typeof rawQuestionSchema>;
export type GenerateExamWorkflowInput = z.infer<typeof generateExamWorkflowInputSchema>;
export type GenerateExamWorkflowOutput = z.infer<typeof generateExamWorkflowOutputSchema>;

type ReviewItem = z.infer<typeof reviewItemSchema>;
type StepName =
  | "parse-requirements"
  | "generate-questions"
  | "quality-check"
  | "save-draft";

type WorkflowMastra = Mastra;

export type GenerateExamWorkflowEvent =
  | { event: "step"; step: StepName; status: "done" }
  | { event: "questions"; data: RawQuestion[] };

function buildQuestionDistribution(
  questionTypes: QuestionType[],
  count: number
): Record<string, number> {
  const distribution: Record<string, number> = Object.fromEntries(
    questionTypes.map((type) => [type, 0])
  );

  for (let index = 0; index < count; index += 1) {
    const type = questionTypes[index % questionTypes.length];
    distribution[type] = (distribution[type] ?? 0) + 1;
  }

  return distribution;
}

function buildExamPrompt(input: GenerateExamWorkflowInput, distribution: Record<string, number>) {
  const distributionLines = Object.entries(distribution)
    .map(([type, value]) => `- ${type}: ${value} 道`)
    .join("\n");

  return [
    "请根据以下要求生成一份高中物理试题，返回严格 JSON 数组，不要输出任何额外内容。",
    `总题量：${input.count} 道`,
    `知识点：${input.knowledgePoints.join("、")}`,
    `目标难度：${input.difficulty}（1-5）`,
    "题型分布：",
    distributionLines,
    "每道题必须包含字段：type、content、options（选择题必填）、answer、explanation（可选）、knowledgePoints、difficulty、score。",
    "题型只允许：choice、fill、calculation、short_answer。",
    "禁止输出 markdown 代码块，必须直接输出 JSON。",
  ].join("\n");
}

function extractAgentText(response: unknown): string {
  if (typeof response === "string") {
    return response;
  }

  if (!response || typeof response !== "object") {
    throw new Error("Agent returned empty response");
  }

  const candidate = response as {
    text?: unknown;
    content?: unknown;
    output?: unknown;
    response?: unknown;
    object?: unknown;
  };

  if (typeof candidate.text === "string") {
    return candidate.text;
  }

  if (typeof candidate.content === "string") {
    return candidate.content;
  }

  if (typeof candidate.output === "string") {
    return candidate.output;
  }

  if (typeof candidate.response === "string") {
    return candidate.response;
  }

  if (typeof candidate.object === "string") {
    return candidate.object;
  }

  throw new Error("Unable to read text content from agent response");
}

function cleanJsonString(value: string): string {
  // Strip <think>...</think> reasoning blocks (glm-z1 and other reasoning models)
  let text = value.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // Strip markdown code fences: ```json ... ``` or ``` ... ```
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();

  // Extract first JSON array
  const arrayMatch = text.match(/(\[[\s\S]*\])/);
  if (arrayMatch) return arrayMatch[1].trim();

  // Extract first JSON object
  const objectMatch = text.match(/(\{[\s\S]*\})/);
  if (objectMatch) return objectMatch[1].trim();

  return text;
}

function fixBackslashes(value: string): string {
  // Fix unescaped backslashes in JSON string values (e.g. LaTeX `\ ` or `\text`)
  // Valid JSON escapes: \", \\, \/, \b, \f, \n, \r, \t, \uXXXX
  return value.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
}

function parseJson<TSchema extends z.ZodTypeAny>(
  value: string,
  schema: TSchema,
  errorMessage: string
): z.infer<TSchema> {
  const cleaned = cleanJsonString(value);
  let parsed: unknown;

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Retry after fixing unescaped backslashes (common with LaTeX in LLM output)
    try {
      parsed = JSON.parse(fixBackslashes(cleaned));
    } catch {
      console.error(`[parseJson] Failed to parse. Cleaned value:\n${cleaned.slice(0, 600)}`);
      throw new Error(errorMessage);
    }
  }

  return schema.parse(parsed);
}

function reviewIssuesToFlags(review: ReviewItem): QualityFlag[] | undefined {
  const issues = review.issues.length > 0 ? review.issues : review.passed ? [] : ["质量审查未通过"];

  if (issues.length === 0) {
    return undefined;
  }

  return issues.map((issue) => ({
    type: "quality_check",
    message: issue,
    severity: review.passed ? "warning" : "error",
  }));
}

async function runParseRequirementsStep(input: GenerateExamWorkflowInput) {
  const questionDistribution = buildQuestionDistribution(input.questionTypes, input.count);

  return parseRequirementsOutputSchema.parse({
    prompt: buildExamPrompt(input, questionDistribution),
    questionDistribution,
  });
}

async function runGenerateQuestionsStep(
  prompt: string,
  mastra: WorkflowMastra
) {
  const agent = mastra.getAgent<{
    generateLegacy(messages: Array<{ role: "user"; content: string }>): Promise<unknown>;
  }>("questionGenerator");

  const response = await agent.generateLegacy([{ role: "user", content: prompt }]);
  const rawText = extractAgentText(response);
  console.log("[questionGenerator] raw response):", rawText);

  const questions = parseJson(
    rawText,
    z.array(rawQuestionSchema).min(1),
    "questionGenerator 返回的题目 JSON 解析失败"
  );

  return generateQuestionsOutputSchema.parse({ questions });
}

async function runQualityCheckStep(
  questions: RawQuestion[],
  mastra: WorkflowMastra
) {
  const agent = mastra.getAgent<{
    generateLegacy(messages: Array<{ role: "user"; content: string }>): Promise<unknown>;
  }>("qualityChecker");

  const response = await agent.generateLegacy([
    {
      role: "user",
      content: `请逐题审查下面的题目 JSON，并返回 JSON 数组：\n${JSON.stringify(
        questions,
        null,
        2
      )}`,
    },
  ]);

  const reviewItems = parseJson(
    extractAgentText(response),
    z.array(reviewItemSchema),
    "qualityChecker 返回的审查 JSON 解析失败"
  );

  const reviewedQuestions = questions.map((question, index) => {
    const review = reviewItems.find((item) => item.questionIndex === index);
    const flags = review ? reviewIssuesToFlags(review) : undefined;

    return flags && flags.length > 0
      ? {
          ...question,
          qualityFlags: [...(question.qualityFlags ?? []), ...flags],
        }
      : question;
  });

  return qualityCheckOutputSchema.parse({
    questions: reviewedQuestions,
  });
}

async function runSaveDraftStep(input: { examId: string; questions: RawQuestion[] }, env: DatabaseEnv) {
  const saveQuestionsTool = createSaveQuestionsTool(env);
  const result = await saveQuestionsTool.execute!({
    examId: input.examId,
    questions: input.questions,
  });

  return saveDraftOutputSchema.parse({
    examId: input.examId,
    questionCount: input.questions.length,
    questionIds: result.questionIds,
  });
}

const parseRequirementsStep = createStep({
  id: "parse-requirements",
  inputSchema: generateExamWorkflowInputSchema,
  outputSchema: parseRequirementsOutputSchema,
  execute: async ({ inputData }: { inputData: GenerateExamWorkflowInput }) =>
    runParseRequirementsStep(inputData),
});

const generateQuestionsStep = createStep({
  id: "generate-questions",
  inputSchema: z.object({ prompt: z.string() }),
  outputSchema: generateQuestionsOutputSchema,
  execute: async ({
    inputData,
    mastra,
  }: {
    inputData: { prompt: string };
    mastra: WorkflowMastra;
  }) => runGenerateQuestionsStep(inputData.prompt, mastra),
});

const qualityCheckStep = createStep({
  id: "quality-check",
  inputSchema: z.object({ questions: z.array(rawQuestionSchema).min(1) }),
  outputSchema: qualityCheckOutputSchema,
  execute: async ({
    inputData,
    mastra,
  }: {
    inputData: { questions: RawQuestion[] };
    mastra: WorkflowMastra;
  }) => runQualityCheckStep(inputData.questions, mastra),
});

export function createGenerateExamWorkflow(_env: DatabaseEnv) {
  const saveDraftStep = createStep({
    id: "save-draft",
    inputSchema: z.object({
      examId: z.string().min(1),
      questions: z.array(rawQuestionSchema).min(1),
    }),
    outputSchema: saveDraftOutputSchema,
    execute: async ({
      inputData,
    }: {
      inputData: { examId: string; questions: RawQuestion[] };
    }) => runSaveDraftStep(inputData, _env),
  });

  return createWorkflow({
    id: "generate-exam",
    inputSchema: generateExamWorkflowInputSchema,
    outputSchema: generateExamWorkflowOutputSchema,
  })
    .then(parseRequirementsStep)
    .then(generateQuestionsStep)
    .then(qualityCheckStep)
    .then(saveDraftStep)
    .commit();
}

export async function runGenerateExamWorkflow(options: {
  env: DatabaseEnv & {
    ZHIPU_API_KEY: string;
    DASHSCOPE_API_KEY: string;
  };
  input: GenerateExamWorkflowInput;
  onEvent?: (event: GenerateExamWorkflowEvent) => Promise<void> | void;
}) {
  const input = generateExamWorkflowInputSchema.parse(options.input);
  const mastra = new Mastra({
    agents: {
      questionGenerator: createQuestionGeneratorAgent(options.env),
      qualityChecker: createQualityCheckerAgent(options.env),
    },
  });

  const parsed = await runParseRequirementsStep(input);
  await options.onEvent?.({ event: "step", step: "parse-requirements", status: "done" });

  const generated = await runGenerateQuestionsStep(parsed.prompt, mastra);
  await options.onEvent?.({ event: "step", step: "generate-questions", status: "done" });
  await options.onEvent?.({ event: "questions", data: generated.questions });

  const reviewed = await runQualityCheckStep(generated.questions, mastra);
  await options.onEvent?.({ event: "step", step: "quality-check", status: "done" });

  const saved = await runSaveDraftStep(
    { examId: input.examId, questions: reviewed.questions },
    options.env
  );
  await options.onEvent?.({ event: "step", step: "save-draft", status: "done" });

  return {
    ...saved,
    questions: reviewed.questions,
  };
}
