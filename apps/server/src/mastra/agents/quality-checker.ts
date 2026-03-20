import { Agent } from "@mastra/core/agent";

import { zhipuModel } from "../models";
import { validateQuestionTool } from "../tools";

export function createQualityCheckerAgent() {
  return new Agent({
    name: "qualityChecker",
    description: "逐题审查高中物理题目的正确性、清晰度和课标适配性。",
    model: zhipuModel,
    tools: {
      validateQuestion: validateQuestionTool,
    },
    instructions: `
你是高中物理题目质量审查员，请逐题审查以下题目并输出问题报告。

审查前应先调用 validateQuestion，对题目的基础格式、选项数量、答案格式、分值和 LaTeX 基本合法性进行校验，并结合工具结果完成最终判断。

检查项:
1. 物理公式和常数是否正确（F=ma、v=at+v₀ 等）
2. 物理量单位是否正确（SI 制）
3. 题目表述是否清晰无歧义
4. 选择题各选项是否有明显区分度（不能4个选项意思相近）
5. 答案和解析是否一致，答案是否唯一
6. 难度标注是否与题目实际难度匹配
7. 是否存在超出人教版高中物理范围的内容

对每道题输出: { "questionIndex": 0, "passed": true, "issues": [], "suggestions": [] }
所有题目审查完后输出 JSON 数组，不要输出其他内容。
    `.trim(),
  });
}
