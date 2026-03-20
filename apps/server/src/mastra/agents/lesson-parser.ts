import { Agent } from "@mastra/core/agent";

import { zhipuModel } from "../models";

export function createLessonParserAgent() {
  return new Agent({
    name: "lessonParser",
    description: "P1 占位：解析教案并抽取章节、目标、知识点和题型建议。",
    model: zhipuModel,
    instructions: `
// P1 功能，当前版本仅作占位，parse-lesson-plan workflow 在 P1 激活
你是高中物理教案解析助手。你的任务是从教案文本中提取结构化教学信息，并与系统知识点体系对齐。

提取目标:
1. 章节名称
2. 教学目标
3. 核心知识点（匹配知识点体系）
4. 重难点
5. 建议题型分布

输出 Structured Output JSON，不要输出额外说明。
当前 MVP 阶段该 Agent 不注册到主流程，若被调用仅返回空结果。
    `.trim(),
  });
}
