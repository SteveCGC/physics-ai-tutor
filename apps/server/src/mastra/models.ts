import { createOpenAI } from "@ai-sdk/openai";

import type { Bindings } from "../types";

export const zhipuModel = "zhipuai/glm-4-flash" as const;

const DASHSCOPE_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
const DASHSCOPE_EMBEDDING_MODEL = "text-embedding-v3";

export function createDashscope(env: Pick<Bindings, "DASHSCOPE_API_KEY">) {
  return createOpenAI({
    baseURL: DASHSCOPE_BASE_URL,
    apiKey: env.DASHSCOPE_API_KEY,
  });
}

export function createEmbeddingModel(env: Pick<Bindings, "DASHSCOPE_API_KEY">) {
  return createDashscope(env).textEmbeddingModel(DASHSCOPE_EMBEDDING_MODEL);
}

