import { createOpenAI } from "@ai-sdk/openai";

import type { Bindings } from "../types";

// ============================================================
// Zhipu AI（智谱）
// 文档: https://open.bigmodel.cn/dev/api
// OpenAI 兼容接口
// ============================================================
const ZHIPU_BASE_URL = "https://open.bigmodel.cn/api/paas/v4/";

export function createZhipu(env: Pick<Bindings, "ZHIPU_API_KEY">) {
  return createOpenAI({
    baseURL: ZHIPU_BASE_URL,
    apiKey: env.ZHIPU_API_KEY,
  });
}

/** 稳定文本/结构化输出，适合严格 JSON 出题 */
export function createQuestionGeneratorModel(env: Pick<Bindings, "ZHIPU_API_KEY">) {
  return createZhipu(env)("glm-4-flash");
}

/** 轻量免费版，适合格式校验类任务 */
export function createQualityCheckerModel(env: Pick<Bindings, "ZHIPU_API_KEY">) {
  return createZhipu(env)("glm-4-flash");
}

// ============================================================
// 阿里云百炼（Dashscope / Qwen）
// 文档: https://help.aliyun.com/zh/dashscope/
// OpenAI 兼容接口
// ============================================================
const DASHSCOPE_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";

export function createDashscope(env: Pick<Bindings, "DASHSCOPE_API_KEY">) {
  return createOpenAI({
    baseURL: DASHSCOPE_BASE_URL,
    apiKey: env.DASHSCOPE_API_KEY,
  });
}

/** 文档理解/长文本，适合解析教案（P1 用）*/
export function createLessonParserModel(env: Pick<Bindings, "DASHSCOPE_API_KEY">) {
  return createDashscope(env)("qwen-plus");
}

/** Embedding 模型 */
export function createEmbeddingModel(env: Pick<Bindings, "DASHSCOPE_API_KEY">) {
  return createDashscope(env).textEmbeddingModel("text-embedding-v3");
}
