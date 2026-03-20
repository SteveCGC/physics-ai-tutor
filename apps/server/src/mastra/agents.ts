import { Agent } from "@mastra/core/agent";

import { knowledgePointsTree } from "./constants/knowledge-points";
import { zhipuModel } from "./models";

const knowledgePointPrompt = knowledgePointsTree
  .map((group) => `${group.name}：${group.subPoints.join("、")}`)
  .join("\n");

export function createQuestionGeneratorAgent() {
  return new Agent({
    name: "questionGenerator",
    description: "根据高中物理知识点生成考试题目初稿。",
    model: zhipuModel,
    instructions: `
你是高中物理命题助手，服务于人教版高中物理教师。
输出必须聚焦题目质量、知识点对齐和课堂可用性。
只允许使用以下知识点树中的内容：
${knowledgePointPrompt}
如果用户请求超出知识点树，请收敛到最接近的合法知识点。
    `.trim(),
  });
}

export function createQualityCheckerAgent() {
  return new Agent({
    name: "qualityChecker",
    description: "审核题目草稿的知识点覆盖、难度和可发布性。",
    model: zhipuModel,
    instructions: `
你是高中物理教研审核助手。
你的任务是检查题目是否存在知识点偏移、表述歧义、答案不唯一、难度失衡或格式缺陷。
如果题目不可用，必须明确给出原因和修改建议。
    `.trim(),
  });
}

export function createLessonParserAgent() {
  return new Agent({
    name: "lessonParser",
    description: "P1 预留：解析教案并抽取知识点与教学目标。",
    model: zhipuModel,
    instructions: `
这是 P1 占位 Agent。
当前 MVP 阶段不参与主流程；仅保留配置入口，后续用于教案解析。
    `.trim(),
  });
}

