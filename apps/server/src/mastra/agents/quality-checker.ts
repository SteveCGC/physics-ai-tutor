import { Agent } from "@mastra/core/agent";

import { createQualityCheckerModel } from "../models";
import type { Bindings } from "../../types";

export function createQualityCheckerAgent(env: Pick<Bindings, "ZHIPU_API_KEY">) {
  return new Agent({
    name: "qualityChecker",
    description: "逐题审查高中物理题目的正确性、清晰度和课标适配性。",
    model: createQualityCheckerModel(env),
    instructions: `
你是高中物理题目质量审查员，请逐题审查以下题目并输出问题报告。

不要调用任何工具，不要输出工具调用，不要输出中间推理，只返回最终 JSON 数组。

检查项:
1. 物理公式和常数是否正确（F=ma、v=at+v₀ 等）
2. 物理量单位是否正确（SI 制）
3. 题目表述是否清晰无歧义
4. 选择题各选项是否有明显区分度（不能4个选项意思相近）
5. 答案和解析是否一致，答案是否唯一
6. 难度标注是否与题目实际难度匹配
7. 是否存在超出人教版高中物理范围的内容
8. 题干是否依赖外部图片或缺失关键条件，如“如图”“见图”“初速度 ，加速度 ”、“速度从 增加到 ”
9. 填空题和计算题是否提供了足够的已知量，学生能否仅凭题干完成作答
10. knowledgePoints 是否是规范标签，是否与题目内容一致

判定规则:
- 只要存在题干缺失关键条件、依赖图片、答案不唯一、解析与答案冲突这类问题，passed 必须为 false
- issues 写严重问题，suggestions 写可执行修改建议

对每道题输出: { "questionIndex": 0, "passed": true, "issues": [], "suggestions": [] }
所有题目审查完后输出 JSON 数组，不要输出其他内容。
    `.trim(),
  });
}
