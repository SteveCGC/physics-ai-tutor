import type { QualityFlag, QuestionType } from "@physics-ai-tutor/shared";

export class QuestionGeneratorUnavailableError extends Error {
  constructor() {
    super("Question generator is unavailable");
    this.name = "QuestionGeneratorUnavailableError";
  }
}

export type RegenerateQuestionInput = {
  knowledgePoints: string[];
  type: QuestionType;
  difficulty: number;
};

export type RegeneratedQuestion = {
  type: QuestionType;
  content: string;
  options?: string[];
  answer: string;
  acceptedAnswers?: string[];
  explanation?: string | null;
  knowledgePoints: string[];
  difficulty: number;
  score: number;
  qualityFlags?: QualityFlag[] | null;
};

export async function regenerateQuestionWithMastra(
  input: RegenerateQuestionInput
): Promise<RegeneratedQuestion> {
  return generateQuestionDraft(input);
}

export function generateQuestionDraft(input: RegenerateQuestionInput): RegeneratedQuestion {
  const primaryPoint = input.knowledgePoints[0] ?? "基础概念";
  const secondaryPoint = input.knowledgePoints[1] ?? primaryPoint;
  const stemPrefix = `围绕“${primaryPoint}”设计一道难度 ${input.difficulty} 的题目。`;
  const qualityFlags =
    input.difficulty >= 5
      ? [
          {
            type: "difficulty_review",
            message: "当前题目难度较高，建议发布前再次确认学生适配性。",
            severity: "warning" as const,
          },
        ]
      : null;

  switch (input.type) {
    case "choice":
      return {
        type: "choice",
        content:
          `${stemPrefix} 已知某物理过程与 ${primaryPoint} 有关，下列说法正确的是（ ）。` +
          ` 设过程中满足 $F=ma$，并结合 ${secondaryPoint} 判断结论。`,
        options: [
          `${primaryPoint} 只与物体质量有关`,
          `过程分析时必须同时考虑 ${secondaryPoint}`,
          `${primaryPoint} 与受力情况无关`,
          `任何情况下加速度都保持不变`,
        ],
        answer: "B",
        explanation: `题目考查 ${primaryPoint} 与 ${secondaryPoint} 的综合辨析，正确选项是 B。`,
        knowledgePoints: input.knowledgePoints,
        difficulty: input.difficulty,
        score: scoreByType(input.type, input.difficulty),
        qualityFlags,
      };
    case "fill":
      return {
        type: "fill",
        content:
          `${stemPrefix} 在研究 ${primaryPoint} 时，若物体质量为 $2\\,kg$，受到合力为 $6\\,N$，` +
          `则加速度大小为 $\\underline{\\qquad}$ m/s^2。`,
        answer: "3",
        acceptedAnswers: ["3.0"],
        explanation: "由牛顿第二定律 $a=F/m=6/2=3$ m/s^2。",
        knowledgePoints: input.knowledgePoints,
        difficulty: input.difficulty,
        score: scoreByType(input.type, input.difficulty),
        qualityFlags,
      };
    case "calculation":
      return {
        type: "calculation",
        content:
          `${stemPrefix} 一物体从静止开始做匀加速直线运动，$4\\,s$ 内位移为 $32\\,m$。` +
          `求其加速度，并说明该过程与 ${primaryPoint} 的联系。`,
        answer: "加速度为 4 m/s^2",
        acceptedAnswers: ["4", "4m/s^2", "4 m/s²", "4 m/s^2"],
        explanation:
          "由位移公式 $s=\\frac{1}{2}at^2$，代入 $32=\\frac{1}{2}a\\times16$，解得 $a=4\\,m/s^2$。",
        knowledgePoints: input.knowledgePoints,
        difficulty: input.difficulty,
        score: scoreByType(input.type, input.difficulty),
        qualityFlags,
      };
    case "short_answer":
      return {
        type: "short_answer",
        content:
          `${stemPrefix} 请简要说明在分析 ${primaryPoint} 问题时，为什么需要结合 ${secondaryPoint}，` +
          "并给出一个课堂中的典型情境。",
        answer: `需要从条件、受力或能量变化等角度综合分析 ${primaryPoint} 与 ${secondaryPoint} 的关系。`,
        explanation:
          `参考作答应能说明 ${primaryPoint} 的核心规律，并结合 ${secondaryPoint} 给出合理实例。`,
        knowledgePoints: input.knowledgePoints,
        difficulty: input.difficulty,
        score: scoreByType(input.type, input.difficulty),
        qualityFlags,
      };
  }
}

function scoreByType(type: QuestionType, difficulty: number) {
  const baseScores: Record<QuestionType, number> = {
    choice: 4,
    fill: 6,
    calculation: 12,
    short_answer: 10,
  };

  return baseScores[type] + Math.max(difficulty - 3, 0) * 2;
}
