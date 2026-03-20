import { Mastra } from "@mastra/core";

import type { DatabaseEnv } from "../db/client";
import type { Bindings } from "../types";
import {
  createLessonParserAgent,
  createQualityCheckerAgent,
  createQuestionGeneratorAgent,
} from "./agents/index";
import { createEmbeddingModel } from "./models";
import { createGenerateExamWorkflow, createParseLessonPlanWorkflow } from "./workflows";

type MastraEnv = Pick<Bindings, "ZHIPU_API_KEY" | "DASHSCOPE_API_KEY"> & DatabaseEnv;

export type MastraRegistry = {
  agents: {
    questionGenerator: ReturnType<typeof createQuestionGeneratorAgent>;
    qualityChecker: ReturnType<typeof createQualityCheckerAgent>;
  };
  workflows: {
    generateExam: ReturnType<typeof createGenerateExamWorkflow>;
  };
  placeholders: {
    agents: {
      lessonParser: ReturnType<typeof createLessonParserAgent>;
    };
    workflows: {
      parseLessonPlan: ReturnType<typeof createParseLessonPlanWorkflow>;
    };
  };
};

function assertMastraEnv(env: MastraEnv) {
  if (!env.ZHIPU_API_KEY) {
    throw new Error("Missing ZHIPU_API_KEY for Mastra initialization");
  }

  if (!env.DASHSCOPE_API_KEY) {
    throw new Error("Missing DASHSCOPE_API_KEY for Mastra initialization");
  }
}

export function createMastra(env: MastraEnv) {
  assertMastraEnv(env);

  const questionGenerator = createQuestionGeneratorAgent(env);
  const qualityChecker = createQualityCheckerAgent();
  const lessonParser = createLessonParserAgent();

  const generateExam = createGenerateExamWorkflow(env);
  const parseLessonPlan = createParseLessonPlanWorkflow();

  // Embedding 模型在 P1 激活；MVP 仅完成配置，避免后续接入时重复改造。
  const embeddingModel = createEmbeddingModel(env);

  const registry: MastraRegistry = {
    agents: {
      questionGenerator,
      qualityChecker,
    },
    workflows: {
      generateExam,
    },
    placeholders: {
      agents: {
        lessonParser,
      },
      workflows: {
        parseLessonPlan,
      },
    },
  };

  void embeddingModel;

  return new Mastra({
    agents: registry.agents,
    workflows: registry.workflows,
  });
}
