import { Agent } from "@mastra/core/agent";
import { Mastra } from "@mastra/core";
import { createStep, createWorkflow } from "@mastra/core/workflows";
import type { QualityFlag, QuestionType } from "@physics-ai-tutor/shared";
import { z } from "zod";

import type { DatabaseEnv } from "../../db/client";
import { createQualityCheckerAgent, createQuestionGeneratorAgent } from "../agents";
import { createQualityCheckerModel } from "../models";
import { saveQuestions } from "../tools";

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

const modelQuestionSchema = z.object({
  type: questionTypeSchema,
  content: z.string().trim().min(1),
  options: z.array(z.string()).optional(),
  answer: z.union([z.string().trim().min(1), z.array(z.string().trim().min(1)).min(1)]),
  acceptedAnswers: z.array(z.string().trim().min(1)).optional(),
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

const explanationPatchSchema = z.object({
  questionIndex: z.number().int().min(0),
  explanation: z.string().trim().min(1),
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
type ModelQuestion = z.infer<typeof modelQuestionSchema>;
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
    "每道题必须包含字段：type、content、options（选择题必填）、answer、explanation、knowledgePoints、difficulty、score。",
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

async function extractStructuredObject<T>(response: unknown): Promise<T | undefined> {
  if (!response || typeof response !== "object") {
    return undefined;
  }

  const candidate = response as {
    object?: unknown;
  };

  const objectValue = candidate.object;
  const resolved =
    objectValue && typeof (objectValue as Promise<unknown>).then === "function"
      ? await (objectValue as Promise<unknown>)
      : objectValue;

  return resolved as T | undefined;
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

function fixLatexCommandsInJson(value: string): string {
  // Protect common LaTeX commands whose leading characters are valid JSON escapes,
  // such as \frac, \theta, \text, \times, \beta, \nu, \rho.
  return value.replace(
    /(?<!\\)\\(frac|text|theta|times|tau|tan|beta|boxed|begin|end|nu|rho|neq|nabla|cdots|ldots)\b/g,
    "\\\\$1"
  );
}

function escapeControlCharsInJsonStrings(value: string) {
  let result = "";
  let inString = false;
  let escaped = false;

  for (const char of value) {
    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      result += char;
      escaped = true;
      continue;
    }

    if (char === "\"") {
      result += char;
      inString = !inString;
      continue;
    }

    if (inString) {
      if (char === "\n") {
        result += "\\n";
        continue;
      }

      if (char === "\r") {
        result += "\\r";
        continue;
      }

      if (char === "\t") {
        result += "\\t";
        continue;
      }
    }

    result += char;
  }

  return result;
}

function truncateForLog(value: string, length = 1200) {
  return value.length > length ? `${value.slice(0, length)}\n...[truncated]` : value;
}

function parseJson<TSchema extends z.ZodTypeAny>(
  value: string,
  schema: TSchema,
  errorMessage: string,
  contextLabel = "parseJson"
): z.infer<TSchema> {
  const cleaned = cleanJsonString(value);
  let parsed: unknown;
  let normalized = escapeControlCharsInJsonStrings(cleaned);

  try {
    normalized = fixLatexCommandsInJson(normalized);
    parsed = JSON.parse(normalized);
  } catch (initialError) {
    // Retry after fixing unescaped backslashes (common with LaTeX in LLM output)
    normalized = fixLatexCommandsInJson(fixBackslashes(normalized));

    try {
      parsed = JSON.parse(normalized);
    } catch (retryError) {
      console.error(`[${contextLabel}] JSON parse failed`, {
        initialError: initialError instanceof Error ? initialError.message : String(initialError),
        retryError: retryError instanceof Error ? retryError.message : String(retryError),
        cleaned: truncateForLog(cleaned),
        normalized: truncateForLog(normalized),
      });

      throw new Error(errorMessage);
    }
  }

  const result = schema.safeParse(parsed);

  if (!result.success) {
    console.error(`[${contextLabel}] Schema validation failed`, {
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
        code: issue.code,
      })),
      cleaned: truncateForLog(cleaned),
      normalized: truncateForLog(normalized),
    });

    throw new Error(`${errorMessage}（返回结构不符合预期）`);
  }

  return result.data;
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

function toUniqueTrimmedStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizeChoiceOption(option: string, optionIndex: number) {
  const optionLetter = String.fromCharCode(65 + optionIndex);

  return option
    .trim()
    .replace(new RegExp(`^${optionLetter}\\s*[.．、:：)）-]\\s*`, "i"), "")
    .trim();
}

function normalizeMathString(value: string) {
  return value
    .replace(/\u000crac\b/g, "\\frac")
    .replace(/\u0008eta\b/g, "\\beta")
    .replace(/\u0009heta\b/g, "\\theta")
    .replace(/\u0009ext\b/g, "\\text")
    .replace(/\u0009imes\b/g, "\\times")
    .replace(/\u0009au\b/g, "\\tau")
    .replace(/\u0009an\b/g, "\\tan")
    .replace(/\u000au\b/g, "\\nu")
    .replace(/\u000dho\b/g, "\\rho")
    .trim();
}

function stripChoiceOptionsFromContent(content: string) {
  const matches = Array.from(content.matchAll(/\b([A-D])\s*[.．、:：)）-]\s*/g));

  if (matches.length < 4) {
    return content.trim();
  }

  const firstFourLabels = matches.slice(0, 4).map((match) => match[1].toUpperCase()).join("");
  if (firstFourLabels !== "ABCD") {
    return content.trim();
  }

  const firstOptionIndex = matches[0].index;
  if (typeof firstOptionIndex !== "number" || firstOptionIndex <= 0) {
    return content.trim();
  }

  const stripped = content.slice(0, firstOptionIndex).trim().replace(/[：:;；，,\s]+$/u, "").trim();
  return stripped || content.trim();
}

function mergeQualityFlags(
  ...groups: Array<Array<{ type: string; message: string; severity: "warning" | "error" }> | undefined>
) {
  const merged = groups.flatMap((group) => group ?? []);
  if (merged.length === 0) {
    return undefined;
  }

  const seen = new Set<string>();
  return merged.filter((flag) => {
    const key = `${flag.type}:${flag.severity}:${flag.message}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function buildLocalQualityFlags(question: RawQuestion): QualityFlag[] | undefined {
  const flags: QualityFlag[] = [];
  const content = question.content.trim();
  const explanation = question.explanation?.trim() ?? "";

  if (/如图|见图|下图|图像如图|根据图像/i.test(content)) {
    flags.push({
      type: "quality_check",
      severity: "error",
      message: "题干依赖外部图示，当前系统无法保证学生仅凭文本作答。",
    });
  }

  if (
    /(?:初速度|末速度|加速度|位移|路程|时间|速度从|速度为|水平位移|竖直位移|落地时水平位移|落地时竖直速度)\s*[，。；,;]/.test(
      content
    )
  ) {
    flags.push({
      type: "quality_check",
      severity: "error",
      message: "题干缺少关键已知条件，存在留空描述。",
    });
  }

  if (/__+|（\s*）|\(\s*\)/.test(content)) {
    flags.push({
      type: "quality_check",
      severity: "warning",
      message: "题干包含空白占位符，请确认不是遗漏条件或答案。",
    });
  }

  if ((question.type === "fill" || question.type === "calculation") && /\d/.test(content) === false) {
    flags.push({
      type: "quality_check",
      severity: "warning",
      message: "填空题/计算题未出现明确数值条件，请确认题目是否可直接作答。",
    });
  }

  if (!explanation) {
    flags.push({
      type: "quality_check",
      severity: "warning",
      message: "缺少解析，建议补充核心思路或公式依据。",
    });
  }

  if (question.knowledgePoints.some((point) => point.includes("-"))) {
    flags.push({
      type: "quality_check",
      severity: "warning",
      message: "knowledgePoints 使用了扩展标签，建议统一为系统标准知识点名称。",
    });
  }

  return flags.length > 0 ? flags : undefined;
}

function normalizeModelQuestion(question: ModelQuestion): RawQuestion {
  const answerCandidates = Array.isArray(question.answer)
    ? toUniqueTrimmedStrings(question.answer.map(normalizeMathString))
    : [normalizeMathString(question.answer)];
  const acceptedAnswers = toUniqueTrimmedStrings([
    ...(question.acceptedAnswers ?? []).map(normalizeMathString),
    ...answerCandidates.slice(1),
  ]);
  const normalizedOptions = question.options?.map((option, optionIndex) =>
    normalizeMathString(normalizeChoiceOption(option, optionIndex))
  );
  const normalizedContent =
    normalizeMathString(
      question.type === "choice"
        ? stripChoiceOptionsFromContent(question.content)
        : question.content.trim()
    );
  const normalizedExplanation = question.explanation
    ? normalizeMathString(question.explanation)
    : question.explanation;

  return rawQuestionSchema.parse({
    ...question,
    content: normalizedContent,
    options: normalizedOptions,
    answer: answerCandidates[0],
    acceptedAnswers: acceptedAnswers.length > 0 ? acceptedAnswers : undefined,
    explanation: normalizedExplanation,
  });
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
    generate(
      input: { messages: Array<{ role: "user"; content: string }> },
      options?: {
        structuredOutput?: {
          schema: unknown;
        };
        maxSteps?: number;
      }
    ): Promise<unknown>;
    generateLegacy(messages: Array<{ role: "user"; content: string }>): Promise<unknown>;
  }>("questionGenerator");

  const structuredSchema = z.array(modelQuestionSchema).min(1);
  let generatedQuestions: ModelQuestion[];

  try {
    const structuredResponse = await agent.generate(
      { messages: [{ role: "user", content: prompt }] },
      {
        structuredOutput: {
          schema: structuredSchema,
        },
        maxSteps: 1,
      }
    );
    const structuredObject = await extractStructuredObject<unknown>(structuredResponse);
    const structuredResult = structuredSchema.safeParse(structuredObject);

    if (!structuredResult.success) {
      console.warn("[questionGenerator] structured output validation failed", {
        issues: structuredResult.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
          code: issue.code,
        })),
      });
      throw new Error("questionGenerator structured output validation failed");
    }

    generatedQuestions = structuredResult.data;
  } catch (error) {
    console.warn("[questionGenerator] falling back to text json parsing");

    const response = await agent.generateLegacy([{ role: "user", content: prompt }]);
    const rawText = extractAgentText(response);
    console.log("[questionGenerator] raw response:", truncateForLog(rawText));

    try {
      generatedQuestions = parseJson(
        rawText,
        structuredSchema,
        "questionGenerator 返回的题目 JSON 解析失败",
        "questionGenerator"
      );
    } catch (parseError) {
      console.warn("[questionGenerator] falling back to json repair");

      const repairAgent = mastra.getAgent<{
        generateLegacy(messages: Array<{ role: "user"; content: string }>): Promise<unknown>;
      }>("jsonRepair");

      const repairResponse = await repairAgent.generateLegacy([
        {
          role: "user",
          content: [
            "请将下面这段内容修复为合法 JSON 数组，只返回修复后的 JSON。",
            "要求：",
            "1. 保留原有题目信息，不要补充解释性文字。",
            "2. 如果字符串中有真实换行、制表符或非法反斜杠，请改成合法 JSON 转义。",
            "3. 如果选择题 options 自带 A./B./C./D. 前缀可以保留，后续系统会清洗。",
            "4. 如果某题字段明显缺失，不要编造新信息，只尽量保持原样并输出合法 JSON。",
            "待修复内容：",
            cleanJsonString(rawText),
          ].join("\n"),
        },
      ]);

      const repairedText = extractAgentText(repairResponse);
      console.log("[jsonRepair] repaired response:", truncateForLog(repairedText));

      generatedQuestions = parseJson(
        repairedText,
        structuredSchema,
        parseError instanceof Error ? parseError.message : "questionGenerator 返回的题目 JSON 解析失败",
        "jsonRepair"
      );
    }
  }

  const questions = generatedQuestions.map((question) => {
    const normalizedQuestion = normalizeModelQuestion(question);

    return {
      ...normalizedQuestion,
      qualityFlags: mergeQualityFlags(
        normalizedQuestion.qualityFlags,
        buildLocalQualityFlags(normalizedQuestion)
      ),
    };
  });

  return generateQuestionsOutputSchema.parse({ questions });
}

async function runFillMissingExplanationsStep(questions: RawQuestion[], mastra: WorkflowMastra) {
  const missingIndexes = questions
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => !question.explanation?.trim())
    .map(({ index }) => index);

  if (missingIndexes.length === 0) {
    return questions;
  }

  const agent = mastra.getAgent<{
    generate(
      input: { messages: Array<{ role: "user"; content: string }> },
      options?: {
        structuredOutput?: {
          schema: unknown;
        };
        maxSteps?: number;
      }
    ): Promise<unknown>;
    generateLegacy(messages: Array<{ role: "user"; content: string }>): Promise<unknown>;
  }>("explanationGenerator");

  const patchSchema = z.array(explanationPatchSchema);
  let patches: Array<z.infer<typeof explanationPatchSchema>>;

  const prompt = [
    "请只为 explanation 为空的题目补写解析，返回严格 JSON 数组，不要输出任何额外内容。",
    "要求：",
    "1. 只返回需要补写的题目，格式为 [{\"questionIndex\":0,\"explanation\":\"...\"}]。",
    "2. explanation 必须简短但完整，说明核心公式、判断依据或关键推导。",
    "3. 不要修改题干、答案、选项、知识点、难度或分值。",
    "4. 不要输出 markdown 代码块。",
    `待补写题号索引：${missingIndexes.join(", ")}`,
    `题目 JSON：${JSON.stringify(questions)}`,
  ].join("\n");

  try {
    const response = await agent.generate(
      { messages: [{ role: "user", content: prompt }] },
      {
        structuredOutput: {
          schema: patchSchema,
        },
        maxSteps: 1,
      }
    );

    const object = await extractStructuredObject<unknown>(response);
    const result = patchSchema.safeParse(object);
    if (!result.success) {
      throw new Error("explanationGenerator structured output validation failed");
    }
    patches = result.data;
  } catch {
    const response = await agent.generateLegacy([{ role: "user", content: prompt }]);
    patches = parseJson(
      extractAgentText(response),
      patchSchema,
      "补写题目解析失败",
      "explanationGenerator"
    );
  }

  const patchMap = new Map(
    patches
      .filter((patch) => missingIndexes.includes(patch.questionIndex))
      .map((patch) => [patch.questionIndex, patch.explanation.trim()])
  );

  return questions.map((question, index) => ({
    ...question,
    explanation: question.explanation?.trim() || patchMap.get(index) || question.explanation,
  }));
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
    "qualityChecker 返回的审查 JSON 解析失败",
    "qualityChecker"
  );

  const reviewedQuestions = questions.map((question, index) => {
    const review = reviewItems.find((item) => item.questionIndex === index);
    const flags = review ? reviewIssuesToFlags(review) : undefined;

    return flags && flags.length > 0
      ? {
          ...question,
          qualityFlags: mergeQualityFlags(question.qualityFlags, flags),
        }
      : question;
  });

  return qualityCheckOutputSchema.parse({
    questions: reviewedQuestions,
  });
}

async function runSaveDraftStep(input: { examId: string; questions: RawQuestion[] }, env: DatabaseEnv) {
  const result = await saveQuestions(env, {
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
      explanationGenerator: new Agent({
        name: "explanationGenerator",
        description: "为缺少解析的题目补写 explanation。",
        model: createQualityCheckerModel(options.env),
        instructions: `
你是一位高中物理教师。

你的唯一任务是为用户提供的题目补写 explanation 字段。
不要改写其他字段，不要输出中间推理，不要输出 markdown 代码块。
如果用户要求返回 JSON 数组，就只返回 JSON 数组。
解析必须简短但完整，说明核心公式、判断依据或关键推导。
        `.trim(),
      }),
      jsonRepair: new Agent({
        name: "jsonRepair",
        description: "将接近 JSON 的模型输出修复为合法 JSON。",
        model: createQualityCheckerModel(options.env),
        instructions: `
你是 JSON 修复器。

你的唯一任务是把用户提供的内容修复为合法 JSON。
不要总结，不要解释，不要补充说明，不要输出 markdown 代码块。
如果原文是 JSON 数组，就只输出修复后的 JSON 数组。
如果字符串中存在真实换行、制表符、非法反斜杠或不合法引号，请修复为合法 JSON 转义。
        `.trim(),
      }),
    },
  });

  const parsed = await runParseRequirementsStep(input);
  await options.onEvent?.({ event: "step", step: "parse-requirements", status: "done" });

  const generated = await runGenerateQuestionsStep(parsed.prompt, mastra);
  const explainedQuestions = await runFillMissingExplanationsStep(generated.questions, mastra);
  await options.onEvent?.({ event: "step", step: "generate-questions", status: "done" });
  await options.onEvent?.({ event: "questions", data: explainedQuestions });

  const reviewed = await runQualityCheckStep(explainedQuestions, mastra);
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
